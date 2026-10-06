// Walking between the street and the inside. Flights that cross the walls go
// round the kiosk and in through the back door instead of through the glass;
// the waypoints come from the model (path_* empties, see scripts/kiosk/build.py).
// Positions are three.js coordinates: y up, the kiosk front faces +z.

const INSIDE = new Set(['inside', 'tv', 'cat']);
const BEHIND = -1.2;     // further back than this you are already round the back
const LEFT_OF = -0.3;    // the door is on the right, so the middle walks right

export function isInside(preset) {
  return INSIDE.has(preset);
}

function outsideLeg([x, , z], waypoints) {
  if (z < BEHIND) return ['path_door_out'];
  const side = x < LEFT_OF ? 'left' : 'right';
  const front = waypoints[`path_front_${side}`];
  const leg = [];
  // step out to the corner first unless you already stand wide of it
  if (front && (Math.abs(x) < Math.abs(front[0]) || z > front[2])) leg.push(`path_front_${side}`);
  leg.push(`path_side_${side}`, 'path_door_out');
  return leg;
}

// Ordered waypoint names to pass between `from` and `to`; empty when both
// presets are on the same side of the walls.
export function walkingRoute({ from, to, fromPosition, toPosition, waypoints }) {
  if (isInside(from) === isInside(to)) return [];
  const outside = isInside(from) ? toPosition : fromPosition;
  const leg = [...outsideLeg(outside, waypoints), 'path_door_in'].filter(name => name in waypoints);
  return isInside(to) ? leg : leg.reverse();
}
