# Печать чека и телефон со «Змейкой» — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** печать чека видна (камера у щели, лента с настоящим чеком, звук), чек читается «в руке»; в снегу лежит телефон со «Змейкой».

**Architecture:** чистая логика змейки в `snake.js`; общий слой «в руке» (`#hand-slot`) для чека и телефона; новые пресеты камеры `printer` и `phone` из модели; `scene.printReceipt(draw)` возвращает Promise окончания ленты.

**Tech Stack:** ES-модули, three.js r186, Web Audio, Blender 5, `node --test`.

Спека: `docs/superpowers/specs/2026-10-10-kiosk-printing-and-phone-design.md`.

---

### Task 1: логика «Змейки» (TDD) — `assets/js/kiosk/snake.js`, `tests/kiosk-snake.test.mjs`
- [ ] Тесты: старт (длина 3, вправо, еда не на змейке), шаг вперёд, поворот не разворачивает на 180°, рост и счёт на еде, проход сквозь край, проигрыш при врезании в себя.
- [ ] `createSnake({ cols = 20, rows = 12, random = Math.random })` → `{ state, turn(dir), step() }`, `state = { snake: [[x,y],…], dir, food, score, over }`.
- [ ] `drawSnake(context, w, h, state, { title, best })` — зелёный LCD.
- [ ] commit.

### Task 2: модель — надпись терминала, телефон, камеры
- [ ] Тест: `terminal_label` есть; `hs_phone`, `phone_screen` (свой материал), `hs_phone_area` (невидимая), `cam_printer`/`tgt_printer`, `cam_phone`/`tgt_phone`.
- [ ] `street.py`: надпись «ОПЫТ\nИ НАВЫКИ»; телефон в снегу у следов справа (≈(0.75, −2.55)); невидимый бокс нажатия 0.32 × 0.32 × 0.12, `hit_area`.
- [ ] `build.py`: `printer` — перед щелью чека, `phone` — сверху наискосок над телефоном.
- [ ] `npm run build:kiosk`; commit.

### Task 3: резюме на экране и печать
- [ ] `pages.js`: `renderResumeScreen(site, resume)` — страница терминала с разделами и кнопками «Распечатать чек» (`data-action="terminal-print"`), «◀ Назад»; `renderPrinting()` — «Печатаем… возьмите чек ↓»; тесты.
- [ ] `receipt-paper.js`: `drawReceiptPaper(context, w, h, data)` — холст ленты с текстом чека; тест текста.
- [ ] `scene.js`: `printReceipt(draw)` → Promise, лента 0.08 × 0.30 м с текстурой, рывки 2.6 с; хотспоты/пресеты `printer`, `phone` (LOCKED, ничего не кликается кроме `hs_phone` в `phone`).
- [ ] Звук принтера в `printer-sound.js` (пила 180 Гц + фильтр, рывками).
- [ ] commit.

### Task 4: слой «в руке», чек и телефон
- [ ] `ui.js`: `renderHand(html, kind)`; CSS: выезжает снизу, поворот на 1–2°, тень, «Назад».
- [ ] `app.js`: `#resume` → `renderResumeScreen`; печать: экран «Печатаем…» → `focusPreset('printer')` → `printReceipt` → слой с чеком; `hs_phone` → `focusPreset('phone')` → слой с телефоном и игрой (клавиатура, клавиши, свайп, рекорд в `localStorage` в try/catch, писк); закрытие слоя = `goBack()`; Esc закрывает слой.
- [ ] Вспышки экрана телефона раз в ~12 с.
- [ ] commit.

### Task 5: проверка
- [ ] Компьютер и телефон: печать видна, чек в руке, «Назад»; телефон находится, игра идёт, проигрыш/рестарт, рекорд; консоль чистая; `npm test`.

### Task 6: карточка «Как тут ходить» (добавлено по просьбе Марата: «сделай правила понятнее, когда человек заходит»)
- [ ] `ui.js`: `renderGuide({ touch })` — бумажная карточка: как осматриваться, наводить, подходить, отходить (свои слова для мыши и пальца), строка «что где», кнопка «Понятно»; тест.
- [ ] `app.js`: показывать при первом заходе (после загрузки; `localStorage` в try/catch — без него показывать каждый раз), «Как тут ходить?» открывает её на всех устройствах (на телефоне кнопка возвращается в меню); Esc и «Понятно» закрывают.
- [ ] CSS: по центру, крупный текст, на телефоне — во всю ширину над меню.
- [ ] commit.
