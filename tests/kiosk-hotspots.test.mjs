import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOTSPOTS,
  LOCKED_PRESETS,
  PRESETS,
  ROUTE_PRESETS,
  SCREENS,
  allowedIn,
  fitDistance,
  fitFov,
  overviewScale,
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

test('portrait overview keeps the kiosk large and backs off on very tall screens', () => {
  assert.equal(overviewScale(40, 1.6), 1);
  assert.equal(overviewScale(40, 1.2), 1);
  assert.ok(overviewScale(40, 390 / 844) <= 1.1);
  assert.ok(overviewScale(40, 280 / 1000) > 1.5);
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
  for (const view of ['home', 'project', 'about', 'contact', 'page', 'catalog']) {
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

test('inside offers a fixed-eye full look-around rather than a restricted orbit', () => {
  assert.equal(presetLimits('inside').lookAround, true);
  assert.equal(presetLimits('inside').azimuthSpan, undefined);
  assert.equal(HOTSPOTS.hs_showcase.label, 'Витрина');
  assert.equal(HOTSPOTS.hs_rack.label, 'Все проекты');
});

test('a portrait screen widens the lens so the kiosk still fits across', () => {
  assert.equal(fitFov(40, 1.6), 40);
  assert.equal(fitFov(40, 2.4), 40);
  const portrait = fitFov(40, 390 / 844);
  assert.ok(portrait > 60 && portrait <= 90, String(portrait));
});

test('a close-up only answers to its own object', () => {
  assert.equal(allowedIn('rack', 'disc_4'), true);
  assert.equal(allowedIn('rack', 'hs_rack'), true);
  assert.equal(allowedIn('rack', 'hs_showcase'), false);
  assert.equal(allowedIn('tv', 'hs_tv'), true);
  assert.equal(allowedIn('tv', 'hs_radio'), false);
  assert.equal(allowedIn('billboard', 'hs_billboard'), true);
  assert.equal(allowedIn('terminal', 'hs_flyer'), false);
  assert.equal(allowedIn('home', 'hs_showcase'), true);
  assert.equal(allowedIn('inside', 'disc_0'), true);
});

test('every screen is a locked close-up with a camera preset', () => {
  for (const preset of Object.keys(SCREENS)) {
    assert.ok(PRESETS.includes(preset), preset);
    assert.ok(LOCKED_PRESETS.includes(preset), preset);
  }
  assert.equal(SCREENS.flyer, 'screen_flyer');
});

test('no price anywhere: it put people off writing', () => {
  assert.equal(ROUTE_PRESETS.price, undefined);
  assert.equal(ROUTE_PRESETS.pricelist, undefined);
  assert.equal(SCREENS.price, undefined);
  assert.ok(!PRESETS.includes('price') && !LOCKED_PRESETS.includes('price'));
  assert.equal(hotspotForNode('hs_pricelist'), null);
});

test('the whole back doorway is a way in, not just the door leaf', () => {
  assert.equal(hotspotForNode('hs_doorway').action.preset, 'inside');
  assert.equal(hotspotForNode('hs_backdoor').action.preset, 'inside');
});

test('in front of the showcase only the projects answer; a click beside steps back', () => {
  assert.equal(allowedIn('showcase', 'slot_0'), true);
  assert.equal(allowedIn('showcase', 'hs_showcase'), false);
  assert.equal(allowedIn('showcase', 'hs_flyer'), false);
});

test('contacts live on the flyer, the terminal is a place to walk to', () => {
  assert.equal(ROUTE_PRESETS.contact, 'flyer');
  assert.equal(hotspotForNode('hs_flyer').action.hash, '#contact');
  assert.deepEqual(hotspotForNode('hs_terminal').action, { type: 'focus', preset: 'terminal' });
  assert.equal(allowedIn('flyer', 'hs_flyer'), true);
  assert.equal(allowedIn('flyer', 'hs_showcase'), false);
});

test('the camera backs off just enough for a screen to fit', () => {
  assert.ok(Math.abs(fitDistance(0.32, 0.24, 40, 1.6) - 0.3297) < 0.001);   // height-bound
  assert.ok(Math.abs(fitDistance(0.32, 0.24, 40, 0.5) - 0.8792) < 0.001);   // width-bound
  assert.ok(Math.abs(fitDistance(0.32, 0.24, 40, 1.6, 0.5) - 0.6594) < 0.001);
});
