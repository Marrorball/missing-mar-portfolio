import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, needleAt, roomTone, stationAfter } from '../assets/js/kiosk/radio.js';

test('one station: Russian Gold, Russian hits of the 90s and 2000s, on a secure stream', () => {
  assert.deepEqual(STATIONS.map(station => station.name), ['Russian Gold']);
  assert.match(STATIONS[0].url, /^https:\/\/.+\.aacp$/);
});

test('if a station is silent the radio tries the next one round', () => {
  assert.equal(stationAfter(0, 1, 3), 1);
  assert.equal(stationAfter(2, 1, 3), 0);
  assert.equal(stationAfter(0, -1, 3), 2);
});

test('the needle sits along the scale, first station at the left end; a lone station in the middle', () => {
  assert.equal(needleAt(0, 1), 0.5);
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

test('the LCD shows the station, «ПОИСК…» while tuning, and ghost segments when off', async () => {
  const { drawRadioDisplay } = await import('../assets/js/kiosk/radio.js');
  const texts = [];
  const context = new Proxy({
    fillText: text => texts.push(text),
    measureText: text => ({ width: text.length * 10 })
  }, { get: (target, key) => (key in target ? target[key] : () => {}), set: () => true });
  drawRadioDisplay(context, 400, 100, { on: true, text: 'Russian Gold' });
  assert.ok(texts.includes('RUSSIAN GOLD'));
  drawRadioDisplay(context, 400, 100, { on: true, seeking: true, now: 0 });
  assert.ok(texts.includes('ПОИСК…'));
  drawRadioDisplay(context, 400, 100, { on: false });
  assert.ok(texts.includes('88888888'));
});
