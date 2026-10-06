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
