import test from 'node:test';
import assert from 'node:assert/strict';
import { drawFlyer, drawPriceSheet, tearOffLines } from '../assets/js/kiosk/paper.js';

test('a tear-off slip keeps a short contact on one line', () => {
  assert.deepEqual(tearOffLines('@marrorball'), ['@marrorball']);
});

test('a long contact breaks before the @ or the path so it fits the slip', () => {
  assert.deepEqual(tearOffLines('marrorball@gmail.com'), ['marrorball', '@gmail.com']);
  assert.deepEqual(tearOffLines('www.behance.net/marmaraj11'), ['behance.net', '/marmaraj11']);
  assert.deepEqual(tearOffLines('https://t.me/marrorball'), ['t.me', '/marrorball']);
});

test('nothing on a slip is longer than the slip', () => {
  for (const value of ['averyveryverylongname@example.com', 'abcdefghijklmnopqrstuvwxyz']) {
    for (const line of tearOffLines(value)) assert.ok(line.length <= 12, line);
  }
});

// A 2D context that only records what was written.
function recorder() {
  const texts = [];
  const images = [];
  const noop = () => {};
  return {
    texts,
    images,
    context: new Proxy({
      fillText: text => texts.push(text),
      measureText: text => ({ width: text.length * 10 }),
      drawImage: (...args) => images.push(args),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} })
    }, { get: (target, key) => (key in target ? target[key] : noop), set: () => true })
  };
}

test('the flyer on the shutter is printed with the face, the name and every contact', () => {
  const { context, texts, images } = recorder();
  const photo = { width: 800, height: 1000 };
  drawFlyer(context, 1024, 1440, {
    name: 'Марат Дреев',
    role: 'Product & Visual Designer',
    location: 'Москва',
    photo,
    links: [
      { label: 'Telegram', value: '@marrorball' },
      { label: 'Почта', value: 'marrorball@gmail.com' }
    ]
  });
  assert.ok(texts.includes('ПРОПАЛ ДИЗАЙНЕР'));
  assert.ok(texts.includes('МАРАТ ДРЕЕВ'));
  assert.ok(texts.includes('Telegram: @marrorball'));
  assert.ok(texts.includes('@gmail.com'), 'tear-off slips carry the split contact');
  assert.equal(images[0][0], photo, 'the photo is on the sheet');
});

test('the price sheet reads ПРАЙС from across the street', () => {
  const { context, texts } = recorder();
  drawPriceSheet(context, 1024, 1440);
  assert.ok(texts.includes('ПРАЙС'));
  assert.ok(texts.some(text => /прайс на услуги/.test(text)));
});

test('the TV inside comes on with the channel list', async () => {
  const { drawTeletext } = await import('../assets/js/kiosk/teletext.js');
  const { context, texts } = recorder();
  drawTeletext(context, 1024, 768, [{ number: '1', title: 'Kortex' }, { number: '2', title: 'Древо' }]);
  assert.ok(texts.includes('ТЕЛЕПРОГРАММА'));
  assert.ok(texts.includes('KORTEX') && texts.includes('ДРЕВО'));
  assert.ok(texts.includes('2'));
});

test('the neighbours are silhouettes cropped by the sill, one with a lit cigarette', async () => {
  const { drawNeighbour } = await import('../assets/js/kiosk/neighbours.js');
  const calls = [];
  const context = new Proxy({}, { get: (target, key) => (key in target ? target[key] : (...args) => calls.push([key, ...args])), set: (target, key, value) => { target[key] = value; return true; } });
  drawNeighbour(context, 1024, 1229, 'smoking');
  assert.ok(calls.some(([name]) => name === 'arc'), 'the ember');
  assert.ok(calls.filter(([name]) => name === 'ellipse').length >= 2, 'a head with hair');
  calls.length = 0;
  drawNeighbour(context, 1024, 1229, 'looking');
  assert.ok(!calls.some(([name]) => name === 'arc'));
});

test('street notices: the 2000s classics, packed into one atlas without overlaps', async () => {
  const { NOTICES, drawNotice, packNotices } = await import('../assets/js/kiosk/notices.js');
  const titles = NOTICES.map(notice => notice.title);
  for (const title of ['СДАМ КВАРТИРУ', 'ПОХУДЕЙ СЕЙЧАС!', 'ПРОПАЛ КОТ', 'КУПЛЮ ВОЛОСЫ ДОРОГО']) assert.ok(titles.includes(title), title);
  const { width, height, cells } = packNotices([{ width: 0.2, height: 0.28 }, { width: 1.5, height: 0.2 }, { width: 0.15, height: 0.21 }]);
  assert.ok(cells.every(cell => cell.x + cell.w <= width && cell.y + cell.h <= height));
  for (let i = 0; i < cells.length; i += 1) {
    for (let j = i + 1; j < cells.length; j += 1) {
      const [a, b] = [cells[i], cells[j]];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'no overlap');
    }
  }
  const { context, texts } = recorder();
  drawNotice(context, 220, 300, 3, { torn: true, seed: 5 });
  assert.ok(texts.includes('ПОХУДЕЙ СЕЙЧАС!'));
});

test('graffiti on both walls draws without trouble', async () => {
  const { drawGraffiti } = await import('../assets/js/kiosk/graffiti.js');
  for (const side of ['right', 'left']) {
    const { context, texts } = recorder();
    drawGraffiti(context, 1024, 580, side);
    assert.ok(texts.includes(side === 'right' ? 'ЦОЙ ЖИВ' : 'ЗДЕСЬ БЫЛ ВАСЯ'));
  }
});
