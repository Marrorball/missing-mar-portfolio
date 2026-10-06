import test from 'node:test';
import assert from 'node:assert/strict';
import { KIOSK_FOOTPRINT, QUALITY, SNOW_BOUNDS, flakePositions, flickerLevel, insideFootprint, qualityTier } from '../assets/js/kiosk/weather.js';

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

test('snow falls around the kiosk, never inside it', () => {
  const positions = flakePositions(500, seeded(7));
  assert.equal(positions.length, 1500);
  for (let index = 0; index < positions.length; index += 3) {
    const [x, y, z] = [positions[index], positions[index + 1], positions[index + 2]];
    assert.ok(!insideFootprint(x, z), `${x},${z}`);
    assert.ok(Math.abs(x) <= SNOW_BOUNDS.x && Math.abs(z) <= SNOW_BOUNDS.z && y >= 0 && y <= SNOW_BOUNDS.y);
  }
  assert.equal(insideFootprint(0, 0), true);
  assert.equal(insideFootprint(KIOSK_FOOTPRINT.x + 0.1, 0), false);
});

test('the bulb is mostly steady and sometimes dips', () => {
  const samples = Array.from({ length: 2000 }, (_, index) => flickerLevel(index * 0.01));
  assert.ok(samples.every(value => value >= 0.55 && value <= 1));
  assert.ok(samples.filter(value => value === 1).length > samples.length * 0.8);
  assert.ok(Math.min(...samples) < 0.8);
});

test('phones and weak machines get the light tier', () => {
  assert.equal(qualityTier({ width: 1440, cores: 8 }), 'high');
  assert.equal(qualityTier({ width: 390, cores: 8 }), 'low');
  assert.equal(qualityTier({ width: 1440, cores: 4 }), 'low');
  assert.equal(QUALITY.high.bloom, true);
  assert.equal(QUALITY.low.shadows, false);
  assert.ok(QUALITY.low.flakes < QUALITY.high.flakes);
});
