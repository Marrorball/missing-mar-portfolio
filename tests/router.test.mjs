import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeToHash } from '../assets/js/router.js';

test('parses supported portfolio routes', () => {
  assert.deepEqual(parseRoute(''), { view: 'home', id: '' });
  assert.deepEqual(parseRoute('#project/kortex'), { view: 'project', id: 'kortex' });
  assert.deepEqual(parseRoute('#about'), { view: 'about', id: '' });
  assert.deepEqual(parseRoute('#contact'), { view: 'contact', id: '' });
  assert.deepEqual(parseRoute('#page/press'), { view: 'page', id: 'press' });
});

test('falls back to home for unknown routes and serializes safe ids', () => {
  assert.deepEqual(parseRoute('#unknown'), { view: 'home', id: '' });
  assert.equal(
    routeToHash({ view: 'project', id: 'учи ру' }),
    '#project/%D1%83%D1%87%D0%B8%20%D1%80%D1%83'
  );
});


test('parses and serializes the kiosk catalog route; old price links lead home', () => {
  assert.deepEqual(parseRoute('#catalog'), { view: 'catalog', id: '' });
  assert.equal(routeToHash({ view: 'catalog' }), '#catalog');
  assert.deepEqual(parseRoute('#price'), { view: 'home', id: '' });
  assert.deepEqual(parseRoute('#pricelist'), { view: 'home', id: '' });
});
