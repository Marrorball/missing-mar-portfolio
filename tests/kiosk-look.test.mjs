import test from 'node:test';
import assert from 'node:assert/strict';
import { turnLook, lookDirection } from '../assets/js/kiosk/look.js';

test('a long drag can turn past 180 degrees without a narrow orbit limit', () => {
  let look = { yaw: 0, pitch: 0 };
  for (let i = 0; i < 12; i++) look = turnLook(look, 150, 0);
  assert.ok(Math.abs(look.yaw) < 0.1, 'one full turn returns near the starting direction');
  assert.ok(Math.abs(turnLook({ yaw: 0, pitch: 0 }, 700, 0).yaw) > 2);
});

test('looking at the floor and ceiling remains finite and normalized', () => {
  for (const dy of [-10000, 10000]) {
    const look = turnLook({ yaw: 2, pitch: 0 }, 0, dy);
    const direction = lookDirection(look);
    assert.ok(look.pitch > -Math.PI / 2 && look.pitch < Math.PI / 2);
    assert.ok(Math.abs(Math.hypot(...direction) - 1) < 1e-12);
  }
});
