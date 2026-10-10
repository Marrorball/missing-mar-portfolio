# Радио в ларьке — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** кассетник играет три станции нулевых; переключение видно (пульт со стрелками, стрелка на шкале, бегущий дисплей) и слышно (шум эфира); снаружи звук приглушён.

**Architecture:** `radio.js` — станции, чистые функции и звук (`<audio crossorigin>` → BiquadFilter → Gain, шум эфира из буфера). `scene.js` двигает стрелку, зажигает лампочку и рисует дисплей по `setRadio(...)`. `app.js` связывает клик по `hs_radio`, пульт и «внутри/снаружи».

**Tech Stack:** Web Audio API, three.js r186, Blender 5, `node --test`.

Спека: `docs/superpowers/specs/2026-10-10-kiosk-radio-design.md`.

---

### Task 1: `radio.js` — станции и чистые функции (TDD)

- [ ] Тест `tests/kiosk-radio.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, needleAt, roomTone, stationAfter } from '../assets/js/kiosk/radio.js';

test('three stations of the 2000s, each a secure stream', () => {
  assert.equal(STATIONS.length, 3);
  for (const station of STATIONS) assert.match(station.url, /^https:\/\/.+\.aacp$/);
  assert.deepEqual(STATIONS.map(station => station.name), ['Russian Gold', 'Russian Hits', 'Pop Gold 2000s']);
});

test('the arrows go round the stations', () => {
  assert.equal(stationAfter(0, 1, 3), 1);
  assert.equal(stationAfter(2, 1, 3), 0);
  assert.equal(stationAfter(0, -1, 3), 2);
});

test('the needle sits along the scale, first station at the left end', () => {
  assert.equal(needleAt(0, 3), 0);
  assert.equal(needleAt(1, 3), 0.5);
  assert.equal(needleAt(2, 3), 1);
});

test('through the wall the radio is muffled and quieter', () => {
  const inside = roomTone(true);
  const outside = roomTone(false);
  assert.ok(outside.cutoff < inside.cutoff / 5);
  assert.ok(outside.level < inside.level);
});
```

- [ ] Реализация: `STATIONS`, `stationAfter`, `needleAt`, `roomTone`, `createRadio({ win, onChange })` с методами `press()` (вкл / следующая), `step(dir)`, `off()`, `setInside(bool)`, полями `on`, `index`, `state` ('off' | 'seeking' | 'playing' | 'static').
- [ ] commit.

### Task 2: модель — стрелка, лампочка, якорь дисплея

- [ ] Тест (`kiosk-scene-file`): `radio_needle`, `radio_led`, `screen_radio` есть и их родитель — `hs_radio`; материал `radio_led` свой.
- [ ] `props.radio_details`: `radio_needle` — красная планка 2×3×26 мм у левого края шкалы (x = −0.035, y = 0.0805, z = 0.069); `radio_led` — 8×4×8 мм справа от шкалы (x = 0.06, z = 0.069); `screen('screen_radio', (0, 0.0785, 0.07), 0.076, 0.026, rot_z=π, parent=radio)` поверх окошка дисплея.
- [ ] `npm run build:kiosk`, commit.

### Task 3: сцена — `setRadio`

- [ ] `scene.js`: найти `radio_needle`, `radio_led`, `screen_radio`; `setRadio({ on, index, count, text, seeking })`; в кадре: стрелка плавно едет к `needleAt`, лампочка (`emissive`), дисплей — canvas 256×88, зелёный LCD, бегущая строка ~12 кадров/с, при `seeking` — «ПОИСК» и полоски шума; выключен — тёмный.
- [ ] commit.

### Task 4: пульт и связка

- [ ] `ui.js`: `renderRadioPanel(name, direction)` — `◀︎ FM <name> ▶︎ ✕` (`data-action="radio-step"`, `radio-off`); тест в `kiosk-ui`.
- [ ] `hotspots.js`: `hs_radio` → `{ type: 'radio' }`; тест.
- [ ] `app.js`: `createRadio`; клик по радио → `press()`; `radio-step` / `radio-off`; пульт в `.kiosk-chrome`; ярлык при наведении; `setInside(isInside(preset))` там же, где `syncDoorButton`; `onChange` → пульт + `state.kiosk.setRadio(...)` + заметка при «только шум».
- [ ] CSS: `.radio-panel` справа вверху (бумажная плашка), въезд названия, скрыт при `body.is-dived`.
- [ ] commit.

### Task 5: проверка

- [ ] Браузер (Chrome, AAC): включение по клику, «ПОИСК» → играет, стрелки и клик листают, ✕ выключает, снаружи приглушено, стрелка и лампочка в 3D, телефон 390×844; консоль чистая; `npm test`.
