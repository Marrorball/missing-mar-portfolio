// The paper strip that feeds out of the terminal's printer, painted with the
// same receipt the visitor then holds: monospace lines on thermal paper,
// dashed rules, «ИТОГО», a barcode at the end.

const MONO = '"PT Mono", "Courier New", monospace';
const INK = '#1d1d1d';
const PAPER = '#f6f4ee';
const TOTAL = 'ОТКРЫТ К ПРЕДЛОЖЕНИЯМ';

function receiptDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Words into lines no wider than `width` at the current font.
function wrap(context, text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = tried;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawReceiptPaper(context, width, height, { owner = {}, resume = {}, number = 1, date = new Date() } = {}) {
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  context.fillStyle = INK;
  const margin = width * 0.07;
  const inner = width - margin * 2;
  const size = Math.round(width * 0.052);
  let y = width * 0.1;
  const font = (scale = 1, weight = 400) => {
    context.font = `${weight} ${Math.round(size * scale)}px ${MONO}`;
  };
  const centre = (text, scale = 1, weight = 400) => {
    font(scale, weight);
    context.textAlign = 'center';
    context.fillText(text, width / 2, y);
    y += size * scale * 1.45;
  };
  const left = (text, scale = 1, weight = 400) => {
    font(scale, weight);
    context.textAlign = 'left';
    for (const line of wrap(context, text, inner)) {
      context.fillText(line, margin, y);
      y += size * scale * 1.35;
    }
  };
  const rule = () => {
    y += size * 0.2;
    context.setLineDash?.([size * 0.35, size * 0.25]);
    context.strokeStyle = INK;
    context.lineWidth = Math.max(1, size * 0.08);
    context.beginPath();
    context.moveTo(margin, y);
    context.lineTo(width - margin, y);
    context.stroke();
    context.setLineDash?.([]);
    y += size * 1.1;
  };

  context.textBaseline = 'alphabetic';
  centre('ТЕРМИНАЛ «ДИЗАЙН У МАРАТА»', 0.95, 700);
  left(`ВЫПИСКА № ${String(number).padStart(6, '0')}`, 0.85);
  left(receiptDate(date), 0.85);
  rule();
  centre(String(owner.name || '').toUpperCase(), 1.4, 700);
  const city = String(owner.location || '').split(',')[0].trim();
  left([owner.role, city].filter(Boolean).join(' · ').toUpperCase(), 0.8);
  const block = (title, rows) => {
    if (!rows.length) return;
    rule();
    left(title, 1, 700);
    for (const [head, text] of rows) {
      if (head) left(head, 0.9, 700);
      if (text) left(text, 0.8);
    }
  };
  block('ОПЫТ', (resume.experience || []).map(item => [`${item.period || ''} ${item.company || ''}`.trim(), [item.role, item.description].filter(Boolean).join('. ')]));
  block('УМЕЮ', (resume.skills || []).map(item => [item.name, item.level]));
  block('ИНСТРУМЕНТЫ', resume.tools?.length ? [['', resume.tools.join(' · ')]] : []);
  block('ОБРАЗОВАНИЕ', (resume.education || []).map(item => [`${item.period || ''} ${item.institution || ''}`.trim(), item.program]));
  block('ПУБЛИКАЦИИ', (resume.publications || []).map(item => [item.year, item.title]));
  rule();
  left('ИТОГО:', 1, 700);
  left(TOTAL, 1, 700);
  y += size * 0.6;
  centre('СПАСИБО! СОХРАНЯЙТЕ ЧЕК', 0.8);
  // the barcode, from the receipt's number so each print differs
  const top = Math.min(y, height - size * 4);
  let x = margin + inner * 0.12;
  let seed = number;
  while (x < width - margin - inner * 0.12) {
    seed = (seed * 9301 + 49297) % 233280;
    const bar = 1 + (seed % 4);
    context.fillRect(x, top, bar * width * 0.004, size * 2.6);
    x += (bar + 1 + (seed % 3)) * width * 0.004;
  }
}
