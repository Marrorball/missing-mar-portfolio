import test from 'node:test';
import assert from 'node:assert/strict';
import { diveClip, isPhone, swipeStep } from '../assets/js/kiosk/dive.js';

test('a phone is narrow, or short when turned on its side; tablets and desktops are not', () => {
  assert.equal(isPhone(390, 844), true);
  assert.equal(isPhone(320, 568), true);
  assert.equal(isPhone(844, 390), true);
  assert.equal(isPhone(820, 1180), false);
  assert.equal(isPhone(1280, 720), false);
});

test('the clip shows only the screen rectangle of a full-viewport page', () => {
  assert.equal(diveClip({ left: 20, top: 300, width: 335, height: 250 }, { width: 375, height: 812 }, 18),
    'inset(300px 20px 262px 20px round 18px)');
  // a rectangle that pokes past an edge never gives a negative inset
  assert.equal(diveClip({ left: -5, top: -5, width: 400, height: 900 }, { width: 375, height: 812 }),
    'inset(0px 0px 0px 0px round 0px)');
});

test('a flick across is a channel step, a scroll or a short slide is not', () => {
  assert.equal(swipeStep(-120, 10), 1);
  assert.equal(swipeStep(120, -8), -1);
  assert.equal(swipeStep(-30, 0), 0);
  assert.equal(swipeStep(-90, 80), 0);
});
