// Street art sprayed on the kiosk's side walls, old and a bit flaked: a
// bubble-letter MAR piece with a crown and drips and a smiley on the right;
// «ЗДЕСЬ БЫЛА ДАЯНА» and a heart «М + Г» on the left.

const BUBBLE = '"Arial Black", "PT Sans Narrow", Impact, sans-serif';
const MARKER = '"PT Sans Narrow", "Arial Narrow", Arial, sans-serif';

function seeded(seed) {
  let state = seed;
  return () => ((state = (state * 16807) % 2147483647) / 2147483647);
}

function bubble(context, text, x, y, size, random) {
  context.save();
  context.translate(x, y);
  context.transform(1, 0, -0.18, 1, 0, 0);   // leaning forward
  context.font = `900 ${size}px ${BUBBLE}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  // depth: a dark block behind, stepped
  for (let step = 14; step > 0; step -= 2) {
    context.fillStyle = '#1a1830';
    context.fillText(text, step, step);
  }
  context.shadowColor = 'rgba(255, 80, 160, 0.6)';
  context.shadowBlur = 18;
  context.lineWidth = size * 0.16;
  context.strokeStyle = '#111';
  context.strokeText(text, 0, 0);
  context.shadowBlur = 0;
  const fill = context.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  fill.addColorStop(0, '#ffe14d');
  fill.addColorStop(0.5, '#ff8a2a');
  fill.addColorStop(1, '#ff3f8e');
  context.fillStyle = fill;
  context.fillText(text, 0, 0);
  // drips running down from the letters
  const width = context.measureText(text).width;
  context.strokeStyle = '#ff3f8e';
  context.lineCap = 'round';
  for (let k = 0; k < 7; k += 1) {
    const dx = (random() - 0.5) * width * 0.9;
    const length = size * (0.15 + random() * 0.35);
    context.lineWidth = 4 + random() * 4;
    context.beginPath();
    context.moveTo(dx, size * 0.32);
    context.lineTo(dx, size * 0.32 + length);
    context.stroke();
    context.beginPath();
    context.arc(dx, size * 0.32 + length, context.lineWidth * 0.8, 0, Math.PI * 2);
    context.fillStyle = '#ff3f8e';
    context.fill();
  }
  // white shine on the top of the letters
  context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  context.lineWidth = 3;
  for (let k = 0; k < text.length; k += 1) {
    const cx = -width / 2 + (k + 0.3) * (width / text.length);
    context.beginPath();
    context.moveTo(cx, -size * 0.28);
    context.quadraticCurveTo(cx + size * 0.08, -size * 0.34, cx + size * 0.18, -size * 0.3);
    context.stroke();
  }
  context.restore();
  return width;
}

function crown(context, x, y, size) {
  context.save();
  context.lineWidth = 6;
  context.strokeStyle = '#111';
  context.fillStyle = '#ffe14d';
  context.beginPath();
  context.moveTo(x - size, y);
  context.lineTo(x - size, y - size * 0.7);
  context.lineTo(x - size * 0.5, y - size * 0.25);
  context.lineTo(x, y - size);
  context.lineTo(x + size * 0.5, y - size * 0.25);
  context.lineTo(x + size, y - size * 0.7);
  context.lineTo(x + size, y);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function marker(context, text, x, y, size, angle, colour = '#111') {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.font = `700 ${size}px ${MARKER}`;
  context.fillStyle = colour;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 0, 0);
  context.restore();
}

function smiley(context, x, y, r) {
  context.save();
  context.lineWidth = 6;
  context.strokeStyle = '#111';
  context.fillStyle = '#ffe14d';
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#111';
  for (const dx of [-0.35, 0.35]) {
    context.beginPath();
    context.ellipse(x + dx * r, y - 0.25 * r, r * 0.1, r * 0.18, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.arc(x, y + 0.05 * r, r * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
  context.stroke();
  context.restore();
}

function heart(context, x, y, size, colour) {
  context.save();
  context.fillStyle = colour;
  context.beginPath();
  context.moveTo(x, y + size * 0.35);
  context.bezierCurveTo(x - size, y - size * 0.3, x - size * 0.4, y - size, x, y - size * 0.45);
  context.bezierCurveTo(x + size * 0.4, y - size, x + size, y - size * 0.3, x, y + size * 0.35);
  context.fill();
  context.restore();
}

// Old paint flakes off: knock small holes through everything drawn so far.
function flake(context, width, height, random, amount) {
  context.save();
  context.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < amount; k += 1) {
    context.globalAlpha = 0.3 + random() * 0.7;
    context.beginPath();
    context.ellipse(random() * width, random() * height, 1 + random() * 5, 1 + random() * 3, random() * 3, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function drawGraffiti(context, width, height, side = 'right') {
  const random = seeded(side === 'right' ? 2004 : 1999);
  context.clearRect(0, 0, width, height);
  if (side === 'right') {
    const w = bubble(context, 'MAR', width * 0.47, height * 0.42, height * 0.42, random);
    crown(context, width * 0.47 - w * 0.32, height * 0.13, height * 0.07);
    smiley(context, width * 0.84, height * 0.72, height * 0.1);
    marker(context, '2004', width * 0.76, height * 0.2, height * 0.07, 0.12, '#e8e8e8');
    marker(context, 'kirpich', width * 0.5, height * 0.9, height * 0.06, 0.03, '#2b5fd9');
    marker(context, '→', width * 0.93, height * 0.45, height * 0.1, 0.4, '#e8e8e8');
  } else {
    marker(context, 'ЗДЕСЬ БЫЛА ДАЯНА', width * 0.45, height * 0.3, height * 0.13, -0.05);
    heart(context, width * 0.7, height * 0.66, height * 0.16, '#d62a4a');
    marker(context, 'М + Г', width * 0.7, height * 0.64, height * 0.07, 0, '#fff');
    marker(context, 'не курить', width * 0.25, height * 0.68, height * 0.07, 0.08, '#2b5fd9');
    smiley(context, width * 0.1, height * 0.62, height * 0.08);
  }
  flake(context, width, height, random, Math.round((width * height) / 900));
}
