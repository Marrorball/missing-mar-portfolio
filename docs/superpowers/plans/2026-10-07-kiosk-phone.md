# Ларёк на телефоне — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** с телефона ларьком удобно пользоваться: экраны раскрываются во весь телефон, вертушка заполняет экран, главный кадр крупнее.

**Architecture:** чистые функции телефонного режима в новом `assets/js/kiosk/dive.js`. `scene.js` раскрывает страницу экрана после прилёта камеры (класс `is-dived`, clip-path от прямоугольника экрана до краёв) и сворачивает её перед отлётом, сообщает об этом через `onDive`. `app.js` ставит `body.is-dived` и ловит свайп по телевизору. Вид — в `screens.css`. Кадры вертушки и обзора на телефоне считаются в `scene.js`.

**Tech Stack:** three.js r186 (vendored), обычный ES-модульный JS без сборки, CSS container/media queries, Web Animations API, `node --test`.

Спека: `docs/superpowers/specs/2026-10-07-kiosk-phone-design.md`.

---

### Task 1: чистые функции телефонного режима

**Files:**
- Create: `assets/js/kiosk/dive.js`
- Test: `tests/kiosk-dive.test.mjs`

- [ ] **Step 1: тест**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { diveClip, isPhone, swipeStep } from '../assets/js/kiosk/dive.js';

test('a phone is narrow, or short when turned on its side; tablets and desktops are not', () => {
  assert.equal(isPhone(390, 844), true);
  assert.equal(isPhone(320, 568), true);
  assert.equal(isPhone(844, 390), true);
  assert.equal(isPhone(820, 1180), false);
  assert.equal(isPhone(1280, 720), false);
});

test('the clip shows only the screen rectangle of a full-viewport page', () => {
  assert.equal(diveClip({ left: 20, top: 300, width: 335, height: 250 }, { width: 375, height: 812 }, 18),
    'inset(300px 20px 262px 20px round 18px)');
  // a rectangle that pokes past an edge never gives a negative inset
  assert.equal(diveClip({ left: -5, top: -5, width: 400, height: 900 }, { width: 375, height: 812 }),
    'inset(0px 0px 0px 0px round 0px)');
});

test('a flick across is a channel step, a scroll or a short slide is not', () => {
  assert.equal(swipeStep(-120, 10), 1);
  assert.equal(swipeStep(120, -8), -1);
  assert.equal(swipeStep(-30, 0), 0);
  assert.equal(swipeStep(-90, 80), 0);
});
```

- [ ] **Step 2:** `node --test tests/kiosk-dive.test.mjs` → FAIL (модуля нет).

- [ ] **Step 3: реализация**

```js
// Phones: the screen you walked up to opens to the whole phone. Pure helpers
// for that mode, shared by the scene and the app.

// Narrow phones standing up, and any phone turned on its side.
export function isPhone(width, height) {
  return width <= 760 || height <= 500;
}

// A clip-path that shows only `rect` of a page covering `viewport`.
export function diveClip(rect, viewport, radius = 0) {
  const top = Math.max(0, Math.round(rect.top));
  const left = Math.max(0, Math.round(rect.left));
  const right = Math.max(0, Math.round(viewport.width - rect.left - rect.width));
  const bottom = Math.max(0, Math.round(viewport.height - rect.top - rect.height));
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;
}

// A flick across the TV: 1 next channel (finger moves left), -1 previous,
// 0 for anything shorter or more up-and-down than across.
export function swipeStep(dx, dy, min = 60) {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
```

- [ ] **Step 4:** `npm test` → всё PASS.
- [ ] **Step 5:** commit `feat: phone-mode helpers: is it a phone, the dive clip, a TV flick`.

### Task 2: нырок в сцене

**Files:** Modify `assets/js/kiosk/scene.js`.

- [ ] **Step 1:** импорт `import { diveClip, isPhone } from './dive.js';`, параметр `onDive = () => {}` в `createKioskScene`.
- [ ] **Step 2:** после `showScreen` добавить состояние и функции:

```js
  // Phones: once you've walked up to a screen it opens to the whole phone,
  // the way the reference's vending machine fills it. The page keeps its final
  // layout and a clip opens from the screen's rectangle to the edges, so
  // nothing stretches; going back closes it the same way.
  let dived = null;
  const OPEN = 'inset(0px 0px 0px 0px round 0px)';
  function restingRect(name) {
    const { width, height } = pagePixels(name, camera.position.distanceTo(screens[name].center));
    return { left: (container.clientWidth - width) / 2, top: (container.clientHeight - height) / 2, width, height };
  }
  function dive(name, { animate = true } = {}) {
    if (dived === name || !isPhone(container.clientWidth, container.clientHeight)) return;
    const { element } = screens[name];
    const viewport = { width: container.clientWidth, height: container.clientHeight };
    const from = diveClip(restingRect(name), viewport, 18);
    dived = name;
    element.classList.add('is-dived');
    onDive(name);
    if (animate && element.animate) {
      element.animate([{ clipPath: from }, { clipPath: OPEN }], { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)' });
    }
  }
  function undive({ animate = true } = {}) {
    if (!dived) return Promise.resolve();
    const name = dived;
    const { element } = screens[name];
    dived = null;
    const finish = () => {
      element.classList.remove('is-dived');
      onDive(null);
    };
    if (!animate || !element.animate) {
      finish();
      return Promise.resolve();
    }
    const viewport = { width: container.clientWidth, height: container.clientHeight };
    const motion = element.animate([{ clipPath: OPEN, opacity: 1 }, { clipPath: diveClip(restingRect(name), viewport, 18), opacity: 0 }],
      { duration: 240, easing: 'cubic-bezier(.4, 0, .8, .4)', fill: 'forwards' });
    return motion.finished.catch(() => {}).then(() => {
      finish();
      element.classList.remove('is-on', 'is-landed');
      motion.cancel();
    });
  }
```

- [ ] **Step 3:** `showScreen` снимает нырок, если показывают другой экран (страховка):

```js
  function showScreen(name, { landed = false } = {}) {
    if (dived && name !== dived) {
      screens[dived].element.classList.remove('is-dived');
      dived = null;
      onDive(null);
    }
    ...
```

- [ ] **Step 4:** `arrive(name, { landed = false, instant = false } = {})` после `showScreen(name, { landed })` вызывает `dive(name, { animate: !instant })`. Instant-ветка `travel` зовёт `arrive(name, { instant: true })`. В кадре, когда доворачиваются ламели билборда: `if (!flight && current === 'billboard') { showScreen('billboard'); dive('billboard'); }`. `turnBillboard` не прячет страницу, если она раскрыта: `if (dived !== 'billboard') showScreen(null);`.
- [ ] **Step 5:** `travel` → `travelNow`; новый `travel` сначала сворачивает нырок, если камера уходит:

```js
  let pendingTravel = null;
  function travel(name, view, fov, options = {}) {
    const staying = dived === name && !flight && name === current
      && camera.position.distanceTo(view.position) < 1e-3 && Math.abs(camera.fov - fov) < 1e-3;
    if (dived && !staying) {
      const first = !pendingTravel;
      pendingTravel = [name, view, fov, options];
      if (first) undive({ animate: !options.instant }).then(() => {
        const [n, v, f, o] = pendingTravel;
        pendingTravel = null;
        travelNow(n, v, f, { ...o, quiet: true });
      });
      return;
    }
    travelNow(name, view, fov, options);
  }
```

В `travelNow` после `fly(name, view, fov);` — `if (options.quiet) flight.leavingPage = null;` (свёрнутая страница уже погасла, второй раз не показываем).
- [ ] **Step 6:** палец: радиусы в `pickTouch` `[8, 16, 24]`.
- [ ] **Step 7:** `npm test` PASS; commit `feat: on phones a screen opens to the whole phone after the walk up`.

### Task 3: приложение — класс на body и свайп по телевизору

**Files:** Modify `assets/js/app.js`.

- [ ] **Step 1:** `import { swipeStep } from './kiosk/dive.js';`
- [ ] **Step 2:** в `createKioskScene({...})`:

```js
      onDive: name => {
        document.body.classList.toggle('is-dived', Boolean(name));
        if (name) document.body.dataset.dived = name;
        else delete document.body.dataset.dived;
      },
```

- [ ] **Step 3:** свайп:

```js
// Phones: a flick across the open TV changes the channel, like CH+ / CH−.
let swipe = null;
document.addEventListener('pointerdown', event => {
  swipe = document.body.dataset.dived === 'tv' && event.pointerType !== 'mouse' && event.target.closest('.screen-tv')
    ? { x: event.clientX, y: event.clientY } : null;
});
document.addEventListener('pointercancel', () => { swipe = null; });
document.addEventListener('pointerup', event => {
  if (!swipe) return;
  const step = swipeStep(event.clientX - swipe.x, event.clientY - swipe.y);
  swipe = null;
  if (step && state.preset === 'tv') changeChannel(step);
});
```

- [ ] **Step 4:** commit `feat: body knows when a screen is open on a phone; flick the TV to change channel`.

### Task 4: вид нырка

**Files:** Modify `assets/css/screens.css` (в конец).

- [ ] **Step 1:** CSS:

```css
/* ---------- phones: the screen you walked up to fills the phone ----------
   Same page, same dress. The container gets another name so the compact
   rules for the small physical screens stop applying and the phone ones do. */
.kiosk-screens .screen-page.is-dived {
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  transform: none !important;
  opacity: 1 !important;
  border-radius: 0;
  box-shadow: none;
  animation: none;
  container: dived-screen / inline-size;
}

.is-dived .screen-scroll {
  padding-bottom: calc(84px + env(safe-area-inset-bottom));
}

/* the TV: a black rim, the curved glass inside it, the remote as Fastext keys */
.kiosk-screens .screen-tv.is-dived { background: #050505; }
.kiosk-screens .screen-tv.is-dived .screen-scroll,
.kiosk-screens .screen-tv.is-dived::after {
  inset: max(6px, env(safe-area-inset-top)) 6px max(6px, env(safe-area-inset-bottom));
  border-radius: 26px / 20px;
}
.kiosk-screens .screen-tv.is-dived .screen-scroll {
  background: linear-gradient(#101a3c, var(--crt) 40%, #060914);
  touch-action: pan-y;
}
.screen-tv.is-dived:has(.ttx) .screen-scroll { background: #000; }

body.is-dived .kiosk-help { display: none; }

body[data-dived="tv"] .kiosk-back,
body[data-dived="tv"] .tv-remote [data-action="tv-scroll"] { display: none; }

body[data-dived="tv"] .tv-remote {
  top: auto;
  right: 12px;
  bottom: calc(max(6px, env(safe-area-inset-bottom)) + 8px);
  left: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  width: auto;
  padding: 6px;
  background: rgba(0, 0, 0, .86);
  border-radius: 0 0 20px 20px;
  box-shadow: none;
  transform: none;
}
body[data-dived="tv"] .tv-remote button {
  min-height: 46px;
  color: #000;
  border-radius: 0;
  box-shadow: none;
  font: 700 15px var(--pt-mono);
}
body[data-dived="tv"] .tv-remote [data-action="tv-off"] { order: 1; color: #fff; background: #d0281e; font-size: 0; }
body[data-dived="tv"] .tv-remote [data-action="tv-off"]::before { content: '← НАЗАД'; font-size: 15px; }
body[data-dived="tv"] .tv-remote [data-step="-1"][data-action="tv-channel"] { order: 2; background: #2fbf4a; }
body[data-dived="tv"] .tv-remote [data-action="tv-menu"] { order: 3; background: #ffe14d; }
body[data-dived="tv"] .tv-remote [data-step="1"][data-action="tv-channel"] { order: 4; background: #3a7bff; color: #fff; }

/* paper screens: plain readable paper, Back as a paper tag at the thumb */
.kiosk-screens .screen-billboard.is-dived::after,
.kiosk-screens .screen-billboard.is-dived::before { display: none; }
.kiosk-screens .screen-billboard.is-dived .screen-scroll { padding-top: env(safe-area-inset-top); }
.kiosk-screens .screen-flyer.is-dived,
.kiosk-screens .screen-price.is-dived { background: #39404c; }
.kiosk-screens .screen-flyer.is-dived::after,
.kiosk-screens .screen-price.is-dived::after { display: none; }
.is-dived .flyer-page,
.is-dived .price-sheet {
  width: min(100% - 24px, 460px);
  margin: calc(16px + env(safe-area-inset-top)) auto 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .4);
}
.kiosk-screens .screen-terminal.is-dived .screen-scroll { padding-top: env(safe-area-inset-top); }

body.is-dived:not([data-dived="tv"]) .kiosk-back {
  top: auto;
  right: 16px;
  bottom: calc(14px + env(safe-area-inset-bottom));
  left: 16px;
  justify-content: center;
  min-height: 52px;
  transform: none;
}
```

- [ ] **Step 2:** медиа-правила телефона (`@media (max-width: 760px)` в `screens.css` с крупными заголовками) — также для лёжа: `@media (max-width: 760px), (max-height: 500px)`.
- [ ] **Step 3:** проверка в браузере (Task 7), commit `style: open screens dressed as their objects, the remote as Fastext keys`.

### Task 5: вертушка во весь телефон

**Files:** Modify `assets/js/kiosk/scene.js` (`destinationView`).

- [ ] **Step 1:**

```js
  // Phones: the rack's face is tall and narrow like the phone, so it fills it
  // between Back above and the rack's arrows and the menu below.
  function rackPhoneView(fov) {
    if (!rack || !presets.rack) return null;
    const centre = rack.getWorldPosition(new THREE.Vector3());
    const facing = presets.rack.position.clone().sub(presets.rack.target).setY(0).normalize();
    let lowest = 1.43;
    root.traverse(object => {
      if (!/^disc_\d+$/.test(object.name) || !isShown(object)) return;
      const at = object.getWorldPosition(new THREE.Vector3());
      if (at.clone().sub(centre).dot(facing) > 0.15) lowest = Math.min(lowest, at.y);
    });
    const top = 1.96;
    const bottom = lowest - 0.14;
    const height = container.clientHeight;
    const above = 72;
    const below = 150;
    const usable = Math.max(120, height - above - below) / height;
    const distance = Math.max(fitDistance(0, top - bottom, fov, camera.aspect, usable),
      fitDistance(0.62, 0, fov, camera.aspect, 0.94));
    const visible = 2 * distance * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const target = new THREE.Vector3(centre.x, (top + bottom) / 2 + ((above - below) / 2 / height) * visible, centre.z);
    return { target, position: target.clone().addScaledVector(facing, distance) };
  }
```

В `destinationView` в начале: `if (name === 'rack' && isPhone(container.clientWidth, container.clientHeight)) { const view = rackPhoneView(SCREEN_FOV); if (view) return { view, fov: SCREEN_FOV }; }`.

- [ ] **Step 2:** commit `feat: on phones the rack's face fills the screen`.

### Task 6: обзор крупнее

**Files:** Modify `assets/js/kiosk/scene.js` (`fitSmallOverview`).

- [ ] **Step 1:** на телефоне стоя (`camera.aspect < 0.8`) вписывать только ларёк со створками, вывеску и вертушку (`hs_showcase`, `hs_flyer`, `hs_pricelist`, `hs_rack`, `kiosk_signbox`); терминал и билборд могут уходить за край. После вписывания по ширине сдвинуть цель по вертикали так, чтобы рамка объектов стояла по центру между верхом и нижним меню (снизу 90 px).
- [ ] **Step 2:** проверить скриншотом 390×844 и 320×568: ларёк с вывеской ≥ 55 % ширины, пустого снега снизу ≤ 15 % высоты; подобрать коэффициенты.
- [ ] **Step 3:** commit `feat: a closer street view on phones`.

### Task 7: проверка и QA

- [ ] `npm test` — всё PASS.
- [ ] Браузер с эмуляцией касаний (Claude Browser, mobile preset; 390×844, 320×568, 844×390): проект, телепрограмма, «Обо мне» ↔ «Прайс», прайс на ставне, листовка, терминал раскрываются на весь экран; горизонтального переполнения нет; «← НАЗАД»/«Назад» возвращают к сцене; свайп меняет канал; обложки на вертушке ≥ 80 px шириной; консоль без ошибок.
- [ ] 820×1180 и 1280×720: нырка нет, всё как раньше.
- [ ] Скриншоты в `docs/superpowers/qa/kiosk-phone/` + README; commit `docs: phone QA`.
