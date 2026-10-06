# Kiosk Greybox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landscape home with a navigable grey 3D kiosk: a Blender script builds the scene, three.js shows it with limited orbit, every clickable object works, and the help bar plus HTML overlays open the existing portfolio views.

**Architecture:** `scripts/kiosk/build.py` runs headless in Blender and writes `assets/kiosk/kiosk.glb` with named nodes (`hs_*` hotspots, `slot_*` shelf slots, `cam_*`/`tgt_*` camera presets). Pure ES modules in `assets/js/kiosk/` decide slot assignment, hotspot picking, camera limits and UI markup (unit-tested with `node --test`). `assets/js/kiosk/scene.js` is the only WebGL code. `app.js` mounts the scene and keeps the existing hash router and overlay views. GitHub Pages serves the repository as-is, so three.js is vendored into `assets/vendor/three/` and resolved through an import map.

**Tech Stack:** Blender 5.0 (bpy, glTF exporter), three.js (GLTFLoader, OrbitControls), vanilla ES modules, Vite dev server, `node --test`.

Spec: `docs/superpowers/specs/2026-10-06-kiosk-portfolio-design.md` (stage 1 «Серая болванка»).

---

## File map

| File | Responsibility |
| --- | --- |
| `scripts/kiosk/build.py` | Build the greybox scene in Blender and export the GLB |
| `assets/kiosk/kiosk.glb` | Exported scene (committed: Pages has no build step) |
| `scripts/vendor-three.mjs` | Copy the needed three.js files from `node_modules` into `assets/vendor/three/` |
| `assets/js/kiosk/slots.js` | Put projects into the 8 shelf slots, choose packaging type |
| `assets/js/kiosk/hotspots.js` | Hotspot table, route→camera preset map, camera limits, ray-hit picking |
| `assets/js/kiosk/ui.js` | HTML strings: help bar, hint, note, loading, a11y buttons, catalog and price views |
| `assets/js/kiosk/scene.js` | three.js renderer, GLB loading, orbit, flights between presets, hover and click |
| `assets/js/router.js` | Add `#catalog` and `#price` routes |
| `assets/js/app.js` | Mount kiosk, wire actions, keep overlays |
| `assets/js/render.js` | Back-link copy «К ларьку» |
| `assets/css/kiosk.css` | Full-screen stage, help bar, label, note, hint, overlay panel |
| `assets/css/site.css` | Import kiosk.css instead of the landscape styles |
| `index.html` | Import map, no hero preload |
| `tests/kiosk-*.test.mjs` | Unit and artifact tests |

---

### Task 1: Save the August state

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ignore local-only folders**

Append to `.gitignore`:

```
concepts/
.claude/
```

- [ ] **Step 2: Commit everything else as-is**

```bash
git add -A
git status --short | grep -E '^(\?\?|A |M )' | head -40
git commit -m "wip: save August landscape + underground state before kiosk rework"
```

Expected: commit succeeds, `git status --short` is empty, `concepts/` and `.claude/` stay untracked and ignored.

- [ ] **Step 3: Run the existing suite**

Run: `npm test`
Expected: `pass 20`, `fail 0`.

---

### Task 2: Vendor three.js

**Files:**
- Create: `scripts/vendor-three.mjs`
- Create: `tests/kiosk-vendor.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Install three**

Run: `npm install three`
Expected: `three` appears in `dependencies` of `package.json`.

- [ ] **Step 2: Write the failing test**

`tests/kiosk-vendor.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = 'assets/vendor/three';
const FILES = [
  'three.module.js',
  'three.core.js',
  'addons/controls/OrbitControls.js',
  'addons/loaders/GLTFLoader.js',
  'addons/utils/BufferGeometryUtils.js',
  'addons/utils/SkeletonUtils.js'
];

function specifiers(source) {
  // Doc comments contain usage examples like `from 'three/addons/...'`.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...code.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
}

test('vendored three.js files exist', () => {
  for (const file of FILES) assert.ok(existsSync(join(ROOT, file)), file);
});

test('vendored files only import "three" or files that are vendored too', () => {
  for (const file of FILES) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const spec of specifiers(source)) {
      if (spec === 'three') continue;
      assert.ok(spec.startsWith('.'), `${file} imports ${spec}`);
      assert.ok(existsSync(join(ROOT, dirname(file), spec)), `${file} → ${spec}`);
    }
  }
});

test('index.html maps "three" to the vendored build', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /"three":\s*"\.\/assets\/vendor\/three\/three\.module\.js"/);
  assert.match(html, /"three\/addons\/":\s*"\.\/assets\/vendor\/three\/addons\/"/);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node --test tests/kiosk-vendor.test.mjs`
Expected: FAIL, files missing.

- [ ] **Step 4: Write the vendor script**

`scripts/vendor-three.mjs`:

```js
// GitHub Pages serves this repository without a build step, so the parts of
// three.js the kiosk needs are copied next to the site and resolved through
// the import map in index.html.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = [
  ['build/three.module.js', 'three.module.js'],
  ['build/three.core.js', 'three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'addons/controls/OrbitControls.js'],
  ['examples/jsm/loaders/GLTFLoader.js', 'addons/loaders/GLTFLoader.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'addons/utils/BufferGeometryUtils.js'],
  ['examples/jsm/utils/SkeletonUtils.js', 'addons/utils/SkeletonUtils.js'],
  ['LICENSE', 'LICENSE']
];

for (const [from, to] of FILES) {
  const target = join('assets/vendor/three', to);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join('node_modules/three', from), target);
}

console.log(`three.js vendored: ${FILES.length} files`);
```

Add to `package.json` `scripts`:

```json
"vendor:three": "node scripts/vendor-three.mjs",
```

Run: `npm run vendor:three`
Expected: `three.js vendored: 7 files`.

- [ ] **Step 5: Add the import map**

In `index.html` replace the hero preload line

```html
  <link rel="preload" as="image" href="assets/media/y2k/hero-scene.webp" fetchpriority="high">
```

with

```html
  <script type="importmap">
    {
      "imports": {
        "three": "./assets/vendor/three/three.module.js",
        "three/addons/": "./assets/vendor/three/addons/"
      }
    }
  </script>
```

and change `<meta name="theme-color" content="#071d52">` to `<meta name="theme-color" content="#1b2a4a">`.

- [ ] **Step 6: Run the test**

Run: `node --test tests/kiosk-vendor.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/vendor-three.mjs assets/vendor/three index.html tests/kiosk-vendor.test.mjs
git commit -m "build: vendor three.js behind an import map"
```

---

### Task 3: Catalog and price routes

**Files:**
- Modify: `assets/js/router.js`
- Modify: `tests/router.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/router.test.mjs`:

```js
test('parses and serializes the kiosk catalog and price routes', () => {
  assert.deepEqual(parseRoute('#catalog'), { view: 'catalog', id: '' });
  assert.deepEqual(parseRoute('#price'), { view: 'price', id: '' });
  assert.equal(routeToHash({ view: 'catalog' }), '#catalog');
  assert.equal(routeToHash({ view: 'price' }), '#price');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/router.test.mjs`
Expected: FAIL, `catalog` parses as `home`.

- [ ] **Step 3: Implement**

Replace `assets/js/router.js` with:

```js
const SIMPLE_VIEWS = ['about', 'contact', 'catalog', 'price'];

export function parseRoute(hash = '') {
  const value = String(hash).replace(/^#/, '');
  if (!value) return { view: 'home', id: '' };
  if (SIMPLE_VIEWS.includes(value)) return { view: value, id: '' };

  const [kind, encodedId = ''] = value.split('/');
  if ((kind === 'project' || kind === 'page') && encodedId) {
    try {
      return { view: kind, id: decodeURIComponent(encodedId) };
    } catch {
      return { view: 'home', id: '' };
    }
  }

  return { view: 'home', id: '' };
}

export function routeToHash({ view, id = '' }) {
  if (view === 'project' && id) return `#project/${encodeURIComponent(id)}`;
  if (view === 'page' && id) return `#page/${encodeURIComponent(id)}`;
  if (SIMPLE_VIEWS.includes(view)) return `#${view}`;
  return '#';
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/router.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/router.js tests/router.test.mjs
git commit -m "feat: add catalog and price routes"
```

---

### Task 4: Shelf slots

**Files:**
- Create: `assets/js/kiosk/slots.js`
- Create: `tests/kiosk-slots.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/kiosk-slots.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_COUNT, assignSlots, productFor } from '../assets/js/kiosk/slots.js';

const projects = Array.from({ length: 10 }, (_, index) => ({
  id: `p${index}`,
  title: `Project ${index}`,
  category: index % 2 ? 'graphic' : 'uxui'
}));

test('fills the eight shelf slots in content order and lists the rest as overflow', () => {
  const { placed, overflow } = assignSlots(projects);
  assert.equal(SLOT_COUNT, 8);
  assert.equal(placed.length, 8);
  assert.deepEqual(placed[0], { slot: 'slot_0', projectId: 'p0', title: 'Project 0', product: 'box' });
  assert.equal(placed[7].slot, 'slot_7');
  assert.deepEqual(overflow, ['p8', 'p9']);
});

test('leaves later slots empty when there are fewer projects', () => {
  const { placed, overflow } = assignSlots([{ id: 'a', title: 'A' }]);
  assert.equal(placed.length, 1);
  assert.deepEqual(overflow, []);
});

test('uses the short label on the price tag when there is one', () => {
  const { placed } = assignSlots([{ id: 'a', title: 'Long title', shortLabel: 'SHORT' }]);
  assert.equal(placed[0].title, 'SHORT');
});

test('explicit packaging wins, otherwise the category decides, otherwise a box', () => {
  assert.equal(productFor({ product: 'dvd', category: 'uxui' }), 'dvd');
  assert.equal(productFor({ product: 'spaceship', category: 'graphic' }), 'magazine');
  assert.equal(productFor({ category: 'uxui' }), 'box');
  assert.equal(productFor({}), 'box');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-slots.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`assets/js/kiosk/slots.js`:

```js
export const SLOT_COUNT = 8;

export const PRODUCT_TYPES = ['can', 'dvd', 'box', 'gum', 'magazine', 'notebook', 'matchbox', 'cassette'];

const PRODUCT_BY_CATEGORY = { uxui: 'box', graphic: 'magazine' };

export function productFor(project = {}) {
  if (PRODUCT_TYPES.includes(project.product)) return project.product;
  return PRODUCT_BY_CATEGORY[project.category] || 'box';
}

// Projects arrive already sorted by content order; the first ones go on the
// front shelf and the rest are only reachable through «Весь товар».
export function assignSlots(projects = [], count = SLOT_COUNT) {
  const placed = projects.slice(0, count).map((project, index) => ({
    slot: `slot_${index}`,
    projectId: project.id,
    title: project.shortLabel || project.title,
    product: productFor(project)
  }));
  return { placed, overflow: projects.slice(count).map(project => project.id) };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/kiosk-slots.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/slots.js tests/kiosk-slots.test.mjs
git commit -m "feat: assign projects to kiosk shelf slots"
```

---

### Task 5: Hotspots, presets and picking

**Files:**
- Create: `assets/js/kiosk/hotspots.js`
- Create: `tests/kiosk-hotspots.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/kiosk-hotspots.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOTSPOTS,
  PRESETS,
  ROUTE_PRESETS,
  hotspotForNode,
  isPickable,
  pickHotspot,
  presetLimits
} from '../assets/js/kiosk/hotspots.js';

const placed = [
  { slot: 'slot_0', projectId: 'kortex', title: 'KORTEX', product: 'box' },
  { slot: 'slot_1', projectId: 'учи ру', title: 'УЧИ.РУ', product: 'box' }
];

test('a slot behind the see-through showcase glass wins over the glass', () => {
  assert.equal(pickHotspot(['hs_showcase', 'slot_1']), 'slot_1');
});

test('the glass itself is picked when nothing pickable is behind it', () => {
  assert.equal(pickHotspot(['hs_showcase', 'kiosk_wall_back']), 'hs_showcase');
});

test('an opaque object in front blocks everything behind it', () => {
  assert.equal(pickHotspot(['kiosk_front_lower', 'hs_flyer']), null);
  assert.equal(pickHotspot([]), null);
  assert.equal(pickHotspot(['hs_terminal']), 'hs_terminal');
});

test('recognises hotspot and slot node names only', () => {
  assert.equal(isPickable('hs_flyer'), true);
  assert.equal(isPickable('slot_7'), true);
  assert.equal(isPickable('terminal_screen'), false);
  assert.equal(isPickable(''), false);
});

test('slots resolve to their project route, empty slots to nothing', () => {
  assert.deepEqual(hotspotForNode('slot_1', placed), {
    label: 'УЧИ.РУ',
    action: { type: 'route', hash: '#project/%D1%83%D1%87%D0%B8%20%D1%80%D1%83' }
  });
  assert.equal(hotspotForNode('slot_5', placed), null);
  assert.equal(hotspotForNode('hs_flyer', placed).label, 'Обо мне');
  assert.equal(hotspotForNode('prop_chair', placed), null);
});

test('every route view and every focus action points at a known camera preset', () => {
  for (const view of ['home', 'project', 'about', 'contact', 'page', 'catalog', 'price']) {
    assert.ok(PRESETS.includes(ROUTE_PRESETS[view]), view);
  }
  for (const spot of Object.values(HOTSPOTS)) {
    if (spot.action.type === 'focus') assert.ok(PRESETS.includes(spot.action.preset), spot.action.preset);
  }
});

test('inside the kiosk the camera is held much closer than outside', () => {
  assert.ok(presetLimits('inside').maxDistance < presetLimits('home').minDistance * 2);
  assert.equal(presetLimits('showcase'), presetLimits('home'));
  assert.ok(presetLimits('home').maxPolarAngle < Math.PI / 2);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-hotspots.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`assets/js/kiosk/hotspots.js`:

```js
export const PRESETS = ['home', 'showcase', 'flyer', 'terminal', 'pricelist', 'inside'];

export const HOTSPOTS = {
  hs_showcase: { label: 'Проекты', action: { type: 'focus', preset: 'showcase' } },
  hs_flyer: { label: 'Обо мне', action: { type: 'route', hash: '#about' } },
  hs_terminal: { label: 'Контакты', action: { type: 'route', hash: '#contact' } },
  hs_pricelist: { label: 'Прайс', action: { type: 'route', hash: '#price' } },
  hs_backdoor: { label: 'Заглянуть внутрь', action: { type: 'focus', preset: 'inside' } },
  hs_tv: { label: 'Весь товар', action: { type: 'route', hash: '#catalog' } },
  hs_radio: { label: 'Радио', action: { type: 'note', text: 'Радио пока молчит.' } },
  hs_sign_away: {
    label: 'Отошёл',
    action: { type: 'note', text: 'Марат отошёл: ищет команду. Контакты — на терминале справа.' }
  }
};

export const ROUTE_PRESETS = {
  home: 'home',
  page: 'home',
  project: 'showcase',
  catalog: 'showcase',
  about: 'flyer',
  contact: 'terminal',
  price: 'pricelist'
};

const OUTSIDE = { minDistance: 1.2, maxDistance: 9, minPolarAngle: 0.45, maxPolarAngle: 1.52 };
const INSIDE = { minDistance: 0.4, maxDistance: 1.6, minPolarAngle: 1.0, maxPolarAngle: 1.75, azimuthSpan: 1.6 };

export function presetLimits(preset) {
  return preset === 'inside' ? INSIDE : OUTSIDE;
}

const SLOT_NAME = /^slot_\d+$/;
const HOTSPOT_NAME = /^hs_[a-z_]+$/;

export function isPickable(name = '') {
  return SLOT_NAME.test(name) || HOTSPOT_NAME.test(name);
}

// `names` are the pickable-or-mesh names of ray hits, nearest first. The
// showcase glass is see-through: a slot behind it wins, while anything opaque
// in front of a hotspot blocks it.
export function pickHotspot(names = []) {
  let glass = null;
  for (const name of names) {
    if (name === 'hs_showcase') {
      glass ??= name;
      continue;
    }
    if (isPickable(name)) return name;
    return glass;
  }
  return glass;
}

export function hotspotForNode(name, placed = []) {
  if (SLOT_NAME.test(name)) {
    const item = placed.find(entry => entry.slot === name);
    if (!item) return null;
    return {
      label: item.title,
      action: { type: 'route', hash: `#project/${encodeURIComponent(item.projectId)}` }
    };
  }
  return HOTSPOTS[name] || null;
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/kiosk-hotspots.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/hotspots.js tests/kiosk-hotspots.test.mjs
git commit -m "feat: kiosk hotspot table, camera presets and ray picking"
```

---

### Task 6: Kiosk UI markup

**Files:**
- Create: `assets/js/kiosk/ui.js`
- Create: `tests/kiosk-ui.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/kiosk-ui.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCatalogView,
  renderHelpBar,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView
} from '../assets/js/kiosk/ui.js';

test('the help bar links to projects, about and contacts and offers help', () => {
  const html = renderHelpBar();
  assert.match(html, /href="#catalog">Проекты</);
  assert.match(html, /href="#about">Обо мне</);
  assert.match(html, /href="#contact">Контакты</);
  assert.match(html, /data-action="kiosk-help"/);
});

test('the catalog lists every project with an encoded link and escaped title', () => {
  const html = renderCatalogView([
    { id: 'учи ру', title: 'Учи.ру <b>', year: '2026' },
    { id: 'kortex', title: 'KORTEX', year: '2025' }
  ]);
  assert.match(html, /href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83"/);
  assert.match(html, /Учи\.ру &lt;b&gt;/);
  assert.match(html, /href="#">/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
});

test('hotspot buttons are real buttons carrying the node name', () => {
  const html = renderHotspotButtons([{ node: 'hs_flyer', label: 'Обо мне' }, { node: 'slot_0', label: 'A&B' }]);
  assert.match(html, /<button type="button" data-action="kiosk-pick" data-node="hs_flyer">Обо мне<\/button>/);
  assert.match(html, /A&amp;B/);
});

test('loading, note and price render readable text', () => {
  assert.match(renderLoading(41.6), /42%/);
  assert.match(renderNote('a < b'), /a &lt; b/);
  assert.match(renderPriceView(), /Прайс/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-ui.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`assets/js/kiosk/ui.js`:

```js
import { escapeHtml } from '../render.js';

export function renderHelpBar() {
  return `<nav class="kiosk-help" aria-label="Помощь по ларьку">
    <a href="#catalog">Проекты</a>
    <a href="#about">Обо мне</a>
    <a href="#contact">Контакты</a>
    <button type="button" data-action="kiosk-help">Как тут ходить?</button>
  </nav>`;
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
      <a class="back-link" href="#">← К ларьку</a>
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
      <a class="back-link" href="#">← К ларьку</a>
      <h1>Прайс</h1>
      <p class="view-summary">Скоро здесь будет прайс на услуги.</p>
    </header>
  </article>`;
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/kiosk-ui.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/ui.js tests/kiosk-ui.test.mjs
git commit -m "feat: kiosk help bar, catalog and price markup"
```

---

### Task 7: Blender greybox scene

**Files:**
- Create: `scripts/kiosk/build.py`
- Create: `tests/kiosk-scene-file.test.mjs`
- Create: `assets/kiosk/kiosk.glb` (generated)
- Modify: `package.json`, `README.md`

Coordinates are Blender metres, Z up, the kiosk front faces −Y. The glTF exporter converts to three.js Y-up.

- [ ] **Step 1: Write the failing test**

`tests/kiosk-scene-file.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function nodeNames() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  return new Set(json.nodes.map(node => node.name));
}

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const names = nodeNames();
  for (const node of Object.keys(HOTSPOTS)) assert.ok(names.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(names.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(names.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(names.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the kiosk scene stays inside the desktop budget', () => {
  assert.ok(statSync(GLB).size < 8 * 1024 * 1024);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-scene-file.test.mjs`
Expected: FAIL, `ENOENT ... kiosk.glb`.

- [ ] **Step 3: Write the Blender script**

`scripts/kiosk/build.py`:

```python
"""Greybox of the «У МАРАТА» kiosk.

Run with `npm run build:kiosk`. The whole scene is rebuilt from the numbers
below on every run and exported to assets/kiosk/kiosk.glb, so a change is a
parameter edit, never a hand-patched file.

Blender metres, Z up, the kiosk front faces -Y. Node names are the contract
with the site: hs_* are hotspots, slot_* shelf slots, cam_*/tgt_* camera
presets (see assets/js/kiosk/hotspots.js).
"""

import math
import os

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'kiosk', 'kiosk.glb')

W, D = 3.0, 2.0            # kiosk footprint
PLINTH = 0.12              # floor height above the snow
TOP = 2.4                  # top of the walls
GLASS_LOW, GLASS_HIGH = 0.95, 2.25
WALL = 0.06
SLOT_COUNT = 8

CAMERAS = {
    'home': ((3.4, -7.2, 2.1), (0.0, 0.0, 1.4)),
    'showcase': ((0.3, -3.0, 1.65), (0.0, -0.9, 1.5)),
    'flyer': ((-1.7, -3.1, 1.65), (-1.94, -1.11, 1.55)),
    'terminal': ((2.9, -2.9, 1.5), (2.15, -0.75, 1.2)),
    'pricelist': ((-0.75, -2.2, 1.3), (-0.9, -0.95, 1.12)),
    'inside': ((0.75, 0.6, 1.55), (-0.4, -0.2, 1.25)),
}

_materials = {}


def material(name, color, alpha=1.0, emission=0.0):
    if name in _materials:
        return _materials[name]
    mat = bpy.data.materials.new(name)
    if not getattr(mat, 'use_nodes', True):
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Alpha'].default_value = alpha
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission
    if alpha < 1.0 and hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    _materials[name] = mat
    return mat


def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def box(name, size, loc, mat, parent=None, rot_z=0.0):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh), parent)
    obj.location = loc
    obj.rotation_euler = (0.0, 0.0, rot_z)
    return obj


def cylinder(name, radius, depth, loc, mat, parent=None):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh), parent)
    obj.location = loc
    return obj


def empty(name, loc, parent=None, rot_z=0.0):
    obj = link(bpy.data.objects.new(name, None), parent)
    obj.location = loc
    obj.rotation_euler = (0.0, 0.0, rot_z)
    return obj


def text(name, body, loc, size, mat):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = body
    curve.size = size
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.extrude = 0.012
    source = link(bpy.data.objects.new(name + '_curve', curve))
    source.location = loc
    source.rotation_euler = (math.pi / 2, 0.0, 0.0)
    bpy.context.view_layer.update()
    evaluated = source.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    mesh.materials.clear()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh))
    obj.matrix_world = source.matrix_world.copy()
    bpy.data.objects.remove(source)
    return obj


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    paint = material('paint', (0.46, 0.52, 0.56))
    paint_dark = material('paint_dark', (0.30, 0.34, 0.37))
    frame = material('frame', (0.22, 0.24, 0.26))
    glass = material('glass', (0.75, 0.85, 0.95), alpha=0.18)
    snow = material('snow', (0.86, 0.89, 0.94))
    sign = material('sign', (0.93, 0.90, 0.82))
    ink = material('ink', (0.08, 0.08, 0.09))
    paper = material('paper', (0.95, 0.93, 0.86))
    poster = material('poster', (0.80, 0.74, 0.62))
    wood = material('wood', (0.45, 0.33, 0.22))
    goods = material('goods', (0.78, 0.55, 0.30))
    filler = material('filler', (0.55, 0.40, 0.38))
    device = material('device', (0.20, 0.21, 0.23))
    screen = material('screen', (0.35, 0.55, 0.70), emission=0.6)
    bulb = material('bulb', (1.0, 0.72, 0.38), emission=6.0)
    away = material('away', (0.90, 0.22, 0.18))

    hw = W / 2
    hd = D / 2
    wall_h = TOP - PLINTH
    wall_z = PLINTH + wall_h / 2
    front_y = -hd + WALL / 2

    # ground and street
    box('ground_snow', (30.0, 30.0, 0.02), (0.0, 0.0, -0.01), snow)
    cylinder('prop_lamppost', 0.06, 4.2, (-3.2, -1.6, 2.1), frame)
    box('prop_lamphead', (0.5, 0.18, 0.12), (-3.0, -1.6, 4.2), frame)

    # shell
    box('kiosk_floor', (W, D, PLINTH), (0.0, 0.0, PLINTH / 2), paint_dark)
    box('kiosk_front_lower', (W, WALL, GLASS_LOW - PLINTH), (0.0, front_y, (PLINTH + GLASS_LOW) / 2), paint)
    box('kiosk_front_top', (W, WALL, TOP - GLASS_HIGH), (0.0, front_y, (GLASS_HIGH + TOP) / 2), paint)
    for side, x in (('l', -hw + 0.05), ('r', hw - 0.05)):
        box(f'kiosk_post_{side}', (0.1, WALL, GLASS_HIGH - GLASS_LOW), (x, front_y, (GLASS_LOW + GLASS_HIGH) / 2), frame)
    box('hs_showcase', (W - 0.2, 0.02, GLASS_HIGH - GLASS_LOW), (0.0, -hd + 0.01, (GLASS_LOW + GLASS_HIGH) / 2), glass)
    for side, x in (('l', -hw + WALL / 2), ('r', hw - WALL / 2)):
        box(f'kiosk_wall_{side}', (WALL, D, wall_h), (x, 0.0, wall_z), paint)

    # back wall with the door opening between x=0.2 and x=1.0
    door_l, door_r, door_top = 0.2, 1.0, 2.05
    back_y = hd - WALL / 2
    box('kiosk_back_left', (door_l + hw, WALL, wall_h), ((door_l - hw) / 2, back_y, wall_z), paint)
    box('kiosk_back_right', (hw - door_r, WALL, wall_h), ((door_r + hw) / 2, back_y, wall_z), paint)
    box('kiosk_back_top', (door_r - door_l, WALL, TOP - door_top), ((door_l + door_r) / 2, back_y, (door_top + TOP) / 2), paint)
    hinge = empty('door_hinge', (door_r, hd, 0.0), rot_z=math.radians(-70))
    box('hs_backdoor', (door_r - door_l, 0.05, door_top - PLINTH), (-(door_r - door_l) / 2, 0.03, (PLINTH + door_top) / 2), paint_dark, parent=hinge)

    # roof and sign
    box('kiosk_roof', (W + 0.3, D + 0.3, 0.1), (0.0, 0.0, TOP + 0.05), paint_dark)
    box('kiosk_signbox', (W + 0.2, 0.3, 0.55), (0.0, -hd, TOP + 0.38), sign)
    text('kiosk_sign_text', 'У МАРАТА', (0.0, -hd - 0.16, TOP + 0.38), 0.34, ink)

    # serving window, the away sign and the price list behind the glass
    box('kiosk_window_frame', (0.6, 0.08, 0.46), (0.0, -hd - 0.03, 1.18), frame)
    box('kiosk_counter_shelf', (0.7, 0.25, 0.04), (0.0, -hd - 0.12, GLASS_LOW + 0.02), wood)
    box('hs_sign_away', (0.3, 0.01, 0.18), (0.0, -hd + 0.06, 1.2), away)
    box('hs_pricelist', (0.3, 0.01, 0.36), (-0.9, -hd + 0.06, 1.12), paper)

    # shutters swung open like «Мечта»; inner faces with posters face the street
    left = empty('shutter_left_hinge', (-hw, -hd, 0.0), rot_z=math.radians(190))
    box('shutter_left', (1.0, 0.04, 1.5), (0.5, 0.0, 1.6), paint, parent=left)
    box('hs_flyer', (0.32, 0.01, 0.45), (0.45, 0.03, 1.55), paper, parent=left)
    box('poster_left_a', (0.28, 0.01, 0.2), (0.78, 0.03, 1.95), poster, parent=left)
    box('poster_left_b', (0.22, 0.01, 0.3), (0.15, 0.03, 1.2), poster, parent=left)
    right = empty('shutter_right_hinge', (hw, -hd, 0.0), rot_z=math.radians(170))
    box('shutter_right', (1.0, 0.04, 1.5), (-0.5, 0.0, 1.6), paint, parent=right)
    box('poster_right_a', (0.3, 0.01, 0.42), (-0.5, 0.03, 1.5), poster, parent=right)

    # shelves: slots on the front row, filler above
    shelf_y = -hd + 0.2
    box('shelf_front', (W - 0.3, 0.3, 0.03), (0.0, shelf_y, 1.3), wood)
    for index in range(SLOT_COUNT):
        x = -1.2 + index * (2.4 / (SLOT_COUNT - 1))
        box(f'slot_{index}', (0.22, 0.14, 0.3), (x, shelf_y, 1.465), goods)
    box('shelf_upper', (W - 0.3, 0.3, 0.03), (0.0, shelf_y, 1.85), wood)
    for index in range(10):
        x = -1.25 + index * 0.28
        height = 0.18 + (index % 3) * 0.06
        box(f'filler_{index}', (0.2, 0.14, height), (x, shelf_y, 1.865 + height / 2), filler)

    # inside
    box('prop_counter', (W - 0.3, 0.45, 0.9), (0.0, -0.55, PLINTH + 0.45), wood)
    box('prop_chair_seat', (0.45, 0.45, 0.06), (0.2, 0.15, 0.55), wood)
    box('prop_chair_back', (0.45, 0.05, 0.5), (0.2, 0.38, 0.83), wood)
    box('prop_heater', (0.5, 0.18, 0.55), (-1.0, 0.72, PLINTH + 0.28), frame)
    box('prop_tv_shelf', (0.4, 0.6, 0.03), (-1.22, 0.3, 1.55), wood)
    box('hs_tv', (0.36, 0.42, 0.34), (-1.22, 0.3, 1.74), device)
    box('tv_screen', (0.02, 0.32, 0.24), (-1.03, 0.3, 1.75), screen)
    box('hs_radio', (0.36, 0.14, 0.2), (0.9, -0.55, PLINTH + 1.0), device)
    cylinder('prop_kettle', 0.09, 0.22, (-0.4, -0.55, PLINTH + 1.01), frame)
    box('prop_calendar', (0.4, 0.01, 0.55), (-0.8, hd - WALL - 0.01, 1.6), paper)
    for index, x in enumerate((-0.6, 0.6)):
        cylinder(f'bulb_{index}', 0.04, 0.09, (x, 0.0, TOP - 0.2), bulb)
    cylinder('bulb_outside', 0.05, 0.1, (0.0, -hd - 0.15, TOP - 0.05), bulb)

    # payment terminal beside the kiosk
    terminal = box('hs_terminal', (0.62, 0.45, 1.75), (2.15, -0.55, 0.875), device)
    box('terminal_screen', (0.45, 0.02, 0.32), (0.0, -0.235, 0.35), screen, parent=terminal)

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
    )
    print(f'kiosk exported: {OUT}')


build()
export()
```

Add to `package.json` `scripts`:

```json
"build:kiosk": "${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender} -b --factory-startup --python-exit-code 1 --python scripts/kiosk/build.py",
```

- [ ] **Step 4: Build the scene**

Run: `npm run build:kiosk`
Expected: the log ends with `kiosk exported: …/assets/kiosk/kiosk.glb`, exit code 0.

- [ ] **Step 5: Run the test**

Run: `node --test tests/kiosk-scene-file.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Document the command**

In `README.md` replace the section `## Графика первого экрана` and its body (up to `## Как открыть панель`) with:

```markdown
## Ларёк

Сцена собирается скриптом в Blender с нуля, а не правится руками:

```bash
npm run build:kiosk
```

`scripts/kiosk/build.py` строит ларёк, внутренности, терминал и камеры и
пишет `assets/kiosk/kiosk.glb`. Имена объектов — договор с сайтом: `hs_*` —
кликабельные места, `slot_*` — полки под проекты, `cam_*`/`tgt_*` — точки
камеры (см. `assets/js/kiosk/hotspots.js`). Blender ищется в
`/Applications/Blender.app`, другой путь можно задать через `BLENDER=...`.

three.js лежит в `assets/vendor/three/` (GitHub Pages отдаёт репозиторий без
сборки). После обновления пакета: `npm run vendor:three`.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/kiosk/build.py assets/kiosk/kiosk.glb tests/kiosk-scene-file.test.mjs package.json README.md
git commit -m "feat: Blender greybox of the kiosk exported to GLB"
```

---

### Task 8: three.js scene runtime

**Files:**
- Create: `assets/js/kiosk/scene.js`

WebGL code is verified in the browser in Task 10, not with unit tests.

- [ ] **Step 1: Implement**

`assets/js/kiosk/scene.js`:

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PRESETS, isPickable, pickHotspot, presetLimits } from './hotspots.js';

const SKY = 0x1b2a4a;
const HOVER = 0x4a3210;
const FLIGHT_MS = 1100;

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

export async function createKioskScene({ container, url, onProgress = () => {}, onHover = () => {}, onPick = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 14, 34);
  scene.add(new THREE.HemisphereLight(0xaac4ff, 0x2a2a33, 1.6));
  const warm = new THREE.PointLight(0xffb259, 8, 6, 1.4);
  warm.position.set(0, 2.1, 0);
  scene.add(warm);

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 80);
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

  function setSlots(placed) {
    const used = new Set(placed.map(item => item.slot));
    root.traverse(object => {
      if (/^slot_\d+$/.test(object.name)) object.visible = used.has(object.name);
    });
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

  function applyLimits(name) {
    const limits = presetLimits(name);
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant || reduced) {
      flight = null;
      controls.enabled = true;
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      applyLimits(name);
      return;
    }
    controls.enabled = false;
    flight = {
      name,
      start: performance.now(),
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      to: preset.position,
      toTarget: preset.target
    };
  }

  let down = null;
  canvas.addEventListener('pointerdown', event => {
    down = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', event => {
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
    if (moved > 6) return;
    const name = pick(event.clientX, event.clientY);
    if (name) onPick(name);
  });

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
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
      camera.lookAt(controls.target);
      if (t === 1) {
        const { name } = flight;
        flight = null;
        controls.enabled = true;
        applyLimits(name);
      }
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
  });

  return {
    focus,
    setSlots,
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

- [ ] **Step 2: Commit**

```bash
git add assets/js/kiosk/scene.js
git commit -m "feat: three.js kiosk scene with limited orbit and preset flights"
```

---

### Task 9: Mount the kiosk in the site

**Files:**
- Modify: `assets/js/app.js` (full replacement)
- Modify: `assets/js/render.js` (back-link copy)
- Create: `assets/css/kiosk.css`
- Modify: `assets/css/site.css`
- Modify: `tests/render.test.mjs` (only if it asserts the old back-link copy)

- [ ] **Step 1: Replace `assets/js/app.js`**

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
import { HOTSPOTS, ROUTE_PRESETS, hotspotForNode } from './kiosk/hotspots.js';
import { assignSlots } from './kiosk/slots.js';
import {
  renderCatalogView,
  renderHelpBar,
  renderHint,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView
} from './kiosk/ui.js';

const KIOSK_URL = new URL('../kiosk/kiosk.glb', import.meta.url).href;

const state = { bundle: null, kiosk: null, placed: [] };

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
    <div id="kiosk-loading-slot">${renderLoading(0)}</div>
    ${renderHelpBar()}`;
}

function hotspotEntries() {
  const slots = state.placed.map(item => ({ node: item.slot, label: item.title }));
  const fixed = Object.entries(HOTSPOTS).map(([node, spot]) => ({ node, label: spot.label }));
  return [...slots, ...fixed];
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

function runAction(node) {
  const spot = hotspotForNode(node, state.placed);
  if (!spot) return;
  const { action } = spot;
  if (action.type === 'route') window.location.hash = action.hash;
  if (action.type === 'focus') state.kiosk?.focus(action.preset);
  if (action.type === 'note') showNote(action.text);
}

function showLabel(node, x, y) {
  const label = document.querySelector('#kiosk-label');
  const spot = node ? hotspotForNode(node, state.placed) : null;
  document.body.classList.toggle('is-pointing', Boolean(spot));
  if (!spot) {
    label.hidden = true;
    return;
  }
  label.textContent = spot.label;
  label.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
  label.hidden = false;
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
  state.kiosk?.focus(ROUTE_PRESETS[route.view] || 'home');

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
      onPick: runAction
    });
    state.kiosk.setSlots(state.placed);
    state.kiosk.focus(ROUTE_PRESETS[parseRoute(window.location.hash).view] || 'home', { instant: true });
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
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  if (action === 'kiosk-pick') runAction(element.dataset.node);
  if (action === 'kiosk-help') showHint();
  if (action === 'close-overlay') window.location.hash = '';
  if (action === 'scroll-to-section') {
    // Section anchors must not touch the hash: it is the view router.
    event.preventDefault();
    document.getElementById(element.dataset.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !overlayView.hidden) window.location.hash = '';
});

window.addEventListener('hashchange', renderRoute);

export async function bootstrapPortfolio() {
  header.hidden = true;
  drawShell();
  try {
    state.bundle = await loadContent();
    state.placed = assignSlots(state.bundle.projects).placed;
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

- [ ] **Step 2: Back-link copy in `assets/js/render.js`**

Replace both `Обратно под траву` and every `На главную` inside `class="back-link"` anchors with `К ларьку`:

```bash
sed -i '' 's/<\/i>Обратно под траву<\/a>/<\/i>К ларьку<\/a>/; s/<\/i>На главную<\/a>/<\/i>К ларьку<\/a>/g' assets/js/render.js
grep -n 'back-link' assets/js/render.js
```

Expected: four `back-link` lines, all ending in `К ларьку</a>`.

Run: `grep -n 'Обратно под траву\|На главную' tests/render.test.mjs`
If it prints matches, replace those strings in the test with `К ларьку`.

- [ ] **Step 3: Create `assets/css/kiosk.css`**

```css
/* The kiosk owns the whole viewport; portfolio views open as a panel on top. */

body {
  overflow: hidden;
  background: #1b2a4a;
}

#home-view {
  position: fixed;
  inset: 0;
}

.kiosk-stage {
  position: absolute;
  inset: 0;
}

.kiosk-stage canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

body.is-pointing .kiosk-stage canvas {
  cursor: pointer;
}

.kiosk-label {
  position: fixed;
  z-index: 5;
  top: 0;
  left: 0;
  padding: 4px 9px;
  color: #1c1408;
  background: #f4e3b8;
  font: 13px/1.3 var(--mono);
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .35);
}

.kiosk-label[hidden] {
  display: none;
}

.kiosk-help {
  position: fixed;
  z-index: 6;
  left: 50%;
  bottom: 18px;
  display: flex;
  gap: 4px;
  padding: 5px;
  background: rgba(14, 18, 28, .8);
  border: 1px solid rgba(255, 255, 255, .14);
  transform: translateX(-50%);
  backdrop-filter: blur(8px);
}

.kiosk-help a,
.kiosk-help button {
  padding: 9px 14px;
  color: #f3ecdf;
  background: transparent;
  font: 13px/1.2 var(--mono);
  white-space: nowrap;
}

.kiosk-help a:hover,
.kiosk-help button:hover,
.kiosk-help a:focus-visible,
.kiosk-help button:focus-visible {
  color: #1c1408;
  background: #f4e3b8;
  outline: none;
}

.kiosk-hint {
  position: fixed;
  z-index: 6;
  top: 22px;
  left: 50%;
  padding: 10px 16px;
  color: #f3ecdf;
  background: rgba(14, 18, 28, .8);
  font: 14px/1.4 var(--mono);
  transform: translateX(-50%);
  animation: kiosk-fade 4s both;
  pointer-events: none;
}

@keyframes kiosk-fade {
  0% { opacity: 0; }
  10%, 85% { opacity: 1; }
  100% { opacity: 0; }
}

.kiosk-note {
  position: fixed;
  z-index: 7;
  left: 50%;
  bottom: 78px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 12px 16px;
  color: #1c1408;
  background: #f4e3b8;
  font: 14px/1.45 var(--mono);
  transform: translateX(-50%);
}

.kiosk-loading {
  position: fixed;
  z-index: 8;
  inset: 0;
  display: grid;
  place-items: center;
  color: #f3ecdf;
  background: #1b2a4a;
  font: 15px var(--mono);
}

.kiosk-a11y button {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.kiosk-a11y button:focus-visible {
  position: fixed;
  z-index: 9;
  top: 16px;
  left: 16px;
  width: auto;
  height: auto;
  padding: 8px 12px;
  color: #1c1408;
  background: #f4e3b8;
  clip-path: none;
}

#overlay-view {
  position: fixed;
  z-index: 10;
  inset: 0;
}

#overlay-view[hidden] {
  display: none;
}

.overlay-scrim {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 16, .55);
}

.overlay-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(820px, 100%);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #10141f;
  box-shadow: -20px 0 60px rgba(0, 0, 0, .45);
}

.catalog-list {
  margin: 0;
  padding: 0 var(--page-pad) 64px;
  list-style: none;
}

.catalog-list a {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, .14);
  font-size: 18px;
}

.catalog-list a:hover small,
.catalog-list a:hover span {
  color: #f4e3b8;
}

@media (max-width: 640px) {
  .kiosk-help {
    right: 12px;
    left: 12px;
    bottom: 12px;
    justify-content: space-between;
    transform: none;
  }

  .kiosk-help a,
  .kiosk-help button {
    padding: 12px 8px;
    font-size: 12px;
  }
}
```

- [ ] **Step 4: Point `assets/css/site.css` at the kiosk**

Replace its content with:

```css
@import url('./fonts.css');
@import url('./base.css');
@import url('./views.css');
@import url('./responsive.css');
@import url('./kiosk.css');
```

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: all tests pass (20 old + 21 new = 41, minus none).

- [ ] **Step 6: Commit**

```bash
git add assets/js/app.js assets/js/render.js assets/css/kiosk.css assets/css/site.css tests/render.test.mjs
git commit -m "feat: mount the kiosk greybox as the home screen"
```

---

### Task 10: Look at it in the browser

- [ ] **Step 1: Start the dev server**

Run (background): `npx vite --port 5173 --strictPort`
Open `http://localhost:5173/missing-mar-portfolio/` in the browser pane at 1440×900.

- [ ] **Step 2: Check each behaviour and take a screenshot of each**

1. Loading text, then the kiosk from the `home` preset; first-visit hint appears and fades.
2. Drag rotates around the kiosk, wheel zooms; the camera never goes under the snow or past `maxDistance`.
3. Hover over a slot, the flyer, the terminal: the object tints and the label follows the cursor.
4. Click a slot → camera flies to `showcase`, project panel opens; «К ларьку» and Esc close it.
5. Flyer → `#about`, terminal → `#contact`, price list → `#price`, help bar «Проекты» → `#catalog`.
6. Back door → camera moves inside, orbit is limited; TV → `#catalog`; radio and «Отошёл» show a note.
7. Tab reaches the hidden hotspot buttons and they become visible on focus; Enter triggers them.
8. Browser back restores the previous view and camera preset.
9. Repeat 1, 4, 5 at 390×844 with touch emulation.

- [ ] **Step 3: Fix what is wrong**

Typical adjustments are camera numbers in `CAMERAS` (`scripts/kiosk/build.py`) or limits in `hotspots.js`. After changing the Blender script, run `npm run build:kiosk` and `npm test` again.

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: tune kiosk greybox cameras after browser check"
```

- [ ] **Step 5: Show Marat the greybox**

Share 1440×900 screenshots of: home, showcase close-up, inside view, an open project panel; and the 390×844 home. Stage 1 is done when he approves composition, scale and controls. Stages 2–5 get their own plans.
