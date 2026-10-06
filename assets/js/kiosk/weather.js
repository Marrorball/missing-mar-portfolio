// Pure helpers for the kiosk's weather and light. No three.js here.
// Coordinates are three.js: Y up, the kiosk centred on the origin.

export const SNOW_BOUNDS = { x: 12, y: 9, z: 12 };
export const KIOSK_FOOTPRINT = { x: 1.75, z: 1.25 };   // half sizes, roof overhang included

export const QUALITY = {
  high: { shadows: true, bloom: true, flakes: 4200 },
  low: { shadows: false, bloom: false, flakes: 1500 }
};

export function insideFootprint(x, z, footprint = KIOSK_FOOTPRINT) {
  return Math.abs(x) < footprint.x && Math.abs(z) < footprint.z;
}

// Starting positions for snowflakes around the kiosk, never under its roof.
export function flakePositions(count, random = Math.random, bounds = SNOW_BOUNDS) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    let x;
    let z;
    do {
      x = (random() * 2 - 1) * bounds.x;
      z = (random() * 2 - 1) * bounds.z;
    } while (insideFootprint(x, z));
    positions.set([x, random() * bounds.y, z], index * 3);
  }
  return positions;
}

// Brightness of the tired bulb at time t (seconds): steady most of the
// time, a short stutter every 7.3 seconds.
export function flickerLevel(t) {
  const cycle = t % 7.3;
  if (cycle > 0.5) return 1;
  return 0.55 + 0.45 * Math.abs(Math.sin(cycle * 37));
}

// A CRT coming on by itself: a couple of blinks, then the picture settles.
// `ms` is the time since someone stepped into the kiosk; 0..1 brightness.
export function tvWarmUp(ms) {
  if (ms < 0) return 0;
  if (ms < 90) return 0.85;
  if (ms < 200) return 0.08;
  if (ms < 300) return 1;
  if (ms < 420) return 0.15;
  if (ms < 900) return Math.min(1, (0.55 + 0.45 * (ms - 420) / 480) * (0.88 + 0.12 * Math.sin(ms * 0.09)));
  return 1;
}

export function qualityTier({ width, cores = 8 }) {
  return width <= 760 || cores <= 4 ? 'low' : 'high';
}
