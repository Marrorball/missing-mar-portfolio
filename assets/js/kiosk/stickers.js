// Vinyl stickers slapped on the kiosk, late-2000s girly style: «ДАША — НЯША»
// with sparkles and a peeling corner, a pink heart, a bunny saying «НЯ!» and a
// «КАВАЙ» star. Die-cut with a white border, a little gloss.

const BUBBLE = '"Arial Black", "PT Sans Narrow", Impact, sans-serif';

function outlined(context, text, x, y, size, fill, stroke) {
  context.font = `900 ${size}px ${BUBBLE}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = size * 0.22;
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
  // the corner has started to peel: backing paper shows, a shadow under it
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

function heart(context, w, h) {
  const size = Math.min(w, h) * 0.46;
  context.save();
  context.translate(w / 2, h / 2 + size * 0.15);
  heartPath(context, 0, 0, size);
  context.fillStyle = '#fff';
  context.shadowColor = 'rgba(0, 0, 0, 0.25)';
  context.shadowBlur = size * 0.08;
  context.fill();
  context.shadowBlur = 0;
  heartPath(context, 0, size * 0.02, size * 0.8);
  context.fillStyle = '#ff5aa8';
  context.fill();
  gloss(context, size, size);
  sparkle(context, -size * 0.35, -size * 0.35, size * 0.14);
  context.restore();
}

function bunny(context, w, h) {
  const r = Math.min(w, h) * 0.38;
  const x = w / 2;
  const y = h * 0.56;
  context.fillStyle = '#fff';
  context.beginPath();
  context.arc(x, y, r * 1.08, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffb3d6';
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fill();
  // ears
  for (const side of [-1, 1]) {
    context.fillStyle = '#fff';
    context.beginPath();
    context.ellipse(x + side * r * 0.35, y - r * 0.95, r * 0.2, r * 0.42, side * 0.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ff7fbf';
    context.beginPath();
    context.ellipse(x + side * r * 0.35, y - r * 0.95, r * 0.09, r * 0.28, side * 0.2, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = '#fff';
  context.beginPath();
  context.ellipse(x, y + r * 0.05, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#2b1b24';
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(x + side * r * 0.25, y - r * 0.02, r * 0.07, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = 'rgba(255, 90, 160, 0.55)';
  for (const side of [-1, 1]) {
    context.beginPath();
    context.ellipse(x + side * r * 0.42, y + r * 0.15, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    context.fill();
  }
  outlined(context, 'НЯ!', x, y + r * 0.72, r * 0.42, '#fff', '#d6247a');
}

function star(context, w, h) {
  const r = Math.min(w, h) * 0.46;
  const x = w / 2;
  const y = h / 2;
  const path = scale => {
    context.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const radius = (k % 2 ? r * 0.48 : r) * scale;
      context.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    context.closePath();
  };
  path(1);
  context.fillStyle = '#fff';
  context.fill();
  path(0.84);
  context.fillStyle = '#ff6fb5';
  context.fill();
  gloss(context, w, h);
  outlined(context, 'КАВАЙ', x, y + r * 0.08, r * 0.3, '#fff', '#c41f6e');
}

const KINDS = { dasha, heart, bunny, star };

export const STICKERS = Object.keys(KINDS);

export function drawSticker(context, width, height, kind) {
  context.clearRect(0, 0, width, height);
  (KINDS[kind] || heart)(context, width, height);
}
