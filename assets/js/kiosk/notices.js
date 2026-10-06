// The small notices pasted all over the shutters, 2000s style: rooms to let,
// computer repair, «похудей сейчас — спроси меня как», a lost ginger cat
// (asleep inside the kiosk). Coloured copier paper, tear-off phone slips, some
// torn half away, tape. All of them are painted into one atlas and drawn as
// one mesh by the scene.

const NARROW = '"PT Sans Narrow", "Arial Narrow", Arial, sans-serif';
const SANS = '"PT Sans", Arial, sans-serif';
const MONO = '"PT Mono", "Courier New", monospace';

export const NOTICES = [
  { paper: '#f4f1e8', title: 'СДАМ КВАРТИРУ', lines: ['1-комн., 2 этаж', 'хозяин, без посредников'], slip: 'Тел. 2-15-06' },
  { paper: '#e9f0f6', title: 'РЕМОНТ КОМПЬЮТЕРОВ', lines: ['установка Windows XP', 'интернет · игры · вирусы'], slip: 'Тел. 4-77-31' },
  { paper: '#f7ecc4', title: 'КУПЛЮ ВОЛОСЫ ДОРОГО', lines: ['от 30 см, натуральные'], slip: 'Тел. 3-09-42' },
  { paper: '#f7f3c0', title: 'ПОХУДЕЙ СЕЙЧАС!', lines: ['СПРОСИ МЕНЯ КАК'], slip: 'Тел. 5-55-12', loud: true },
  { paper: '#f4f1e8', title: 'ПРОПАЛ КОТ', lines: ['рыжий, толстый, спит много', 'откликается на «Барсик»'], slip: 'Тел. 2-40-18', art: 'cat' },
  { paper: '#dff0d8', title: 'РЕПЕТИТОР', lines: ['английский язык', 'школьникам и взрослым'], slip: 'Тел. 6-12-90' },
  { paper: '#fde2ea', title: 'ГРУЗОПЕРЕВОЗКИ', lines: ['ГАЗЕЛЬ · грузчики', 'недорого, по городу'], slip: 'Тел. 7-03-55' },
  { paper: '#1d1b3a', ink: '#ffe14d', title: 'ДИСКОТЕКА 90-Х', lines: ['ДК «Маяк» · суббота · 20:00', 'вход 50 руб.'], poster: true },
  { paper: '#f9f6ec', title: 'РАБОТА!', lines: ['доход от 500 у.е.', 'без опыта, гибкий график'], slip: 'Тел. 9-99-01', loud: true },
  { paper: '#e9f0f6', title: 'НАТЯЖНЫЕ ПОТОЛКИ', lines: ['за 1 день · гарантия'], slip: 'Тел. 4-20-66' },
  { paper: '#f4f1e8', title: 'ПРОДАМ ГАРАЖ', lines: ['кирпичный, с ямой', 'торг'], slip: 'Тел. 3-71-24' },
  { paper: '#f7ecc4', title: 'ВСКРЫТИЕ ЗАМКОВ', lines: ['круглосуточно'], slip: 'Тел. 0-24-24' },
  { paper: '#fde2ea', title: 'ОТДАМ КОТЯТ', lines: ['в добрые руки', 'к лотку приучены'], slip: 'Тел. 2-86-47' },
  { paper: '#dff0d8', title: 'ВЫВОЗ МУСОРА', lines: ['хлам, мебель, техника'], slip: 'Тел. 5-30-77' }
];

const PX = 1100;   // canvas pixels per metre of notice

function seeded(seed) {
  let state = seed * 9301 + 49297;
  return () => ((state = (state * 9301 + 49297) % 233280) / 233280);
}

function fitFont(context, text, weight, family, size, maxWidth) {
  let px = size;
  do {
    context.font = `${weight} ${px}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    px -= 1;
  } while (px > 6);
  return px;
}

// The paper's outline: straight edges, or torn ones, and the slips along the
// bottom with a few already torn off.
function outline(context, w, h, random, { torn, slips }) {
  const tear = torn ? h * (0.18 + random() * 0.25) : 0;
  context.beginPath();
  if (torn) {
    context.moveTo(0, tear + random() * 12);
    for (let x = 0; x <= w; x += 6) context.lineTo(x, tear + (random() - 0.5) * 14 + Math.sin(x * 0.05) * 6);
  } else {
    context.moveTo(0, 0);
    context.lineTo(w, 0);
  }
  const slipTop = slips ? h * 0.78 : h;
  context.lineTo(w, slipTop);
  if (slips) {
    const count = Math.max(4, Math.round(w / 34));
    const width = w / count;
    for (let k = count - 1; k >= 0; k -= 1) {
      const gone = random() < 0.4;
      const bottom = gone ? slipTop + 4 + random() * 6 : h - random() * 4;
      context.lineTo((k + 1) * width - 1, bottom);
      context.lineTo(k * width + 1, bottom);
      context.lineTo(k * width, slipTop);
    }
  } else {
    context.lineTo(w, h);
    context.lineTo(0, h);
  }
  context.closePath();
  return { tear, slipTop };
}

function cat(context, x, y, size, ink) {
  context.fillStyle = ink;
  context.beginPath();
  context.ellipse(x, y + size * 0.15, size * 0.42, size * 0.3, 0, 0, Math.PI * 2);
  context.ellipse(x - size * 0.3, y - size * 0.12, size * 0.2, size * 0.18, 0, 0, Math.PI * 2);
  context.moveTo(x - size * 0.45, y - size * 0.22);
  context.lineTo(x - size * 0.42, y - size * 0.42);
  context.lineTo(x - size * 0.32, y - size * 0.28);
  context.moveTo(x - size * 0.24, y - size * 0.28);
  context.lineTo(x - size * 0.16, y - size * 0.42);
  context.lineTo(x - size * 0.13, y - size * 0.2);
  context.fill();
  context.lineWidth = size * 0.07;
  context.strokeStyle = ink;
  context.beginPath();
  context.moveTo(x + size * 0.38, y + size * 0.2);
  context.quadraticCurveTo(x + size * 0.62, y - size * 0.05, x + size * 0.48, y - size * 0.3);
  context.stroke();
}

export function drawNotice(context, w, h, design, { torn = false, seed = 1 } = {}) {
  const notice = NOTICES[design % NOTICES.length];
  const random = seeded(seed);
  const ink = notice.ink || '#151515';
  const slips = Boolean(notice.slip) && h > w * 0.75;
  context.save();
  const { tear, slipTop } = outline(context, w, h, random, { torn, slips });
  context.clip();
  context.fillStyle = notice.paper;
  context.fillRect(0, 0, w, h);
  // copier toner specks and a damp stain
  context.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let k = 0; k < (w * h) / 900; k += 1) context.fillRect(random() * w, random() * h, 1 + random() * 1.5, 1);
  const stain = context.createRadialGradient(w * random(), h * random(), 2, w * 0.5, h * 0.5, w * 0.7);
  stain.addColorStop(0, 'rgba(120, 95, 50, 0.12)');
  stain.addColorStop(1, 'rgba(120, 95, 50, 0)');
  context.fillStyle = stain;
  context.fillRect(0, 0, w, h);

  const pad = w * 0.07;
  const top = Math.max(tear + 6, h * 0.08);
  const body = slipTop - top;
  context.fillStyle = ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (notice.poster) {
    context.fillStyle = '#e2245a';
    context.fillRect(0, top + body * 0.18, w, body * 0.32);
    context.fillStyle = ink;
  }
  const titleSize = fitFont(context, notice.title, 700, NARROW, Math.round(h * (notice.loud ? 0.2 : 0.15)), w - pad * 2);
  context.fillText(notice.title, w / 2, top + body * (notice.poster ? 0.34 : 0.2));
  let y = top + body * 0.2 + titleSize * 1.1;
  if (notice.art === 'cat') {
    cat(context, w / 2, y + h * 0.1, h * 0.2, ink);
    y += h * 0.22;
  }
  for (const line of notice.lines) {
    const size = fitFont(context, line, notice.loud ? 700 : 400, notice.loud ? NARROW : SANS,
      Math.round(h * (notice.loud ? 0.11 : 0.068)), w - pad * 2);
    if (y + size > slipTop - 4) break;
    context.fillText(line, w / 2, y + (notice.poster ? body * 0.25 : 0));
    y += size * 1.3;
  }
  if (slips) {
    context.strokeStyle = 'rgba(40, 40, 40, 0.55)';
    context.setLineDash?.([4, 3]);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, slipTop);
    context.lineTo(w, slipTop);
    const count = Math.max(4, Math.round(w / 34));
    for (let k = 1; k < count; k += 1) {
      context.moveTo((k * w) / count, slipTop);
      context.lineTo((k * w) / count, h);
    }
    context.stroke();
    context.setLineDash?.([]);
    context.fillStyle = ink;
    context.font = `400 ${Math.max(7, Math.round(w / count * 0.34))}px ${MONO}`;
    for (let k = 0; k < count; k += 1) {
      context.save();
      context.translate(((k + 0.5) * w) / count, slipTop + 4);
      context.rotate(Math.PI / 2);
      context.textAlign = 'left';
      context.fillText(notice.slip, 0, 0, h - slipTop - 6);
      context.restore();
    }
  }
  context.restore();
  // a strip of tape over the top edge, now and then
  if (!torn && random() < 0.5) {
    context.fillStyle = 'rgba(232, 222, 186, 0.75)';
    context.save();
    context.translate(w * (0.3 + random() * 0.4), 4);
    context.rotate((random() - 0.5) * 0.4);
    context.fillRect(-w * 0.18, -6, w * 0.36, 14);
    context.restore();
  }
}

// Lay every notice into one canvas, row by row. `items` are {width, height}
// in metres; returns the canvas size and each notice's pixel rectangle.
export function packNotices(items, sheetWidth = 2048) {
  const cells = [];
  let x = 0;
  let y = 0;
  let row = 0;
  for (const item of items) {
    const w = Math.round(item.width * PX);
    const h = Math.round(item.height * PX);
    if (x + w > sheetWidth) {
      x = 0;
      y += row + 2;
      row = 0;
    }
    cells.push({ x, y, w, h });
    x += w + 2;
    row = Math.max(row, h);
  }
  return { width: sheetWidth, height: Math.ceil((y + row) / 4) * 4, cells };
}
