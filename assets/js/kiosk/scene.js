import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RACK_FACES } from './discs.js';
import { coverDescriptor, drawCover } from './covers.js';
import { lookDirection, turnLook } from './look.js';
import { quadTransform } from './quad.js';
import { walkingRoute } from './routes.js';
import { flightDuration, flightOrientation, flightProgress, prepareFlightOrientation } from './motion.js';
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
import { QUALITY, qualityTier, signTail, tvWarmUp } from './weather.js';
import { drawPosterWear } from './poster.js';
import { drawNeighbour } from './neighbours.js';
import { drawNotice, packNotices } from './notices.js';

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

// The kiosk's footprint in three.js coordinates (3 x 2 m, front at +z).
function withinWalls({ x, z }) {
  return Math.abs(x) < 1.5 && Math.abs(z) < 1.0;
}

function smoothstep(from, to, value) {
  const t = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
}

export async function createKioskScene({
  container,
  url,
  onProgress = () => {},
  onHover = () => {},
  onPick = () => {},
  onRackFace = () => {},
  onEmptyClick = () => {},
  onStreetClick = () => {},
  onArrive = () => {}
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
  // Retina at 2x costs four times the pixels for little visible gain here.
  const pixelRatio = Math.min(window.devicePixelRatio, quality.bloom ? 1.5 : 1.25);
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

  const waypoints = {};
  root.traverse(object => {
    if (object.name.startsWith('path_')) waypoints[object.name] = object.getWorldPosition(new THREE.Vector3()).toArray();
  });

  const screens = {};
  for (const [preset, anchorName] of Object.entries(SCREENS)) {
    const anchor = root.getObjectByName(anchorName);
    if (!anchor) continue;
    const turn = anchor.getWorldQuaternion(new THREE.Quaternion());
    const element = document.createElement('div');
    element.className = `screen-page screen-${preset}`;
    const scroller = document.createElement('div');
    scroller.className = 'screen-scroll';
    element.appendChild(scroller);
    screenLayer.appendChild(element);
    screens[preset] = {
      center: anchor.getWorldPosition(new THREE.Vector3()),
      normal: new THREE.Vector3(0, 0, 1).applyQuaternion(turn),
      right: new THREE.Vector3(1, 0, 0).applyQuaternion(turn),
      up: new THREE.Vector3(0, 1, 0).applyQuaternion(turn),
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

  // Hover and click rays only test what can be picked or can hide something
  // that can; heavy decoration (snow, goods, 3D lettering, trees) is skipped.
  // A ray against everything cost ~2.6 ms, on every mouse move.
  const DECOR = /^(ground_snow|snow_|roof_snow|rack_snow|terminal_snow|trees|buildings|power|wires|ad_\d|glass_tag|goods_fill|stock_|price_tags|window_|counter_|cat_(whisker|forehead|mouth|eye|nose|ear|left|right))|_(text|label|title)(_\d+)?$/;
  const pickTargets = [];
  root.traverse(object => {
    if (object.isMesh && !DECOR.test(object.name)) pickTargets.push(object);
  });

  // click areas (the back doorway) are picked but never drawn
  root.traverse(object => {
    if (object.isMesh && object.material.name.startsWith('hit_area')) object.material.visible = false;
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
        if (!material.emissive) continue;
        // a painted sheet already glows by its own picture: brighten it instead
        if (material.emissiveMap) material.emissiveIntensity = material.userData.glow * (key === name ? 2.4 : 1);
        else material.emissive.setHex(key === name ? HOVER : 0x000000);
      }
    }
  }

  function showOnly(pattern, entries) {
    const used = new Set(entries.map(entry => entry.node));
    root.traverse(object => {
      if (pattern.test(object.name)) object.visible = used.has(object.name);
    });
  }

  // «ТА» at the end of the sign is on tired bulbs (see signTail).
  let signTailMaterial = null;
  root.traverse(object => {
    if (object.isMesh && object.material.name === 'sign_glow_tail') signTailMaterial = object.material;
  });
  const signGlow = signTailMaterial?.emissiveIntensity ?? 0;
  const signColour = signTailMaterial?.color.clone();
  function burnSign(now) {
    if (!signTailMaterial || reducedMotion) return;
    const level = signTail(now);
    signTailMaterial.emissiveIntensity = signGlow * level;
    signTailMaterial.color.copy(signColour).multiplyScalar(0.35 + 0.65 * level);
  }

  // The cat breathes in its sleep and shivers a little when it purrs.
  const cat = root.getObjectByName('hs_cat');
  let purrUntil = 0;
  function purr() {
    purrUntil = performance.now() + 1900;
  }
  function breathe(now) {
    if (!cat || reducedMotion) return;
    const purring = now * 1000 < purrUntil;
    cat.scale.y = 1 + 0.012 * Math.sin(now * 1.9) + (purring ? 0.003 * Math.sin(now * 160) : 0);
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
  let insideLook = { yaw: 0, pitch: 0 };
  const insidePointers = new Map();
  let pinch = null;
  // Zoom inside eases towards its target instead of jumping per wheel notch.
  const ZOOM = [30, 80];
  let fovTarget = null;
  function zoomTo(fov) {
    fovTarget = THREE.MathUtils.clamp(fov, ...ZOOM);
  }
  function easeZoom(dt) {
    if (fovTarget === null) return;
    if (flight || current !== 'inside') {
      fovTarget = null;
      return;
    }
    camera.fov += (fovTarget - camera.fov) * (1 - Math.exp(-dt * 14));
    if (Math.abs(fovTarget - camera.fov) < 0.02) {
      camera.fov = fovTarget;
      fovTarget = null;
    }
    camera.updateProjectionMatrix();
  }

  function lookInside(dx, dy) {
    if (current !== 'inside' || flight) return;
    // zoomed in, the same drag turns the head less, so it stays controllable
    const scale = camera.fov / presetLimits('inside').fov;
    insideLook = turnLook(insideLook, dx * scale, dy * scale);
    controls.target.copy(camera.position).add(new THREE.Vector3(...lookDirection(insideLook)).multiplyScalar(1.8));
    camera.lookAt(controls.target);
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const names = raycaster.intersectObjects(pickTargets, false)
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
    movingDisc = { mesh, from, to, start: performance.now(), duration: flight ? flight.duration : FLIGHT_MS };
  }

  // A screen close-up: straight in front of the anchor, far enough back for
  // the whole screen to fit whatever the window shape.
  function screenView(name) {
    const screen = screens[name];
    if (!screen) return null;
    const distance = fitDistance(screen.width, screen.height, SCREEN_FOV, camera.aspect, SCREEN_FILL);
    return { position: screen.center.clone().addScaledVector(screen.normal, distance), target: screen.center.clone() };
  }

  // The page's size in pixels when the camera rests `distance` from it.
  function pagePixels(name, distance) {
    const screen = screens[name];
    const visible = 2 * distance * Math.tan(THREE.MathUtils.degToRad(SCREEN_FOV / 2));
    const height = Math.round((screen.height / visible) * container.clientHeight);
    return { width: Math.round(height * (screen.width / screen.height)), height };
  }

  // At rest the page covers exactly the screen's rectangle on the monitor.
  function sizeScreen(name) {
    const screen = screens[name];
    const { width, height } = pagePixels(name, camera.position.distanceTo(screen.center));
    Object.assign(screen.element.style, {
      width: `${width}px`,
      height: `${height}px`,
      left: `${Math.round((container.clientWidth - width) / 2)}px`,
      top: `${Math.round((container.clientHeight - height) / 2)}px`,
      transform: '',
      opacity: ''
    });
  }

  function showScreen(name, { landed = false } = {}) {
    for (const [key, screen] of Object.entries(screens)) {
      screen.element.classList.toggle('is-on', key === name);
      screen.element.classList.toggle('is-landed', key === name && landed);
      if (key !== name) screen.element.classList.remove('is-near');
    }
  }

  // While the camera walks up, the page already sits on the screen in
  // perspective, laid on its four projected corners at the size it will have
  // on arrival, and shows only when nothing stands between it and the eye.
  const corner = new THREE.Vector3();
  const sight = new THREE.Raycaster();
  function screenQuad(screen) {
    const quad = [];
    for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      corner.copy(screen.center)
        .addScaledVector(screen.right, x * screen.width / 2)
        .addScaledVector(screen.up, y * screen.height / 2)
        .project(camera);
      if (corner.z > 1 || corner.z < -1) return null;
      quad.push([(corner.x + 1) / 2 * container.clientWidth, (1 - corner.y) / 2 * container.clientHeight]);
    }
    return quad;
  }

  function inSight(name) {
    const screen = screens[name];
    const toEye = camera.position.clone().sub(screen.center);
    if (toEye.dot(screen.normal) <= 0) return false;
    const distance = toEye.length();
    sight.set(camera.position, toEye.negate().normalize());
    sight.far = distance - 0.03;
    const hit = sight.intersectObjects(pickTargets, false).find(entry => isShown(entry.object)
      && !entry.object.material?.transparent);
    return !hit || allowedIn(name, pickableNameOf(hit.object));
  }

  function layPage(name, opacity) {
    const screen = screens[name];
    const quad = opacity > 0.01 ? screenQuad(screen) : null;
    const element = screen.element;
    if (!quad) {
      element.classList.remove('is-near');
      return;
    }
    const { width, height } = screen.landing;
    Object.assign(element.style, {
      width: `${width}px`,
      height: `${height}px`,
      left: '0px',
      top: '0px',
      transform: `matrix3d(${quadTransform(width, height, quad).join(',')})`,
      opacity: String(opacity)
    });
    element.classList.add('is-near');
  }

  function applyLimits(name) {
    const limits = presetLimits(name);
    controls.enabled = !limits.locked && !limits.lookAround;
    if (limits.lookAround) {
      const direction = controls.target.clone().sub(camera.position).normalize();
      insideLook = { yaw: Math.atan2(direction.x, direction.z), pitch: Math.asin(direction.y) };
      return;
    }
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

  function arrive(name, { landed = false } = {}) {
    applyLimits(name);
    onArrive(name);
    if (screens[name]) {
      sizeScreen(name);
      if (name !== 'billboard' || !billboardMotion) showScreen(name, { landed });
    }
  }

  let flight = null;
  const destinationCamera = new THREE.PerspectiveCamera();

  // Flies to a view; walks round through the back door when the move
  // crosses the walls. `name` is the preset that takes over on arrival.
  function fly(name, view, fov) {
    // cut in mid-walk: what counts is where the camera is, not where it was going
    const leaving = flight ? (withinWalls(camera.position) ? 'inside' : 'home') : current;
    controls.enabled = false;
    const route = walkingRoute({
      from: leaving,
      to: name,
      fromPosition: camera.position.toArray(),
      toPosition: view.position.toArray(),
      waypoints
    });
    const from = camera.position.clone();
    let curve = null;
    let length = from.distanceTo(view.position);
    if (route.length) {
      curve = new THREE.CatmullRomCurve3([from, ...route.map(point => new THREE.Vector3(...waypoints[point])), view.position.clone()],
        false, 'centripetal');
      length = curve.getLength();
    }
    const duration = flightDuration(length, Boolean(curve));
    destinationCamera.position.copy(view.position);
    destinationCamera.lookAt(view.target);
    const page = screens[name] ? name : null;
    if (page) screens[page].landing = pagePixels(page, view.position.distanceTo(screens[page].center));
    flight = {
      name,
      start: performance.now(),
      duration,
      from,
      fromTarget: controls.target.clone(),
      fromRotation: camera.quaternion.clone(),
      toRotation: destinationCamera.quaternion.clone(),
      fromFov: camera.fov,
      to: view.position,
      toTarget: view.target,
      toFov: fov,
      curve,
      page,
      // the page you leave fades off its screen as you step back
      leavingPage: screens[leaving] && leaving !== name && leaving !== 'billboard' ? leaving : null
    };
    prepareFlightOrientation(flight);
  }

  function focus(name, { instant = false } = {}) {
    let view = screenView(name) || presets[name];
    if (!view) return;
    if (name === 'home') {
      const scale = overviewScale(presetLimits(name).fov, camera.aspect);
      view = { target: view.target, position: view.position.clone().sub(view.target).multiplyScalar(scale).add(view.target) };
    }
    const fov = screens[name] ? SCREEN_FOV : fitFov(presetLimits(name).fov, camera.aspect);
    travel(name, view, fov, { instant });
  }

  function travel(name, view, fov, { instant = false, look = null } = {}) {
    const alreadyThere = !flight && name === current
      && camera.position.distanceTo(view.position) < 1e-3
      && controls.target.distanceTo(view.target) < 1e-3
      && Math.abs(camera.fov - fov) < 1e-3;
    insidePointers.clear();
    pinch = null;
    if (name !== 'tv') cancelDisc();
    if (name !== 'billboard') turnBillboard(0);
    if (alreadyThere) {
      current = name;
      arrive(name); // e.g. switching channels: the TV stays on
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant || reduced) {
      showScreen(null);
      current = name;
      flight = null;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.copy(view.position);
      controls.target.copy(view.target);
      camera.lookAt(controls.target);
      arrive(name);
      if (look) insideLook = { ...look };
      return;
    }
    const leavingPage = screens[current] && current !== name ? current : null;
    if (!leavingPage) showScreen(null);
    fly(name, view, fov);
    current = name;
    if (leavingPage) {
      screens[leavingPage].landing = pagePixels(leavingPage, camera.position.distanceTo(screens[leavingPage].center));
      screens[leavingPage].element.classList.remove('is-on', 'is-landed');
    }
  }

  // Where the camera stands now, to come back to after a close-up.
  function snapshot() {
    return {
      preset: current,
      position: camera.position.clone(),
      target: controls.target.clone(),
      fov: camera.fov,
      look: { ...insideLook }
    };
  }

  function restore(saved) {
    travel(saved.preset, { position: saved.position.clone(), target: saved.target.clone() }, saved.fov, { look: saved.look });
  }

  // Position and target along a flight at eased progress k.
  const flightDirection = new THREE.Vector3();
  function flightPose(k) {
    if (flight.curve) flight.curve.getPointAt(k, camera.position);
    else camera.position.lerpVectors(flight.from, flight.to, k);
    flightOrientation(flight, k, camera.position, camera.quaternion);
    // Keep a useful orbit target without making it drive the turn itself.
    const distance = THREE.MathUtils.lerp(
      flight.from.distanceTo(flight.fromTarget), flight.to.distanceTo(flight.toTarget), k);
    flightDirection.set(0, 0, -1).applyQuaternion(camera.quaternion);
    controls.target.copy(camera.position).addScaledVector(flightDirection, Math.max(.25, distance));
    if (k === 1) controls.target.copy(flight.toTarget);
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
  function paintAnchor(name, draw, { transparent = true, lit = false, glow = 0, pickAs = '' } = {}) {
    const anchor = root.getObjectByName(name);
    if (!anchor) return null;
    const { width, height } = anchor.userData;
    const paint = document.createElement('canvas');
    paint.width = 1024;
    paint.height = Math.round(1024 * (height / width));
    draw(paint.getContext('2d'), paint.width, paint.height);
    const texture = new THREE.CanvasTexture(paint);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = lit
      ? new THREE.MeshStandardMaterial({ map: texture, transparent, roughness: 0.9,
        ...(glow && { emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: glow }) })
      : new THREE.MeshBasicMaterial({ map: texture, transparent });
    material.userData.glow = glow;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.name = pickAs || `${name}_paint`;
    plane.position.z = 0.002;
    plane.receiveShadow = true;
    anchor.add(plane);
    if (pickAs) {
      if (!highlight.has(pickAs)) highlight.set(pickAs, []);
      highlight.get(pickAs).push(material);
      pickTargets.push(plane);
    }
    renderer.shadowMap.needsUpdate = true;
    return plane;
  }

  // A printed sheet on a shutter (flyer, price list), lit like paper. The
  // page laid over it in a close-up has the same layout.
  function paintSheet(name, draw, pickAs) {
    // only a touch of glow, as if a little of the street light caught it
    return paintAnchor(name, draw, { transparent: false, lit: true, glow: 0.08, pickAs });
  }

  // Paint sprayed on a wall: lit like the wall, see-through around it.
  function paintDecal(name, draw, glow = 0) {
    const plane = paintAnchor(name, draw, { transparent: true, lit: true, glow });
    if (plane) {
      plane.material.depthWrite = false;
      plane.material.polygonOffset = true;
      plane.material.polygonOffsetFactor = -2;
    }
    return plane;
  }

  // The small notices all over the shutters: one atlas, one mesh, paper lit
  // like the shutter paint (call once the fonts are in).
  const noticeResources = [];
  function paintNotices() {
    const anchors = [];
    root.traverse(object => {
      if (object.name.startsWith('shutter_notice_')) anchors.push(object);
    });
    if (!anchors.length) return;
    const { width, height, cells } = packNotices(anchors.map(anchor => anchor.userData));
    const sheet = document.createElement('canvas');
    sheet.width = width;
    sheet.height = height;
    const context = sheet.getContext('2d');
    anchors.forEach((anchor, index) => {
      const cell = cells[index];
      context.save();
      context.translate(cell.x, cell.y);
      drawNotice(context, cell.w, cell.h, anchor.userData.design ?? index, { torn: Boolean(anchor.userData.torn), seed: index + 3 });
      context.restore();
    });
    const texture = new THREE.CanvasTexture(sheet);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const positions = [];
    const uvs = [];
    const indices = [];
    const corner = new THREE.Vector3();
    anchors.forEach((anchor, index) => {
      const { width: w, height: h } = anchor.userData;
      const cell = cells[index];
      const [u0, u1] = [cell.x / width, (cell.x + cell.w) / width];
      const [v0, v1] = [1 - (cell.y + cell.h) / height, 1 - cell.y / height];
      anchor.updateWorldMatrix(true, false);
      const base = positions.length / 3;
      for (const [x, y, u, v] of [[-w / 2, h / 2, u0, v1], [w / 2, h / 2, u1, v1], [w / 2, -h / 2, u1, v0], [-w / 2, -h / 2, u0, v0]]) {
        corner.set(x, y, 0.002).applyMatrix4(anchor.matrixWorld);
        positions.push(corner.x, corner.y, corner.z);
        uvs.push(u, v);
      }
      indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.92,
      emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.06 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'shutter_notices';
    mesh.receiveShadow = true;
    scene.add(mesh);
    noticeResources.push(texture, geometry, material);
    renderer.shadowMap.needsUpdate = true;
  }

  // The TV is dark until someone steps into the kiosk, then it blinks and
  // comes on by itself with the channel list.
  let tvPicture = null;
  let tvOnSince = null;
  function setTvPicture(draw) {
    tvPicture = paintAnchor('screen_tv', draw, { transparent: false, pickAs: 'hs_tv' });
    if (tvPicture) tvPicture.material.color.setScalar(0.03);
  }
  function updateTv(now) {
    if (!tvPicture) return;
    const inKiosk = withinWalls(camera.position);
    if (!inKiosk) tvOnSince = null;
    else tvOnSince ??= now;
    const level = tvOnSince === null ? 0 : reducedMotion ? 1 : tvWarmUp(now - tvOnSince);
    tvPicture.material.color.setScalar(0.03 + 1.2 * level);
  }

  // From inside, a click that lands on the street (through the door, the
  // window, past the grille) means "out".
  function towardStreet(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(root, true).find(entry => isShown(entry.object)
      && !entry.object.material?.transparent && entry.object.name !== 'kiosk_grille');
    return !hit || !withinWalls(hit.point);
  }

  function setWallText(lines) {
    if (!lines.length) return;
    paintAnchor('wall_contacts', (context, width, height) => {
      const lineHeight = height / (lines.length + 0.4);
      context.fillStyle = '#121418';
      context.textBaseline = 'top';
      // the whole address has to fit on the wall, gmail.com included
      let size = Math.round(lineHeight * 0.72);
      const fits = () => lines.every((line, index) => {
        context.font = `${index === 0 ? 700 : 500} ${size}px "IBM Plex Mono", monospace`;
        return context.measureText(line).width <= width - 72;
      });
      while (size > 12 && !fits()) size -= 2;
      lines.forEach((line, index) => {
        context.save();
        context.translate(36, 18 + index * lineHeight);
        context.rotate(-0.025 + index * 0.012);
        context.font = `${index === 0 ? 700 : 500} ${size}px "IBM Plex Mono", monospace`;
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

  // The three printed faces of the billboard: the ad, the about poster and
  // the price sheet, in the same newsprint and type as the pages on it.
  function drawPoster(context, width, height, { headline, bar, line, big = false }) {
    context.fillStyle = '#ece4d0';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#d0281e';
    context.lineWidth = 10;
    context.strokeRect(14, 14, width - 28, height - 28);
    context.fillStyle = '#1b1a17';
    context.textBaseline = 'alphabetic';
    context.font = `700 ${Math.round(height * (big ? 0.3 : 0.22))}px "PT Sans Narrow", "Arial Narrow", Arial, sans-serif`;
    context.fillText(headline, width * 0.06, height * (big ? 0.44 : 0.4), width * 0.88);
    if (bar) {
      context.font = `700 ${Math.round(height * 0.075)}px "PT Sans Narrow", Arial, sans-serif`;
      const barWidth = Math.min(context.measureText(bar).width + width * 0.04, width * 0.88);
      context.fillStyle = '#d0281e';
      context.fillRect(width * 0.06, height * 0.5, barWidth, height * 0.11);
      context.fillStyle = '#fff';
      context.fillText(bar, width * 0.08, height * 0.585, width * 0.84);
    }
    context.fillStyle = '#1b1a17';
    context.fillRect(width * 0.06, height * 0.72, width * 0.88, height * 0.012);
    context.font = `400 ${Math.round(height * 0.07)}px "PT Sans", Arial, sans-serif`;
    context.fillText(line, width * 0.06, height * 0.84, width * 0.88);
  }

  function setBillboardAd({ brand = 'missing mar', name = '', role = '' } = {}) {
    const anchor = root.getObjectByName('screen_billboard');
    if (!anchor) return;
    const { width: boardWidth, height: boardHeight } = anchor.userData;
    const wear = document.createElement('canvas');
    wear.width = 1024;
    wear.height = 512;
    drawPosterWear(wear.getContext('2d'), wear.width, wear.height);
    // The readable page has the same paper grain and wear as the 3D print.
    screens.billboard.element.style.setProperty('--billboard-wear', `url("${wear.toDataURL()}")`);
    const faces = [
      { headline: brand, bar: name.toUpperCase(), line: `${role} · Обо мне →`, big: true },
      { headline: name.toUpperCase(), bar: role.toUpperCase(), line: 'Ищу работу. Подробности — на щите.' },
      { headline: 'ПРАЙС', bar: 'ДИЗАЙН У МАРА · УСЛУГИ', line: 'Скоро здесь будет прайс на услуги.' }
    ];
    const faceTextures = faces.map(face => {
      const sheet = document.createElement('canvas');
      sheet.width = 1024;
      sheet.height = 512;
      const context = sheet.getContext('2d');
      drawPoster(context, sheet.width, sheet.height, face);
      context.globalCompositeOperation = 'multiply';
      context.drawImage(wear, 0, 0);
      context.globalCompositeOperation = 'source-over';
      const map = new THREE.CanvasTexture(sheet);
      map.colorSpace = THREE.SRGBColorSpace;
      billboardResources.push(map);
      return map;
    });
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
  let hoverAt = null;
  canvas.addEventListener('pointerdown', event => {
    down = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, dragged: false };
    if (current === 'inside') {
      insidePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (insidePointers.size === 2) {
        const [a, b] = [...insidePointers.values()];
        pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), fov: camera.fov };
        down.dragged = true;
      }
    }
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // a pointer the browser no longer tracks: carry on without capture
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (down && current === 'inside' && !flight) {
      insidePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && insidePointers.size === 2) {
        const [a, b] = [...insidePointers.values()];
        const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        zoomTo(pinch.fov * pinch.distance / distance);
        down.dragged = true;
      } else {
        lookInside(event.clientX - down.lastX, event.clientY - down.lastY);
      }
      down.lastX = event.clientX;
      down.lastY = event.clientY;
      return;
    }
    if (down && current === 'rack' && rack) {
      rack.rotation.y += (event.clientX - down.lastX) * 0.01;
      rackTarget = rack.rotation.y;
      down.lastX = event.clientX;
      return;
    }
    if (event.pointerType !== 'mouse' || event.buttons) return;
    hoverAt = { x: event.clientX, y: event.clientY };   // picked once per frame
  });
  canvas.addEventListener('pointerleave', () => {
    hoverAt = null;
    setHovered(null);
    onHover(null, 0, 0);
  });
  canvas.addEventListener('pointerup', event => {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    insidePointers.delete(event.pointerId);
    if (current === 'inside' && insidePointers.size === 1) {
      const point = [...insidePointers.values()][0];
      down = { x: point.x, y: point.y, lastX: point.x, lastY: point.y, dragged: true };
      pinch = null;
      return;
    }
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    const dragged = down.dragged;
    down = null;
    pinch = null;
    if (flight) return;
    if (moved > 6 || dragged) {
      if (current === 'rack' && rack) snapRack();
      return;
    }
    const name = pick(event.clientX, event.clientY);
    if (name) onPick(name);
    else if (!flight && (presetLimits(current).locked || current === 'showcase')) onEmptyClick();
    else if (!flight && current === 'inside' && towardStreet(event.clientX, event.clientY)) onStreetClick();
  });
  canvas.addEventListener('pointercancel', () => {
    down = null;
    insidePointers.clear();
    pinch = null;
    if (current === 'rack' && rack) snapRack();
  });
  canvas.addEventListener('wheel', event => {
    if (current !== 'inside' || flight) return;
    event.preventDefault();
    // lines or pixels, mouse notch or trackpad pinch (ctrlKey): same feel
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    zoomTo((fovTarget ?? camera.fov) * Math.exp(delta * (event.ctrlKey ? 0.006 : 0.0012)));
  }, { passive: false });

  function applySize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // If frames keep running slow (median over two seconds), step the
  // resolution down, and at the very end drop the glow. Never steps back up,
  // so it can't oscillate. A hidden or throttled tab is not a slow one.
  const ratios = [pixelRatio, 1.25, 1, 0.85].filter((ratio, index, all) => ratio <= pixelRatio && all.indexOf(ratio) === index);
  let ratioStep = 0;
  const frameTimes = [];
  function keepFrameRate(ms) {
    if (ms <= 0 || ms > 250 || document.hidden) return;
    frameTimes.push(ms);
    if (frameTimes.length < 120) return;
    const median = frameTimes.sort((a, b) => a - b)[60];
    frameTimes.length = 0;
    if (median < 24) return;
    if (ratioStep < ratios.length - 1) {
      ratioStep += 1;
      renderer.setPixelRatio(ratios[ratioStep]);
      composer.setPixelRatio(ratios[ratioStep]);
      applySize();
    } else if (composer.bloom) {
      composer.removePass(composer.bloom);
      composer.bloom.dispose();
      composer.bloom = null;
    }
  }

  const resize = () => {
    applySize();
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


  const carried = new THREE.Vector3();
  const discHeading = new THREE.Vector3();
  const side = new THREE.Vector3();
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  let lastFrame = 0;
  const frame = () => {
    if (flight) {
      const t = Math.min((performance.now() - flight.start) / flight.duration, 1);
      const k = flightProgress(t);
      flightPose(k);
      camera.fov = THREE.MathUtils.lerp(flight.fromFov, flight.toFov, k);
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      if (flight.leavingPage) layPage(flight.leavingPage, 1 - smoothstep(0, 0.35, t));
      if (flight.page && !(flight.page === 'billboard' && billboardMotion)) {
        // fades in late in the flight, and only from the moment the screen
        // comes into sight (a walk round the back sees it at the doorway)
        flight.frames = (flight.frames || 0) + 1;
        if (flight.frames % 3 === 1) flight.inSight = t > 0.5 && inSight(flight.page);
        const seen = t > 0.5 && flight.inSight;
        if (!seen) flight.seenAt = null;
        else flight.seenAt ??= performance.now();
        const opacity = seen ? Math.min(smoothstep(0.5, 0.92, t), smoothstep(0, 380, performance.now() - flight.seenAt)) : 0;
        layPage(flight.page, opacity);
      }
      if (t === 1) {
        const { name, page, leavingPage } = flight;
        flight = null;
        if (leavingPage) layPage(leavingPage, 0);
        arrive(name, { landed: page === name && screens[name]?.element.classList.contains('is-near') });
        screens[name]?.element.classList.remove('is-near');
      }
    } else if (controls.enabled) {
      controls.update();
    }
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
      // The disc hops off the rack into your hand, rides along in front of
      // you round the kiosk and drops into the player as you reach the TV.
      const t = Math.min((performance.now() - movingDisc.start) / movingDisc.duration, 1);
      const carry = carried.copy(camera.position)
        .addScaledVector(camera.getWorldDirection(discHeading), 0.7)
        .addScaledVector(side.set(1, 0, 0).applyQuaternion(camera.quaternion), 0.14)
        .addScaledVector(camera.up, -0.2);
      const disc = movingDisc.mesh;
      disc.position.lerpVectors(movingDisc.from, carry, smoothstep(0, 0.2, t));
      disc.position.y += Math.sin(Math.PI * Math.min(t / 0.2, 1)) * 0.25;
      disc.position.lerp(movingDisc.to, smoothstep(0.78, 1, t));
      disc.quaternion.copy(camera.quaternion);
      if (t > 0.78) disc.quaternion.slerp(flat, smoothstep(0.78, 0.95, t));
      disc.rotateZ(t * 9);
      // small in the hand so it doesn't fill the view, full size again in the tray
      const inHand = smoothstep(0.08, 0.2, t) - smoothstep(0.78, 0.92, t);
      disc.scale.setScalar((1 - 0.5 * inHand) * (1 - smoothstep(0.92, 1, t)));
      if (t === 1) cancelDisc();
    }
    if (hoverAt && !flight) {
      const { x, y } = hoverAt;
      hoverAt = null;
      const name = pick(x, y);
      setHovered(name);
      onHover(name, x, y);
    }
    const now = performance.now() / 1000;
    const elapsed = now - (lastFrame || now);
    keepFrameRate(elapsed * 1000);
    easeZoom(Math.min(elapsed, 0.1));
    const dt = Math.min(elapsed, 0.1);
    if (rack) rack.rotation.y += (rackTarget - rack.rotation.y) * (1 - Math.exp(-elapsed * 10));
    updateTv(performance.now());
    breathe(performance.now() / 1000);
    burnSign(performance.now() / 1000);
    lastFrame = now;
    sky.position.copy(camera.position);
    snow.update(dt, now);
    if (!reducedMotion) flicker(flickering, now);
    composer.render();
  };
  renderer.setAnimationLoop(frame);

  // Dev server only: handles for profiling from the console; `frame` steps
  // the loop by hand when the tab is hidden and the browser stops drawing.
  if (import.meta.env?.DEV) window.__kiosk = { scene, renderer, composer, camera, controls, pick, frame,
    get inFlight() { return Boolean(flight); }, get current() { return current; } };

  // neighbours at two lit windows across the street
  for (const pose of ['smoking', 'looking']) {
    paintAnchor(`window_person_${pose}`, (context, width, height) => drawNeighbour(context, width, height, pose));
  }

  // Compile every shader and upload every texture now, behind the loading
  // screen, so the first walk into the kiosk or up to a screen doesn't stall
  // on materials the camera hasn't seen yet.
  const textures = new Set();
  scene.traverse(object => {
    for (const material of [].concat(object.material || [])) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => renderer.initTexture(texture));
  await renderer.compileAsync(scene, camera).catch(() => {});

  return {
    focus,
    paintSheet,
    paintNotices,
    paintDecal,
    setTvPicture,
    purr,
    snapshot,
    restore,
    spinRack,
    lookInside,
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
      noticeResources.forEach(resource => resource.dispose());
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      screenLayer.remove();
    }
  };
}
