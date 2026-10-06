// Neighbours at their windows across the street: a man smoking and someone
// leaning on the sill, as soft silhouettes against the room light (that is
// what you see of a person at a lit window at night). The sill crops them at
// the waist. Coordinates are in hundredths of the canvas width.

const SHADOW = 'rgb(13, 15, 23)';

function head(context, u, x, y, tilt = 0) {
  context.save();
  context.translate(x * u, y * u);
  context.rotate(tilt);
  context.beginPath();
  context.ellipse(0, 0, 8.6 * u, 10.8 * u, 0, 0, Math.PI * 2);   // skull
  context.ellipse(0, -3 * u, 9.6 * u, 8 * u, 0, 0, Math.PI * 2);  // hair
  context.fill();
  context.restore();
}

// Neck, shoulders and chest down past the bottom edge (the sill).
function torso(context, u, height, x, shoulder, width = 25) {
  context.beginPath();
  context.moveTo((x - 3.5) * u, (shoulder - 9) * u);
  context.lineTo((x - 4.2) * u, (shoulder - 1) * u);
  context.bezierCurveTo((x - width * 0.55) * u, shoulder * u, (x - width) * u, (shoulder + 3) * u, (x - width - 2) * u, (shoulder + 16) * u);
  context.lineTo((x - width) * u, height);
  context.lineTo((x + width) * u, height);
  context.lineTo((x + width + 2) * u, (shoulder + 16) * u);
  context.bezierCurveTo((x + width) * u, (shoulder + 3) * u, (x + width * 0.55) * u, shoulder * u, (x + 4.2) * u, (shoulder - 1) * u);
  context.lineTo((x + 3.5) * u, (shoulder - 9) * u);
  context.closePath();
  context.fill();
}

function limb(context, u, points, thickness) {
  context.lineWidth = thickness * u;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(points[0][0] * u, points[0][1] * u);
  for (const [x, y] of points.slice(1)) context.lineTo(x * u, y * u);
  context.stroke();
}

function smoke(context, u, x, y) {
  context.strokeStyle = 'rgba(205, 210, 220, 0.28)';
  context.lineWidth = 1.6 * u;
  context.beginPath();
  context.moveTo(x * u, y * u);
  context.bezierCurveTo((x + 4) * u, (y - 8) * u, (x - 3) * u, (y - 14) * u, (x + 2) * u, (y - 22) * u);
  context.bezierCurveTo((x + 6) * u, (y - 28) * u, (x + 1) * u, (y - 34) * u, (x + 5) * u, (y - 42) * u);
  context.stroke();
}

export function drawNeighbour(context, width, height, pose = 'looking') {
  const u = width / 100;
  context.clearRect(0, 0, width, height);
  context.filter = 'blur(1.5px)';
  context.fillStyle = SHADOW;
  context.strokeStyle = SHADOW;
  if (pose === 'smoking') {
    const x = 46;
    torso(context, u, height, x, 66);
    head(context, u, x + 1, 45, 0.06);
    // arm folded on the sill
    limb(context, u, [[x - 22, 84], [x - 30, 110], [x + 2, 116]], 9);
    // hand up at the mouth, elbow out
    limb(context, u, [[x + 22, 82], [x + 30, 70], [x + 10, 55]], 8.5);
    context.filter = 'none';
    context.fillStyle = '#ff7a2a';
    context.shadowColor = '#ff7a2a';
    context.shadowBlur = 3 * u;
    context.beginPath();
    context.arc((x + 17) * u, 51 * u, 1.1 * u, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    smoke(context, u, x + 18, 48);
  } else {
    const x = 52;
    torso(context, u, height, x, 70, 27);
    head(context, u, x - 2, 49, -0.18);   // looking down at the street
    // both forearms on the sill
    limb(context, u, [[x - 24, 88], [x - 28, 112], [x + 10, 117]], 9.5);
    limb(context, u, [[x + 24, 88], [x + 28, 112], [x - 6, 120]], 9.5);
  }
  context.filter = 'none';
}
