import * as THREE from 'three';

// Sine acceleration avoids the pronounced burst of speed at a cubic midpoint.
export function flightProgress(t) {
  return (1 - Math.cos(Math.PI * THREE.MathUtils.clamp(t, 0, 1))) / 2;
}

export function flightDuration(length, walking) {
  const seconds = walking
    ? THREE.MathUtils.clamp(.5 + length * .18, 1.6, 3.2)
    : THREE.MathUtils.clamp(.65 + length * .10, 1.05, 1.85);
  return seconds * 1000;
}

const behind = new THREE.Vector3();
const ahead = new THREE.Vector3();
const direction = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const blend = (a, b, t) => THREE.MathUtils.smoothstep(t, a, b);
const nearestYaw = (angle, previous) => previous + THREE.MathUtils.euclideanModulo(angle - previous + Math.PI, 2 * Math.PI) - Math.PI;

// Unwrap the heading once for the entire walk. Choosing a shortest quaternion
// arc afresh on each frame can reverse that arc when a bend crosses 180 degrees.
export function prepareFlightOrientation(flight) {
  if (!flight.curve) return;
  const start = euler.setFromQuaternion(flight.fromRotation, 'YXZ');
  const fromYaw = start.y, fromPitch = start.x;
  const end = euler.setFromQuaternion(flight.toRotation, 'YXZ');
  const toYaw = end.y, toPitch = end.x;
  const yaws = [];
  let previous = fromYaw;
  for (let i = 0; i <= 128; i++) {
    const k = i / 128;
    flight.curve.getPointAt(Math.max(0, k - .025), behind);
    flight.curve.getPointAt(Math.min(1, k + .06), ahead);
    direction.subVectors(ahead, behind).setY(0);
    if (direction.lengthSq() > 1e-8) previous = nearestYaw(Math.atan2(-direction.x, -direction.z), previous);
    yaws.push(previous);
  }
  flight.walkLook = { yaws, fromYaw, fromPitch, toYaw: nearestYaw(toYaw, previous), toPitch };
}

export function flightOrientation(flight, k, position, out) {
  if (!flight.curve) return out.slerpQuaternions(flight.fromRotation, flight.toRotation, k);
  if (!flight.walkLook) prepareFlightOrientation(flight);
  const look = flight.walkLook;
  const at = THREE.MathUtils.clamp(k, 0, 1) * 128;
  const index = Math.min(Math.floor(at), 127);
  const turn = THREE.MathUtils.lerp(look.yaws[index], look.yaws[index + 1], at - index);
  const enter = blend(0, .22, k), leave = blend(.62, 1, k);
  const yaw = THREE.MathUtils.lerp(THREE.MathUtils.lerp(look.fromYaw, turn, enter), look.toYaw, leave);
  const pitch = THREE.MathUtils.lerp(look.fromPitch * (1 - enter), look.toPitch, leave);
  return out.setFromEuler(euler.set(pitch, yaw, 0, 'YXZ'));
}
