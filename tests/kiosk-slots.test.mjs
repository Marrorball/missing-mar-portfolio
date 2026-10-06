import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_COUNT, assignHits } from '../assets/js/kiosk/slots.js';

test('the showcase shows featured projects in featured order', () => {
  const hits = assignHits([
    { id: 'a', title: 'A', featured: true, featuredOrder: 20 },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C', shortLabel: 'CC', featured: true, featuredOrder: 10 }
  ]);
  assert.deepEqual(hits, [
    { node: 'slot_0', projectId: 'c', title: 'CC' },
    { node: 'slot_1', projectId: 'a', title: 'A' }
  ]);
});

test('at most eight hits, none when nothing is featured', () => {
  const many = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}`, title: `P${index}`, featured: true, featuredOrder: index }));
  assert.equal(SLOT_COUNT, 8);
  assert.equal(assignHits(many).length, 8);
  assert.equal(assignHits(many)[7].node, 'slot_7');
  assert.deepEqual(assignHits([{ id: 'x', title: 'X' }]), []);
});
