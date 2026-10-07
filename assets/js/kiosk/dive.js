// Phones: the screen you walked up to opens to the whole phone. Pure helpers
// for that mode, shared by the scene and the app.

// Narrow phones standing up, and any phone turned on its side.
export function isPhone(width, height) {
  return width <= 760 || height <= 500;
}

// A clip-path that shows only `rect` of a page covering `viewport`.
export function diveClip(rect, viewport, radius = 0) {
  const top = Math.max(0, Math.round(rect.top));
  const left = Math.max(0, Math.round(rect.left));
  const right = Math.max(0, Math.round(viewport.width - rect.left - rect.width));
  const bottom = Math.max(0, Math.round(viewport.height - rect.top - rect.height));
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;
}

// A flick across the TV: 1 next channel (finger moves left), -1 previous,
// 0 for anything shorter or more up-and-down than across.
export function swipeStep(dx, dy, min = 60) {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
