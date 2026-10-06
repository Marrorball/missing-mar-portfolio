import test from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels } from '../assets/js/kiosk/touch-labels.js';

test('crowded touch labels fit on a phone without overlap or covering the footer', () => {
  const labels = placeLabels(Array.from({ length: 7 }, (_, i) => ({
    id: i, x: 190 + i * 2, y: 400 + i * 3, width: 120, height: 44
  })), { width: 390, bottom: 720 });
  assert.equal(labels.length, 7);
  for (const label of labels) {
    assert.ok(label.x >= 8 && label.x + label.width <= 382);
    assert.ok(label.y >= 8 && label.y + label.height <= 712);
    for (const other of labels) {
      if (label === other) continue;
      assert.ok(label.x + label.width <= other.x || other.x + other.width <= label.x
        || label.y + label.height <= other.y || other.y + other.height <= label.y);
    }
  }
});

test('edge labels stay on screen and keep their original object anchors', () => {
  const labels = placeLabels([
    { x: 1, y: 100, width: 100, height: 44 },
    { x: 389, y: 100, width: 100, height: 44 }
  ], { width: 390, bottom: 720 });
  assert.deepEqual(labels.map(l => [l.x, l.anchorX]), [[8, 1], [282, 389]]);
});

test('labels at the top flip below the object and lack of room never creates overlap', () => {
  const labels = placeLabels([
    { x: 50, y: 5, width: 100, height: 44 },
    { x: 50, y: 5, width: 100, height: 44 }
  ], { width: 116, bottom: 70 });
  assert.equal(labels.length, 1);
  assert.equal(labels[0].y, 15);
});
