// Lays a flat page onto the screen's projected corners while the camera is
// still on its way: the CSS matrix3d that maps a width x height element onto
// a quad (top-left, top-right, bottom-right, bottom-left, in pixels).
// Square-to-quad projective map after Heckbert, "Fundamentals of Texture
// Mapping" (1989); use with transform-origin 0 0.

export function quadTransform(width, height, quad) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  let a, b, d, e, g = 0, k = 0;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    a = x1 - x0; b = x3 - x0;
    d = y1 - y0; e = y3 - y0;
  } else {
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den;
    k = (dx1 * sy - sx * dy1) / den;
    a = x1 - x0 + g * x1; b = x3 - x0 + k * x3;
    d = y1 - y0 + g * y1; e = y3 - y0 + k * y3;
  }
  return [
    a / width, d / width, 0, g / width,
    b / height, e / height, 0, k / height,
    0, 0, 1, 0,
    x0, y0, 0, 1
  ];
}
