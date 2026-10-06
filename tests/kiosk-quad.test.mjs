import test from 'node:test';
import assert from 'node:assert/strict';
import { quadTransform } from '../assets/js/kiosk/quad.js';

// CSS matrix3d is column-major: x' = m[0]x + m[4]y + m[12], w' = m[3]x + m[7]y + m[15].
function apply(m, x, y) {
  const w = m[3] * x + m[7] * y + m[15];
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w];
}

function assertMaps(width, height, quad) {
  const m = quadTransform(width, height, quad);
  assert.equal(m.length, 16);
  const corners = [[0, 0], [width, 0], [width, height], [0, height]];
  corners.forEach(([x, y], index) => {
    const [px, py] = apply(m, x, y);
    assert.ok(Math.abs(px - quad[index][0]) < 1e-6 && Math.abs(py - quad[index][1]) < 1e-6,
      `corner ${index}: got ${px},${py} want ${quad[index]}`);
  });
  return m;
}

test('an upright rectangle is a plain scale and move', () => {
  const m = assertMaps(800, 600, [[100, 50], [500, 50], [500, 350], [100, 350]]);
  assert.equal(m[3], 0);
  assert.equal(m[7], 0);
});

test('a screen seen from the side maps all four corners in perspective', () => {
  assertMaps(800, 600, [[120, 80], [610, 150], [600, 470], [130, 520]]);
});

test('a billboard seen from below and turned keeps its corners', () => {
  assertMaps(1200, 600, [[-40, 300], [900, 210], [960, 700], [10, 640]]);
});

test('the element centre lands inside the quad', () => {
  const quad = [[120, 80], [610, 150], [600, 470], [130, 520]];
  const [x, y] = apply(quadTransform(800, 600, quad), 400, 300);
  assert.ok(x > 130 && x < 600 && y > 150 && y < 470);
});
