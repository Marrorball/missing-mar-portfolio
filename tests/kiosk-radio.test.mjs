import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, needleAt, roomTone, stationAfter } from '../assets/js/kiosk/radio.js';

test('three stations of the 2000s, each a secure stream', () => {
  assert.equal(STATIONS.length, 3);
  for (const station of STATIONS) assert.match(station.url, /^https:\/\/.+\.aacp$/);
  assert.deepEqual(STATIONS.map(station => station.name), ['Russian Gold', 'Russian Hits', 'Pop Gold 2000s']);
});

test('the arrows go round the stations', () => {
  assert.equal(stationAfter(0, 1, 3), 1);
  assert.equal(stationAfter(2, 1, 3), 0);
  assert.equal(stationAfter(0, -1, 3), 2);
});

test('the needle sits along the scale, first station at the left end', () => {
  assert.equal(needleAt(0, 3), 0);
  assert.equal(needleAt(1, 3), 0.5);
  assert.equal(needleAt(2, 3), 1);
});

test('through the wall the radio is muffled and quieter', () => {
  const inside = roomTone(true);
  const outside = roomTone(false);
  assert.ok(outside.cutoff < inside.cutoff / 5);
  assert.ok(outside.level < inside.level);
});
