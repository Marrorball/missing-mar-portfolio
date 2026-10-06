import test from 'node:test';
import assert from 'node:assert/strict';
import { channelNumber, neighbourId } from '../assets/js/kiosk/channels.js';

test('channel numbers are two digits, starting at 01', () => {
  assert.equal(channelNumber(0), '1');
  assert.equal(channelNumber(11), '12');
});

test('switching channels wraps around both ways', () => {
  const projects = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(neighbourId(projects, 'a', 1), 'b');
  assert.equal(neighbourId(projects, 'c', 1), 'a');
  assert.equal(neighbourId(projects, 'a', -1), 'c');
  assert.equal(neighbourId(projects, 'missing', 1), 'a');
  assert.equal(neighbourId([], 'a', 1), null);
});
