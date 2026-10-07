# Терминал печатает резюме чеком — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** терминал печатает резюме кассовым чеком, билборд разгружен, тексты нейтральные.

**Architecture:** разметка чека — чистая функция `renderReceipt(site, resume, { number, date })` в `pages.js`, первый экран — `renderTerminalScreen()`. `app.js` даёт терминалу адрес `#resume` и печатает по `data-action="terminal-print"`. `scene.js` выдвигает из щели 3D-ленту (`printReceipt()`), щель — пустышка `terminal_receipt_slot` в модели.

**Tech Stack:** ES-модули без сборки, three.js r186, Blender 5 (`npm run build:kiosk`), `node --test`.

Спека: `docs/superpowers/specs/2026-10-07-kiosk-receipt-design.md`.

---

### Task 1: адрес `#resume` и нейтральные тексты

**Files:** `assets/js/router.js`, `assets/js/kiosk/hotspots.js`, `assets/js/kiosk/scene.js`; tests `tests/router.test.mjs`, `tests/kiosk-hotspots.test.mjs`.

- [ ] Тесты:

```js
// router.test.mjs
test('the terminal has its own address', () => {
  assert.deepEqual(parseRoute('#resume'), { view: 'resume', id: '' });
  assert.equal(routeToHash({ view: 'resume' }), '#resume');
});
// kiosk-hotspots.test.mjs
test('the terminal prints the résumé; the away sign points at the flyer for contacts', () => {
  assert.equal(ROUTE_PRESETS.resume, 'terminal');
  assert.equal(hotspotForNode('hs_terminal').action.hash, '#resume');
  const note = hotspotForNode('hs_sign_away').action.text;
  assert.match(note, /листовке/);
  assert.doesNotMatch(note, /ищет команду|Контакты — на терминале/);
});
```

и `'resume'` в списке видов теста «every route view…».
- [ ] `router.js`: `const SIMPLE_VIEWS = ['about', 'contact', 'catalog', 'resume'];`
- [ ] `hotspots.js`: `hs_terminal: { label: 'Терминал', action: { type: 'route', hash: '#resume' } }`; `ROUTE_PRESETS` + `resume: 'terminal'`; `hs_sign_away` → `'Марат отошёл. Контакты — на листовке слева, выписка — в терминале справа.'`
- [ ] `scene.js` (`setBillboardAd`, вторая грань): `line: 'Открыт к предложениям. Подробности — на щите.'`
- [ ] `npm test` (новые проходят, сломанные старые — в Task 2); commit.

### Task 2: чек и первый экран терминала

**Files:** `assets/js/kiosk/pages.js`; test `tests/kiosk-pages.test.mjs`.

- [ ] Тесты:

```js
test('the terminal opens on one key that prints the résumé, no contacts', () => {
  const html = renderTerminalScreen();
  assert.match(html, /data-action="terminal-print"/);
  assert.match(html, /Распечатать выписку/);
  assert.doesNotMatch(html, /mailto:|t\.me/);
  assert.match(html, /data-action="kiosk-back"/);
});

test('the résumé prints as a till receipt from the content', () => {
  const html = renderReceipt(
    { owner: { name: 'Марат <Д>', role: 'Product Designer', location: 'Москва, Россия' } },
    { experience: [{ period: '2024 — н.в.', company: 'Фриланс', role: 'UX/UI', description: 'Лендинги' }],
      skills: [{ name: 'Интерфейсы', level: 'UI · дизайн-системы' }], tools: ['Figma', 'Tilda'],
      education: [{ institution: 'МТУСИ', program: 'ИТ', period: '2022 — 2026' }],
      publications: [{ title: 'Видеоаналитика', year: '2023' }], about: 'Не боюсь критики' },
    { number: 472, date: new Date(2026, 9, 7, 21, 4) });
  assert.match(html, /Выписка № 000472/);
  assert.match(html, /07\.10\.2026 21:04/);
  assert.match(html, /Марат &lt;Д&gt;/);
  assert.match(html, /Product Designer · Москва</);
  for (const text of ['Фриланс', 'Лендинги', 'Интерфейсы', 'Figma · Tilda', 'МТУСИ', 'Видеоаналитика', 'Не боюсь критики', 'Открыт к предложениям']) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /data-action="terminal-print">Распечатать ещё/);
  assert.match(html, /href="#contact"/);
});
```

Тест билборда: `renderAboutBoard(site, page)` без резюме — `doesNotMatch(/KORTEX|board-resume/)`, `match(/href="#resume"/)`, штамп `Открыт к<br>предложениям`. Из теста «terminal and flyer both carry clickable contacts» убрать часть терминала.
- [ ] Реализация в `pages.js`:

```js
const RECEIPT_TOTAL = 'Открыт к предложениям';

function receiptDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function terminalFoot() {
  return `<footer class="terminal-foot">
      <button type="button" class="terminal-key" data-action="kiosk-back">◀︎ Назад</button>
      <p class="terminal-note">Комиссия 0%. Сдачу не выдаём.</p>
    </footer>`;
}

// The terminal's first screen: one big key prints the résumé.
export function renderTerminalScreen() {
  return `<article class="terminal-page">
    <header class="terminal-bar"><span>Дизайн у Марата</span><span>Касса</span></header>
    <h1>Выписка о дизайнере</h1>
    <p class="terminal-lead">Опыт, навыки и инструменты одним чеком</p>
    <div class="terminal-buttons">
      <button type="button" class="terminal-button" data-action="terminal-print"><span>Распечатать выписку</span><small>Чек бесплатный</small></button>
    </div>
    ${terminalFoot()}
  </article>`;
}

// The résumé as a till receipt: everything comes from the content.
export function renderReceipt(site = {}, resume = {}, { number = 1, date = new Date() } = {}) {
  const owner = site.owner || {};
  const city = String(owner.location || '').split(',')[0].trim();
  const block = (title, rows) => (rows.length ? `<section class="receipt-block"><h2>${title}</h2>${rows.join('')}</section>` : '');
  const line = (bold, text, small = '') => `<p><b>${escapeHtml(bold)}</b> ${escapeHtml(text)}${small ? `<br><small>${escapeHtml(small)}</small>` : ''}</p>`;
  return `<article class="terminal-page terminal-printed">
    <header class="terminal-bar"><span>Дизайн у Марата</span><span>Касса</span></header>
    <div class="receipt-slot">
      <div class="receipt">
        <p class="receipt-head">Терминал «Дизайн у Марата»</p>
        <p class="receipt-line"><span>Выписка № ${String(number).padStart(6, '0')}</span><span>${receiptDate(date)}</span></p>
        <h1>${escapeHtml(owner.name || '')}</h1>
        <p class="receipt-role">${escapeHtml([owner.role, city].filter(Boolean).join(' · '))}</p>
        ${block('Опыт', (resume.experience || []).map(item => line(item.period || '', `${item.company || ''} · ${item.role || ''}`, item.description)))}
        ${block('Умею', (resume.skills || []).map(item => line(item.name || '', '', item.level)))}
        ${block('Инструменты', resume.tools?.length ? [`<p>${resume.tools.map(escapeHtml).join(' · ')}</p>`] : [])}
        ${block('Образование', (resume.education || []).map(item => line(item.period || '', item.institution || '', item.program)))}
        ${block('Публикации', (resume.publications || []).map(item => line(item.year || '', '', item.title)))}
        ${block('О себе', resume.about ? [`<p><small>${escapeHtml(resume.about)}</small></p>`] : [])}
        <p class="receipt-total"><span>Итого:</span><b>${RECEIPT_TOTAL}</b></p>
        <p class="receipt-thanks">Спасибо! Сохраняйте чек</p>
        <p class="receipt-barcode" aria-hidden="true"></p>
      </div>
    </div>
    <div class="terminal-actions">
      <button type="button" class="terminal-button" data-action="terminal-print">Распечатать ещё</button>
      <a class="terminal-button" href="#contact">Связаться →</a>
    </div>
    ${terminalFoot()}
  </article>`;
}
```

`renderAboutBoard(site = {}, page = {})`: убрать `resumeBlocks` (и функцию), штамп `Открыт к<br>предложениям`, после `.board-head` — `<p class="board-more"><a href="#resume">Опыт и навыки — выписка в терминале →</a></p>`.
- [ ] `npm test`; commit.

### Task 3: приложение

**Files:** `assets/js/app.js`.

- [ ] Импорт `renderReceipt`; `renderAboutBoard(site, page)`.
- [ ] Маршрут:

```js
  if (route.view === 'resume') {
    openScreen('terminal', renderTerminalScreen());
    announce('Выписка');
    return;
  }
```

- [ ] Удалить `terminalPage()`, особый случай терминала в `arriveBack` и в `runAction` (терминал теперь маршрут).
- [ ] Печать:

```js
// The terminal prints the résumé: a new receipt number every time, and a
// strip of paper feeds out of the slot under the bill acceptor.
function printReceipt() {
  const { site, resume } = state.bundle;
  const number = 100000 + Math.floor(Math.random() * 900000);
  openScreen('terminal', renderReceipt(site, resume, { number, date: new Date() }));
  state.kiosk?.printReceipt();
}
```

и в обработчике кликов `if (action === 'terminal-print') printReceipt();`.
- [ ] commit.

### Task 4: вид чека

**Files:** `assets/css/screens.css` (раздел терминала; убрать мёртвые `.board-resume`).

- [ ] CSS: `.receipt-slot` (отступы, `overflow: hidden`), `.receipt` (белая термобумага, PT Mono, зубчатые края `mask`/градиент, тень), заголовки блоков капсом с пунктиром, `.receipt-total` жирно, `.receipt-barcode` полосками `repeating-linear-gradient`, `.terminal-actions` (две кнопки в ряд). Печать: `@keyframes receipt-feed { from { transform: translateY(-100%); } to { transform: none; } }` с `steps(12)`, 1,2 с.
- [ ] Проверка в браузере; commit.

### Task 5: лента из щели в 3D

**Files:** `scripts/kiosk/street.py`, `assets/js/kiosk/scene.js`; test `tests/kiosk-scene-file.test.mjs`.

- [ ] Тест: узел `terminal_receipt_slot` есть, на лицевой стороне терминала (three: `z` ≈ 0.6, `y` ≈ 0.55, `x` ≈ 3.0).
- [ ] `street.py` в `_terminal`: `empty('terminal_receipt_slot', (tx, ty - 0.247, 0.552))` — у нижнего края щели для чека.
- [ ] `scene.js`:

```js
  // The terminal's receipt: a strip of paper that feeds out of the slot under
  // the bill acceptor in jerks and stays hanging there.
  const receiptSlot = root.getObjectByName('terminal_receipt_slot');
  let receiptStrip = null;
  let receiptFeed = null;
  function printReceipt() {
    if (!receiptSlot) return;
    if (!receiptStrip) {
      const paper = document.createElement('canvas');
      paper.width = 64;
      paper.height = 256;
      const context = paper.getContext('2d');
      context.fillStyle = '#f4f2ec';
      context.fillRect(0, 0, paper.width, paper.height);
      context.fillStyle = 'rgba(40, 40, 40, .55)';
      for (let y = 10; y < 246; y += 7) context.fillRect(6, y, 20 + ((y * 37) % 32), 2);
      const map = new THREE.CanvasTexture(paper);
      map.colorSpace = THREE.SRGBColorSpace;
      receiptStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.26).translate(0, -0.13, 0),
        new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }));
      receiptStrip.name = 'terminal_receipt';
      receiptSlot.add(receiptStrip);
    }
    receiptFeed = { start: performance.now() };
  }
```

в `frame()`:

```js
    if (receiptFeed) {
      const t = Math.min((performance.now() - receiptFeed.start) / 1200, 1);
      receiptStrip.scale.y = Math.max(0.001, Math.floor(t * 12) / 12);
      receiptStrip.rotation.x = -0.25 * receiptStrip.scale.y;   // the free end curls out
      if (t === 1) receiptFeed = null;
    }
```

и `printReceipt` в возвращаемом API; ресурсы ленты — в `dispose`.
- [ ] `npm run build:kiosk`, `npm test`; commit.

### Task 6: проверка

- [ ] Компьютер 1280×720 и телефон 390×844 (нырок): `#resume`, печать, «Распечатать ещё» (новый номер), «Связаться →» ведёт к листовке, «◀ Назад»; лента в 3D висит из щели (кадр со стороны); билборд без резюме, ссылка «выписка в терминале» открывает терминал; консоль чистая; `npm test` зелёный.
