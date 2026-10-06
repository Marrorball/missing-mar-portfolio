import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function gltf() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const names = new Set(gltf().nodes.map(node => node.name));
  for (const node of Object.keys(HOTSPOTS)) assert.ok(names.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(names.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(names.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(names.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the detail pass is in the scene', () => {
  const names = new Set(gltf().nodes.map(node => node.name));
  for (const node of ['kiosk_grille', 'kiosk_ribs', 'goods_fill', 'price_tags', 'interior', 'trees', 'buildings', 'snow_drifts', 'terminal_details']) {
    assert.ok(names.has(node), node);
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
