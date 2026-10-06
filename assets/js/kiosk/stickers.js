// Stickers slapped on the kiosk's side wall by the local kids, late 2000s:
// «ДАША — НЯША» with sparkles, a Turbo gum insert with a red sports car, a
// tuned street racer with flames and neon underglow, a Bakugan dragon bursting
// out of its ball and a closed blue Bakugan ball. Die-cut with a white border.

const BUBBLE = '"Arial Black", "PT Sans Narrow", Impact, sans-serif';

function outlined(context, text, x, y, size, fill, stroke, { italic = false, width = 0.22 } = {}) {
  context.font = `${italic ? 'italic ' : ''}900 ${size}px ${BUBBLE}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = size * width;
  context.strokeStyle = stroke;
  context.strokeText(text, x, y);
  context.fillStyle = fill;
  context.fillText(text, x, y);
}

function sparkle(context, x, y, r, colour = '#fff') {
  context.fillStyle = colour;
  context.beginPath();
  for (let k = 0; k < 8; k += 1) {
    const a = (k * Math.PI) / 4;
    const radius = k % 2 ? r * 0.28 : r;
    context.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  context.closePath();
  context.fill();
}

function heartPath(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y + size * 0.42);
  context.bezierCurveTo(x - size * 1.05, y - size * 0.25, x - size * 0.45, y - size * 1.0, x, y - size * 0.45);
  context.bezierCurveTo(x + size * 0.45, y - size * 1.0, x + size * 1.05, y - size * 0.25, x, y + size * 0.42);
  context.closePath();
}

function gloss(context, width, height) {
  const shine = context.createLinearGradient(0, 0, width, height);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  shine.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
  context.fillStyle = shine;
  context.fill();
}

// The vinyl has started to peel at a corner: backing paper shows.
function peel(context, w, h, pad) {
  context.save();
  context.beginPath();
  context.moveTo(w - pad, h * 0.62);
  context.lineTo(w - pad, h - pad);
  context.lineTo(w * 0.86, h - pad);
  context.closePath();
  context.globalCompositeOperation = 'destination-out';
  context.fill();
  context.restore();
  context.beginPath();
  context.moveTo(w - pad, h * 0.62);
  context.lineTo(w * 0.86, h - pad);
  context.lineTo(w * 0.83, h * 0.7);
  context.closePath();
  context.fillStyle = '#efe9e2';
  context.shadowColor = 'rgba(0, 0, 0, 0.3)';
  context.shadowBlur = h * 0.03;
  context.fill();
  context.shadowBlur = 0;
}

function dasha(context, w, h) {
  const r = h * 0.22;
  const pad = h * 0.07;
  context.beginPath();
  context.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
  context.fillStyle = '#fff';
  context.shadowColor = 'rgba(0, 0, 0, 0.25)';
  context.shadowBlur = h * 0.04;
  context.fill();
  context.shadowBlur = 0;
  context.beginPath();
  context.roundRect(pad * 2, pad * 2, w - pad * 4, h - pad * 4, r * 0.8);
  const pink = context.createLinearGradient(0, pad * 2, 0, h - pad * 2);
  pink.addColorStop(0, '#ff9ccd');
  pink.addColorStop(1, '#ff4fa1');
  context.fillStyle = pink;
  context.fill();
  gloss(context, w, h);
  outlined(context, 'ДАША —', w * 0.5, h * 0.36, h * 0.24, '#fff', '#d6247a');
  outlined(context, 'НЯША', w * 0.5, h * 0.66, h * 0.3, '#fff', '#d6247a');
  sparkle(context, w * 0.12, h * 0.3, h * 0.08);
  sparkle(context, w * 0.88, h * 0.72, h * 0.07);
  sparkle(context, w * 0.86, h * 0.26, h * 0.05, '#ffe14d');
  context.fillStyle = '#fff';
  heartPath(context, w * 0.14, h * 0.72, h * 0.07);
  context.fill();
  peel(context, w, h, pad);
}

// A low sports car side on, nose to the right, drawn 100 units long with the
// road at y = 0. `wing` adds a rear spoiler.
function bodyPath(context, wing) {
  context.beginPath();
  context.moveTo(-50, -7);
  context.lineTo(-50.5, -18);
  context.lineTo(-46, -22);
  context.lineTo(-31, -23);
  context.quadraticCurveTo(-19, -35, -5, -36);
  context.lineTo(5, -36);
  context.quadraticCurveTo(13, -35, 22, -25);
  context.lineTo(43, -21);
  context.quadraticCurveTo(50.5, -19, 50.5, -12);
  context.lineTo(49, -6.5);
  context.closePath();
  if (wing) {
    context.rect(-51, -31, 15, 3.2);
    context.rect(-45, -29, 2.4, 7);
  }
}

const WHEELS = [-31, 32];

function car(context, x, y, length, paint, { wing = false, border = 0 } = {}) {
  context.save();
  context.translate(x, y);
  context.scale(length / 100, length / 100);
  context.lineJoin = 'round';
  if (border) {
    // the die-cut white edge round the whole silhouette
    context.fillStyle = '#fff';
    context.strokeStyle = '#fff';
    context.lineWidth = border * 2;
    bodyPath(context, wing);
    context.fill();
    context.stroke();
    for (const wx of WHEELS) {
      context.beginPath();
      context.arc(wx, -9, 9.5 + border, 0, Math.PI * 2);
      context.fill();
    }
  }
  bodyPath(context, wing);
  const shade = context.createLinearGradient(0, -36, 0, -6);
  shade.addColorStop(0, '#fff');
  shade.addColorStop(0.12, paint);
  shade.addColorStop(1, paint);
  context.fillStyle = shade;
  context.fill();
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';   // sill and the shadow under the doors
  context.fillRect(-46, -11, 92, 4);
  // windows with a streak of reflection, the pillar between them
  context.beginPath();
  context.moveTo(-25, -24.5);
  context.quadraticCurveTo(-16, -33.4, -5, -34.4);
  context.lineTo(5, -34.4);
  context.quadraticCurveTo(12, -33, 18.5, -25.3);
  context.closePath();
  context.fillStyle = '#1b2433';
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(8, -32);
  context.lineTo(13, -27);
  context.moveTo(-18, -27);
  context.lineTo(-12, -32);
  context.stroke();
  context.fillStyle = paint;
  context.fillRect(-3.5, -34.6, 2.6, 10.4);
  context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(-2.2, -24);
  context.lineTo(-3, -11);
  context.moveTo(19, -24);
  context.lineTo(18, -11);
  context.stroke();
  context.fillStyle = '#fff6c8';                // headlight
  context.beginPath();
  context.ellipse(46, -17.5, 3.4, 1.6, -0.15, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#e8141e';                // tail light
  context.fillRect(-50.4, -19.5, 2.6, 3.6);
  for (const wx of WHEELS) {
    context.fillStyle = '#121212';
    context.beginPath();
    context.arc(wx, -9, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c9ccd2';
    context.beginPath();
    context.arc(wx, -9, 5.8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#5b5f66';
    context.lineWidth = 1.1;
    context.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = (k * 2 * Math.PI) / 5;
      context.moveTo(wx + Math.cos(a) * 1.4, -9 + Math.sin(a) * 1.4);
      context.lineTo(wx + Math.cos(a) * 5.2, -9 + Math.sin(a) * 5.2);
    }
    context.stroke();
    context.fillStyle = '#3a3d42';
    context.beginPath();
    context.arc(wx, -9, 1.3, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

// A gum wrapper insert, Turbo style: a supercar on a road, its number and top speed.
function turbo(context, w, h) {
  const pad = h * 0.05;
  context.beginPath();
  context.roundRect(pad, pad, w - pad * 2, h - pad * 2, h * 0.05);
  context.fillStyle = '#fbfaf5';
  context.shadowColor = 'rgba(0, 0, 0, 0.25)';
  context.shadowBlur = h * 0.03;
  context.fill();
  context.shadowBlur = 0;
  const inner = { x: pad * 2.2, y: pad * 2.2, w: w - pad * 4.4, h: h * 0.7 };
  const sky = context.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
  sky.addColorStop(0, '#3fa9e6');
  sky.addColorStop(0.62, '#d9f1ff');
  sky.addColorStop(0.63, '#7a7f86');
  sky.addColorStop(1, '#4b4f55');
  context.fillStyle = sky;
  context.fillRect(inner.x, inner.y, inner.w, inner.h);
  context.strokeStyle = '#f2f2f2';                // lane marks
  context.lineWidth = h * 0.012;
  context.setLineDash?.([w * 0.06, w * 0.05]);
  context.beginPath();
  context.moveTo(inner.x, inner.y + inner.h * 0.9);
  context.lineTo(inner.x + inner.w, inner.y + inner.h * 0.9);
  context.stroke();
  context.setLineDash?.([]);
  car(context, w * 0.5, inner.y + inner.h * 0.84, w * 0.74, '#d8161c', { wing: false });
  // the yellow brand flash in the corner
  context.save();
  context.translate(inner.x, inner.y + h * 0.02);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(w * 0.42, 0);
  context.lineTo(w * 0.36, h * 0.17);
  context.lineTo(0, h * 0.17);
  context.closePath();
  context.fillStyle = '#ffd60a';
  context.fill();
  context.restore();
  outlined(context, 'TURBO', inner.x + w * 0.19, inner.y + h * 0.105, h * 0.13, '#e3141b', '#fff', { italic: true, width: 0.16 });
  context.fillStyle = '#e3141b';
  context.beginPath();
  context.arc(w * 0.84, inner.y + h * 0.13, h * 0.085, 0, Math.PI * 2);
  context.fill();
  outlined(context, '57', w * 0.84, inner.y + h * 0.135, h * 0.09, '#fff', '#a00d12', { width: 0.12 });
  context.font = `italic 700 ${Math.round(h * 0.085)}px ${BUBBLE}`;
  context.fillStyle = '#1b1b1b';
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillText('№ 57', inner.x + w * 0.01, h * 0.86);
  context.textAlign = 'right';
  context.fillText('290 km/h', inner.x + inner.w - w * 0.01, h * 0.86);
  // sun-faded a little
  context.save();
  context.globalCompositeOperation = 'source-atop';
  context.fillStyle = 'rgba(255, 255, 255, 0.1)';
  context.fillRect(0, 0, w, h);
  context.restore();
}

// A die-cut street racer: lowered, a wing, flames up the side, neon under it.
function tuning(context, w, h) {
  const length = w * 0.78;
  const ground = h * 0.66;
  context.save();
  context.fillStyle = '#fff';
  context.beginPath();
  context.ellipse(w / 2, ground + h * 0.02, length * 0.5, h * 0.07, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
  car(context, w / 2, ground, length, '#1f5fd6', { wing: true, border: 3.2 });
  // underglow
  context.save();
  context.shadowColor = '#c13cff';
  context.shadowBlur = h * 0.06;
  context.fillStyle = 'rgba(205, 90, 255, 0.85)';
  context.beginPath();
  context.ellipse(w / 2, ground + h * 0.015, length * 0.36, h * 0.022, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
  // flames licking back from the front wheel
  const u = length / 100;
  const x0 = w / 2;
  context.save();
  context.translate(x0, ground);
  context.scale(u, u);
  for (const [colour, grow] of [['#ff7a00', 1], ['#ffd400', 0.6]]) {
    context.fillStyle = colour;
    context.beginPath();
    context.moveTo(40, -20);
    for (let k = 0; k < 5; k += 1) {
      const tip = 18 - k * 9;
      context.quadraticCurveTo(tip + 6, -20 + 2 * grow, tip - 10 * grow, -22 + k * 1.6);
      context.quadraticCurveTo(tip - 2, -16 + k, tip + 2, -14 + k * 0.4);
    }
    context.lineTo(40, -12);
    context.closePath();
    context.fill();
  }
  context.restore();
  // the slogan, die-cut along with the car
  context.save();
  context.font = `italic 900 ${Math.round(h * 0.15)}px ${BUBBLE}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = h * 0.07;
  context.strokeStyle = '#fff';
  context.strokeText('STREET RACING', w / 2, h * 0.86);
  context.restore();
  outlined(context, 'STREET RACING', w / 2, h * 0.86, h * 0.15, '#ffd400', '#111', { italic: true, width: 0.16 });
}

function badge(context, w, h, fill) {
  const r = Math.min(w, h) * 0.47;
  context.beginPath();
  context.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  context.fillStyle = '#fff';
  context.shadowColor = 'rgba(0, 0, 0, 0.25)';
  context.shadowBlur = r * 0.05;
  context.fill();
  context.shadowBlur = 0;
  context.beginPath();
  context.arc(w / 2, h / 2, r * 0.9, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  return r * 0.9;
}

// A sphere seen a little from above, split into armour plates.
function ball(context, x, y, r, light, mid, dark) {
  const shade = context.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  shade.addColorStop(0, light);
  shade.addColorStop(0.55, mid);
  shade.addColorStop(1, dark);
  context.fillStyle = shade;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  context.lineWidth = r * 0.05;
  context.beginPath();
  context.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI);
  context.moveTo(x - r * 0.02, y - r);
  context.bezierCurveTo(x - r * 0.45, y - r * 0.4, x - r * 0.45, y + r * 0.4, x - r * 0.02, y + r);
  context.moveTo(x + r * 0.02, y - r);
  context.bezierCurveTo(x + r * 0.45, y - r * 0.4, x + r * 0.45, y + r * 0.4, x + r * 0.02, y + r);
  context.stroke();
  context.fillStyle = 'rgba(255, 255, 255, 0.7)';
  context.beginPath();
  context.ellipse(x - r * 0.4, y - r * 0.5, r * 0.22, r * 0.11, -0.6, 0, Math.PI * 2);
  context.fill();
}

// A fire dragon bursting out of its ball: wings, a long neck, a horned head.
function bakugan(context, w, h) {
  const r = badge(context, w, h, '#2a0c0c');
  const cx = w / 2;
  const cy = h / 2;
  const burst = context.createRadialGradient(cx, cy * 1.1, r * 0.1, cx, cy, r);
  burst.addColorStop(0, '#ffd23a');
  burst.addColorStop(0.45, '#ff6a00');
  burst.addColorStop(1, '#8d0e0e');
  context.fillStyle = burst;
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.fill();
  context.save();
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = 'rgba(255, 240, 160, 0.25)';
  for (let k = 0; k < 12; k += 1) {
    const a = (k * Math.PI) / 6;
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2);
    context.lineTo(cx + Math.cos(a + 0.18) * r * 1.2, cy + Math.sin(a + 0.18) * r * 1.2);
    context.closePath();
    context.fill();
  }
  // wings
  for (const side of [-1, 1]) {
    context.fillStyle = '#9e0f16';
    context.strokeStyle = '#3a0508';
    context.lineWidth = r * 0.025;
    context.beginPath();
    context.moveTo(cx + side * r * 0.12, cy + r * 0.05);
    context.lineTo(cx + side * r * 0.55, cy - r * 0.72);
    context.lineTo(cx + side * r * 0.9, cy - r * 0.35);
    context.quadraticCurveTo(cx + side * r * 0.68, cy - r * 0.3, cx + side * r * 0.7, cy - r * 0.08);
    context.quadraticCurveTo(cx + side * r * 0.5, cy - r * 0.12, cx + side * r * 0.45, cy + r * 0.1);
    context.quadraticCurveTo(cx + side * r * 0.3, cy + r * 0.02, cx + side * r * 0.12, cy + r * 0.2);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(cx + side * r * 0.55, cy - r * 0.72);
    context.lineTo(cx + side * r * 0.6, cy - r * 0.08);
    context.moveTo(cx + side * r * 0.55, cy - r * 0.72);
    context.lineTo(cx + side * r * 0.4, cy + r * 0.05);
    context.stroke();
  }
  // neck and head
  context.lineCap = 'round';
  context.strokeStyle = '#d8261f';
  context.lineWidth = r * 0.2;
  context.beginPath();
  context.moveTo(cx, cy + r * 0.25);
  context.bezierCurveTo(cx + r * 0.05, cy - r * 0.1, cx - r * 0.2, cy - r * 0.2, cx - r * 0.12, cy - r * 0.42);
  context.stroke();
  context.strokeStyle = '#ffb347';
  context.lineWidth = r * 0.07;
  context.stroke();
  context.save();
  context.translate(cx - r * 0.12, cy - r * 0.5);
  context.rotate(-0.25);
  context.scale(1.45, 1.45);
  context.fillStyle = '#d8261f';
  context.strokeStyle = '#3a0508';
  context.lineWidth = r * 0.02;
  context.beginPath();
  context.moveTo(r * 0.14, -r * 0.08);
  context.lineTo(r * 0.12, -r * 0.3);   // horn
  context.lineTo(r * 0.02, -r * 0.1);
  context.lineTo(-r * 0.06, -r * 0.27); // horn
  context.lineTo(-r * 0.1, -r * 0.07);
  context.lineTo(-r * 0.38, 0);         // snout
  context.lineTo(-r * 0.3, r * 0.06);
  context.lineTo(-r * 0.12, r * 0.04);  // open jaw
  context.lineTo(-r * 0.3, r * 0.14);
  context.lineTo(r * 0.04, r * 0.14);
  context.lineTo(r * 0.16, r * 0.04);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = '#ffe14d';
  context.beginPath();
  context.ellipse(-r * 0.05, -r * 0.03, r * 0.05, r * 0.03, -0.3, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#111';
  context.fillRect(-r * 0.06, -r * 0.055, r * 0.016, r * 0.05);
  context.restore();
  // the open ball it came from
  ball(context, cx, cy + r * 0.42, r * 0.3, '#ff9a8a', '#d0161c', '#5a0508');
  context.restore();
  outlined(context, 'BAKUGAN', cx, cy + r * 0.76, r * 0.21, '#fff', '#c41a12', { italic: true, width: 0.2 });
  sparkle(context, cx + r * 0.62, cy - r * 0.62, r * 0.09);
}

// A closed blue ball with its emblem and G-power, as on the cards.
function bakuganBall(context, w, h) {
  const r = badge(context, w, h, '#0b1a3a');
  const cx = w / 2;
  const cy = h / 2;
  for (const [x, y, s] of [[0.3, 0.28, 0.07], [0.74, 0.22, 0.05], [0.8, 0.62, 0.06], [0.2, 0.68, 0.04]]) {
    sparkle(context, w * x, h * y, r * s * 1.6, '#9fe0ff');
  }
  ball(context, cx, cy - r * 0.08, r * 0.6, '#c8f0ff', '#1d7fe0', '#06225e');
  context.fillStyle = '#ffcf33';
  context.strokeStyle = '#6b4a00';
  context.lineWidth = r * 0.02;
  context.beginPath();
  context.arc(cx, cy - r * 0.08, r * 0.17, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#1d7fe0';    // water drop of the blue clan
  context.beginPath();
  context.moveTo(cx, cy - r * 0.2);
  context.quadraticCurveTo(cx + r * 0.1, cy - r * 0.04, cx, cy + r * 0.02);
  context.quadraticCurveTo(cx - r * 0.1, cy - r * 0.04, cx, cy - r * 0.2);
  context.fill();
  outlined(context, '450 G', cx, cy + r * 0.72, r * 0.26, '#ffe14d', '#0b1a3a', { italic: true, width: 0.18 });
}

const KINDS = { dasha, turbo, tuning, bakugan, ball: bakuganBall };

export const STICKERS = Object.keys(KINDS);

export function drawSticker(context, width, height, kind) {
  context.clearRect(0, 0, width, height);
  (KINDS[kind] || dasha)(context, width, height);
}
