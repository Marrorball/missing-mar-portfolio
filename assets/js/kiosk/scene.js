import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PRESETS, isPickable, pickHotspot, presetLimits } from './hotspots.js';

const SKY = 0x1b2a4a;
const HOVER = 0x4a3210;
const FLIGHT_MS = 1100;

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

export async function createKioskScene({ container, url, onProgress = () => {}, onHover = () => {}, onPick = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 14, 34);
  scene.add(new THREE.HemisphereLight(0xaac4ff, 0x2a2a33, 1.6));
  const warm = new THREE.PointLight(0xffb259, 8, 6, 1.4);
  warm.position.set(0, 2.1, 0);
  scene.add(warm);

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 80);
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

  function setSlots(placed) {
    const used = new Set(placed.map(item => item.slot));
    root.traverse(object => {
      if (/^slot_\d+$/.test(object.name)) object.visible = used.has(object.name);
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const names = raycaster.intersectObject(root, true)
      .filter(hit => isShown(hit.object))
      .map(hit => pickableNameOf(hit.object));
    return pickHotspot(names);
  }

  function applyLimits(name) {
    const limits = presetLimits(name);
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

  let flight = null;
  function focus(name, { instant = false } = {}) {
    const preset = presets[name];
    if (!preset) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant || reduced) {
      flight = null;
      controls.enabled = true;
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      applyLimits(name);
      return;
    }
    controls.enabled = false;
    flight = {
      name,
      start: performance.now(),
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      to: preset.position,
      toTarget: preset.target
    };
  }

  let down = null;
  canvas.addEventListener('pointerdown', event => {
    down = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', event => {
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
    if (moved > 6) return;
    const name = pick(event.clientX, event.clientY);
    if (name) onPick(name);
  });

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  renderer.setAnimationLoop(() => {
    if (flight) {
      const t = Math.min((performance.now() - flight.start) / FLIGHT_MS, 1);
      const k = easeInOutCubic(t);
      camera.position.lerpVectors(flight.from, flight.to, k);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
      camera.lookAt(controls.target);
      if (t === 1) {
        const { name } = flight;
        flight = null;
        controls.enabled = true;
        applyLimits(name);
      }
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
  });

  return {
    focus,
    setSlots,
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
}
