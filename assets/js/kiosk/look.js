// Turning at a fixed eye point keeps the camera inside the room. Yaw is
// unrestricted; pitch avoids the singularity when looking straight up/down.
export function turnLook({ yaw, pitch }, dx, dy) {
  const angle = yaw + dx * 0.0035;
  return { yaw: Math.atan2(Math.sin(angle), Math.cos(angle)),
    pitch: Math.max(-1.3, Math.min(1.2, pitch + dy * 0.0035)) };
}

export function lookDirection({ yaw, pitch }) {
  const horizontal = Math.cos(pitch);
  return [Math.sin(yaw) * horizontal, Math.sin(pitch), Math.cos(yaw) * horizontal];
}
