import test from 'node:test';
import assert from 'node:assert/strict';
import { drawReceiptPaper } from '../assets/js/kiosk/receipt-paper.js';

test('the strip out of the printer carries the real receipt', () => {
  const texts = [];
  const context = new Proxy({ fillText: text => texts.push(String(text)), measureText: text => ({ width: String(text).length * 10 }) },
    { get: (target, key) => (key in target ? target[key] : () => {}), set: () => true });
  drawReceiptPaper(context, 512, 1920, {
    owner: { name: 'Марат Дреев', role: 'Product & Visual Designer', location: 'Москва, Россия' },
    resume: { experience: [{ period: '2026 — н.в.', company: 'ЦНИИП', role: 'Главный дизайнер' }], skills: [{ name: 'Интерфейсы', level: 'UI' }], tools: ['Figma'] },
    number: 472,
    date: new Date(2026, 9, 10, 18, 5)
  });
  for (const text of ['МАРАТ ДРЕЕВ', 'ВЫПИСКА № 000472', '10.10.2026 18:05', 'ОПЫТ', 'ИТОГО:']) {
    assert.ok(texts.some(line => line.includes(text)), text);
  }
  assert.ok(texts.some(line => line.includes('ЦНИИП')));
});
