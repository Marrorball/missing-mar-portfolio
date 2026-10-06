import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function nodeNames() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  return new Set(json.nodes.map(node => node.name));
}

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const names = nodeNames();
  for (const node of Object.keys(HOTSPOTS)) assert.ok(names.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(names.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(names.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(names.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the kiosk scene stays inside the desktop budget', () => {
  assert.ok(statSync(GLB).size < 8 * 1024 * 1024);
});
