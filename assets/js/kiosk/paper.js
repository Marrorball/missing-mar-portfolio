// Printed sheets taped to the shutters: the «ПРОПАЛ ДИЗАЙНЕР» flyer and the
// price list. They are painted onto the model so they read from across the
// street, and the close-up page lays the same layout over them (the numbers
// here and the cqw values in screens.css are one layout: keep them in step).
// Every position is in hundredths of the sheet width.

const INK = '#141414';
const PAPER = '#f2f0ea';
const RED = '#d0281e';
const NARROW = '"PT Sans Narrow", "Arial Narrow", Arial, sans-serif';
const SANS = '"PT Sans", Arial, sans-serif';
const MONO = '"PT Mono", "Courier New", monospace';

const SLIP_CHARS = 12;

// A contact as it fits on a tear-off slip: one or more short lines, broken
// before the @ or the path.
export function tearOffLines(value = '', max = SLIP_CHARS) {
  const text = String(value).replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (text.length <= max) return [text];
  const cut = Math.max(text.lastIndexOf('@'), text.indexOf('/'));
  const parts = cut > 0 ? [text.slice(0, cut), text.slice(cut)] : [text];
  return parts.flatMap(part => part.match(new RegExp(`.{1,${max}}`, 'g')));
}

function font(context, weight, size, family, style = 'normal') {
  context.font = `${style} ${weight} ${size}px ${family}`;
}

// Off-white copier paper with toner specks, from a fixed seed so the sheet
// looks the same on every visit.
function paper(context, width, height) {
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  context.fillStyle = 'rgba(0, 0, 0, 0.07)';
  for (let index = 0; index < 900; index += 1) {
    context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 2);
  }
}

function tape(context, u) {
  context.fillStyle = 'rgba(228, 216, 176, 0.85)';
  for (const [x, angle] of [[9, -0.16], [91, 0.14]]) {
    context.save();
    context.translate(x * u, 2 * u);
    context.rotate(angle);
    context.fillRect(-13 * u, -3.5 * u, 26 * u, 7 * u);
    context.restore();
  }
}

// Centres a line on `y` the way CSS centres it in a line box: by the font's
// ascent and descent, not the em square (canvas 'middle' sits ~0.1em higher).
function centred(context, text, x, y, maxWidth) {
  context.textAlign = 'center';
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = context.measureText(text);
  if (Number.isFinite(ascent) && Number.isFinite(descent)) {
    context.textBaseline = 'alphabetic';
    context.fillText(text, x, y + (ascent - descent) / 2, maxWidth);
  } else {
    context.textBaseline = 'middle';
    context.fillText(text, x, y, maxWidth);
  }
}

// Grey, hard contrast, a little blown out: the photo after a cheap copier
// (the same as CSS grayscale(1) contrast(1.7) brightness(1.12) on the page).
function photocopy(context, photo, left, top, size) {
  const side = Math.min(photo.width, photo.height);
  context.drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, left, top, size, size);
  const area = context.getImageData(left, top, size, size);
  const pixels = area.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const grey = (0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]) / 255;
    const value = Math.max(0, Math.min(1, ((grey - 0.5) * 1.7 + 0.5) * 1.12)) * 255;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
  }
  context.putImageData(area, left, top);
}

export function drawFlyer(context, width, height, { name = '', role = '', location = '', links = [], photo = null } = {}) {
  const u = width / 100;
  paper(context, width, height);
  tape(context, u);
  context.fillStyle = INK;

  font(context, 700, 10.5 * u, NARROW);
  centred(context, 'ПРОПАЛ ДИЗАЙНЕР', width / 2, 10.5 * u, 92 * u);
  if (photo) photocopy(context, photo, 22 * u, 17.5 * u, 56 * u);
  else {
    context.fillStyle = '#9a9a96';
    context.fillRect(22 * u, 17.5 * u, 56 * u, 56 * u);
    context.fillStyle = INK;
  }

  font(context, 700, 7 * u, NARROW);
  centred(context, name.toUpperCase(), width / 2, 79.5 * u, 92 * u);
  font(context, 400, 3.9 * u, SANS);
  centred(context, [role, location].filter(Boolean).join(' · '), width / 2, 85.2 * u, 92 * u);
  font(context, 700, 4.4 * u, NARROW);
  centred(context, 'НАШЕДШЕГО ПРОСЬБА НАПИСАТЬ:', width / 2, 91.5 * u, 92 * u);

  font(context, 400, 3.6 * u, MONO);
  links.forEach((link, index) => {
    const line = `${link.label}: ${link.value}`;
    const y = (97 + index * 5.4) * u;
    centred(context, line, width / 2, y, 92 * u);
    const half = Math.min(context.measureText(line).width, 92 * u) / 2;
    context.fillRect(width / 2 - half, y + 2 * u, half * 2, 0.3 * u);
  });

  // tear-off slips along the bottom edge
  const top = 112.5 * u;
  context.strokeStyle = '#555';
  context.lineWidth = 0.5 * u;
  context.setLineDash?.([2 * u, 1.4 * u]);
  context.beginPath();
  context.moveTo(0, top);
  context.lineTo(width, top);
  const slip = width / Math.max(links.length, 1);
  links.forEach((link, index) => {
    if (index) {
      context.moveTo(index * slip, top);
      context.lineTo(index * slip, height);
    }
  });
  context.stroke();
  context.setLineDash?.([]);
  font(context, 400, 3.4 * u, MONO);
  context.textAlign = 'left';
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = context.measureText('M');
  const across = Number.isFinite(ascent) && Number.isFinite(descent) ? (ascent - descent) / 2 : 0;
  context.textBaseline = across ? 'alphabetic' : 'middle';
  links.forEach((link, index) => {
    const lines = tearOffLines(link.value);
    lines.forEach((line, column) => {
      // vertical-rl: the first line is the rightmost column
      const x = (index + 0.5) * slip + ((lines.length - 1) / 2 - column) * 4.4 * u;
      context.save();
      context.translate(x, top + 2.5 * u);
      context.rotate(Math.PI / 2);
      context.fillText(line, 0, across);
      context.restore();
    });
  });
}

export const PRICE_ROWS = 6;

export function drawPriceSheet(context, width, height) {
  const u = width / 100;
  paper(context, width, height);
  tape(context, u);
  context.fillStyle = INK;

  font(context, 700, 24 * u, NARROW);
  centred(context, 'ПРАЙС', width / 2, 17 * u, 92 * u);

  const label = 'ДИЗАЙН У МАРА · УСЛУГИ';
  font(context, 700, 4.6 * u, NARROW);
  const barWidth = Math.min(context.measureText(label).width + 6 * u, 92 * u);
  context.fillStyle = RED;
  context.fillRect((width - barWidth) / 2, 27 * u, barWidth, 7 * u);
  context.fillStyle = '#fff';
  centred(context, label, width / 2, 30.5 * u, 88 * u);

  context.fillStyle = INK;
  context.strokeStyle = INK;
  for (let row = 0; row < PRICE_ROWS; row += 1) {
    const y = (46 + row * 9) * u;
    context.fillRect(8 * u, y, 40 * u, 0.5 * u);
    context.setLineDash?.([0.6 * u, 1.4 * u]);
    context.lineWidth = 0.6 * u;
    context.beginPath();
    context.moveTo(50 * u, y);
    context.lineTo(77 * u, y);
    context.stroke();
    context.setLineDash?.([]);
    font(context, 700, 5 * u, NARROW);
    context.textAlign = 'right';
    context.textBaseline = 'alphabetic';
    context.fillText('— ₽', 92 * u, y);
  }

  context.fillStyle = RED;
  font(context, 400, 4.4 * u, SANS, 'italic');
  centred(context, 'Скоро здесь будет', width / 2, 105 * u, 92 * u);
  centred(context, 'прайс на услуги.', width / 2, 110.5 * u, 92 * u);
  context.fillStyle = INK;
  font(context, 700, 4.2 * u, NARROW);
  centred(context, 'ПОЛНЫЙ ПРАЙС — НА ЩИТЕ →', width / 2, 130 * u, 92 * u);
}

// The little note taped under the price list: the full list is on the
// billboard behind the kiosk.
export function drawPriceNote(context, width, height) {
  const u = width / 100;
  paper(context, width, height);
  context.fillStyle = 'rgba(228, 216, 176, 0.85)';
  context.fillRect(40 * u, 0, 20 * u, 6 * u);
  context.fillStyle = RED;
  context.fillRect(0, 0, 2.4 * u, height);
  context.fillStyle = INK;
  font(context, 700, 15 * u, NARROW);
  centred(context, 'ПОЛНЫЙ ПРАЙС', width / 2, 17 * u, 90 * u);
  context.fillStyle = RED;
  font(context, 700, 7 * u, NARROW);
  centred(context, 'НА ЩИТЕ ЗА ЛАРЬКОМ →', width / 2, 33 * u, 90 * u);
}
