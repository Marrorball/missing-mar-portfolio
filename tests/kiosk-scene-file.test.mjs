import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { POCKETS_PER_FACE, RACK_FACES } from '../assets/js/kiosk/discs.js';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function gltf() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

const names = () => new Set(gltf().nodes.map(node => node.name));

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const all = names();
  for (const node of Object.keys(HOTSPOTS)) assert.ok(all.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(all.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(all.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(all.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the rack holds a disc in every pocket and the player sits under the TV', () => {
  const all = names();
  for (const node of ['dvd_rack', 'hs_rack', 'dvd_player', 'tv_screen', 'terminal_screen']) assert.ok(all.has(node), node);
  for (let index = 0; index < RACK_FACES * POCKETS_PER_FACE; index += 1) assert.ok(all.has(`disc_${index}`), `disc_${index}`);
});

test('screens carry their size for the in-scene pages', () => {
  const nodes = gltf().nodes;
  for (const name of ['screen_tv', 'screen_terminal', 'screen_billboard', 'screen_flyer', 'wall_contacts']) {
    const node = nodes.find(entry => entry.name === name);
    assert.ok(node, name);
    assert.ok(node.extras?.width > 0 && node.extras?.height > 0, `${name} size`);
  }
});

test('the detail pass is in the scene', () => {
  const all = names();
  for (const node of ['kiosk_grille', 'kiosk_ribs', 'goods_fill', 'price_tags', 'interior', 'trees', 'buildings', 'snow_drifts', 'terminal_details', 'billboard_frame']) {
    assert.ok(all.has(node), node);
  }
});

test('the kiosk scene stays inside the desktop budget', () => {
  const json = gltf();
  const primitives = json.nodes
    .filter(node => node.mesh !== undefined)
    .reduce((sum, node) => sum + json.meshes[node.mesh].primitives.length, 0);
  assert.ok(primitives < 400, `${primitives} draw calls`);
  assert.ok(statSync(GLB).size < 8 * 1024 * 1024);
});

test('light anchors come from the model', () => {
  const all = names();
  for (const node of ['light_window', 'light_window_target', 'light_street', 'light_street_target',
    'light_billboard_0', 'light_billboard_1', 'light_billboard_2', 'light_billboard_target', 'bulb_outside']) {
    assert.ok(all.has(node), node);
  }
});

test('the rack stands outside in front of the left shutter, clear of the doorway', () => {
  const nodes = gltf().nodes;
  const rack = nodes.find(node => node.name === 'dvd_rack');
  assert.ok(rack.translation[0] < -1.8, 'rack must be beside the kiosk');
  assert.ok(rack.translation[2] > 1.5, 'rack must be in front of the shutter');
  const camera = nodes.find(node => node.name === 'cam_rack');
  assert.ok(camera.translation[2] > rack.translation[2], 'view from the street');
});

test('the curled cat has a bed inside and does not obstruct the back entrance', () => {
  const nodes = gltf().nodes;
  const bed = nodes.find(node => node.name === 'cat_bed');
  const cat = nodes.find(node => node.name === 'hs_cat');
  assert.ok(bed && cat, 'bed and ginger cat exported');
  assert.ok(cat.translation[0] < -0.5 && Math.abs(cat.translation[2]) < 1);
  assert.ok(cat.translation[1] > 0.12 && cat.translation[1] < 0.5);
});

test('the revised cat has a smooth continuous tail, sleeping face and tucked paws', () => {
  const all = names();
  for (const name of ['cat_body', 'cat_head', 'cat_tail', 'cat_eye_left', 'cat_eye_right', 'cat_paw_left', 'cat_paw_right']) assert.ok(all.has(name), name);
});

test('a cola can sits by the bin and the terminal has orange paint and wear', () => {
  const json = gltf();
  assert.ok(names().has('cola_can'));
  assert.ok(names().has('cola_label'));
  assert.ok(names().has('terminal_wear'));
  const paint = json.materials.find(mat => mat.name === 'terminal_orange');
  assert.ok(paint, 'orange paint');
  const [r, g, b] = paint.pbrMetallicRoughness.baseColorFactor;
  assert.ok(r > g * 2 && g > b * 2);
});
