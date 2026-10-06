import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_COUNT, assignSlots, productFor } from '../assets/js/kiosk/slots.js';

const projects = Array.from({ length: 10 }, (_, index) => ({
  id: `p${index}`,
  title: `Project ${index}`,
  category: index % 2 ? 'graphic' : 'uxui'
}));

test('fills the eight shelf slots in content order and lists the rest as overflow', () => {
  const { placed, overflow } = assignSlots(projects);
  assert.equal(SLOT_COUNT, 8);
  assert.equal(placed.length, 8);
  assert.deepEqual(placed[0], { slot: 'slot_0', projectId: 'p0', title: 'Project 0', product: 'box' });
  assert.equal(placed[7].slot, 'slot_7');
  assert.deepEqual(overflow, ['p8', 'p9']);
});

test('leaves later slots empty when there are fewer projects', () => {
  const { placed, overflow } = assignSlots([{ id: 'a', title: 'A' }]);
  assert.equal(placed.length, 1);
  assert.deepEqual(overflow, []);
});

test('uses the short label on the price tag when there is one', () => {
  const { placed } = assignSlots([{ id: 'a', title: 'Long title', shortLabel: 'SHORT' }]);
  assert.equal(placed[0].title, 'SHORT');
});

test('explicit packaging wins, otherwise the category decides, otherwise a box', () => {
  assert.equal(productFor({ product: 'dvd', category: 'uxui' }), 'dvd');
  assert.equal(productFor({ product: 'spaceship', category: 'graphic' }), 'magazine');
  assert.equal(productFor({ category: 'uxui' }), 'box');
  assert.equal(productFor({}), 'box');
});
