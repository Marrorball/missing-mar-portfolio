import test from 'node:test';
import assert from 'node:assert/strict';
import { PURR_SECONDS, purr } from '../assets/js/kiosk/purr.js';

test('without Web Audio the cat just stays quiet', () => {
  assert.equal(purr({}), false);
  assert.equal(purr(undefined), false);
});

test('a purr is a couple of breaths long', () => {
  assert.ok(PURR_SECONDS > 1 && PURR_SECONDS < 3);
});
