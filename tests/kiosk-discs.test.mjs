import test from 'node:test';
import assert from 'node:assert/strict';
import { POCKETS_PER_FACE, RACK_FACES, assignDiscs } from '../assets/js/kiosk/discs.js';

const categories = [
  { id: 'graphic', title: 'Графика', order: 20 },
  { id: 'uxui', title: 'UX/UI', order: 10 }
];
const make = (count, category, prefix) =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}`, title: `${prefix}${index}`, category }));

test('each category starts on its own face, in category order', () => {
  const { faces, discs, overflow } = assignDiscs([...make(3, 'graphic', 'g'), ...make(2, 'uxui', 'u')], categories);
  assert.deepEqual(faces, [{ index: 0, title: 'UX/UI' }, { index: 1, title: 'Графика' }]);
  assert.deepEqual(discs.map(disc => disc.node), ['disc_0', 'disc_1', 'disc_8', 'disc_9', 'disc_10']);
  assert.deepEqual(discs[2], { node: 'disc_8', projectId: 'g0', title: 'g0', face: 1 });
  assert.deepEqual(overflow, []);
});

test('a big category spills onto the next faces, the rest goes to the TV guide only', () => {
  const { faces, discs, overflow } = assignDiscs(make(40, 'uxui', 'u'), categories);
  assert.equal(RACK_FACES * POCKETS_PER_FACE, 32);
  assert.equal(faces.length, 4);
  assert.equal(discs.length, 32);
  assert.equal(discs[31].node, 'disc_31');
  assert.equal(overflow.length, 8);
  assert.equal(overflow[0], 'u32');
});

test('projects without a known category go to «Разное»', () => {
  const { faces, discs } = assignDiscs([{ id: 'x', title: 'X', category: 'video' }], categories);
  assert.deepEqual(faces, [{ index: 0, title: 'Разное' }]);
  assert.equal(discs[0].node, 'disc_0');
});
