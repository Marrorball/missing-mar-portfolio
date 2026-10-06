import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RACK_FACES } from './discs.js';
import { coverDescriptor, drawCover } from './covers.js';
import {
  PRESETS,
  SCREENS,
  SCREEN_FILL,
  allowedIn,
  fitDistance,
  fitFov,
  isPickable,
  overviewScale,
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
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  // `?quality=low` forces the light tier (debugging, slow machines).
  const forced = new URLSearchParams(window.location.search).get('quality');
  const quality = QUALITY[forced in QUALITY ? forced : qualityTier({ width: window.innerWidth, cores: navigator.hardwareConcurrency || 8 })];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pixelRatio = Math.min(window.devicePixelRatio, quality.bloom ? 2 : 1.25);
  renderer.setPixelRatio(pixelRatio);
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
  composer.setPixelRatio(pixelRatio);

  const artworkTextures = new Map();
  const artworkMaterials = [];
  const artworkPlanes = [];
  let disposed = false;
  function setProjectArt(projects, entries, categories) {
    for (const project of projects) {
      const descriptor = coverDescriptor(project, categories);
      const paint = document.createElement('canvas');
      paint.width = 256;
      paint.height = 360;
      const context = paint.getContext('2d');
      drawCover(context, paint.width, paint.height, descriptor);
      const texture = new THREE.CanvasTexture(paint);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      artworkTextures.set(project.id, texture);
      if (descriptor.image) {
        const artwork = new Image();
        artwork.onload = () => {
          if (disposed) return;
          drawCover(context, paint.width, paint.height, descriptor, artwork);
          texture.needsUpdate = true;
        };
        artwork.src = descriptor.image;
      }
    }
    for (const entry of entries) {
      const node = root.getObjectByName(entry.node);
      const texture = artworkTextures.get(entry.projectId);
      if (!node || !texture) continue;
      const disc = entry.node.startsWith('disc_');
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, side: THREE.DoubleSide,
        emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.06 });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(disc ? 0.131 : 0.195, disc ? 0.185 : 0.274), material);
      plane.position.z = disc ? -0.008 : 0.067;
      if (disc) plane.rotation.y = Math.PI;
      node.add(plane);
      artworkMaterials.push(material);
      artworkPlanes.push(plane);
    }
  }

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
    if (reducedMotion && rack) rack.rotation.y = rackTarget;
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

  let movingDisc = null;
  function cancelDisc() {
    if (!movingDisc) return;
    scene.remove(movingDisc.mesh);
    movingDisc.mesh.geometry.dispose();
    movingDisc.mesh.material.dispose();
    movingDisc = null;
  }

  function playDisc(nodeName) {
    cancelDisc();
    if (reducedMotion) return;
    const source = root.getObjectByName(nodeName);
    const player = root.getObjectByName('dvd_player');
    const texture = source?.children.find(child => child.material?.map)?.material.map;
    if (!source || !player || !texture) return;
    root.updateMatrixWorld(true);
    const from = source.getWorldPosition(new THREE.Vector3());
    const to = player.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.175, 0, 0));
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.115, 40),
      new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.30, metalness: 0.35, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.15 }));
    mesh.name = 'playing_disc';
    mesh.position.copy(from);
    scene.add(mesh);
    movingDisc = { mesh, from, to, start: performance.now() };
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
      if (name !== 'billboard' || !billboardMotion) showScreen(name);
    }
  }

  let flight = null;
  function focus(name, { instant = false } = {}) {
    let view = screenView(name) || presets[name];
    if (!view) return;
    if (name === 'home') {
      const scale = overviewScale(presetLimits(name).fov, camera.aspect);
      view = { target: view.target, position: view.position.clone().sub(view.target).multiplyScalar(scale).add(view.target) };
    }
    const fov = screens[name] ? SCREEN_FOV : fitFov(presetLimits(name).fov, camera.aspect);
    const alreadyThere = !flight && name === current
      && camera.position.distanceTo(view.position) < 1e-3
      && controls.target.distanceTo(view.target) < 1e-3
      && Math.abs(camera.fov - fov) < 1e-3;
    current = name;
    if (name !== 'tv') cancelDisc();
    if (name === 'home') turnBillboard(0);
    if (alreadyThere) {
      arrive(name); // e.g. switching channels: the TV stays on
      return;
    }
    showScreen(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  function setPage(name, html, { switching = false, boardFace = 1 } = {}) {
    const screen = screens[name];
    if (!screen) return;
    screen.scroller.innerHTML = html;
    screen.scroller.scrollTop = 0;
    if (name === 'billboard') turnBillboard(boardFace);
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
  const billboardSlats = [];
  const billboardResources = [];
  let billboardFace = 0;
  let billboardMotion = null;
  function turnBillboard(face) {
    if (face === billboardFace) return;
    billboardFace = face;
    const target = face * Math.PI * 2 / 3;
    if (reducedMotion || !billboardSlats.length) {
      billboardSlats.forEach(slat => { slat.rotation.y = target; });
      billboardMotion = null;
      return;
    }
    showScreen(null);
    billboardMotion = { start: performance.now(), from: billboardSlats.map(slat => slat.rotation.y), to: target };
  }

  function setBillboardAd({ brand = 'missing mar', name = '', role = '' } = {}) {
    const anchor = root.getObjectByName('screen_billboard');
    if (!anchor) return;
    const { width: boardWidth, height: boardHeight } = anchor.userData;
    const paint = document.createElement('canvas');
    paint.width = 1024;
    paint.height = 512;
    const context = paint.getContext('2d');
    const width = paint.width;
    const height = paint.height;
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
    const texture = new THREE.CanvasTexture(paint);
    texture.colorSpace = THREE.SRGBColorSpace;
    billboardResources.push(texture);
    const faceTextures = [texture];
    for (const title of [name.toUpperCase(), 'ПРАЙС']) {
      const sheet = document.createElement('canvas');
      sheet.width = 1024;
      sheet.height = 512;
      const ctx = sheet.getContext('2d');
      ctx.fillStyle = '#efe7d4';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#17181c';
      ctx.font = '900 88px "Arial Black", Arial, sans-serif';
      ctx.fillText(title, 60, 190, 900);
      ctx.font = '500 40px "IBM Plex Mono", monospace';
      ctx.fillText(title === 'ПРАЙС' ? 'Скоро здесь будет прайс на услуги' : role, 60, 300, 900);
      ctx.fillRect(60, 390, 900, 6);
      const map = new THREE.CanvasTexture(sheet);
      map.colorSpace = THREE.SRGBColorSpace;
      faceTextures.push(map);
      billboardResources.push(map);
    }
    const count = 24;
    const slatWidth = boardWidth / count;
    const radius = slatWidth / Math.sqrt(3);
    for (let index = 0; index < count; index += 1) {
      const slat = new THREE.Group();
      slat.position.set(-boardWidth / 2 + (index + 0.5) * slatWidth, 0, 0);
      slat.rotation.y = billboardFace * Math.PI * 2 / 3;
      for (let face = 0; face < 3; face += 1) {
        const map = faceTextures[face].clone();
        map.repeat.x = 1 / count;
        map.offset.x = index / count;
        map.needsUpdate = true;
        const material = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(slatWidth * 0.975, boardHeight), material);
        const angle = -face * Math.PI * 2 / 3;
        plane.position.set(Math.sin(angle) * radius / 2, 0, Math.cos(angle) * radius / 2);
        plane.rotation.y = angle;
        plane.name = 'hs_billboard';
        plane.receiveShadow = true;
        slat.add(plane);
        billboardResources.push(map, material, plane.geometry);
      }
      anchor.add(slat);
      billboardSlats.push(slat);
    }
    renderer.shadowMap.needsUpdate = true;
  }

  let down = null;
  canvas.addEventListener('pointerdown', event => {
    down = { x: event.clientX, y: event.clientY, lastX: event.clientX };
    canvas.setPointerCapture(event.pointerId);
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
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
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
  canvas.addEventListener('pointercancel', () => {
    down = null;
    if (current === 'rack' && rack) snapRack();
  });

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (flight) {
      focus(current, { instant: true });
      return;
    }
    if (screens[current] || current === 'home') {
      focus(current, { instant: true });
    } else {
      camera.fov = fitFov(presetLimits(current).fov, camera.aspect);
      camera.updateProjectionMatrix();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // Dev server only: handles for profiling from the console.
  if (import.meta.env?.DEV) window.__kiosk = { scene, renderer, composer, camera, controls, pick };

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
    if (billboardMotion) {
      let complete = true;
      billboardSlats.forEach((slat, index) => {
        const t = THREE.MathUtils.clamp((performance.now() - billboardMotion.start - index * 18) / 450, 0, 1);
        slat.rotation.y = THREE.MathUtils.lerp(billboardMotion.from[index], billboardMotion.to, easeInOutCubic(t));
        if (t < 1) complete = false;
      });
      if (complete) {
        billboardMotion = null;
        if (!flight && current === 'billboard') showScreen('billboard');
      }
    }
    if (movingDisc) {
      const t = Math.min((performance.now() - movingDisc.start) / FLIGHT_MS, 1);
      const k = easeInOutCubic(t);
      movingDisc.mesh.position.lerpVectors(movingDisc.from, movingDisc.to, k);
      movingDisc.mesh.position.y += Math.sin(Math.PI * k) * 0.55;
      movingDisc.mesh.quaternion.copy(camera.quaternion);
      if (t > 0.65) {
        const horizontal = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        movingDisc.mesh.quaternion.slerp(horizontal, (t - 0.65) / 0.35);
      }
      movingDisc.mesh.scale.setScalar(1 - Math.max(0, (t - 0.85) / 0.15));
      if (t === 1) cancelDisc();
    }
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
    setProjectArt,
    playDisc,
    cancelDisc,
    pageScroller: name => screens[name]?.scroller || null,
    setHits: hits => showOnly(/^slot_\d+$/, hits),
    setDiscs: discs => showOnly(/^disc_\d+$/, discs),
    dispose() {
      disposed = true;
      cancelDisc();
      artworkTextures.forEach(texture => texture.dispose());
      artworkMaterials.forEach(material => material.dispose());
      artworkPlanes.forEach(plane => plane.geometry.dispose());
      billboardResources.forEach(resource => resource.dispose());
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      screenLayer.remove();
    }
  };
}
