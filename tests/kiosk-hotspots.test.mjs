import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOTSPOTS,
  PRESETS,
  ROUTE_PRESETS,
  fitFov,
  hotspotForNode,
  isPickable,
  pickHotspot,
  presetLimits
} from '../assets/js/kiosk/hotspots.js';

const hits = [{ node: 'slot_0', projectId: 'kortex', title: 'KORTEX' }];
const discs = [
  { node: 'disc_0', projectId: 'kortex', title: 'KORTEX', face: 0 },
  { node: 'disc_9', projectId: 'учи ру', title: 'УЧИ.РУ', face: 1 }
];

test('a slot or disc behind the see-through showcase glass wins over the glass', () => {
  assert.equal(pickHotspot(['hs_showcase', 'slot_0']), 'slot_0');
  assert.equal(pickHotspot(['hs_showcase', 'disc_9']), 'disc_9');
});

test('the glass itself is picked when nothing pickable is behind it', () => {
  assert.equal(pickHotspot(['hs_showcase', 'kiosk_wall_back']), 'hs_showcase');
});

test('an opaque object in front blocks everything behind it', () => {
  assert.equal(pickHotspot(['kiosk_front_lower', 'hs_flyer']), null);
  assert.equal(pickHotspot([]), null);
  assert.equal(pickHotspot(['hs_terminal']), 'hs_terminal');
});

test('the window grille never blocks what is behind it', () => {
  assert.equal(pickHotspot(['kiosk_grille', 'hs_showcase', 'slot_0']), 'slot_0');
  assert.equal(pickHotspot(['kiosk_grille', 'hs_flyer']), 'hs_flyer');
  assert.equal(pickHotspot(['kiosk_grille']), null);
});

test('recognises hotspot, slot and disc node names only', () => {
  assert.equal(isPickable('hs_rack'), true);
  assert.equal(isPickable('slot_7'), true);
  assert.equal(isPickable('disc_31'), true);
  assert.equal(isPickable('terminal_screen'), false);
  assert.equal(isPickable(''), false);
});

test('hits and discs open their project, empty pockets nothing', () => {
  const route = '#project/%D1%83%D1%87%D0%B8%20%D1%80%D1%83';
  assert.deepEqual(hotspotForNode('disc_9', { hits, discs }), { label: 'УЧИ.РУ', action: { type: 'route', hash: route } });
  assert.equal(hotspotForNode('slot_0', { hits, discs }).action.hash, '#project/kortex');
  assert.equal(hotspotForNode('disc_3', { hits, discs }), null);
  assert.equal(hotspotForNode('slot_5', { hits, discs }), null);
  assert.equal(hotspotForNode('hs_rack').action.preset, 'rack');
  assert.equal(hotspotForNode('hs_billboard').action.hash, '#about');
  assert.equal(hotspotForNode('prop_chair'), null);
});

test('every route view and every focus action points at a known camera preset', () => {
  for (const view of ['home', 'project', 'about', 'contact', 'page', 'catalog', 'price']) {
    assert.ok(PRESETS.includes(ROUTE_PRESETS[view]), view);
  }
  for (const spot of Object.values(HOTSPOTS)) {
    if (spot.action.type === 'focus') assert.ok(PRESETS.includes(spot.action.preset), spot.action.preset);
  }
  assert.equal(ROUTE_PRESETS.project, 'tv');
  assert.equal(ROUTE_PRESETS.about, 'billboard');
});

test('close-ups lock the camera, the overview and the inside do not', () => {
  for (const preset of ['rack', 'tv', 'billboard', 'terminal']) assert.equal(presetLimits(preset).locked, true, preset);
  for (const preset of ['home', 'showcase', 'inside']) assert.ok(!presetLimits(preset).locked, preset);
  assert.equal(presetLimits('showcase'), presetLimits('home'));
});

test('inside the kiosk the camera is held close and the lens is wider', () => {
  assert.ok(presetLimits('inside').maxDistance < presetLimits('home').minDistance * 2);
  assert.ok(presetLimits('inside').fov > presetLimits('home').fov);
  assert.ok(presetLimits('home').maxPolarAngle < Math.PI / 2);
});

test('a portrait screen widens the lens so the kiosk still fits across', () => {
  assert.equal(fitFov(40, 1.6), 40);
  assert.equal(fitFov(40, 2.4), 40);
  const portrait = fitFov(40, 390 / 844);
  assert.ok(portrait > 60 && portrait <= 90, String(portrait));
});
