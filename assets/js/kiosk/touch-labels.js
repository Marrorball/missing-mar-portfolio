// Test input capabilities rather than screen width: an iPad can be wider
// than a laptop, and a tablet with a trackpad still has a touchscreen.
export const TOUCH_LABEL_QUERY = '(hover: none), (any-pointer: coarse)';

export function selectLabels(items, { width, height, preset }) {
  const priority = node => preset === 'home'
    ? ({ hs_rack: 0, hs_flyer: 1 }[node] ?? 2) : 0;
  const score = item => priority(item.node) * width * height
    + (item.x - width / 2) ** 2 + (item.y - height * 0.48) ** 2;
  return items.filter(item => !(preset === 'rack' && item.node === 'hs_rack'))
    .slice().sort((a, b) => score(a) - score(b)).slice(0, width <= 600 ? 2 : 3);
}

export function placeLabels(items, { width, bottom, margin = 8, gap = 6 }) {
  const placed = [];
  for (const item of items) {
    const w = Math.min(item.width, width - margin * 2);
    const h = item.height;
    const x = Math.max(margin, Math.min(width - margin - w, item.x - w / 2));
    const desired = item.y - h - 10;
    // Try immediately above/below the object, then the nearest free row.
    const rows = [desired, item.y + 10];
    for (const other of placed) rows.push(other.y - h - gap, other.y + other.height + gap);
    rows.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired));
    const y = rows.find(row => row >= margin && row + h <= bottom - margin
      && !placed.some(other => x < other.x + other.width + gap && x + w + gap > other.x
        && row < other.y + other.height + gap && row + h + gap > other.y));
    if (y !== undefined) placed.push({ ...item, anchorX: item.x, anchorY: item.y, x, y, width: w });
  }
  return placed;
}
