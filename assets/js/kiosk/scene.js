import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RACK_FACES } from './discs.js';
import {
  PRESETS,
  SCREENS,
  SCREEN_FILL,
  allowedIn,
  fitDistance,
  fitFov,
  isPickable,
  pickHotspot,
  presetLimits
} from './hotspots.js';
import { addLights, addSky, addSnow, createComposer, flicker, setupShadows, weatherMaterials } from './atmosphere.js';
import { QUALITY, qualityTier } from './weather.js';

const HOVER = 0x4a3210;
const FLIGHT_MS = 1100;
const QUARTER = Math.PI / 2;
const SCREEN_FOV = 40;

function pickableNameOf(object) {
  for (let node = object; node; node = node.parent) {
    if (isPickable(node.name)) return node.name;
  }
  return object.name;
}

function isShown(object) {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export async function createKioskScene({
  container,
  url,
  onProgress = () => {},
  onHover = () => {},
  onPick = () => {},
  onRackFace = () => {}
}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const quality = QUALITY[qualityTier({ width: window.innerWidth, cores: navigator.hardwareConcurrency || 8 })];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  // A close-up always looks at its screen head-on, so the screen shows up as
  // a centred rectangle and the page can be a plain 2D layer laid exactly on
  // it. (Pages inside a CSS3D context render in Chrome but ignore clicks.)
  // Only the pages take the mouse; everything else falls through.
  const screenLayer = document.createElement('div');
  screenLayer.className = 'kiosk-screens';
  container.appendChild(screenLayer);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 160);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  const gltf = await new GLTFLoader().loadAsync(url, event => {
    if (event.total) onProgress((event.loaded / event.total) * 100);
  });
  const root = gltf.scene;
  scene.add(root);
  root.updateMatrixWorld(true);

  const presets = {};
  for (const name of PRESETS) {
    const cam = root.getObjectByName(`cam_${name}`);
    const target = root.getObjectByName(`tgt_${name}`);
    if (cam && target) {
      presets[name] = {
        position: cam.getWorldPosition(new THREE.Vector3()),
        target: target.getWorldPosition(new THREE.Vector3())
      };
    }
  }

  const screens = {};
  for (const [preset, anchorName] of Object.entries(SCREENS)) {
    const anchor = root.getObjectByName(anchorName);
    if (!anchor) continue;
    const element = document.createElement('div');
    element.className = `screen-page screen-${preset}`;
    const scroller = document.createElement('div');
    scroller.className = 'screen-scroll';
    element.appendChild(scroller);
    screenLayer.appendChild(element);
    screens[preset] = {
      center: anchor.getWorldPosition(new THREE.Vector3()),
      normal: new THREE.Vector3(0, 0, 1).applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion())),
      element,
      scroller,
      width: anchor.userData.width,
      height: anchor.userData.height
    };
  }

  const highlight = new Map();
  root.traverse(object => {
    if (!object.isMesh) return;
    if (object.material.name.startsWith('glass')) {
      object.material.transparent = true;
      object.material.opacity = 0.18;
      object.material.depthWrite = false;
    }
    const name = pickableNameOf(object);
    if (!isPickable(name)) return;
    object.material = object.material.clone();
    if (!highlight.has(name)) highlight.set(name, []);
    highlight.get(name).push(object.material);
  });

  weatherMaterials(root);
  const sky = addSky(scene);
  const flickering = addLights(scene, root, quality);
  setupShadows(renderer, root, quality);
  const snow = addSnow(scene, quality.flakes, { moving: !reducedMotion });
  const composer = createComposer(renderer, scene, camera, container.clientWidth, container.clientHeight, quality);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  let hovered = null;
  function setHovered(name) {
    if (name === hovered) return;
    hovered = name;
    for (const [key, materials] of highlight) {
      for (const material of materials) {
        if (material.emissive) material.emissive.setHex(key === name ? HOVER : 0x000000);
      }
    }
  }

  function showOnly(pattern, entries) {
    const used = new Set(entries.map(entry => entry.node));
    root.traverse(object => {
      if (pattern.test(object.name)) object.visible = used.has(object.name);
    });
  }

  const rack = root.getObjectByName('dvd_rack');
  let rackFace = 0;
  let rackTarget = 0;
  function spinRack(step) {
    rackFace = (((rackFace + step) % RACK_FACES) + RACK_FACES) % RACK_FACES;
    rackTarget += -step * QUARTER;
    onRackFace(rackFace);
  }
  function snapRack() {
    const turns = Math.round(-rack.rotation.y / QUARTER);
    rackTarget = -turns * QUARTER;
    rackFace = ((turns % RACK_FACES) + RACK_FACES) % RACK_FACES;
    onRackFace(rackFace);
  }

  let current = 'home';
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const names = raycaster.intersectObject(root, true)
      .filter(hit => isShown(hit.object))
      .map(hit => pickableNameOf(hit.object));
    const name = pickHotspot(names);
    return name && allowedIn(current, name) ? name : null;
  }

  // A screen close-up: straight in front of the anchor, far enough back for
  // the whole screen to fit whatever the window shape.
  function screenView(name) {
    const screen = screens[name];
    if (!screen) return null;
    const distance = fitDistance(screen.width, screen.height, SCREEN_FOV, camera.aspect, SCREEN_FILL);
    return { position: screen.center.clone().addScaledVector(screen.normal, distance), target: screen.center.clone() };
  }

  // The page covers exactly the screen's rectangle on the monitor.
  function sizeScreen(name) {
    const screen = screens[name];
    const distance = camera.position.distanceTo(screen.center);
    const visible = 2 * distance * Math.tan(THREE.MathUtils.degToRad(SCREEN_FOV / 2));
    const height = Math.round((screen.height / visible) * container.clientHeight);
    const width = Math.round(height * (screen.width / screen.height));
    Object.assign(screen.element.style, {
      width: `${width}px`,
      height: `${height}px`,
      left: `${Math.round((container.clientWidth - width) / 2)}px`,
      top: `${Math.round((container.clientHeight - height) / 2)}px`
    });
  }

  function showScreen(name) {
    for (const [key, screen] of Object.entries(screens)) {
      screen.element.classList.toggle('is-on', key === name);
    }
  }

  function applyLimits(name) {
    const limits = presetLimits(name);
    controls.enabled = !limits.locked;
    if (limits.locked) return;
    controls.minDistance = limits.minDistance;
    controls.maxDistance = limits.maxDistance;
    controls.minPolarAngle = limits.minPolarAngle;
    controls.maxPolarAngle = limits.maxPolarAngle;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.update();
    if (limits.azimuthSpan) {
      const azimuth = controls.getAzimuthalAngle();
      controls.minAzimuthAngle = azimuth - limits.azimuthSpan / 2;
      controls.maxAzimuthAngle = azimuth + limits.azimuthSpan / 2;
    }
  }

  function arrive(name) {
    applyLimits(name);
    if (screens[name]) {
      sizeScreen(name);
      showScreen(name);
    }
  }

  let flight = null;
  function focus(name, { instant = false } = {}) {
    const view = screenView(name) || presets[name];
    if (!view) return;
    const alreadyThere = !flight && name === current
      && camera.position.distanceTo(view.position) < 1e-3
      && controls.target.distanceTo(view.target) < 1e-3;
    current = name;
    if (alreadyThere) {
      arrive(name); // e.g. switching channels: the TV stays on
      return;
    }
    showScreen(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fov = screens[name] ? SCREEN_FOV : fitFov(presetLimits(name).fov, camera.aspect);
    if (instant || reduced) {
      flight = null;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.copy(view.position);
      controls.target.copy(view.target);
      camera.lookAt(controls.target);
      arrive(name);
      return;
    }
    controls.enabled = false;
    flight = {
      name,
      start: performance.now(),
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      to: view.position,
      toTarget: view.target,
      toFov: fov
    };
  }

  function setPage(name, html, { switching = false } = {}) {
    const screen = screens[name];
    if (!screen) return;
    screen.scroller.innerHTML = html;
    screen.scroller.scrollTop = 0;
    if (switching) {
      screen.element.classList.remove('is-switching');
      void screen.element.offsetWidth;
      screen.element.classList.add('is-switching');
    }
  }

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

  let down = null;
  canvas.addEventListener('pointerdown', event => {
    down = { x: event.clientX, y: event.clientY, lastX: event.clientX };
  });
  canvas.addEventListener('pointermove', event => {
    if (down && current === 'rack' && rack) {
      rack.rotation.y += (event.clientX - down.lastX) * 0.01;
      rackTarget = rack.rotation.y;
      down.lastX = event.clientX;
      return;
    }
    if (event.pointerType !== 'mouse' || event.buttons) return;
    const name = pick(event.clientX, event.clientY);
    setHovered(name);
    onHover(name, event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    setHovered(null);
    onHover(null, 0, 0);
  });
  canvas.addEventListener('pointerup', event => {
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (moved > 6) {
      if (current === 'rack' && rack) snapRack();
      return;
    }
    const name = pick(event.clientX, event.clientY);
    if (name) onPick(name);
  });

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (flight) return;
    if (screens[current]) {
      focus(current, { instant: true });
    } else {
      camera.fov = fitFov(presetLimits(current).fov, camera.aspect);
      camera.updateProjectionMatrix();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let lastFrame = 0;
  renderer.setAnimationLoop(() => {
    if (flight) {
      const t = Math.min((performance.now() - flight.start) / FLIGHT_MS, 1);
      const k = easeInOutCubic(t);
      camera.position.lerpVectors(flight.from, flight.to, k);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
      camera.fov = THREE.MathUtils.lerp(flight.fromFov, flight.toFov, k);
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      if (t === 1) {
        const { name } = flight;
        flight = null;
        arrive(name);
      }
    } else if (controls.enabled) {
      controls.update();
    }
    if (rack) rack.rotation.y += (rackTarget - rack.rotation.y) * 0.15;
    const now = performance.now() / 1000;
    const dt = Math.min(now - (lastFrame || now), 0.1);
    lastFrame = now;
    sky.position.copy(camera.position);
    snow.update(dt, now);
    if (!reducedMotion) flicker(flickering, now);
    composer.render();
  });

  return {
    focus,
    spinRack,
    setPage,
    setWallText,
    setBillboardAd,
    pageScroller: name => screens[name]?.scroller || null,
    setHits: hits => showOnly(/^slot_\d+$/, hits),
    setDiscs: discs => showOnly(/^disc_\d+$/, discs),
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      screenLayer.remove();
    }
  };
}
