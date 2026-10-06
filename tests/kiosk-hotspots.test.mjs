import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOTSPOTS,
  PRESETS,
  ROUTE_PRESETS,
  hotspotForNode,
  fitFov,
  isPickable,
  pickHotspot,
  presetLimits
} from '../assets/js/kiosk/hotspots.js';

const placed = [
  { slot: 'slot_0', projectId: 'kortex', title: 'KORTEX', product: 'box' },
  { slot: 'slot_1', projectId: 'учи ру', title: 'УЧИ.РУ', product: 'box' }
];

test('a slot behind the see-through showcase glass wins over the glass', () => {
  assert.equal(pickHotspot(['hs_showcase', 'slot_1']), 'slot_1');
});

test('the glass itself is picked when nothing pickable is behind it', () => {
  assert.equal(pickHotspot(['hs_showcase', 'kiosk_wall_back']), 'hs_showcase');
});

test('an opaque object in front blocks everything behind it', () => {
  assert.equal(pickHotspot(['kiosk_front_lower', 'hs_flyer']), null);
  assert.equal(pickHotspot([]), null);
  assert.equal(pickHotspot(['hs_terminal']), 'hs_terminal');
});

test('recognises hotspot and slot node names only', () => {
  assert.equal(isPickable('hs_flyer'), true);
  assert.equal(isPickable('slot_7'), true);
  assert.equal(isPickable('terminal_screen'), false);
  assert.equal(isPickable(''), false);
});

test('slots resolve to their project route, empty slots to nothing', () => {
  assert.deepEqual(hotspotForNode('slot_1', placed), {
    label: 'УЧИ.РУ',
    action: { type: 'route', hash: '#project/%D1%83%D1%87%D0%B8%20%D1%80%D1%83' }
  });
  assert.equal(hotspotForNode('slot_5', placed), null);
  assert.equal(hotspotForNode('hs_flyer', placed).label, 'Обо мне');
  assert.equal(hotspotForNode('prop_chair', placed), null);
});

test('every route view and every focus action points at a known camera preset', () => {
  for (const view of ['home', 'project', 'about', 'contact', 'page', 'catalog', 'price']) {
    assert.ok(PRESETS.includes(ROUTE_PRESETS[view]), view);
  }
  for (const spot of Object.values(HOTSPOTS)) {
    if (spot.action.type === 'focus') assert.ok(PRESETS.includes(spot.action.preset), spot.action.preset);
  }
});

test('inside the kiosk the camera is held much closer than outside', () => {
  assert.ok(presetLimits('inside').maxDistance < presetLimits('home').minDistance * 2);
  assert.equal(presetLimits('showcase'), presetLimits('home'));
  assert.ok(presetLimits('home').maxPolarAngle < Math.PI / 2);
});

test('inside the kiosk the lens is wider so the cramped room reads', () => {
  assert.ok(presetLimits('inside').fov > presetLimits('home').fov);
});

test('a portrait screen widens the lens so the kiosk still fits across', () => {
  assert.equal(fitFov(40, 1.6), 40);
  assert.equal(fitFov(40, 2.4), 40);
  const portrait = fitFov(40, 390 / 844);
  assert.ok(portrait > 60 && portrait <= 90, String(portrait));
});
