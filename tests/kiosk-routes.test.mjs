import test from 'node:test';
import assert from 'node:assert/strict';
import { isInside, walkingRoute } from '../assets/js/kiosk/routes.js';

// three.js coordinates (y up, the kiosk front faces +z), as the scene reads them from the model
const WAYPOINTS = {
  path_front_left: [-2.9, 1.5, 2.9],
  path_side_left: [-2.9, 1.65, -1.2],
  path_front_right: [3.9, 1.6, 1.6],
  path_side_right: [3.9, 1.65, -0.9],
  path_door_out: [0.6, 1.6, -2.6],
  path_doorway: [0.6, 1.6, -1.0],
  path_door_in: [0.6, 1.6, -0.45]
};
const CAMERAS = {
  home: [3.4, 2.5, 8.5],
  rack: [-2.35, 1.3, 4.85],
  terminal: [3.0, 1.25, 1.35],
  billboard: [0, 4.2, -1.4],
  tv: [-0.42, 1.76, -0.3],
  inside: [1.1, 1.65, -0.2],
  cat: [0, 0.76, -0.3]
};
const route = (from, to) => walkingRoute({
  from, to, fromPosition: CAMERAS[from], toPosition: CAMERAS[to], waypoints: WAYPOINTS
});

test('the inside presets are the ones behind the walls', () => {
  assert.ok(isInside('tv') && isInside('inside') && isInside('cat'));
  assert.ok(!isInside('home') && !isInside('rack') && !isInside('billboard'));
});

test('from the street to the TV you walk round the right side and in through the back door', () => {
  assert.deepEqual(route('home', 'tv'),
    ['path_front_right', 'path_side_right', 'path_door_out', 'path_doorway', 'path_door_in']);
});

test('from the rack you go round the left, between the rack and the lamp post', () => {
  assert.deepEqual(route('rack', 'tv'),
    ['path_front_left', 'path_side_left', 'path_door_out', 'path_doorway', 'path_door_in']);
});

test('coming out retraces the walk backwards', () => {
  assert.deepEqual(route('tv', 'home'),
    ['path_door_in', 'path_doorway', 'path_door_out', 'path_side_right', 'path_front_right']);
  assert.deepEqual(route('cat', 'rack'),
    ['path_door_in', 'path_doorway', 'path_door_out', 'path_side_left', 'path_front_left']);
});

test('from behind the kiosk the door is right there', () => {
  assert.deepEqual(route('billboard', 'inside'), ['path_door_out', 'path_doorway', 'path_door_in']);
});

test('a camera already wide of the corner skips the front waypoint', () => {
  const wide = walkingRoute({ from: 'home', to: 'tv', fromPosition: [6, 1.6, -0.5], toPosition: CAMERAS.tv, waypoints: WAYPOINTS });
  assert.deepEqual(wide, ['path_side_right', 'path_door_out', 'path_doorway', 'path_door_in']);
});

test('moves that stay outside or stay inside fly straight', () => {
  assert.deepEqual(route('home', 'rack'), []);
  assert.deepEqual(route('terminal', 'billboard'), []);
  assert.deepEqual(route('tv', 'cat'), []);
});

test('a waypoint the model does not have is left out', () => {
  const { path_front_left, ...rest } = WAYPOINTS;
  const result = walkingRoute({ from: 'rack', to: 'tv', fromPosition: CAMERAS.rack, toPosition: CAMERAS.tv, waypoints: rest });
  assert.deepEqual(result, ['path_side_left', 'path_door_out', 'path_doorway', 'path_door_in']);
  assert.ok(path_front_left);
});

test('stepping away from a close-up: a few steps back the way you faced it, at eye height', async () => {
  const { stepBack } = await import('../assets/js/kiosk/routes.js');
  // the billboard high up: you stay on the ground, looking at the street in front of it
  assert.deepEqual(stepBack({ target: [0, 4.2, -6], eye: [0, 4.2, -1], distance: 6 }), { target: [0, 1.8, -6], position: [0, 2.3, 0] });
  // the flyer on the shutter: three and a half metres back from where you read it
  const away = stepBack({ target: [-1.9, 1.55, 1.1], eye: [-1.8, 1.55, 1.9], distance: 3.5 });
  assert.ok(Math.abs(Math.hypot(away.position[0] + 1.9, away.position[2] - 1.1) - 3.5) < 1e-9);
  assert.ok(away.position[2] > 1.9, 'further out the same way, not back past the object');
});
