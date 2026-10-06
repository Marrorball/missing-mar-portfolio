# Light and Atmosphere Implementation Plan (stage 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat-lit scene into the blue-hour reference: a dark navy sky fading to a violet horizon, warm 2700K bulbs inside, a pool of warm light on the snow in front of the window with the diamond grille's shadow in it, a sodium street lamp, lit billboard, glowing bulbs and windows, falling snow, one flickering bulb, rust and peeling paint on the kiosk — and a printed ad on the billboard when nobody is reading it.

**Architecture:** Real-time lighting in three.js with ACES tone mapping and a bloom pass (EffectComposer). Light positions come from Blender anchors (`light_window`, `light_street`, `light_billboard_*` and their targets) and from the existing bulb meshes, so they move with the model. Weathering is procedural: a shader chunk injected into the paint, metal and snow materials paints rust, grime and peeling from world-space noise (the meshes have no UVs, nothing is generated as an image). Shadows are static: rendered once after load. Pure helpers (`weather.js`: flake placement, flicker curve, quality tier) are unit-tested; three.js code lives in `atmosphere.js`. Phones and weak machines get a light tier without bloom and shadows.

**Tech Stack:** three.js r186 (`EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass`, `onBeforeCompile`), Blender 5.0 bpy, `node --test`.

Spec: `docs/superpowers/specs/2026-10-06-kiosk-portfolio-design.md` («Свет и цвет», stage 4). Deviation from the spec: light is not baked in Cycles. Real-time light reaches the same look sooner, keeps every change a parameter edit, and avoids UV-unwrapping 180 merged meshes; baking stays an option if the frame rate demands it.

Code blocks preceded by `<!-- file: path -->` are complete file contents.

---

## File map

| File | Responsibility |
| --- | --- |
| `scripts/vendor-three.mjs`, `tests/kiosk-vendor.test.mjs` | Vendor the post-processing passes and their shaders |
| `assets/js/kiosk/weather.js` | Pure: snowflake placement, flicker curve, quality tier |
| `assets/js/kiosk/atmosphere.js` | three.js: sky, lights, shadows, weathering shader, snowfall, composer |
| `assets/js/kiosk/scene.js` | Uses the above; billboard ad and wall text share one canvas painter |
| `assets/js/app.js` | Passes the owner to the billboard ad |
| `scripts/kiosk/kiosk.py`, `street.py` | Light anchors |
| `tests/kiosk-weather.test.mjs`, `tests/kiosk-scene-file.test.mjs` | Tests |

---

### Task 1: Vendor post-processing

**Files:**
- Modify: `scripts/vendor-three.mjs`, `tests/kiosk-vendor.test.mjs`

- [ ] **Step 1: Failing test** — in `tests/kiosk-vendor.test.mjs` add to `FILES`:

```js
  'addons/postprocessing/EffectComposer.js',
  'addons/postprocessing/RenderPass.js',
  'addons/postprocessing/UnrealBloomPass.js',
  'addons/postprocessing/OutputPass.js',
```

Run: `node --test tests/kiosk-vendor.test.mjs` → FAIL (files missing).

- [ ] **Step 2: Vendor** — in `scripts/vendor-three.mjs` add to `FILES`:

```js
  ['examples/jsm/postprocessing/EffectComposer.js', 'addons/postprocessing/EffectComposer.js'],
  ['examples/jsm/postprocessing/RenderPass.js', 'addons/postprocessing/RenderPass.js'],
  ['examples/jsm/postprocessing/UnrealBloomPass.js', 'addons/postprocessing/UnrealBloomPass.js'],
  ['examples/jsm/postprocessing/OutputPass.js', 'addons/postprocessing/OutputPass.js'],
  ['examples/jsm/postprocessing/ShaderPass.js', 'addons/postprocessing/ShaderPass.js'],
  ['examples/jsm/postprocessing/MaskPass.js', 'addons/postprocessing/MaskPass.js'],
  ['examples/jsm/postprocessing/Pass.js', 'addons/postprocessing/Pass.js'],
  ['examples/jsm/shaders/CopyShader.js', 'addons/shaders/CopyShader.js'],
  ['examples/jsm/shaders/LuminosityHighPassShader.js', 'addons/shaders/LuminosityHighPassShader.js'],
  ['examples/jsm/shaders/OutputShader.js', 'addons/shaders/OutputShader.js'],
```

Run: `npm run vendor:three && node --test tests/kiosk-vendor.test.mjs` → PASS (the import check proves every transitive file is there).

- [ ] **Step 3: Commit**

```bash
git add scripts/vendor-three.mjs tests/kiosk-vendor.test.mjs assets/vendor/three
git commit -m "build: vendor bloom and output passes"
```

---

### Task 2: Weather helpers

**Files:**
- Create: `assets/js/kiosk/weather.js`, `tests/kiosk-weather.test.mjs`

- [ ] **Step 1: Failing test**

<!-- file: tests/kiosk-weather.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { KIOSK_FOOTPRINT, QUALITY, SNOW_BOUNDS, flakePositions, flickerLevel, insideFootprint, qualityTier } from '../assets/js/kiosk/weather.js';

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

test('snow falls around the kiosk, never inside it', () => {
  const positions = flakePositions(500, seeded(7));
  assert.equal(positions.length, 1500);
  for (let index = 0; index < positions.length; index += 3) {
    const [x, y, z] = [positions[index], positions[index + 1], positions[index + 2]];
    assert.ok(!insideFootprint(x, z), `${x},${z}`);
    assert.ok(Math.abs(x) <= SNOW_BOUNDS.x && Math.abs(z) <= SNOW_BOUNDS.z && y >= 0 && y <= SNOW_BOUNDS.y);
  }
  assert.equal(insideFootprint(0, 0), true);
  assert.equal(insideFootprint(KIOSK_FOOTPRINT.x + 0.1, 0), false);
});

test('the bulb is mostly steady and sometimes dips', () => {
  const samples = Array.from({ length: 2000 }, (_, index) => flickerLevel(index * 0.01));
  assert.ok(samples.every(value => value >= 0.55 && value <= 1));
  assert.ok(samples.filter(value => value === 1).length > samples.length * 0.8);
  assert.ok(Math.min(...samples) < 0.8);
});

test('phones and weak machines get the light tier', () => {
  assert.equal(qualityTier({ width: 1440, cores: 8 }), 'high');
  assert.equal(qualityTier({ width: 390, cores: 8 }), 'low');
  assert.equal(qualityTier({ width: 1440, cores: 4 }), 'low');
  assert.equal(QUALITY.high.bloom, true);
  assert.equal(QUALITY.low.shadows, false);
  assert.ok(QUALITY.low.flakes < QUALITY.high.flakes);
});
```

Run: `node --test tests/kiosk-weather.test.mjs` → FAIL, module not found.

- [ ] **Step 2: Implement**

<!-- file: assets/js/kiosk/weather.js -->
```js
// Pure helpers for the kiosk's weather and light. No three.js here.
// Coordinates are three.js: Y up, the kiosk centred on the origin.

export const SNOW_BOUNDS = { x: 12, y: 9, z: 12 };
export const KIOSK_FOOTPRINT = { x: 1.75, z: 1.25 };   // half sizes, roof overhang included

export const QUALITY = {
  high: { shadows: true, bloom: true, flakes: 3500 },
  low: { shadows: false, bloom: false, flakes: 1200 }
};

export function insideFootprint(x, z, footprint = KIOSK_FOOTPRINT) {
  return Math.abs(x) < footprint.x && Math.abs(z) < footprint.z;
}

// Starting positions for snowflakes around the kiosk, never under its roof.
export function flakePositions(count, random = Math.random, bounds = SNOW_BOUNDS) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    let x;
    let z;
    do {
      x = (random() * 2 - 1) * bounds.x;
      z = (random() * 2 - 1) * bounds.z;
    } while (insideFootprint(x, z));
    positions.set([x, random() * bounds.y, z], index * 3);
  }
  return positions;
}

// Brightness of the tired bulb at time t (seconds): steady most of the
// time, a short stutter every 7.3 seconds.
export function flickerLevel(t) {
  const cycle = t % 7.3;
  if (cycle > 0.5) return 1;
  return 0.55 + 0.45 * Math.abs(Math.sin(cycle * 37));
}

export function qualityTier({ width, cores = 8 }) {
  return width <= 760 || cores <= 4 ? 'low' : 'high';
}
```

Run: `node --test tests/kiosk-weather.test.mjs` → PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add assets/js/kiosk/weather.js tests/kiosk-weather.test.mjs
git commit -m "feat: snowflake placement, bulb flicker and quality tier"
```

---

### Task 3: Light anchors in Blender

**Files:**
- Modify: `scripts/kiosk/kiosk.py`, `scripts/kiosk/street.py`, `tests/kiosk-scene-file.test.mjs`, `assets/kiosk/kiosk.glb`

- [ ] **Step 1: Failing test** — append to `tests/kiosk-scene-file.test.mjs`:

```js
test('light anchors come from the model', () => {
  const all = names();
  for (const node of ['light_window', 'light_window_target', 'light_street', 'light_street_target',
    'light_billboard_0', 'light_billboard_1', 'light_billboard_2', 'light_billboard_target', 'bulb_outside']) {
    assert.ok(all.has(node), node);
  }
});
```

Run: `node --test tests/kiosk-scene-file.test.mjs` → FAIL (`light_window`).

- [ ] **Step 2: Kiosk anchor** — in `scripts/kiosk/kiosk.py`, at the end of `_roof_and_lamp`, add:

```python
    # the warm spill through the showcase: just behind the glass, aimed at
    # the snow in front, so the grille throws its diamonds on the snow
    empty('light_window', (0.0, -HD + 0.07, GLASS_HIGH - 0.05))
    empty('light_window_target', (0.0, -3.2, 0.0))
```

- [ ] **Step 3: Street anchors** — in `scripts/kiosk/street.py` change the import to `from lib import Merge, box, empty, screen, text`; at the end of `_lamp_and_wires` add:

```python
    empty('light_street', (px + 0.95, py, 4.3))
    empty('light_street_target', (px + 0.95, py - 0.3, 0.0))
```

and at the end of `_billboard` add:

```python
    for index, x in enumerate((-1.6, 0.0, 1.6)):
        empty(f'light_billboard_{index}', (bx + x, by - 0.62, top + 0.28))
    empty('light_billboard_target', (bx, by, centre))
```

- [ ] **Step 4: Build and test**

Run: `npm run build:kiosk && node --test tests/kiosk-scene-file.test.mjs` → `kiosk exported`, PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/kiosk/kiosk.py scripts/kiosk/street.py tests/kiosk-scene-file.test.mjs assets/kiosk/kiosk.glb
git commit -m "feat: light anchors for the window spill, street lamp and billboard"
```

---

### Task 4: Atmosphere

**Files:**
- Create: `assets/js/kiosk/atmosphere.js`

- [ ] **Step 1: Implement**

<!-- file: assets/js/kiosk/atmosphere.js -->
```js
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

  const inside = ['bulb_0', 'bulb_1', 'bulb_2'].map(name => point(scene, root, name, { color: WARM, intensity: 6, distance: 6 }));
  point(scene, root, 'bulb_outside', { color: WARM, intensity: 5, distance: 5 });
  spot(scene, root, 'light_window', 'light_window_target', { color: WARM, intensity: 40, distance: 9, angle: 0.8, shadow: quality.shadows });
  spot(scene, root, 'light_street', 'light_street_target', { color: SODIUM, intensity: 90, distance: 12, angle: 0.95 });
  for (let index = 0; index < 3; index += 1) {
    spot(scene, root, `light_billboard_${index}`, 'light_billboard_target', { color: 0xdfe6ff, intensity: 25, distance: 7, angle: 0.7 });
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  if (quality.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.6, 0.85));
  composer.addPass(new OutputPass());
  return composer;
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/kiosk/atmosphere.js
git commit -m "feat: sky, warm lights, static shadows, weathering, snowfall and bloom"
```

---

### Task 5: Use it in the scene

**Files:**
- Modify: `assets/js/kiosk/scene.js`, `assets/js/app.js`

- [ ] **Step 1: Imports** — in `assets/js/kiosk/scene.js` add after the `hotspots.js` import:

```js
import { addLights, addSky, addSnow, createComposer, flicker, setupShadows, weatherMaterials } from './atmosphere.js';
import { QUALITY, qualityTier } from './weather.js';
```

- [ ] **Step 2: Renderer and old lights** — replace

```js
  renderer.outputColorSpace = THREE.SRGBColorSpace;
```

with

```js
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const quality = QUALITY[qualityTier({ width: window.innerWidth, cores: navigator.hardwareConcurrency || 8 })];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

and delete these lines (the sky, fog and lights now come from `atmosphere.js`):

```js
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 18, 90);
  scene.add(new THREE.HemisphereLight(0xaac4ff, 0x2a2a33, 1.6));
  const warm = new THREE.PointLight(0xffb259, 8, 6, 1.4);
  warm.position.set(0, 2.1, 0);
  scene.add(warm);
```

and the constant `const SKY = 0x1b2a4a;`.

- [ ] **Step 3: Set up after the highlight cloning** — directly after the `root.traverse(...)` block that clones highlight materials, add:

```js
  weatherMaterials(root);
  const sky = addSky(scene);
  const flickering = addLights(scene, root, quality);
  setupShadows(renderer, root, quality);
  const snow = addSnow(scene, quality.flakes, { moving: !reducedMotion });
  const composer = createComposer(renderer, scene, camera, container.clientWidth, container.clientHeight, quality);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

- [ ] **Step 4: One painter for every canvas on the model** — replace the whole `setWallText` function with:

```js
  // Paints a canvas onto a Blender anchor (marker on the shutter, the ad on
  // the billboard). `draw(context, width, height)` works in canvas pixels.
  // `pickAs` lets a painted surface answer clicks for the object it covers.
  function paintAnchor(name, draw, { transparent = true, lit = false, pickAs = '' } = {}) {
    const anchor = root.getObjectByName(name);
    if (!anchor) return;
    const { width, height } = anchor.userData;
    const paint = document.createElement('canvas');
    paint.width = 1024;
    paint.height = Math.round(1024 * (height / width));
    draw(paint.getContext('2d'), paint.width, paint.height);
    const texture = new THREE.CanvasTexture(paint);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = lit
      ? new THREE.MeshStandardMaterial({ map: texture, transparent, roughness: 0.9 })
      : new THREE.MeshBasicMaterial({ map: texture, transparent });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.name = pickAs || `${name}_paint`;
    plane.position.z = 0.002;
    plane.receiveShadow = true;
    anchor.add(plane);
    renderer.shadowMap.needsUpdate = true;
  }

  function setWallText(lines) {
    if (!lines.length) return;
    paintAnchor('wall_contacts', (context, width, height) => {
      const lineHeight = height / (lines.length + 0.4);
      context.fillStyle = '#121418';
      context.textBaseline = 'top';
      lines.forEach((line, index) => {
        context.save();
        context.translate(36, 18 + index * lineHeight);
        context.rotate(-0.025 + index * 0.012);
        context.font = `${index === 0 ? 700 : 500} ${Math.round(lineHeight * 0.72)}px "IBM Plex Mono", monospace`;
        context.fillText(line, 0, 0);
        context.restore();
      });
    }, { lit: true });
  }

  // What the billboard shows when nobody is reading it: a printed ad.
  function setBillboardAd({ brand = 'missing mar', name = '', role = '' } = {}) {
    paintAnchor('screen_billboard', (context, width, height) => {
      context.fillStyle = '#efe7d4';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#17181c';
      context.textBaseline = 'alphabetic';
      context.font = `900 ${Math.round(height * 0.26)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
      context.fillText(brand, width * 0.06, height * 0.44);
      context.font = `700 ${Math.round(height * 0.09)}px "IBM Plex Mono", monospace`;
      context.fillText(name.toUpperCase(), width * 0.06, height * 0.62);
      context.fillText(role, width * 0.06, height * 0.74);
      context.fillRect(width * 0.06, height * 0.82, width * 0.88, height * 0.012);
      context.font = `500 ${Math.round(height * 0.075)}px "IBM Plex Mono", monospace`;
      context.fillText('Обо мне →', width * 0.06, height * 0.93);
    }, { transparent: false, lit: true, pickAs: 'hs_billboard' });
  }
```

- [ ] **Step 5: Resize and render** — in `resize`, after `renderer.setSize(width, height, false);` add `composer.setSize(width, height);`. Replace the animation loop's

```js
    if (rack) rack.rotation.y += (rackTarget - rack.rotation.y) * 0.15;
    renderer.render(scene, camera);
```

with

```js
    if (rack) rack.rotation.y += (rackTarget - rack.rotation.y) * 0.15;
    const now = performance.now() / 1000;
    const dt = Math.min(now - (lastFrame || now), 0.1);
    lastFrame = now;
    sky.position.copy(camera.position);
    snow.update(dt, now);
    if (!reducedMotion) flicker(flickering, now);
    composer.render();
```

and declare `let lastFrame = 0;` right before `renderer.setAnimationLoop(`.

- [ ] **Step 6: Return the ad painter** — add `setBillboardAd,` to the returned object, next to `setWallText,`.

- [ ] **Step 7: App** — in `assets/js/app.js`, in `mountKiosk` inside `document.fonts.ready.then(() => { … })`, add after the `setWallText` call:

```js
      const owner = state.bundle.site.owner || {};
      state.kiosk.setBillboardAd({ brand: owner.brandName, name: owner.name, role: owner.role });
```

- [ ] **Step 8: Tests and commit**

Run: `npm test` → all pass.

```bash
git add assets/js/kiosk/scene.js assets/js/app.js
git commit -m "feat: blue hour, warm light and snow in the kiosk scene"
```

---

### Task 6: Look at it

- [ ] **Step 1:** Headless Playwright 1440×900: `home`, `showcase`, `inside`, back side, `#about` (billboard from a distance before the page appears), `#project/kortex`; 390×844 `home`. Note console errors and the frame rate (`requestAnimationFrame` count over 3 s).
- [ ] **Step 2:** Compare with `docs/superpowers/specs/assets/kiosk-refs/`: cold surroundings vs warm interior, warm pool with the grille's diamonds on the snow, readable sign, bulbs and windows glow without washing out.
- [ ] **Step 3:** Tune intensities, colours, fog and exposure in `atmosphere.js` / `scene.js`, `npm test`, commit `fix: tune blue hour after browser check`.
- [ ] **Step 4:** Screenshots to `docs/superpowers/qa/kiosk-atmosphere/`, show Marat.
