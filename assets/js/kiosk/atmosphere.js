// Blue hour around the kiosk: sky, lights, static shadows, weathered paint,
// falling snow and the bloom that makes bulbs and windows glow.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SNOW_BOUNDS, flakePositions, flickerLevel } from './weather.js';

const WARM = 0xffb36b;     // ~2700K bulbs
const SODIUM = 0xffa04a;   // street lamp
const HORIZON = 0x464f7e;  // violet haze at the horizon, also the fog
const SHADOW_RADIUS = 7;   // only things near the kiosk cast shadows

export function addSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x060b1d) },
        middle: { value: new THREE.Color(0x15204a) },
        horizon: { value: new THREE.Color(HORIZON) }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top;
        uniform vec3 middle;
        uniform vec3 horizon;
        varying vec3 vDirection;
        void main() {
          float h = clamp(vDirection.y, 0.0, 1.0);
          vec3 color = mix(horizon, middle, smoothstep(0.0, 0.22, h));
          color = mix(color, top, smoothstep(0.22, 0.85, h));
          gl_FragColor = vec4(color, 1.0);
        }`
    })
  );
  sky.name = 'sky';
  scene.add(sky);
  scene.background = null;
  scene.fog = new THREE.Fog(HORIZON, 16, 85);
  return sky;
}

function spot(scene, root, from, to, { color, intensity, distance, angle, shadow = false }) {
  const source = root.getObjectByName(from);
  const target = root.getObjectByName(to);
  if (!source || !target) return null;
  const light = new THREE.SpotLight(color, intensity, distance, angle, 0.65, 2);
  source.getWorldPosition(light.position);
  target.getWorldPosition(light.target.position);
  if (shadow) {
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0004;
    light.shadow.radius = 3;
  }
  scene.add(light, light.target);
  return light;
}

function point(scene, root, name, { color, intensity, distance, drop = 0.06 }) {
  const mesh = root.getObjectByName(name);
  if (!mesh) return null;
  const light = new THREE.PointLight(color, intensity, distance, 2);
  mesh.getWorldPosition(light.position);
  light.position.y -= drop;
  scene.add(light);
  return light;
}

// Returns the light and bulb mesh that flicker.
export function addLights(scene, root, quality) {
  scene.add(new THREE.HemisphereLight(0x6177bd, 0x14161d, 0.6));
  const moon = new THREE.DirectionalLight(0x9db2ff, 0.35);
  moon.position.set(-8, 14, -6);
  scene.add(moon);

  const inside = ['bulb_0', 'bulb_1', 'bulb_2'].map(name => point(scene, root, name, { color: WARM, intensity: 2.2, distance: 5 }));
  point(scene, root, 'bulb_outside', { color: WARM, intensity: 1.6, distance: 4 });
  point(scene, root, 'bulb_rack', { color: WARM, intensity: 0.30, distance: 3 });
  // the showcase light over the shelves, so the goods face the street lit
  point(scene, root, 'light_window', { color: WARM, intensity: 2.4, distance: 2.6, drop: 0.02 });
  spot(scene, root, 'light_window', 'light_window_target', { color: WARM, intensity: 32, distance: 9, angle: 0.9, shadow: quality.shadows });
  spot(scene, root, 'light_street', 'light_street_target', { color: SODIUM, intensity: 22, distance: 11, angle: 0.9 });
  for (let index = 0; index < 3; index += 1) {
    spot(scene, root, `light_billboard_${index}`, 'light_billboard_target', { color: 0xdfe6ff, intensity: 3.5, distance: 6, angle: 0.7 });
  }

  // The flickering bulb gets its own material so the others stay steady.
  const bulb = root.getObjectByName('bulb_1');
  if (bulb?.isMesh) bulb.material = bulb.material.clone();
  return { light: inside[1], bulb, base: inside[1]?.intensity ?? 0 };
}

export function flicker(state, t) {
  if (!state.light) return;
  const level = flickerLevel(t);
  state.light.intensity = state.base * level;
  if (state.bulb?.material) state.bulb.material.emissiveIntensity = level;
}

// Static scene: the shadow map is rendered once, after everything is placed.
export function setupShadows(renderer, root, quality) {
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const centre = new THREE.Vector3();
  root.traverse(object => {
    if (!object.isMesh) return;
    object.receiveShadow = true;
    const near = object.getWorldPosition(centre).length() < SHADOW_RADIUS;
    object.castShadow = near && !object.material.name.startsWith('glass') && object.name !== 'ground_snow';
  });
  renderer.shadowMap.needsUpdate = true;
}

const NOISE = `
  varying vec3 vWeatherPos;
  float weatherHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float weatherNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(weatherHash(i), weatherHash(i + vec3(1, 0, 0)), f.x),
          mix(weatherHash(i + vec3(0, 1, 0)), weatherHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(weatherHash(i + vec3(0, 0, 1)), weatherHash(i + vec3(1, 0, 1)), f.x),
          mix(weatherHash(i + vec3(0, 1, 1)), weatherHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float weatherFbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * weatherNoise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }`;

const WEATHERING = {
  // grime streaks, peeling to bare primer, rust creeping up from the snow
  paint: `
    float grime = weatherFbm(vWeatherPos * vec3(2.0, 6.0, 2.0));
    float low = 1.0 - smoothstep(0.1, 0.9, vWeatherPos.y);
    float rust = smoothstep(0.62, 0.8, weatherFbm(vWeatherPos * 4.0) * 0.75 + low * 0.45 + grime * 0.15);
    float peel = smoothstep(0.70, 0.76, weatherFbm(vWeatherPos * 9.0 + 7.0));
    diffuseColor.rgb *= 0.82 + 0.3 * grime;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.80, 0.76), peel * 0.5);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.14, 0.06), rust);`,
  metal: `
    float rust = smoothstep(0.6, 0.85, weatherFbm(vWeatherPos * 6.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.13, 0.06), rust * 0.8);`,
  snow: `
    diffuseColor.rgb *= 0.9 + 0.12 * weatherFbm(vWeatherPos * vec3(0.6, 1.0, 0.6));`
};

const KIND_BY_MATERIAL = {
  paint: 'paint',
  paint_dark: 'paint',
  frame: 'metal',
  snow: 'snow',
  snow_trodden: 'snow'
};

function weather(material, kind) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWeatherPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWeatherPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${WEATHERING[kind]}`);
  };
  material.customProgramCacheKey = () => `weather-${kind}`;
}

// Run after any material cloning: onBeforeCompile does not survive clone().
export function weatherMaterials(root) {
  const done = new Set();
  root.traverse(object => {
    if (!object.isMesh || done.has(object.material)) return;
    const kind = KIND_BY_MATERIAL[object.material.name];
    if (kind) weather(object.material, kind);
    done.add(object.material);
  });
}

function flakeSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function addSnow(scene, count, { moving = true } = {}) {
  const positions = flakePositions(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const flakes = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xe6ecff,
    size: 0.045,
    map: flakeSprite(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  }));
  flakes.name = 'snowfall';
  flakes.frustumCulled = false;
  scene.add(flakes);
  const speeds = Float32Array.from({ length: count }, () => 0.35 + Math.random() * 0.35);
  return {
    update(dt, t) {
      if (!moving) return;
      for (let index = 0; index < count; index += 1) {
        const i = index * 3;
        positions[i] += Math.sin(t * 0.7 + index) * 0.08 * dt;
        positions[i + 1] -= speeds[index] * dt;
        if (positions[i + 1] < 0) positions[i + 1] += SNOW_BOUNDS.y;
      }
      geometry.attributes.position.needsUpdate = true;
    }
  };
}

export function createComposer(renderer, scene, camera, width, height, quality) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (quality.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.32, 0.45, 1.1));
  composer.addPass(new OutputPass());
  return composer;
}
