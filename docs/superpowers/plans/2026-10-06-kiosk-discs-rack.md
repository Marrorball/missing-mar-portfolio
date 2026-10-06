# Discs, Rack, Billboard and Contacts Implementation Plan (stage 3a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every project becomes a DVD: all of them sit in a spinnable DVD rack inside the kiosk, featured ones on the showcase; a DVD player sits under the TV; a billboard stands behind the kiosk; close-up presets lock the camera and show «← К ларьку»; «Контакты» in the help bar opens a contact card in place.

**Architecture:** Blender gains the rack (32 named disc pockets on a rotating `dvd_rack` node), the player, the billboard and three screen anchors (`screen_tv`, `screen_terminal`, `screen_billboard`, with `width`/`height` exported as glTF extras for stage 3b/3c). Pure modules decide hits (`slots.js`), rack faces (`discs.js`) and contact links (`contacts.js`). `hotspots.js` learns the new presets, locked close-ups and disc picking. `scene.js` locks the camera on close-ups and spins the rack. The existing overlay views stay until stages 3b/3c replace them with in-scene screens.

**Tech Stack:** Blender 5.0 bpy, three.js, vanilla ES modules, `node --test`, Python `unittest`.

Spec: `docs/superpowers/specs/2026-10-06-kiosk-portfolio-design.md` («Диски и проекты», «Экраны в сцене», «Контакты»).

Code blocks preceded by `<!-- file: path -->` are complete file contents.

---

## File map

| File | Responsibility |
| --- | --- |
| `assets/js/kiosk/slots.js` | Showcase hits: featured projects only |
| `assets/js/kiosk/discs.js` | Rack faces by category, 8 pockets per face, overflow |
| `assets/js/kiosk/contacts.js` | Validated contact links from content |
| `assets/js/kiosk/hotspots.js` | Presets, locked close-ups, hotspot table, picking incl. discs |
| `assets/js/kiosk/ui.js` | Help bar, contact card, back button, rack controls, existing views |
| `assets/js/kiosk/scene.js` | Locked close-ups, rack spinning and snapping, disc visibility |
| `assets/js/app.js` | Wiring of all of the above |
| `assets/css/kiosk.css` | Back button, rack controls, contact card |
| `scripts/kiosk/dims.py` | New positions: rack, chair, TV, billboard |
| `scripts/kiosk/lib.py` | `screen()` anchor with size extras |
| `scripts/kiosk/interior.py` | Rack with discs, DVD player, TV screen as its own node |
| `scripts/kiosk/street.py` | Billboard, terminal screen as its own node |
| `scripts/kiosk/build.py` | New camera presets, glTF extras |
| `tests/kiosk-*.test.mjs` | Updated and new tests |

---

### Task 1: Hits on the showcase

**Files:**
- Modify: `assets/js/kiosk/slots.js` (full replacement)
- Modify: `tests/kiosk-slots.test.mjs` (full replacement)

- [ ] **Step 1: Write the failing test**

<!-- file: tests/kiosk-slots.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_COUNT, assignHits } from '../assets/js/kiosk/slots.js';

test('the showcase shows featured projects in featured order', () => {
  const hits = assignHits([
    { id: 'a', title: 'A', featured: true, featuredOrder: 20 },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C', shortLabel: 'CC', featured: true, featuredOrder: 10 }
  ]);
  assert.deepEqual(hits, [
    { node: 'slot_0', projectId: 'c', title: 'CC' },
    { node: 'slot_1', projectId: 'a', title: 'A' }
  ]);
});

test('at most eight hits, none when nothing is featured', () => {
  const many = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}`, title: `P${index}`, featured: true, featuredOrder: index }));
  assert.equal(SLOT_COUNT, 8);
  assert.equal(assignHits(many).length, 8);
  assert.equal(assignHits(many)[7].node, 'slot_7');
  assert.deepEqual(assignHits([{ id: 'x', title: 'X' }]), []);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-slots.test.mjs`
Expected: FAIL, `assignHits` is not exported.

- [ ] **Step 3: Implement**

<!-- file: assets/js/kiosk/slots.js -->
```js
export const SLOT_COUNT = 8;

// The showcase carries the «hits»: projects marked `featured`, in
// featuredOrder. Every project also has its disc in the rack inside.
export function assignHits(projects = [], count = SLOT_COUNT) {
  return projects
    .filter(project => project.featured)
    .sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0))
    .slice(0, count)
    .map((project, index) => ({
      node: `slot_${index}`,
      projectId: project.id,
      title: project.shortLabel || project.title
    }));
}
```

- [ ] **Step 4: Run it**

Run: `node --test tests/kiosk-slots.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit** (app.js still imports `assignSlots`; Task 7 rewires it, so the browser is broken between Task 1 and Task 7)

```bash
git add assets/js/kiosk/slots.js tests/kiosk-slots.test.mjs
git commit -m "feat: showcase hits are the featured projects"
```

---

### Task 2: Rack faces

**Files:**
- Create: `assets/js/kiosk/discs.js`
- Create: `tests/kiosk-discs.test.mjs`

- [ ] **Step 1: Write the failing test**

<!-- file: tests/kiosk-discs.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { POCKETS_PER_FACE, RACK_FACES, assignDiscs } from '../assets/js/kiosk/discs.js';

const categories = [
  { id: 'graphic', title: 'Графика', order: 20 },
  { id: 'uxui', title: 'UX/UI', order: 10 }
];
const make = (count, category, prefix) =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}`, title: `${prefix}${index}`, category }));

test('each category starts on its own face, in category order', () => {
  const { faces, discs, overflow } = assignDiscs([...make(3, 'graphic', 'g'), ...make(2, 'uxui', 'u')], categories);
  assert.deepEqual(faces, [{ index: 0, title: 'UX/UI' }, { index: 1, title: 'Графика' }]);
  assert.deepEqual(discs.map(disc => disc.node), ['disc_0', 'disc_1', 'disc_8', 'disc_9', 'disc_10']);
  assert.deepEqual(discs[2], { node: 'disc_8', projectId: 'g0', title: 'g0', face: 1 });
  assert.deepEqual(overflow, []);
});

test('a big category spills onto the next faces, the rest goes to the TV guide only', () => {
  const { faces, discs, overflow } = assignDiscs(make(40, 'uxui', 'u'), categories);
  assert.equal(RACK_FACES * POCKETS_PER_FACE, 32);
  assert.equal(faces.length, 4);
  assert.equal(discs.length, 32);
  assert.equal(discs[31].node, 'disc_31');
  assert.equal(overflow.length, 8);
  assert.equal(overflow[0], 'u32');
});

test('projects without a known category go to «Разное»', () => {
  const { faces, discs } = assignDiscs([{ id: 'x', title: 'X', category: 'video' }], categories);
  assert.deepEqual(faces, [{ index: 0, title: 'Разное' }]);
  assert.equal(discs[0].node, 'disc_0');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-discs.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

<!-- file: assets/js/kiosk/discs.js -->
```js
export const RACK_FACES = 4;
export const POCKETS_PER_FACE = 8;

// Fills the DVD rack face by face. Each category starts on a fresh face and
// takes as many faces as it needs; projects that do not fit are only listed
// in the TV guide.
export function assignDiscs(projects = [], categories = []) {
  const ordered = [...categories].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const known = new Set(ordered.map(category => category.id));
  const groups = ordered.map(category => ({
    title: category.title,
    items: projects.filter(project => project.category === category.id)
  }));
  groups.push({ title: 'Разное', items: projects.filter(project => !known.has(project.category)) });

  const faces = [];
  const discs = [];
  const overflow = [];
  for (const group of groups) {
    for (let start = 0; start < group.items.length; start += POCKETS_PER_FACE) {
      const chunk = group.items.slice(start, start + POCKETS_PER_FACE);
      if (faces.length === RACK_FACES) {
        overflow.push(...chunk.map(project => project.id));
        continue;
      }
      const face = faces.length;
      faces.push({ index: face, title: group.title });
      chunk.forEach((project, pocket) => discs.push({
        node: `disc_${face * POCKETS_PER_FACE + pocket}`,
        projectId: project.id,
        title: project.shortLabel || project.title,
        face
      }));
    }
  }
  return { faces, discs, overflow };
}
```

- [ ] **Step 4: Run it**

Run: `node --test tests/kiosk-discs.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/discs.js tests/kiosk-discs.test.mjs
git commit -m "feat: lay projects out on the DVD rack by category"
```

---

### Task 3: Contact links

**Files:**
- Create: `assets/js/kiosk/contacts.js`
- Create: `tests/kiosk-contacts.test.mjs`

- [ ] **Step 1: Write the failing test**

<!-- file: tests/kiosk-contacts.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { contactLinks } from '../assets/js/kiosk/contacts.js';

test('builds ready links from the content contacts', () => {
  assert.deepEqual(contactLinks({
    telegram: '@marrorball',
    email: 'marrorball@gmail.com',
    behance: 'https://www.behance.net/marmaraj11'
  }), [
    { kind: 'telegram', label: 'Telegram', value: '@marrorball', href: 'https://t.me/marrorball' },
    { kind: 'email', label: 'Почта', value: 'marrorball@gmail.com', href: 'mailto:marrorball@gmail.com' },
    { kind: 'behance', label: 'Behance', value: 'www.behance.net/marmaraj11', href: 'https://www.behance.net/marmaraj11' }
  ]);
});

test('drops anything malformed or unsafe', () => {
  assert.deepEqual(contactLinks({ telegram: 'a b', email: 'nope', behance: 'javascript:alert(1)' }), []);
  assert.deepEqual(contactLinks({ behance: 'http://example.com' }), []);
  assert.deepEqual(contactLinks(), []);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-contacts.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

<!-- file: assets/js/kiosk/contacts.js -->
```js
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM = /^[A-Za-z0-9_]{5,32}$/;

function httpsUrl(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// Content contacts as ready-to-click links; anything malformed is dropped.
export function contactLinks(contacts = {}) {
  const links = [];
  const telegram = String(contacts.telegram || '').replace(/^@/, '');
  if (TELEGRAM.test(telegram)) {
    links.push({ kind: 'telegram', label: 'Telegram', value: `@${telegram}`, href: `https://t.me/${telegram}` });
  }
  if (EMAIL.test(contacts.email || '')) {
    links.push({ kind: 'email', label: 'Почта', value: contacts.email, href: `mailto:${contacts.email}` });
  }
  const behance = httpsUrl(contacts.behance);
  if (behance) {
    links.push({ kind: 'behance', label: 'Behance', value: behance.replace(/^https:\/\//, '').replace(/\/$/, ''), href: behance });
  }
  return links;
}
```

- [ ] **Step 4: Run it**

Run: `node --test tests/kiosk-contacts.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/contacts.js tests/kiosk-contacts.test.mjs
git commit -m "feat: validated contact links for the contact card"
```

---

### Task 4: Presets, close-ups and disc picking

**Files:**
- Modify: `assets/js/kiosk/hotspots.js` (full replacement)
- Modify: `tests/kiosk-hotspots.test.mjs` (full replacement)

- [ ] **Step 1: Write the failing test**

<!-- file: tests/kiosk-hotspots.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOTSPOTS,
  PRESETS,
  ROUTE_PRESETS,
  fitFov,
  hotspotForNode,
  isPickable,
  pickHotspot,
  presetLimits
} from '../assets/js/kiosk/hotspots.js';

const hits = [{ node: 'slot_0', projectId: 'kortex', title: 'KORTEX' }];
const discs = [
  { node: 'disc_0', projectId: 'kortex', title: 'KORTEX', face: 0 },
  { node: 'disc_9', projectId: 'учи ру', title: 'УЧИ.РУ', face: 1 }
];

test('a slot or disc behind the see-through showcase glass wins over the glass', () => {
  assert.equal(pickHotspot(['hs_showcase', 'slot_0']), 'slot_0');
  assert.equal(pickHotspot(['hs_showcase', 'disc_9']), 'disc_9');
});

test('the glass itself is picked when nothing pickable is behind it', () => {
  assert.equal(pickHotspot(['hs_showcase', 'kiosk_wall_back']), 'hs_showcase');
});

test('an opaque object in front blocks everything behind it', () => {
  assert.equal(pickHotspot(['kiosk_front_lower', 'hs_flyer']), null);
  assert.equal(pickHotspot([]), null);
  assert.equal(pickHotspot(['hs_terminal']), 'hs_terminal');
});

test('the window grille never blocks what is behind it', () => {
  assert.equal(pickHotspot(['kiosk_grille', 'hs_showcase', 'slot_0']), 'slot_0');
  assert.equal(pickHotspot(['kiosk_grille', 'hs_flyer']), 'hs_flyer');
  assert.equal(pickHotspot(['kiosk_grille']), null);
});

test('recognises hotspot, slot and disc node names only', () => {
  assert.equal(isPickable('hs_rack'), true);
  assert.equal(isPickable('slot_7'), true);
  assert.equal(isPickable('disc_31'), true);
  assert.equal(isPickable('terminal_screen'), false);
  assert.equal(isPickable(''), false);
});

test('hits and discs open their project, empty pockets nothing', () => {
  const route = '#project/%D1%83%D1%87%D0%B8%20%D1%80%D1%83';
  assert.deepEqual(hotspotForNode('disc_9', { hits, discs }), { label: 'УЧИ.РУ', action: { type: 'route', hash: route } });
  assert.equal(hotspotForNode('slot_0', { hits, discs }).action.hash, '#project/kortex');
  assert.equal(hotspotForNode('disc_3', { hits, discs }), null);
  assert.equal(hotspotForNode('slot_5', { hits, discs }), null);
  assert.equal(hotspotForNode('hs_rack').action.preset, 'rack');
  assert.equal(hotspotForNode('hs_billboard').action.hash, '#about');
  assert.equal(hotspotForNode('prop_chair'), null);
});

test('every route view and every focus action points at a known camera preset', () => {
  for (const view of ['home', 'project', 'about', 'contact', 'page', 'catalog', 'price']) {
    assert.ok(PRESETS.includes(ROUTE_PRESETS[view]), view);
  }
  for (const spot of Object.values(HOTSPOTS)) {
    if (spot.action.type === 'focus') assert.ok(PRESETS.includes(spot.action.preset), spot.action.preset);
  }
  assert.equal(ROUTE_PRESETS.project, 'tv');
  assert.equal(ROUTE_PRESETS.about, 'billboard');
});

test('close-ups lock the camera, the overview and the inside do not', () => {
  for (const preset of ['rack', 'tv', 'billboard', 'terminal']) assert.equal(presetLimits(preset).locked, true, preset);
  for (const preset of ['home', 'showcase', 'inside']) assert.ok(!presetLimits(preset).locked, preset);
  assert.equal(presetLimits('showcase'), presetLimits('home'));
});

test('inside the kiosk the camera is held close and the lens is wider', () => {
  assert.ok(presetLimits('inside').maxDistance < presetLimits('home').minDistance * 2);
  assert.ok(presetLimits('inside').fov > presetLimits('home').fov);
  assert.ok(presetLimits('home').maxPolarAngle < Math.PI / 2);
});

test('a portrait screen widens the lens so the kiosk still fits across', () => {
  assert.equal(fitFov(40, 1.6), 40);
  assert.equal(fitFov(40, 2.4), 40);
  const portrait = fitFov(40, 390 / 844);
  assert.ok(portrait > 60 && portrait <= 90, String(portrait));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-hotspots.test.mjs`
Expected: FAIL (`hs_rack`, `disc_*`, `tv` preset unknown).

- [ ] **Step 3: Implement**

<!-- file: assets/js/kiosk/hotspots.js -->
```js
export const PRESETS = ['home', 'showcase', 'inside', 'rack', 'tv', 'billboard', 'terminal'];

// Close-ups hold the camera still: you read or spin something, you don't orbit.
export const LOCKED_PRESETS = ['rack', 'tv', 'billboard', 'terminal'];

export const HOTSPOTS = {
  hs_showcase: { label: 'Хиты', action: { type: 'focus', preset: 'showcase' } },
  hs_flyer: { label: 'Обо мне', action: { type: 'route', hash: '#about' } },
  hs_billboard: { label: 'Обо мне', action: { type: 'route', hash: '#about' } },
  hs_pricelist: { label: 'Прайс', action: { type: 'route', hash: '#price' } },
  hs_terminal: { label: 'Контакты', action: { type: 'route', hash: '#contact' } },
  hs_backdoor: { label: 'Заглянуть внутрь', action: { type: 'focus', preset: 'inside' } },
  hs_rack: { label: 'Все диски', action: { type: 'focus', preset: 'rack' } },
  hs_tv: { label: 'Телевизор', action: { type: 'route', hash: '#catalog' } },
  hs_radio: { label: 'Радио', action: { type: 'note', text: 'Радио пока молчит.' } },
  hs_sign_away: {
    label: 'Отошёл',
    action: { type: 'note', text: 'Марат отошёл: ищет команду. Контакты — на терминале справа.' }
  }
};

export const ROUTE_PRESETS = {
  home: 'home',
  page: 'home',
  project: 'tv',
  catalog: 'tv',
  about: 'billboard',
  price: 'billboard',
  contact: 'terminal'
};

const OUTSIDE = { fov: 40, minDistance: 1.2, maxDistance: 9, minPolarAngle: 0.45, maxPolarAngle: 1.52 };
// Inside, the camera stands in the back corner: a wide lens and a short leash
// so turning around never pushes it through a wall.
const INSIDE = { fov: 62, minDistance: 0.4, maxDistance: 1.8, minPolarAngle: 1.0, maxPolarAngle: 1.75, azimuthSpan: 0.6 };
const CLOSE_UP = { fov: 40, locked: true };

const DESIGN_ASPECT = 1.6;
const MAX_FOV = 75;

// Presets are framed for a 16:10 screen. On narrower screens the vertical
// field of view opens up so the kiosk keeps (most of) its width in frame.
export function fitFov(fov, aspect) {
  if (aspect >= DESIGN_ASPECT) return fov;
  const half = Math.atan(Math.tan((fov * Math.PI) / 360) * (DESIGN_ASPECT / aspect));
  return Math.min((half * 360) / Math.PI, MAX_FOV);
}

export function presetLimits(preset) {
  if (preset === 'inside') return INSIDE;
  if (LOCKED_PRESETS.includes(preset)) return CLOSE_UP;
  return OUTSIDE;
}

const PROJECT_NODE = /^(slot|disc)_\d+$/;
const HOTSPOT_NAME = /^hs_[a-z_]+$/;

export function isPickable(name = '') {
  return PROJECT_NODE.test(name) || HOTSPOT_NAME.test(name);
}

// Thin enough to click through: hits on these are ignored.
const SEE_THROUGH = new Set(['kiosk_grille']);

// `names` are the pickable-or-mesh names of ray hits, nearest first. The
// showcase glass is see-through: a slot behind it wins, while anything opaque
// in front of a hotspot blocks it.
export function pickHotspot(names = []) {
  let glass = null;
  for (const name of names) {
    if (SEE_THROUGH.has(name)) continue;
    if (name === 'hs_showcase') {
      glass ??= name;
      continue;
    }
    if (isPickable(name)) return name;
    return glass;
  }
  return glass;
}

export function hotspotForNode(name, { hits = [], discs = [] } = {}) {
  if (PROJECT_NODE.test(name)) {
    const item = [...hits, ...discs].find(entry => entry.node === name);
    if (!item) return null;
    return {
      label: item.title,
      action: { type: 'route', hash: `#project/${encodeURIComponent(item.projectId)}` }
    };
  }
  return HOTSPOTS[name] || null;
}
```

- [ ] **Step 4: Run it**

Run: `node --test tests/kiosk-hotspots.test.mjs`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/hotspots.js tests/kiosk-hotspots.test.mjs
git commit -m "feat: close-up presets, rack and billboard hotspots, disc picking"
```

---

### Task 5: Help bar, contact card, back button, rack controls

**Files:**
- Modify: `assets/js/kiosk/ui.js` (full replacement)
- Modify: `tests/kiosk-ui.test.mjs` (full replacement)

- [ ] **Step 1: Write the failing test**

<!-- file: tests/kiosk-ui.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderBackButton,
  renderCatalogView,
  renderContactCard,
  renderHelpBar,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView,
  renderRackControls
} from '../assets/js/kiosk/ui.js';

test('the help bar sends projects to the rack, about to the billboard, contacts to the card', () => {
  const html = renderHelpBar();
  assert.match(html, /data-action="kiosk-focus" data-preset="rack">Проекты</);
  assert.match(html, /href="#about">Обо мне</);
  assert.match(html, /data-action="contacts-card" aria-expanded="false" aria-controls="contact-card">Контакты</);
  assert.match(html, /data-action="kiosk-help"/);
});

test('the contact card opens links in one click and offers copying', () => {
  const html = renderContactCard([
    { kind: 'telegram', label: 'Telegram', value: '@mar<b>', href: 'https://t.me/mar' },
    { kind: 'email', label: 'Почта', value: 'a@b.cd', href: 'mailto:a@b.cd' }
  ]);
  assert.match(html, /id="contact-card"/);
  assert.match(html, /href="https:\/\/t\.me\/mar" target="_blank" rel="noreferrer"/);
  assert.match(html, /href="mailto:a@b\.cd">/);
  assert.match(html, /@mar&lt;b&gt;/);
  assert.match(html, /data-action="copy-contact" data-value="a@b\.cd"/);
});

test('close-ups get a way back and the rack gets its spin controls', () => {
  assert.match(renderBackButton(), /data-action="kiosk-home">.*К ларьку/);
  const rack = renderRackControls('UX/UI <3');
  assert.match(rack, /data-action="rack-spin" data-step="-1"/);
  assert.match(rack, /data-action="rack-spin" data-step="1"/);
  assert.match(rack, /UX\/UI &lt;3/);
});

test('the catalog lists every project with an encoded link and escaped title', () => {
  const html = renderCatalogView([
    { id: 'учи ру', title: 'Учи.ру <b>', year: '2026' },
    { id: 'kortex', title: 'KORTEX', year: '2025' }
  ]);
  assert.match(html, /href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83"/);
  assert.match(html, /Учи\.ру &lt;b&gt;/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
});

test('hotspot buttons, loading, note and price render readable text', () => {
  assert.match(renderHotspotButtons([{ node: 'disc_0', label: 'A&B' }]), /data-node="disc_0">A&amp;B<\/button>/);
  assert.match(renderLoading(41.6), /42%/);
  assert.match(renderNote('a < b'), /a &lt; b/);
  assert.match(renderPriceView(), /Прайс/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-ui.test.mjs`
Expected: FAIL, `renderContactCard` is not exported.

- [ ] **Step 3: Implement**

<!-- file: assets/js/kiosk/ui.js -->
```js
import { escapeHtml } from '../render.js';

const BACK_ICON = '<i class="ph ph-arrow-left" aria-hidden="true"></i>';

export function renderHelpBar() {
  return `<nav class="kiosk-help" aria-label="Помощь по ларьку">
    <button type="button" data-action="kiosk-focus" data-preset="rack">Проекты</button>
    <a href="#about">Обо мне</a>
    <button type="button" data-action="contacts-card" aria-expanded="false" aria-controls="contact-card">Контакты</button>
    <button type="button" data-action="kiosk-help">Как тут ходить?</button>
  </nav>`;
}

export function renderContactCard(links = []) {
  return `<div class="contact-card" id="contact-card" role="dialog" aria-label="Контакты">
    <ul>
      ${links.map(link => `<li>
        <a href="${escapeHtml(link.href)}"${link.kind === 'email' ? '' : ' target="_blank" rel="noreferrer"'}><small>${escapeHtml(link.label)}</small>${escapeHtml(link.value)}</a>
        <button type="button" data-action="copy-contact" data-value="${escapeHtml(link.value)}">Скопировать</button>
      </li>`).join('')}
    </ul>
  </div>`;
}

export function renderBackButton() {
  return `<button type="button" class="kiosk-back" data-action="kiosk-home">${BACK_ICON}К ларьку</button>`;
}

export function renderRackControls(title = '') {
  return `<div class="rack-controls" role="group" aria-label="Вертушка с дисками">
    <button type="button" data-action="rack-spin" data-step="-1" aria-label="Предыдущая сторона">◀</button>
    <span id="rack-face" aria-live="polite">${escapeHtml(title)}</span>
    <button type="button" data-action="rack-spin" data-step="1" aria-label="Следующая сторона">▶</button>
  </div>`;
}

export function renderHint() {
  return '<div class="kiosk-hint" role="status">Крути мышкой и нажимай на то, что светится</div>';
}

export function renderNote(text = '') {
  return `<div class="kiosk-note" role="status">${escapeHtml(text)}</div>`;
}

export function renderLoading(percent = 0) {
  return `<div class="kiosk-loading" role="status">Открываем ларёк… ${Math.round(percent)}%</div>`;
}

// Every clickable object in the scene has a twin button here, so the kiosk
// works from the keyboard and with screen readers.
export function renderHotspotButtons(entries = []) {
  return `<div class="kiosk-a11y">${entries.map(entry => `<button type="button" data-action="kiosk-pick" data-node="${escapeHtml(entry.node)}">${escapeHtml(entry.label)}</button>`).join('')}</div>`;
}

export function renderCatalogView(projects = []) {
  return `<article class="portfolio-view catalog-view" data-view="catalog">
    <header class="view-header">
      <a class="back-link" href="#">${BACK_ICON}К ларьку</a>
      <h1>Весь товар</h1>
    </header>
    <ol class="catalog-list">
      ${projects.map(project => `<li><a href="#project/${encodeURIComponent(project.id)}"><span>${escapeHtml(project.title || '')}</span><small>${escapeHtml(project.year || '')}</small></a></li>`).join('')}
    </ol>
  </article>`;
}

export function renderPriceView() {
  return `<article class="portfolio-view price-view" data-view="price">
    <header class="view-header">
      <a class="back-link" href="#">${BACK_ICON}К ларьку</a>
      <h1>Прайс</h1>
      <p class="view-summary">Скоро здесь будет прайс на услуги.</p>
    </header>
  </article>`;
}
```

- [ ] **Step 4: Run it**

Run: `node --test tests/kiosk-ui.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/ui.js tests/kiosk-ui.test.mjs
git commit -m "feat: contact card, back button and rack controls markup"
```

---

### Task 6: Rack, player, billboard and screen anchors in Blender

**Files:**
- Modify: `scripts/kiosk/dims.py`, `scripts/kiosk/interior.py`, `scripts/kiosk/street.py`, `scripts/kiosk/build.py` (full replacements)
- Modify: `scripts/kiosk/lib.py` (append `screen`)
- Modify: `tests/kiosk-scene-file.test.mjs` (full replacement)
- Modify: `assets/kiosk/kiosk.glb` (generated)

- [ ] **Step 1: Write the failing test**

<!-- file: tests/kiosk-scene-file.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { POCKETS_PER_FACE, RACK_FACES } from '../assets/js/kiosk/discs.js';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function gltf() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

const names = () => new Set(gltf().nodes.map(node => node.name));

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const all = names();
  for (const node of Object.keys(HOTSPOTS)) assert.ok(all.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(all.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(all.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(all.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the rack holds a disc in every pocket and the player sits under the TV', () => {
  const all = names();
  for (const node of ['dvd_rack', 'hs_rack', 'dvd_player', 'tv_screen', 'terminal_screen']) assert.ok(all.has(node), node);
  for (let index = 0; index < RACK_FACES * POCKETS_PER_FACE; index += 1) assert.ok(all.has(`disc_${index}`), `disc_${index}`);
});

test('screens carry their size for the in-scene pages', () => {
  const nodes = gltf().nodes;
  for (const name of ['screen_tv', 'screen_terminal', 'screen_billboard']) {
    const node = nodes.find(entry => entry.name === name);
    assert.ok(node, name);
    assert.ok(node.extras?.width > 0 && node.extras?.height > 0, `${name} size`);
  }
});

test('the detail pass is in the scene', () => {
  const all = names();
  for (const node of ['kiosk_grille', 'kiosk_ribs', 'goods_fill', 'price_tags', 'interior', 'trees', 'buildings', 'snow_drifts', 'terminal_details', 'billboard_frame']) {
    assert.ok(all.has(node), node);
  }
});

test('the kiosk scene stays inside the desktop budget', () => {
  const json = gltf();
  const primitives = json.nodes
    .filter(node => node.mesh !== undefined)
    .reduce((sum, node) => sum + json.meshes[node.mesh].primitives.length, 0);
  assert.ok(primitives < 400, `${primitives} draw calls`);
  assert.ok(statSync(GLB).size < 8 * 1024 * 1024);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-scene-file.test.mjs`
Expected: FAIL (`cam_rack`, `dvd_rack`, `screen_tv` missing).

- [ ] **Step 3: Measurements**

<!-- file: scripts/kiosk/dims.py -->
```python
"""Kiosk measurements shared by every build module.
Blender metres, Z up, the kiosk front faces -Y."""

W, D = 3.0, 2.0
HW, HD = W / 2, D / 2
PLINTH = 0.12                      # floor height above the snow
TOP = 2.4                          # top of the walls
WALL = 0.06
GLASS_LOW, GLASS_HIGH = 0.95, 2.25
WINDOW_L, WINDOW_R, WINDOW_TOP = -0.3, 0.3, 1.41   # serving window in the glass
DOOR_L, DOOR_R, DOOR_TOP = 0.2, 1.0, 2.05          # back door opening
DOOR_OPEN_DEG = -115

SHELF_Y = -HD + 0.2                # centre line of the showcase shelves
SHELF_LEVELS = (0.98, 1.30, 1.62, 1.94)
SLOT_LEVEL = 1.30                  # the shelf that carries the hits
SLOT_COUNT = 8
SLOT_XS = tuple(-1.2 + index * (2.4 / (SLOT_COUNT - 1)) for index in range(SLOT_COUNT))

CHAIR = (-0.3, 0.25)
TV = (-1.22, 0.3, 1.75)            # centre of the TV body, screen faces +X
RACK = (0.6, 0.25)                 # DVD rack, visible through the back door
RACK_FACES, RACK_POCKETS = 4, 8
RACK_TOP_ROW, RACK_ROW_STEP = 1.43, 0.27

LAMP_POST = (-3.2, -1.6)
TERMINAL = (3.0, -0.35)
BILLBOARD = (0.0, 6.0)
BILLBOARD_FACE = (4.8, 2.4, 4.2)   # width, height, centre height
```

- [ ] **Step 4: Screen anchors in the kit**

Append to `scripts/kiosk/lib.py`:

```python


def screen(name, loc, width, height, rot_z=0.0):
    """Anchor for an in-scene HTML page: the centre of the screen, facing its
    local -Y. The size travels to the site as glTF extras."""
    obj = empty(name, loc, rot_z=rot_z)
    obj['width'] = width
    obj['height'] = height
    return obj
```

- [ ] **Step 5: Interior with rack and player**

<!-- file: scripts/kiosk/interior.py -->
```python
"""Inside the kiosk: the seller's counter, chair with a sweater, ribbed
heater, stock shelves and boxes, crates, wall clock, calendar, poster, a
jacket on a hook, hanging bulbs, the TV on a DVD player, the DVD rack with
32 discs, and the radio."""

import math
import random

from dims import (CHAIR, DOOR_L, HD, HW, PLINTH, RACK, RACK_FACES, RACK_POCKETS, RACK_ROW_STEP,
                  RACK_TOP_ROW, TOP, TV, W)
from lib import Merge, box, cylinder, empty, screen

COUNTER_Y = -0.42
COUNTER_TOP = PLINTH + 0.9


def _room(M, rng):
    room = Merge('interior')

    room.box((W - 0.3, 0.3, 0.88), (0.0, COUNTER_Y, PLINTH + 0.44), M['wood'])
    room.box((W - 0.26, 0.34, 0.03), (0.0, COUNTER_Y, COUNTER_TOP - 0.005), M['paint_dark'])

    cx, cy = CHAIR
    room.box((0.42, 0.42, 0.05), (cx, cy, 0.55), M['wood'])
    room.box((0.42, 0.05, 0.48), (cx, cy + 0.2, 0.82), M['wood'])
    for dx in (-0.18, 0.18):
        for dy in (-0.18, 0.18):
            room.box((0.035, 0.035, 0.42), (cx + dx, cy + dy, PLINTH + 0.21), M['frame'])
    room.blob((0.46, 0.16, 0.34), (cx, cy + 0.2, 0.92), M['fabric'])

    for k in range(8):
        room.box((0.05, 0.18, 0.5), (-1.15 + k * 0.065, 0.45, PLINTH + 0.3), M['plastic_light'])
    room.box((0.55, 0.12, 0.03), (-0.92, 0.45, PLINTH + 0.04), M['frame'])

    left, right = -HW + 0.08, DOOR_L - 0.08
    for level in (0.6, 1.1, 1.6, 2.0):
        room.box((right - left, 0.26, 0.025), ((left + right) / 2, HD - 0.18, level), M['wood'])
        x = left + 0.03
        while x < right - 0.12:
            w, h = rng.uniform(0.14, 0.3), rng.uniform(0.12, 0.3)
            room.box((w, 0.22, h), (x + w / 2, HD - 0.18, level + 0.0125 + h / 2),
                     M['cardboard'] if rng.random() < 0.7 else rng.choice(M['goods_palette']))
            x += w + 0.02
    for x in (left, right):
        room.box((0.03, 0.26, 2.0 - PLINTH), (x, HD - 0.18, (PLINTH + 2.0) / 2), M['wood'])

    for k, (w, h) in enumerate(((0.5, 0.35), (0.42, 0.3), (0.34, 0.26))):
        room.box((w, 0.4, h), (-1.12, 0.05, PLINTH + h / 2 + sum((0.35, 0.3, 0.26)[:k])), M['cardboard'])
    for k in range(3):
        room.box((0.4, 0.3, 0.28), (1.2, 0.55, PLINTH + 0.14 + k * 0.29),
                 rng.choice((M['goods_palette'][0], M['goods_palette'][3])))

    room.cylinder(0.12, 0.03, (-HW + 0.08, -0.02, 2.1), M['paper'], segments=20, rot=(0.0, math.pi / 2, 0.0))
    room.box((0.01, 0.42, 0.56), (HW - 0.08, -0.15, 1.7), M['paper'])
    room.box((0.012, 0.42, 0.12), (HW - 0.081, -0.15, 1.92), M['away'])
    room.box((0.01, 0.4, 0.55), (-HW + 0.08, -0.35, 1.75), rng.choice(M['posters']))
    room.box((0.04, 0.04, 0.04), (HW - 0.1, 0.42, 1.95), M['frame'])
    room.blob((0.14, 0.36, 0.7), (HW - 0.16, 0.42, 1.55), M['fabric_dark'])

    room.cylinder(0.09, 0.22, (-0.4, COUNTER_Y, COUNTER_TOP + 0.11), M['plastic_light'])
    room.cylinder(0.045, 0.09, (-0.25, COUNTER_Y + 0.05, COUNTER_TOP + 0.045), M['goods_palette'][0])
    room.box((0.1, 0.16, 0.025), (0.45, COUNTER_Y, COUNTER_TOP + 0.0125), M['device'])
    room.box((0.22, 0.3, 0.02), (0.15, COUNTER_Y + 0.02, COUNTER_TOP + 0.01), M['goods_palette'][2])
    room.box((0.3, 0.22, 0.1), (-0.85, COUNTER_Y, COUNTER_TOP + 0.05), M['device'])

    for index, (x, y) in enumerate(((-0.75, -0.2), (0.0, 0.1), (0.75, -0.2))):
        room.bar((x, y, TOP), (x, y, TOP - 0.25), 0.008, M['ink'])
        cylinder(f'bulb_{index}', 0.035, 0.08, (x, y, TOP - 0.29), M['bulb'])
    room.finish()


def _tv(M):
    tx, ty, tz = TV
    tv = box('hs_tv', (0.36, 0.42, 0.34), (tx, ty, tz), M['device'])
    box('tv_screen', (0.02, 0.32, 0.24), (0.19, 0.0, 0.01), M['screen'], parent=tv)
    parts = Merge('tv_details')
    parts.box((0.42, 0.62, 0.03), (0.0, 0.0, -0.25), M['wood'])                    # wall shelf
    parts.bar((0.0, 0.0, 0.17), (-0.06, -0.18, 0.45), 0.008, M['frame'])           # rabbit ears
    parts.bar((0.0, 0.0, 0.17), (-0.06, 0.18, 0.45), 0.008, M['frame'])
    parts.finish(parent=tv)
    player = box('dvd_player', (0.34, 0.32, 0.055), (tx, ty, tz - 0.205), M['device'])
    tray = Merge('dvd_player_details')
    tray.box((0.005, 0.2, 0.012), (0.171, -0.02, 0.0), M['ink'])                    # disc tray
    tray.box((0.005, 0.03, 0.01), (0.171, 0.12, 0.0), M['screen'])                  # display
    tray.finish(parent=player)
    screen('screen_tv', (tx + 0.202, ty, tz + 0.01), 0.32, 0.24, rot_z=math.pi / 2)


def _rack(M):
    rack = empty('dvd_rack', (RACK[0], RACK[1], 0.0))
    frame = Merge('hs_rack')
    frame.cylinder(0.02, 1.62, (0.0, 0.0, 0.86), M['frame'], segments=10)
    frame.box((0.5, 0.05, 0.04), (0.0, 0.0, 0.07), M['frame'])
    frame.box((0.05, 0.5, 0.04), (0.0, 0.0, 0.07), M['frame'])
    frame.box((0.3, 0.3, 0.03), (0.0, 0.0, 1.68), M['frame'])
    for face in range(RACK_FACES):
        angle = face * math.pi / 2
        out = (-math.sin(angle), math.cos(angle))
        side = (math.cos(angle), math.sin(angle))
        for z in (1.55, 0.5):
            frame.bar((0.0, 0.0, z), (out[0] * 0.18, out[1] * 0.18, z), 0.01, M['frame'])
        for row in range(RACK_POCKETS // 2):
            z = RACK_TOP_ROW - row * RACK_ROW_STEP
            frame.bar((out[0] * 0.2 - side[0] * 0.16, out[1] * 0.2 - side[1] * 0.16, z - 0.09),
                      (out[0] * 0.2 + side[0] * 0.16, out[1] * 0.2 + side[1] * 0.16, z - 0.09), 0.008, M['frame'])
            for col in range(2):
                lateral = (col - 0.5) * 0.15
                index = face * RACK_POCKETS + row * 2 + col
                box(f'disc_{index}', (0.135, 0.014, 0.19),
                    (out[0] * 0.18 + side[0] * lateral, out[1] * 0.18 + side[1] * lateral, z),
                    M['goods'], parent=rack, rot_z=angle)
    frame.finish(parent=rack)


def build(M):
    rng = random.Random(5)
    _room(M, rng)
    _tv(M)
    _rack(M)

    radio = box('hs_radio', (0.36, 0.14, 0.2), (0.9, COUNTER_Y, COUNTER_TOP + 0.1), M['device'])
    radio_parts = Merge('radio_details')
    for dx in (-0.1, 0.1):
        radio_parts.cylinder(0.055, 0.01, (dx, 0.072, -0.01), M['ink'], segments=16, rot=(math.pi / 2, 0.0, 0.0))
    radio_parts.box((0.08, 0.01, 0.03), (0.0, 0.072, 0.07), M['screen'])
    radio_parts.bar((0.14, 0.0, 0.1), (0.05, 0.0, 0.45), 0.006, M['frame'])
    radio_parts.finish(parent=radio)
```

- [ ] **Step 6: Street with billboard and terminal screen**

<!-- file: scripts/kiosk/street.py -->
```python
"""Everything around the kiosk: snow, drifts, a trodden path, the lamp post
and its cable, a power line, a bench, a bin, bare trees, the billboard, panel
blocks far away, and the payment terminal hotspot."""

import math
import random

from dims import BILLBOARD, BILLBOARD_FACE, HD, HW, LAMP_POST, TERMINAL, TOP
from geometry import catenary, tree_segments
from lib import Merge, box, screen, text

TREES = ((-6.0, 6.0, 8.0), (5.5, 7.0, 7.0), (-9.0, 2.0, 9.0), (8.0, 1.0, 6.5),
         (-3.0, 11.0, 8.5), (10.0, 9.0, 7.5), (-12.0, 8.0, 8.0))
BLOCKS = ((-26.0, 40.0, 24.0, 12.0, 27.0), (2.0, 46.0, 30.0, 12.0, 33.0), (30.0, 38.0, 20.0, 12.0, 27.0),
          (-48.0, 22.0, 12.0, 30.0, 27.0), (46.0, 18.0, 12.0, 28.0, 30.0))
POWER_POLES = ((-14.0, 10.0), (0.0, 12.0), (14.0, 10.0))


def _snow(M, rng):
    box('ground_snow', (140.0, 140.0, 0.02), (0.0, 0.0, -0.01), M['snow'])
    trodden = Merge('snow_trodden')
    for k in range(9):
        t = k / 8
        trodden.blob((1.3 - t * 0.4, 0.9, 0.01), (0.2 + t * 2.0, -1.6 - t * 5.0, 0.002), M['snow_trodden'])
    trodden.finish()

    drifts = Merge('snow_drifts')
    edge = 0.2
    for k in range(10):
        x = -HW + k * (2 * HW / 9)
        if not 0.1 < x < 1.5:
            drifts.blob((0.7, 0.45, 0.35), (x, HD + edge, 0.0), M['snow'])
        drifts.blob((0.6, 0.4, 0.22), (x, -HD - edge - 0.1, 0.0), M['snow'])
    for y in (-0.6, 0.0, 0.6):
        drifts.blob((0.45, 0.7, 0.35), (-HW - edge, y, 0.0), M['snow'])
        drifts.blob((0.45, 0.7, 0.35), (HW + edge, y, 0.0), M['snow'])
    placed = 0
    while placed < 14:
        angle, radius = rng.uniform(0.0, 2 * math.pi), rng.uniform(4.0, 14.0)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        if y < -1.0 and abs(x) < 4.5:
            continue  # keep the approach and the camera clear
        if abs(x - BILLBOARD[0]) < 3.2 and abs(y - BILLBOARD[1]) < 2.0:
            continue  # keep the billboard legs clear
        drifts.blob((rng.uniform(2.0, 4.0), rng.uniform(1.5, 3.0), rng.uniform(0.4, 0.9)), (x, y, 0.0), M['snow'])
        placed += 1
    drifts.finish()


def _lamp_and_wires(M):
    px, py = LAMP_POST
    post = Merge('lamppost')
    post.cylinder(0.07, 4.4, (0.0, 0.0, 2.2), M['frame'], segments=10)
    post.bar((0.0, 0.0, 4.25), (0.8, 0.0, 4.45), 0.05, M['frame'])
    post.box((0.45, 0.2, 0.1), (0.95, 0.0, 4.42), M['frame'])
    post.box((0.3, 0.14, 0.02), (0.95, 0.0, 4.36), M['bulb'])
    post.finish((px, py, 0.0))

    wires = Merge('cables')
    wires.polyline(catenary((-HW + 0.15, -HD + 0.4, TOP + 0.12), (px, py, 4.1), 0.45, 18), 0.012, M['ink'])
    poles = Merge('power_poles')
    tops = []
    for x, y in POWER_POLES:
        poles.cylinder(0.12, 9.0, (x, y, 4.5), M['wood'], segments=8)
        poles.box((1.8, 0.1, 0.1), (x, y, 8.6), M['wood'])
        tops.append((x, y))
    for (ax, ay), (bx, by) in zip(tops, tops[1:]):
        for dx in (-0.8, 0.8):
            wires.polyline(catenary((ax + dx, ay, 8.65), (bx + dx, by, 8.65), 0.9, 20), 0.02, M['ink'])
    poles.finish()
    wires.finish()


def _bench_and_bin(M):
    bench = Merge('bench')
    for x in (-0.7, 0.7):
        bench.box((0.08, 0.42, 0.42), (x, 0.0, 0.21), M['frame'])
        bench.box((0.06, 0.06, 0.45), (x, 0.2, 0.62), M['frame'])
    for y in (-0.12, 0.0, 0.12):
        bench.box((1.7, 0.09, 0.03), (0.0, y, 0.45), M['wood'])
    for z in (0.65, 0.8):
        bench.box((1.7, 0.03, 0.09), (0.0, 0.22, z), M['wood'])
    bench.blob((1.5, 0.36, 0.07), (0.0, 0.0, 0.48), M['snow'])
    bench.finish((-2.5, -2.8, 0.0))

    bin_ = Merge('bin')
    bin_.cylinder(0.2, 0.6, (0.0, 0.0, 0.3), M['device'], top=0.24, segments=14)
    bin_.cylinder(0.25, 0.04, (0.0, 0.0, 0.6), M['frame'], segments=14)
    bin_.blob((0.4, 0.4, 0.1), (0.0, 0.0, 0.62), M['snow'])
    bin_.finish((1.9, -1.9, 0.0))


def _trees(M, rng):
    trees = Merge('trees')
    for x, y, height in TREES:
        for start, end, thickness in tree_segments(rng, (x, y, 0.0), height):
            trees.bar(start, end, max(thickness, 0.02), M['bark'])
    trees.finish()


def _billboard(M):
    bx, by = BILLBOARD
    width, height, centre = BILLBOARD_FACE
    bottom, top = centre - height / 2, centre + height / 2
    frame = Merge('billboard_frame')
    for x in (-1.6, 1.6):
        frame.cylinder(0.14, bottom + 0.1, (x, 0.25, (bottom + 0.1) / 2), M['frame'], segments=10)
    for z in (bottom - 0.05, top + 0.05):
        frame.box((width + 0.2, 0.25, 0.1), (0.0, 0.0, z), M['frame'])
    for x in (-width / 2 - 0.05, width / 2 + 0.05):
        frame.box((0.1, 0.25, height), (x, 0.0, centre), M['frame'])
    for x in (-1.6, 0.0, 1.6):
        frame.bar((x, 0.0, top + 0.1), (x, -0.6, top + 0.35), 0.04, M['frame'])
        frame.box((0.3, 0.15, 0.08), (x, -0.62, top + 0.33), M['frame'])
    frame.finish((bx, by, 0.0))
    box('hs_billboard', (width, 0.12, height), (bx, by + 0.08, centre), M['device'])
    screen('screen_billboard', (bx, by - 0.1, centre), width, height)


def _blocks(M, rng):
    blocks = Merge('buildings')
    for x, y, w, d, h in BLOCKS:
        blocks.box((w, d, h), (x, y, h / 2), M['building'])
        face = y - d / 2 - 0.03
        floors, columns = int(h // 3), int(w // 2.4)
        for floor in range(floors):
            for column in range(columns):
                wx = x - w / 2 + 1.2 + column * (w - 2.4) / max(columns - 1, 1)
                lit = rng.random() < 0.18
                blocks.box((1.2, 0.06, 1.4), (wx, face, 1.8 + floor * 3), M['window_lit'] if lit else M['window_dark'])
    blocks.finish()


def _terminal(M):
    tx, ty = TERMINAL
    terminal = box('hs_terminal', (0.62, 0.45, 1.75), (tx, ty, 0.875), M['device'])
    box('terminal_screen', (0.45, 0.02, 0.32), (0.0, -0.235, 0.35), M['screen'], parent=terminal)
    parts = Merge('terminal_details')
    front = -0.235
    parts.box((0.66, 0.5, 0.22), (0.0, 0.0, 0.985), M['sign'])
    for row in range(4):
        for col in range(3):
            parts.box((0.05, 0.015, 0.035), (-0.07 + col * 0.07, front, 0.08 - row * 0.05), M['plastic_light'])
    parts.box((0.2, 0.02, 0.04), (0.0, front, -0.2), M['ink'])
    parts.box((0.12, 0.02, 0.02), (0.0, front, -0.32), M['ink'])
    parts.box((0.7, 0.5, 0.06), (0.0, 0.0, -0.845), M['frame'])
    parts.finish(parent=terminal)
    text('terminal_label', 'ОПЛАТА', (0.0, -0.255, 0.985), 0.09, M['ink'], parent=terminal)
    screen('screen_terminal', (tx, ty - 0.247, 1.225), 0.45, 0.32)


def build(M):
    rng = random.Random(13)
    _snow(M, rng)
    _lamp_and_wires(M)
    _bench_and_bin(M)
    _trees(M, rng)
    _billboard(M)
    _blocks(M, rng)
    _terminal(M)
```

- [ ] **Step 7: Presets and extras in the build**

<!-- file: scripts/kiosk/build.py -->
```python
"""Builds the «У МАРАТА» kiosk scene and exports assets/kiosk/kiosk.glb.

Run with `npm run build:kiosk`. The scene is rebuilt from the modules in this
folder on every run, so a change is a parameter edit, never a hand-patched
file. Node names are the contract with the site: hs_* are hotspots, slot_*
showcase hits, disc_* rack pockets, screen_* page anchors (size in extras),
cam_*/tgt_* camera presets (see assets/js/kiosk/hotspots.js).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import goods  # noqa: E402
import interior  # noqa: E402
import kiosk  # noqa: E402
import street  # noqa: E402
from lib import empty  # noqa: E402
from palette import make_materials  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'kiosk', 'kiosk.glb')

CAMERAS = {
    'home': ((3.4, -7.2, 2.1), (0.0, 0.0, 1.4)),
    'showcase': ((0.3, -3.0, 1.65), (0.0, -0.9, 1.5)),
    'inside': ((1.15, 0.8, 1.6), (-0.3, 0.0, 1.4)),
    'rack': ((0.6, 1.75, 1.2), (0.6, 0.25, 1.05)),
    'tv': ((-0.42, 0.3, 1.76), (-1.02, 0.3, 1.76)),
    'billboard': ((0.0, 1.4, 4.2), (0.0, 6.0, 4.2)),
    'terminal': ((3.0, -1.35, 1.25), (3.0, -0.6, 1.225)),
}


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials = make_materials()
    kiosk.build(materials)
    goods.build(materials)
    interior.build(materials)
    street.build(materials)
    for name, (cam, target) in CAMERAS.items():
        empty(f'cam_{name}', cam)
        empty(f'tgt_{name}', target)


def export():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    print(f'kiosk exported: {OUT}')


build()
export()
```

- [ ] **Step 8: Build and test**

Run: `npm run build:kiosk`
Expected: `kiosk exported: …`, exit 0.

Run: `node --test tests/kiosk-scene-file.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add scripts/kiosk/dims.py scripts/kiosk/lib.py scripts/kiosk/interior.py scripts/kiosk/street.py scripts/kiosk/build.py tests/kiosk-scene-file.test.mjs assets/kiosk/kiosk.glb
git commit -m "feat: DVD rack with 32 discs, player, billboard and screen anchors"
```

---

### Task 7: Scene runtime and app wiring

**Files:**
- Modify: `assets/js/kiosk/scene.js` (full replacement)
- Modify: `assets/js/app.js` (full replacement)
- Modify: `assets/css/kiosk.css` (append)

- [ ] **Step 1: Scene runtime**

<!-- file: assets/js/kiosk/scene.js -->
```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RACK_FACES } from './discs.js';
import { PRESETS, fitFov, isPickable, pickHotspot, presetLimits } from './hotspots.js';

const SKY = 0x1b2a4a;
const HOVER = 0x4a3210;
const FLIGHT_MS = 1100;
const QUARTER = Math.PI / 2;

function pickableNameOf(object) {
  for (let node = object; node; node = node.parent) {
    if (isPickable(node.name)) return node.name;
  }
  return object.name;
}

function isShown(object) {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export async function createKioskScene({
  container,
  url,
  onProgress = () => {},
  onHover = () => {},
  onPick = () => {},
  onRackFace = () => {}
}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 18, 90);
  scene.add(new THREE.HemisphereLight(0xaac4ff, 0x2a2a33, 1.6));
  const warm = new THREE.PointLight(0xffb259, 8, 6, 1.4);
  warm.position.set(0, 2.1, 0);
  scene.add(warm);

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 160);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  const gltf = await new GLTFLoader().loadAsync(url, event => {
    if (event.total) onProgress((event.loaded / event.total) * 100);
  });
  const root = gltf.scene;
  scene.add(root);
  root.updateMatrixWorld(true);

  const presets = {};
  for (const name of PRESETS) {
    const cam = root.getObjectByName(`cam_${name}`);
    const target = root.getObjectByName(`tgt_${name}`);
    if (cam && target) {
      presets[name] = {
        position: cam.getWorldPosition(new THREE.Vector3()),
        target: target.getWorldPosition(new THREE.Vector3())
      };
    }
  }

  const highlight = new Map();
  root.traverse(object => {
    if (!object.isMesh) return;
    if (object.material.name.startsWith('glass')) {
      object.material.transparent = true;
      object.material.opacity = 0.18;
      object.material.depthWrite = false;
    }
    const name = pickableNameOf(object);
    if (!isPickable(name)) return;
    object.material = object.material.clone();
    if (!highlight.has(name)) highlight.set(name, []);
    highlight.get(name).push(object.material);
  });

  let hovered = null;
  function setHovered(name) {
    if (name === hovered) return;
    hovered = name;
    for (const [key, materials] of highlight) {
      for (const material of materials) {
        if (material.emissive) material.emissive.setHex(key === name ? HOVER : 0x000000);
      }
    }
  }

  function showOnly(pattern, entries) {
    const used = new Set(entries.map(entry => entry.node));
    root.traverse(object => {
      if (pattern.test(object.name)) object.visible = used.has(object.name);
    });
  }

  const rack = root.getObjectByName('dvd_rack');
  let rackFace = 0;
  let rackTarget = 0;
  function spinRack(step) {
    rackFace = (((rackFace + step) % RACK_FACES) + RACK_FACES) % RACK_FACES;
    // keep turning the short way round instead of unwinding past 360°
    rackTarget += -step * QUARTER;
    onRackFace(rackFace);
  }
  function snapRack() {
    const turns = Math.round(-rack.rotation.y / QUARTER);
    rackTarget = -turns * QUARTER;
    rackFace = ((turns % RACK_FACES) + RACK_FACES) % RACK_FACES;
    onRackFace(rackFace);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const names = raycaster.intersectObject(root, true)
      .filter(hit => isShown(hit.object))
      .map(hit => pickableNameOf(hit.object));
    return pickHotspot(names);
  }

  let current = 'home';
  function applyLimits(name) {
    const limits = presetLimits(name);
    controls.enabled = !limits.locked;
    if (limits.locked) return;
    controls.minDistance = limits.minDistance;
    controls.maxDistance = limits.maxDistance;
    controls.minPolarAngle = limits.minPolarAngle;
    controls.maxPolarAngle = limits.maxPolarAngle;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.update();
    if (limits.azimuthSpan) {
      const azimuth = controls.getAzimuthalAngle();
      controls.minAzimuthAngle = azimuth - limits.azimuthSpan / 2;
      controls.maxAzimuthAngle = azimuth + limits.azimuthSpan / 2;
    }
  }

  let flight = null;
  function focus(name, { instant = false } = {}) {
    const preset = presets[name];
    if (!preset) return;
    current = name;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fov = fitFov(presetLimits(name).fov, camera.aspect);
    if (instant || reduced) {
      flight = null;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      camera.lookAt(controls.target);
      applyLimits(name);
      return;
    }
    controls.enabled = false;
    flight = {
      name,
      start: performance.now(),
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      to: preset.position,
      toTarget: preset.target,
      toFov: fov
    };
  }

  let down = null;
  canvas.addEventListener('pointerdown', event => {
    down = { x: event.clientX, y: event.clientY, lastX: event.clientX };
  });
  canvas.addEventListener('pointermove', event => {
    if (down && current === 'rack' && rack) {
      rack.rotation.y += (event.clientX - down.lastX) * 0.01;
      rackTarget = rack.rotation.y;
      down.lastX = event.clientX;
      return;
    }
    if (event.pointerType !== 'mouse' || event.buttons) return;
    const name = pick(event.clientX, event.clientY);
    setHovered(name);
    onHover(name, event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    setHovered(null);
    onHover(null, 0, 0);
  });
  canvas.addEventListener('pointerup', event => {
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (moved > 6) {
      if (current === 'rack' && rack) snapRack();
      return;
    }
    const name = pick(event.clientX, event.clientY);
    if (name) onPick(name);
  });

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!flight) camera.fov = fitFov(presetLimits(current).fov, camera.aspect);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  renderer.setAnimationLoop(() => {
    if (flight) {
      const t = Math.min((performance.now() - flight.start) / FLIGHT_MS, 1);
      const k = easeInOutCubic(t);
      camera.position.lerpVectors(flight.from, flight.to, k);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
      camera.fov = THREE.MathUtils.lerp(flight.fromFov, flight.toFov, k);
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      if (t === 1) {
        const { name } = flight;
        flight = null;
        applyLimits(name);
      }
    } else if (controls.enabled) {
      controls.update();
    }
    if (rack) rack.rotation.y += (rackTarget - rack.rotation.y) * 0.15;
    renderer.render(scene, camera);
  });

  return {
    focus,
    spinRack,
    setHits: hits => showOnly(/^slot_\d+$/, hits),
    setDiscs: discs => showOnly(/^disc_\d+$/, discs),
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
}
```

- [ ] **Step 2: App wiring**

<!-- file: assets/js/app.js -->
```js
import { loadContent } from './content.js';
import {
  renderAboutView,
  renderContactView,
  renderGenericPageView,
  renderLoadError,
  renderProjectView
} from './render.js';
import { parseRoute } from './router.js';
import { contactLinks } from './kiosk/contacts.js';
import { assignDiscs } from './kiosk/discs.js';
import { HOTSPOTS, LOCKED_PRESETS, ROUTE_PRESETS, hotspotForNode } from './kiosk/hotspots.js';
import { assignHits } from './kiosk/slots.js';
import {
  renderBackButton,
  renderCatalogView,
  renderContactCard,
  renderHelpBar,
  renderHint,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView,
  renderRackControls
} from './kiosk/ui.js';

const KIOSK_URL = new URL('../kiosk/kiosk.glb', import.meta.url).href;

const state = { bundle: null, kiosk: null, hits: [], discs: [], faces: [], preset: 'home', rackFace: 0 };

const header = document.querySelector('#site-header');
const homeView = document.querySelector('#home-view');
const overlayView = document.querySelector('#overlay-view');
const liveRegion = document.querySelector('#live-region');

function announce(message) {
  liveRegion.textContent = '';
  window.requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function getProject(projectId) {
  return state.bundle?.projects.find(project => project.id === projectId);
}

function getPage(pageId) {
  return state.bundle?.pages.find(page => page.id === pageId);
}

function getCategory(categoryId) {
  return state.bundle?.site.categories?.find(category => category.id === categoryId) || {};
}

function drawShell() {
  homeView.innerHTML = `<div class="kiosk-stage" id="kiosk-stage"></div>
    <div class="kiosk-label" id="kiosk-label" hidden></div>
    <div id="kiosk-note-slot"></div>
    <div id="kiosk-closeup-slot"></div>
    <div id="contact-card-slot"></div>
    <div id="kiosk-loading-slot">${renderLoading(0)}</div>
    ${renderHelpBar()}`;
}

function hotspotEntries() {
  const projects = [...state.hits, ...state.discs].map(item => ({ node: item.node, label: item.title }));
  const fixed = Object.entries(HOTSPOTS).map(([node, spot]) => ({ node, label: spot.label }));
  return [...projects, ...fixed];
}

let noteTimer = 0;
function showNote(text) {
  const slot = document.querySelector('#kiosk-note-slot');
  slot.innerHTML = renderNote(text);
  window.clearTimeout(noteTimer);
  noteTimer = window.setTimeout(() => { slot.innerHTML = ''; }, 4200);
}

function showHint() {
  document.querySelector('.kiosk-hint')?.remove();
  homeView.insertAdjacentHTML('beforeend', renderHint());
  window.setTimeout(() => document.querySelector('.kiosk-hint')?.remove(), 4000);
}

function firstVisitHint() {
  let seen = false;
  try {
    seen = window.localStorage.getItem('kiosk-hint-seen') === '1';
    window.localStorage.setItem('kiosk-hint-seen', '1');
  } catch {
    seen = false;
  }
  if (!seen) showHint();
}

function rackTitle(face) {
  return state.faces.find(entry => entry.index === face)?.title || 'Пусто';
}

// Moves the camera and swaps the close-up chrome: a way back for every
// close-up, spin controls for the rack.
function focusPreset(name, options) {
  state.preset = name;
  state.kiosk?.focus(name, options);
  const slot = document.querySelector('#kiosk-closeup-slot');
  if (!LOCKED_PRESETS.includes(name)) {
    slot.innerHTML = '';
    return;
  }
  slot.innerHTML = renderBackButton() + (name === 'rack' ? renderRackControls(rackTitle(state.rackFace)) : '');
}

function goHome() {
  if (window.location.hash && window.location.hash !== '#') {
    window.location.hash = '';
  } else {
    focusPreset('home');
  }
}

function runAction(node) {
  const spot = hotspotForNode(node, state);
  if (!spot) return;
  const { action } = spot;
  if (action.type === 'route') window.location.hash = action.hash;
  if (action.type === 'focus') focusPreset(action.preset);
  if (action.type === 'note') showNote(action.text);
}

function showLabel(node, x, y) {
  const label = document.querySelector('#kiosk-label');
  const spot = node ? hotspotForNode(node, state) : null;
  document.body.classList.toggle('is-pointing', Boolean(spot));
  if (!spot) {
    label.hidden = true;
    return;
  }
  label.textContent = spot.label;
  label.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
  label.hidden = false;
}

function toggleContactCard(force) {
  const slot = document.querySelector('#contact-card-slot');
  const button = document.querySelector('[data-action="contacts-card"]');
  const open = force ?? !slot.innerHTML;
  slot.innerHTML = open ? renderContactCard(contactLinks(state.bundle?.site.contacts)) : '';
  button?.setAttribute('aria-expanded', String(open));
  if (open) slot.querySelector('a')?.focus();
}

async function copyContact(value) {
  try {
    await navigator.clipboard.writeText(value);
    showNote(`Скопировано: ${value}`);
  } catch {
    showNote(value);
  }
}

function closeOverlay() {
  overlayView.hidden = true;
  overlayView.innerHTML = '';
  document.body.dataset.route = 'home';
}

function showOverlay(html, viewName) {
  overlayView.innerHTML = `<div class="overlay-scrim" data-action="close-overlay"></div><div class="overlay-panel">${html}</div>`;
  overlayView.hidden = false;
  document.body.dataset.route = viewName;
  overlayView.querySelector('.back-link')?.focus({ preventScroll: true });
}

function renderRoute() {
  if (!state.bundle) return;
  const route = parseRoute(window.location.hash);
  focusPreset(ROUTE_PRESETS[route.view] || 'home');

  if (route.view === 'home') {
    closeOverlay();
    return;
  }

  if (route.view === 'project') {
    const project = getProject(route.id);
    if (!project) {
      window.location.hash = '';
      return;
    }
    const ordered = state.bundle.projects;
    const position = ordered.findIndex(item => item.id === project.id);
    const neighbour = ordered[(position + 1) % ordered.length] || null;
    showOverlay(
      renderProjectView(project, getCategory(project.category), neighbour === project ? null : neighbour),
      'project'
    );
    announce(`Открыт проект ${project.title}`);
    return;
  }

  if (route.view === 'catalog') {
    showOverlay(renderCatalogView(state.bundle.projects), 'catalog');
    announce('Открыт список проектов');
    return;
  }

  if (route.view === 'price') {
    showOverlay(renderPriceView(), 'price');
    announce('Открыт прайс');
    return;
  }

  if (route.view === 'about') {
    const page = getPage('about') || { id: 'about', title: 'Обо мне', content: '' };
    showOverlay(renderAboutView(state.bundle.site, state.bundle.resume, page), 'about');
    announce('Открыта страница Обо мне');
    return;
  }

  if (route.view === 'contact') {
    showOverlay(renderContactView(state.bundle.site), 'contact');
    announce('Открыта страница Контакт');
    return;
  }

  const page = getPage(route.id);
  if (!page) {
    window.location.hash = '';
    return;
  }
  showOverlay(renderGenericPageView(page), 'page');
  announce(`Открыта страница ${page.title}`);
}

async function mountKiosk() {
  const loading = document.querySelector('#kiosk-loading-slot');
  try {
    const { createKioskScene } = await import('./kiosk/scene.js');
    state.kiosk = await createKioskScene({
      container: document.querySelector('#kiosk-stage'),
      url: KIOSK_URL,
      onProgress: percent => { loading.innerHTML = renderLoading(percent); },
      onHover: showLabel,
      onPick: runAction,
      onRackFace: face => {
        state.rackFace = face;
        const title = document.querySelector('#rack-face');
        if (title) title.textContent = rackTitle(face);
      }
    });
    state.kiosk.setHits(state.hits);
    state.kiosk.setDiscs(state.discs);
    focusPreset(ROUTE_PRESETS[parseRoute(window.location.hash).view] || 'home', { instant: true });
    loading.innerHTML = '';
    firstVisitHint();
  } catch (error) {
    console.error(error);
    loading.innerHTML = '';
    showNote('Ларёк не открылся на этом устройстве. Вот весь товар списком.');
    if (parseRoute(window.location.hash).view === 'home') window.location.hash = '#catalog';
  }
}

document.addEventListener('click', event => {
  const card = document.querySelector('#contact-card');
  if (card && !event.target.closest('#contact-card, [data-action="contacts-card"]')) toggleContactCard(false);

  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  if (action === 'kiosk-pick') runAction(element.dataset.node);
  if (action === 'kiosk-focus') focusPreset(element.dataset.preset);
  if (action === 'kiosk-home') goHome();
  if (action === 'kiosk-help') showHint();
  if (action === 'rack-spin') state.kiosk?.spinRack(Number(element.dataset.step));
  if (action === 'contacts-card') toggleContactCard();
  if (action === 'copy-contact') copyContact(element.dataset.value);
  if (action === 'close-overlay') window.location.hash = '';
  if (action === 'scroll-to-section') {
    // Section anchors must not touch the hash: it is the view router.
    event.preventDefault();
    document.getElementById(element.dataset.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.querySelector('#contact-card')) toggleContactCard(false);
    else if (!overlayView.hidden) window.location.hash = '';
    else if (LOCKED_PRESETS.includes(state.preset)) goHome();
  }
  if (state.preset === 'rack' && overlayView.hidden && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    state.kiosk?.spinRack(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

window.addEventListener('hashchange', renderRoute);

export async function bootstrapPortfolio() {
  header.hidden = true;
  drawShell();
  try {
    state.bundle = await loadContent();
    state.hits = assignHits(state.bundle.projects);
    const { discs, faces } = assignDiscs(state.bundle.projects, state.bundle.site.categories);
    state.discs = discs;
    state.faces = faces;
    homeView.insertAdjacentHTML('beforeend', renderHotspotButtons(hotspotEntries()));
    renderRoute();
  } catch (error) {
    homeView.innerHTML = renderLoadError(error.message);
    return;
  }
  await mountKiosk();
}

bootstrapPortfolio();
```

- [ ] **Step 3: Styles for the new chrome**

Append to `assets/css/kiosk.css`:

```css

/* ---------- close-ups, rack, contact card ---------- */

.kiosk-back {
  position: fixed;
  z-index: 6;
  top: 18px;
  left: 18px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 14px;
  color: #f3ecdf;
  background: rgba(14, 18, 28, .8);
  border: 1px solid rgba(255, 255, 255, .14);
  font: 13px/1.2 var(--mono);
}

.rack-controls {
  position: fixed;
  z-index: 6;
  left: 50%;
  bottom: 78px;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 5px;
  color: #f3ecdf;
  background: rgba(14, 18, 28, .8);
  border: 1px solid rgba(255, 255, 255, .14);
  font: 13px/1.2 var(--mono);
  transform: translateX(-50%);
}

.rack-controls span {
  min-width: 140px;
  text-align: center;
}

.rack-controls button {
  width: 42px;
  height: 36px;
  color: #f3ecdf;
  background: transparent;
  font: 16px var(--mono);
}

.kiosk-back:hover,
.kiosk-back:focus-visible,
.rack-controls button:hover,
.rack-controls button:focus-visible {
  color: #1c1408;
  background: #f4e3b8;
  outline: none;
}

.contact-card {
  position: fixed;
  z-index: 7;
  left: 50%;
  bottom: 72px;
  width: min(420px, calc(100vw - 24px));
  padding: 6px 8px;
  color: #1c1408;
  background: #f4e3b8;
  box-shadow: 0 18px 40px rgba(0, 0, 0, .4);
  font: 14px/1.4 var(--mono);
  transform: translateX(-50%);
}

.contact-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.contact-card li {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 6px;
  border-bottom: 1px solid rgba(28, 20, 8, .15);
}

.contact-card li:last-child {
  border-bottom: 0;
}

.contact-card a {
  flex: 1;
  display: grid;
  color: inherit;
}

.contact-card small {
  font-size: 12px;
  opacity: .65;
}

.contact-card button {
  padding: 6px 10px;
  color: #1c1408;
  background: transparent;
  border: 1px solid rgba(28, 20, 8, .35);
  font: 12px var(--mono);
}

.contact-card a:focus-visible,
.contact-card button:hover,
.contact-card button:focus-visible {
  outline: 2px solid #1c1408;
  outline-offset: 2px;
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all node tests pass, Python `OK`.

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/scene.js assets/js/app.js assets/css/kiosk.css
git commit -m "feat: rack spinning, close-up chrome and contact card in the kiosk"
```

---

### Task 8: Look at it

- [ ] **Step 1:** Dev server on 5173. Headless Playwright at 1440×900 (the browser pane may be hidden).
- [ ] **Step 2:** Screenshots: `home` (billboard visible over the roof), `inside`, `rack` (then ▶ twice), `tv`, `billboard`, `terminal`, the contact card open.
- [ ] **Step 3:** Check: the rack spins by drag and by ◀ ▶ and snaps to a face; the face title updates; clicking a disc routes to its project; Esc and «← К ларьку» return to `home`; the contact card opens, links point to Telegram/mailto/Behance, «Скопировать» shows a note; close-ups do not orbit.
- [ ] **Step 4:** Fix by tuning parameters (cameras in `build.py`, positions in `dims.py`), rebuild, `npm test`, commit `fix: tune rack, billboard and close-ups after browser check`.
- [ ] **Step 5:** Save screenshots to `docs/superpowers/qa/kiosk-discs/`, show Marat.
