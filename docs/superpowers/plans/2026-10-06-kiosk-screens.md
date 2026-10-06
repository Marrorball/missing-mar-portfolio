# In-Scene Screens Implementation Plan (stages 3b + 3c)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nothing opens a separate panel any more: projects play on the TV inside (channels, remote, static between channels, TV guide), «Обо мне» and «Прайс» are on the billboard (clickable tabs), contacts are on the «ПРОПАЛ ДИЗАЙНЕР» flyer and the terminal, and contacts are written in marker on the shutter next to the flyer.

**Architecture:** Every page is real HTML placed exactly on its object with three.js `CSS3DRenderer`, so text is crisp, selectable and clickable. Screens are defined in Blender as anchors (`screen_tv`, `screen_billboard`, `screen_terminal`, `screen_flyer`) with their size in glTF extras; at runtime the camera is placed straight in front of the anchor at a distance that fits the screen (`fitDistance`), and the page element is sized 1 CSS px : 1 screen px. Pure modules render the pages (`pages.js`) and handle channel order (`channels.js`). On screens ≤ 760 px wide, and when 3D is unavailable, the same page fills the viewport instead («flat mode»). The marker text on the shutter is a canvas texture built from the content contacts.

**Tech Stack:** three.js (`CSS3DRenderer`, `CanvasTexture`), Blender 5.0 bpy, vanilla ES modules, `node --test`.

Spec: `docs/superpowers/specs/2026-10-06-kiosk-portfolio-design.md` («Экраны в сцене»). Marat's correction 2026-10-06: contacts live on the flyer (with marker text on the wall next to it), not only on the terminal.

Code blocks preceded by `<!-- file: path -->` are complete file contents.

---

## File map

| File | Responsibility |
| --- | --- |
| `scripts/vendor-three.mjs`, `tests/kiosk-vendor.test.mjs` | Vendor `CSS3DRenderer` |
| `assets/js/kiosk/channels.js` | Channel numbers, next/previous with wrap-around |
| `assets/js/kiosk/pages.js` | HTML of every screen: TV channel, TV guide, billboard about/price/page, terminal, flyer |
| `assets/js/kiosk/hotspots.js` | `flyer` close-up, `SCREENS`, `fitDistance`, contact → flyer, terminal as a focus |
| `assets/js/kiosk/ui.js` | TV remote; catalog/price views removed (now pages) |
| `assets/js/kiosk/scene.js` | CSS3D screens, fitted close-up cameras, marker text on the shutter |
| `assets/js/app.js` | Routes open screens; flat mode; remote, keyboard |
| `assets/css/screens.css` | Look of TV, remote, billboard, terminal, flyer, flat mode |
| `scripts/kiosk/lib.py`, `kiosk.py`, `build.py` | Flyer screen anchor, wall-contacts anchor, flyer camera |

---

### Task 1: Vendor CSS3DRenderer

**Files:**
- Modify: `tests/kiosk-vendor.test.mjs`, `scripts/vendor-three.mjs`

- [ ] **Step 1: Failing test** — in `tests/kiosk-vendor.test.mjs` add `'addons/renderers/CSS3DRenderer.js'` to `FILES` (after `'addons/loaders/GLTFLoader.js'`).

Run: `node --test tests/kiosk-vendor.test.mjs`
Expected: FAIL, `addons/renderers/CSS3DRenderer.js` missing.

- [ ] **Step 2: Vendor it** — in `scripts/vendor-three.mjs` add to `FILES` after the GLTFLoader entry:

```js
  ['examples/jsm/renderers/CSS3DRenderer.js', 'addons/renderers/CSS3DRenderer.js'],
```

Run: `npm run vendor:three && node --test tests/kiosk-vendor.test.mjs`
Expected: `three.js vendored: 8 files`, PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/vendor-three.mjs tests/kiosk-vendor.test.mjs assets/vendor/three
git commit -m "build: vendor CSS3DRenderer for in-scene pages"
```

---

### Task 2: Channels

**Files:**
- Create: `assets/js/kiosk/channels.js`, `tests/kiosk-channels.test.mjs`

- [ ] **Step 1: Failing test**

<!-- file: tests/kiosk-channels.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { channelNumber, neighbourId } from '../assets/js/kiosk/channels.js';

test('channel numbers are two digits, starting at 01', () => {
  assert.equal(channelNumber(0), '01');
  assert.equal(channelNumber(11), '12');
});

test('switching channels wraps around both ways', () => {
  const projects = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(neighbourId(projects, 'a', 1), 'b');
  assert.equal(neighbourId(projects, 'c', 1), 'a');
  assert.equal(neighbourId(projects, 'a', -1), 'c');
  assert.equal(neighbourId(projects, 'missing', 1), 'a');
  assert.equal(neighbourId([], 'a', 1), null);
});
```

Run: `node --test tests/kiosk-channels.test.mjs` → FAIL, module not found.

- [ ] **Step 2: Implement**

<!-- file: assets/js/kiosk/channels.js -->
```js
// Every project is a channel, numbered in content order.
export function channelNumber(index) {
  return String(index + 1).padStart(2, '0');
}

export function neighbourId(projects = [], id, step) {
  if (!projects.length) return null;
  const index = projects.findIndex(project => project.id === id);
  if (index === -1) return projects[0].id;
  return projects[(index + step + projects.length) % projects.length].id;
}
```

Run: `node --test tests/kiosk-channels.test.mjs` → PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add assets/js/kiosk/channels.js tests/kiosk-channels.test.mjs
git commit -m "feat: TV channel numbers and switching"
```

---

### Task 3: Pages

**Files:**
- Create: `assets/js/kiosk/pages.js`, `tests/kiosk-pages.test.mjs`

- [ ] **Step 1: Failing test**

<!-- file: tests/kiosk-pages.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderAboutBoard,
  renderFlyer,
  renderPageBoard,
  renderPriceBoard,
  renderTerminalScreen,
  renderTvChannel,
  renderTvGuide
} from '../assets/js/kiosk/pages.js';

const links = [
  { kind: 'telegram', label: 'Telegram', value: '@marrorball', href: 'https://t.me/marrorball' },
  { kind: 'email', label: 'Почта', value: 'a@b.cd', href: 'mailto:a@b.cd' }
];

test('a TV channel shows the project under its channel number', () => {
  const html = renderTvChannel({
    id: 'kortex',
    title: 'KORTEX <x>',
    year: '2025',
    summary: 'Сервис',
    tags: ['ИИ'],
    behance: 'https://www.behance.net/gallery/1',
    sections: [{ id: 'problem', label: '❓ Задача', content: '<p>owner html</p>' }]
  }, { index: 2, category: 'UX/UI проекты' });
  assert.match(html, /КАНАЛ 03/);
  assert.match(html, /KORTEX &lt;x&gt;/);
  assert.match(html, /UX\/UI проекты · 2025/);
  assert.match(html, /<li>ИИ<\/li>/);
  assert.match(html, /<h2>Задача<\/h2>/);
  assert.match(html, /<p>owner html<\/p>/);
  assert.match(html, /href="https:\/\/www\.behance\.net\/gallery\/1" target="_blank" rel="noreferrer"/);
});

test('unsafe Behance links never reach the TV', () => {
  assert.doesNotMatch(renderTvChannel({ id: 'a', title: 'A', behance: 'javascript:alert(1)' }), /Behance/);
});

test('the TV guide numbers every channel and links to it', () => {
  const html = renderTvGuide(
    [{ id: 'учи ру', title: 'Учи.ру', category: 'uxui', year: '2026' }, { id: 'b', title: 'B' }],
    [{ id: 'uxui', title: 'UX/UI' }]
  );
  assert.match(html, /ТЕЛЕПРОГРАММА/);
  assert.match(html, /href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83"/);
  assert.match(html, />01<.*Учи\.ру.*UX\/UI · 2026/s);
  assert.match(html, />02</);
});

test('the billboard shows who Marat is, with tabs for about and price', () => {
  const html = renderAboutBoard(
    { owner: { name: 'Марат <Д>', role: 'Product Designer', location: 'Москва', bio: 'Био', status: 'Ищу работу', profileImage: '/p.jpg' } },
    {
      experience: [{ period: '2025', company: 'KORTEX', role: 'UX/UI', description: 'Сервис' }],
      skills: [{ name: 'Figma', level: 'уверенно' }],
      tools: ['Figma']
    },
    { id: 'about', title: 'Обо мне', content: '' }
  );
  assert.match(html, /href="#about" aria-current="page">Обо мне/);
  assert.match(html, /href="#price">Прайс/);
  assert.match(html, /Марат &lt;Д&gt;/);
  assert.match(html, /Product Designer · Москва/);
  assert.match(html, /Био/);
  assert.match(html, /Ищу работу/);
  assert.match(html, /KORTEX/);
  assert.match(html, /src="\/p\.jpg"/);
});

test('price and generic pages also fit the billboard', () => {
  assert.match(renderPriceBoard(), /href="#price" aria-current="page"/);
  assert.match(renderPriceBoard(), /Скоро здесь будет прайс/);
  assert.match(renderPageBoard({ title: 'Пресса', content: '<p>x</p>' }), /Пресса.*<p>x<\/p>/s);
});

test('terminal and flyer both carry clickable contacts', () => {
  const terminal = renderTerminalScreen(links);
  assert.match(terminal, /href="https:\/\/t\.me\/marrorball" target="_blank" rel="noreferrer"/);
  assert.match(terminal, /href="mailto:a@b\.cd">/);

  const flyer = renderFlyer(links, { name: 'Марат', role: 'Designer', location: 'Москва', profileImage: '/p.jpg' });
  assert.match(flyer, /ПРОПАЛ ДИЗАЙНЕР/);
  assert.match(flyer, /Нашедшего просьба написать/);
  assert.match(flyer, /href="https:\/\/t\.me\/marrorball"/);
  assert.match(flyer, /data-action="copy-contact" data-value="@marrorball"/);
});
```

Run: `node --test tests/kiosk-pages.test.mjs` → FAIL, module not found.

- [ ] **Step 2: Implement**

<!-- file: assets/js/kiosk/pages.js -->
```js
// HTML of the pages that live on objects in the scene. Owner-authored rich
// content (case sections, page bodies) is trusted and inserted as is; every
// other value is escaped.
import { escapeHtml } from '../render.js';
import { channelNumber } from './channels.js';

function httpsUrl(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function plainLabel(label = '') {
  return label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function meta(...parts) {
  return escapeHtml(parts.filter(Boolean).join(' · '));
}

function externalAttrs(link) {
  return link.kind === 'email' ? '' : ' target="_blank" rel="noreferrer"';
}

export function renderTvChannel(project = {}, { index = 0, category = '' } = {}) {
  const tags = (project.tags || []).map(tag => `<li>${escapeHtml(tag)}</li>`).join('');
  const behance = httpsUrl(project.behance);
  const cover = typeof project.cover === 'string' ? project.cover.trim() : '';
  return `<article class="tv-page" data-channel="${escapeHtml(project.id || '')}">
    <p class="tv-osd">КАНАЛ ${channelNumber(index)}</p>
    <header class="tv-head">
      <p class="tv-kicker">${meta(category, project.year)}</p>
      <h1>${escapeHtml(project.title || '')}</h1>
      ${project.summary ? `<p class="tv-summary">${escapeHtml(project.summary)}</p>` : ''}
      ${tags ? `<ul class="tv-tags">${tags}</ul>` : ''}
      ${behance ? `<a class="tv-link" href="${escapeHtml(behance)}" target="_blank" rel="noreferrer">Смотреть на Behance ↗</a>` : ''}
    </header>
    ${cover ? `<img class="tv-cover" src="${escapeHtml(cover)}" alt="">` : ''}
    ${(project.sections || []).map(section => `<section class="tv-section">
      <h2>${escapeHtml(plainLabel(section.label || ''))}</h2>
      <div class="rich-content">${section.content || ''}</div>
    </section>`).join('')}
  </article>`;
}

export function renderTvGuide(projects = [], categories = []) {
  const categoryTitle = id => categories.find(category => category.id === id)?.title || '';
  return `<article class="tv-page tv-guide">
    <p class="tv-osd">ТЕЛЕПРОГРАММА</p>
    <h1>Сегодня в эфире</h1>
    <ol class="tv-guide-list">
      ${projects.map((project, index) => `<li><a href="#project/${encodeURIComponent(project.id)}">
        <span class="tv-guide-number">${channelNumber(index)}</span>
        <span>${escapeHtml(project.title || '')}</span>
        <small>${meta(categoryTitle(project.category), project.year)}</small>
      </a></li>`).join('')}
    </ol>
  </article>`;
}

function boardTabs(active) {
  return `<nav class="board-tabs" aria-label="Билборд">
    <a href="#about"${active === 'about' ? ' aria-current="page"' : ''}>Обо мне</a>
    <a href="#price"${active === 'price' ? ' aria-current="page"' : ''}>Прайс</a>
  </nav>`;
}

function resumeBlocks(resume = {}) {
  const experience = (resume.experience || []).map(item => `<article>
    <p><small>${escapeHtml(item.period || '')}</small></p>
    <h3>${escapeHtml(item.company || '')}</h3>
    <p><strong>${escapeHtml(item.role || '')}</strong> ${escapeHtml(item.description || '')}</p>
  </article>`).join('');
  const education = (resume.education || []).map(item => `<article>
    <p><small>${escapeHtml(item.period || '')}</small></p>
    <h3>${escapeHtml(item.institution || '')}</h3>
    <p><strong>${escapeHtml(item.program || '')}</strong> ${escapeHtml(item.description || '')}</p>
  </article>`).join('');
  const skills = (resume.skills || []).map(item => `<li><strong>${escapeHtml(item.name || '')}</strong> ${escapeHtml(item.level || '')}</li>`).join('');
  const tools = (resume.tools || []).map(tool => `<li>${escapeHtml(tool)}</li>`).join('');
  const blocks = [
    experience && `<section><h2>Опыт</h2>${experience}</section>`,
    education && `<section><h2>Образование</h2>${education}</section>`,
    skills && `<section><h2>Навыки</h2><ul>${skills}</ul></section>`,
    tools && `<section><h2>Инструменты</h2><ul>${tools}</ul></section>`
  ].filter(Boolean).join('');
  return blocks ? `<div class="board-resume">${blocks}</div>` : '';
}

export function renderAboutBoard(site = {}, resume = {}, page = {}) {
  const owner = site.owner || {};
  return `<article class="board-page">
    ${boardTabs('about')}
    <div class="board-about">
      ${owner.profileImage ? `<img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}">` : ''}
      <div>
        <h1>${escapeHtml(owner.name || page.title || 'Обо мне')}</h1>
        <p class="board-role">${meta(owner.role, owner.location)}</p>
        ${page.content ? `<div class="rich-content">${page.content}</div>` : `<p>${escapeHtml(owner.bio || '')}</p>`}
        ${owner.status ? `<p class="board-status">${escapeHtml(owner.status)}</p>` : ''}
      </div>
    </div>
    ${resumeBlocks(resume)}
  </article>`;
}

export function renderPriceBoard() {
  return `<article class="board-page">
    ${boardTabs('price')}
    <h1>Прайс</h1>
    <p>Скоро здесь будет прайс на услуги.</p>
  </article>`;
}

export function renderPageBoard(page = {}) {
  return `<article class="board-page">
    ${boardTabs('')}
    <h1>${escapeHtml(page.title || '')}</h1>
    <div class="rich-content">${page.content || ''}</div>
  </article>`;
}

export function renderTerminalScreen(links = []) {
  return `<article class="terminal-page">
    <p class="terminal-step">Шаг 1 из 1</p>
    <h1>Связаться с Маратом</h1>
    <div class="terminal-buttons">
      ${links.map(link => `<a class="terminal-button" href="${escapeHtml(link.href)}"${externalAttrs(link)}>
        <span>${escapeHtml(link.label)}</span><small>${escapeHtml(link.value)}</small>
      </a>`).join('')}
    </div>
    <p class="terminal-note">Комиссия 0%. Сдачу не выдаём.</p>
  </article>`;
}

export function renderFlyer(links = [], owner = {}) {
  return `<article class="flyer-page">
    <h1>ПРОПАЛ ДИЗАЙНЕР</h1>
    ${owner.profileImage ? `<img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}">` : ''}
    <p class="flyer-name">${escapeHtml(owner.name || '')}</p>
    <p>${meta(owner.role, owner.location)}</p>
    <p class="flyer-ask">Нашедшего просьба написать:</p>
    <ul class="flyer-contacts">
      ${links.map(link => `<li><a href="${escapeHtml(link.href)}"${externalAttrs(link)}>${escapeHtml(link.label)}: ${escapeHtml(link.value)}</a></li>`).join('')}
    </ul>
    <div class="flyer-tabs" aria-label="Оторвать контакт">
      ${links.map(link => `<button type="button" data-action="copy-contact" data-value="${escapeHtml(link.value)}">${escapeHtml(link.value)}</button>`).join('')}
    </div>
  </article>`;
}
```

Run: `node --test tests/kiosk-pages.test.mjs` → PASS (6 tests).

- [ ] **Step 3: Commit**

```bash
git add assets/js/kiosk/pages.js tests/kiosk-pages.test.mjs
git commit -m "feat: pages for the TV, billboard, terminal and flyer"
```

---

### Task 4: Screens in the hotspot table

**Files:**
- Modify: `assets/js/kiosk/hotspots.js`, `tests/kiosk-hotspots.test.mjs`

- [ ] **Step 1: Failing test** — append to `tests/kiosk-hotspots.test.mjs` (and add `SCREENS, LOCKED_PRESETS, fitDistance` to its import list):

```js
test('every screen is a locked close-up with a camera preset', () => {
  for (const preset of Object.keys(SCREENS)) {
    assert.ok(PRESETS.includes(preset), preset);
    assert.ok(LOCKED_PRESETS.includes(preset), preset);
  }
  assert.equal(SCREENS.flyer, 'screen_flyer');
});

test('contacts live on the flyer, the terminal is a place to walk to', () => {
  assert.equal(ROUTE_PRESETS.contact, 'flyer');
  assert.equal(hotspotForNode('hs_flyer').action.hash, '#contact');
  assert.deepEqual(hotspotForNode('hs_terminal').action, { type: 'focus', preset: 'terminal' });
  assert.equal(allowedIn('flyer', 'hs_flyer'), true);
  assert.equal(allowedIn('flyer', 'hs_showcase'), false);
});

test('the camera backs off just enough for a screen to fit', () => {
  assert.ok(Math.abs(fitDistance(0.32, 0.24, 40, 1.6) - 0.3297) < 0.001);   // height-bound
  assert.ok(Math.abs(fitDistance(0.32, 0.24, 40, 0.5) - 0.8792) < 0.001);   // width-bound
  assert.ok(Math.abs(fitDistance(0.32, 0.24, 40, 1.6, 0.5) - 0.6594) < 0.001);
});
```

Run: `node --test tests/kiosk-hotspots.test.mjs` → FAIL (`SCREENS` not exported).

- [ ] **Step 2: Implement** — in `assets/js/kiosk/hotspots.js`:

Replace the `PRESETS` and `LOCKED_PRESETS` lines with:

```js
export const PRESETS = ['home', 'showcase', 'inside', 'rack', 'tv', 'billboard', 'terminal', 'flyer'];

// Close-ups hold the camera still: you read or spin something, you don't orbit.
export const LOCKED_PRESETS = ['rack', 'tv', 'billboard', 'terminal', 'flyer'];

// Close-ups that show a page, and the Blender anchor the page sits on.
export const SCREENS = {
  tv: 'screen_tv',
  billboard: 'screen_billboard',
  terminal: 'screen_terminal',
  flyer: 'screen_flyer'
};

// How much of the viewport a screen may take: room is left for the way back
// and the TV remote.
export const SCREEN_FILL = 0.74;
```

In `HOTSPOTS` replace the `hs_flyer` and `hs_terminal` entries with:

```js
  hs_flyer: { label: 'Контакты', action: { type: 'route', hash: '#contact' } },
  hs_terminal: { label: 'Терминал', action: { type: 'focus', preset: 'terminal' } },
```

In `ROUTE_PRESETS` replace `contact: 'terminal'` with `contact: 'flyer'`.

In `CLOSE_UP_TARGETS` add `flyer: /^hs_flyer$/,`.

After `fitFov` add:

```js
// Distance at which a width×height screen fills `fill` of the view.
export function fitDistance(width, height, vfovDeg, aspect, fill = 1) {
  const tangent = Math.tan((vfovDeg * Math.PI) / 360);
  const vertical = height / (2 * tangent);
  const horizontal = width / (2 * tangent * aspect);
  return Math.max(vertical, horizontal) / fill;
}
```

Run: `node --test tests/kiosk-hotspots.test.mjs` → PASS (14 tests).

- [ ] **Step 3: Commit**

```bash
git add assets/js/kiosk/hotspots.js tests/kiosk-hotspots.test.mjs
git commit -m "feat: screens, flyer close-up and fitted screen distance"
```

---

### Task 5: Remote, and pages leave ui.js

**Files:**
- Modify: `assets/js/kiosk/ui.js`, `tests/kiosk-ui.test.mjs`

- [ ] **Step 1: Failing test** — in `tests/kiosk-ui.test.mjs` remove `renderCatalogView` and `renderPriceView` from the import and delete the test «the catalog lists every project…»; in the last test delete the `renderPriceView` assertion; add `renderRemote` to the import and append:

```js
test('the TV remote switches, scrolls, opens the guide and turns off', () => {
  const html = renderRemote();
  assert.match(html, /data-action="tv-channel" data-step="1"/);
  assert.match(html, /data-action="tv-channel" data-step="-1"/);
  assert.match(html, /data-action="tv-scroll" data-step="-1"/);
  assert.match(html, /data-action="tv-scroll" data-step="1"/);
  assert.match(html, /data-action="tv-menu"/);
  assert.match(html, /data-action="tv-off"/);
});
```

Run: `node --test tests/kiosk-ui.test.mjs` → FAIL (`renderRemote` not exported).

- [ ] **Step 2: Implement** — in `assets/js/kiosk/ui.js` delete `renderCatalogView` and `renderPriceView` and add:

```js
export function renderRemote() {
  return `<div class="tv-remote" role="group" aria-label="Пульт">
    <button type="button" data-action="tv-off" aria-label="Выключить и вернуться к ларьку">ВЫКЛ</button>
    <button type="button" data-action="tv-channel" data-step="1" aria-label="Следующий канал">CH+</button>
    <button type="button" data-action="tv-channel" data-step="-1" aria-label="Предыдущий канал">CH−</button>
    <button type="button" data-action="tv-scroll" data-step="-1" aria-label="Листать вверх">▲</button>
    <button type="button" data-action="tv-scroll" data-step="1" aria-label="Листать вниз">▼</button>
    <button type="button" data-action="tv-menu">МЕНЮ</button>
  </div>`;
}
```

Run: `node --test tests/kiosk-ui.test.mjs` → PASS.

- [ ] **Step 3: Commit**

```bash
git add assets/js/kiosk/ui.js tests/kiosk-ui.test.mjs
git commit -m "feat: TV remote; catalog and price become screen pages"
```

---

### Task 6: Flyer anchors in Blender

**Files:**
- Modify: `scripts/kiosk/lib.py`, `scripts/kiosk/kiosk.py`, `scripts/kiosk/build.py`, `tests/kiosk-scene-file.test.mjs`, `assets/kiosk/kiosk.glb`

- [ ] **Step 1: Failing test** — in `tests/kiosk-scene-file.test.mjs`, test «screens carry their size…», change the list to `['screen_tv', 'screen_terminal', 'screen_billboard', 'screen_flyer', 'wall_contacts']`.

Run: `node --test tests/kiosk-scene-file.test.mjs` → FAIL (`cam_flyer`, `screen_flyer` missing).

- [ ] **Step 2: Anchors can have a parent** — in `scripts/kiosk/lib.py` replace `screen` with:

```python
def screen(name, loc, width, height, rot_z=0.0, parent=None):
    """Anchor for an in-scene HTML page: the centre of the screen, facing its
    local -Y. The size travels to the site as glTF extras."""
    obj = empty(name, loc, parent=parent, rot_z=rot_z)
    obj['width'] = width
    obj['height'] = height
    return obj
```

- [ ] **Step 3: Flyer and wall anchors** — in `scripts/kiosk/kiosk.py`:

Change the import `from lib import Merge, box, cylinder, empty, text` to `from lib import Merge, box, cylinder, empty, screen, text`.

In `_shutters`, after the line `continue  # the flyer lives here` block, add:

```python
            if side == 'left' and abs(x - 0.45) < 0.3 and z < 1.25:
                continue  # marker contacts live here
```

After `text('flyer_title', …)` add:

```python
            screen('screen_flyer', (0.0, 0.0035, 0.0), 0.32, 0.45, rot_z=math.pi, parent=flyer)
            screen('wall_contacts', (0.45, 0.024, 1.02), 0.52, 0.24, rot_z=math.pi, parent=hinge)
```

- [ ] **Step 4: Flyer camera** — in `scripts/kiosk/build.py` add to `CAMERAS`:

```python
    'flyer': ((-1.79, -1.93, 1.55), (-1.938, -1.108, 1.55)),
```

- [ ] **Step 5: Build and test**

Run: `npm run build:kiosk && node --test tests/kiosk-scene-file.test.mjs` → `kiosk exported`, PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/kiosk/lib.py scripts/kiosk/kiosk.py scripts/kiosk/build.py tests/kiosk-scene-file.test.mjs assets/kiosk/kiosk.glb
git commit -m "feat: flyer page anchor and marker contacts on the shutter"
```

---

### Task 7: Scene runtime with CSS3D screens

**Files:**
- Modify: `assets/js/kiosk/scene.js` (full replacement)

- [ ] **Step 1: Implement**

<!-- file: assets/js/kiosk/scene.js -->
```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RACK_FACES } from './discs.js';
import {
  PRESETS,
  SCREENS,
  SCREEN_FILL,
  allowedIn,
  fitDistance,
  fitFov,
  isPickable,
  pickHotspot,
  presetLimits
} from './hotspots.js';

const SKY = 0x1b2a4a;
const HOVER = 0x4a3210;
const FLIGHT_MS = 1100;
const QUARTER = Math.PI / 2;
const SCREEN_FOV = 40;

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

  // Pages sit in a CSS3D layer above the canvas; only the pages themselves
  // take the mouse, everything else falls through to the scene.
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(container.clientWidth, container.clientHeight);
  cssRenderer.domElement.className = 'kiosk-css3d';
  container.appendChild(cssRenderer.domElement);

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

  const screens = {};
  for (const [preset, anchorName] of Object.entries(SCREENS)) {
    const anchor = root.getObjectByName(anchorName);
    if (!anchor) continue;
    const element = document.createElement('div');
    element.className = `screen-page screen-${preset}`;
    const scroller = document.createElement('div');
    scroller.className = 'screen-scroll';
    element.appendChild(scroller);
    const object = new CSS3DObject(element);
    anchor.getWorldPosition(object.position);
    anchor.getWorldQuaternion(object.quaternion);
    object.visible = false;
    scene.add(object);
    screens[preset] = { anchor, object, element, scroller, width: anchor.userData.width, height: anchor.userData.height };
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
    rackTarget += -step * QUARTER;
    onRackFace(rackFace);
  }
  function snapRack() {
    const turns = Math.round(-rack.rotation.y / QUARTER);
    rackTarget = -turns * QUARTER;
    rackFace = ((turns % RACK_FACES) + RACK_FACES) % RACK_FACES;
    onRackFace(rackFace);
  }

  let current = 'home';
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const names = raycaster.intersectObject(root, true)
      .filter(hit => isShown(hit.object))
      .map(hit => pickableNameOf(hit.object));
    const name = pickHotspot(names);
    return name && allowedIn(current, name) ? name : null;
  }

  // A screen close-up: straight in front of the anchor, far enough back for
  // the whole screen to fit whatever the window shape.
  function screenView(name) {
    const screen = screens[name];
    if (!screen) return null;
    const target = screen.anchor.getWorldPosition(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.anchor.getWorldQuaternion(new THREE.Quaternion()));
    const distance = fitDistance(screen.width, screen.height, SCREEN_FOV, camera.aspect, SCREEN_FILL);
    return { position: target.clone().addScaledVector(normal, distance), target };
  }

  // One CSS pixel of the page = one pixel on the monitor, so text stays sharp.
  function sizeScreen(name) {
    const screen = screens[name];
    const distance = camera.position.distanceTo(screen.object.position);
    const visible = 2 * distance * Math.tan(THREE.MathUtils.degToRad(SCREEN_FOV / 2));
    const heightPx = (screen.height / visible) * container.clientHeight;
    const widthPx = heightPx * (screen.width / screen.height);
    screen.element.style.width = `${Math.round(widthPx)}px`;
    screen.element.style.height = `${Math.round(heightPx)}px`;
    screen.object.scale.setScalar(screen.height / Math.round(heightPx));
  }

  function showScreen(name) {
    for (const [key, screen] of Object.entries(screens)) {
      const on = key === name;
      screen.object.visible = on;
      screen.element.classList.toggle('is-on', on);
    }
  }

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

  function arrive(name) {
    applyLimits(name);
    if (screens[name]) {
      sizeScreen(name);
      showScreen(name);
    }
  }

  let flight = null;
  function focus(name, { instant = false } = {}) {
    const view = screenView(name) || presets[name];
    if (!view) return;
    current = name;
    showScreen(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fov = screens[name] ? SCREEN_FOV : fitFov(presetLimits(name).fov, camera.aspect);
    if (instant || reduced) {
      flight = null;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.copy(view.position);
      controls.target.copy(view.target);
      camera.lookAt(controls.target);
      arrive(name);
      return;
    }
    controls.enabled = false;
    flight = {
      name,
      start: performance.now(),
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      to: view.position,
      toTarget: view.target,
      toFov: fov
    };
  }

  function setPage(name, html, { switching = false } = {}) {
    const screen = screens[name];
    if (!screen) return;
    screen.scroller.innerHTML = html;
    screen.scroller.scrollTop = 0;
    if (switching) {
      screen.element.classList.remove('is-switching');
      void screen.element.offsetWidth;
      screen.element.classList.add('is-switching');
    }
  }

  function setWallText(lines) {
    const anchor = root.getObjectByName('wall_contacts');
    if (!anchor || !lines.length) return;
    const { width, height } = anchor.userData;
    const paint = document.createElement('canvas');
    paint.width = 1024;
    paint.height = Math.round(1024 * (height / width));
    const context = paint.getContext('2d');
    context.fillStyle = '#121418';
    context.textBaseline = 'top';
    const lineHeight = paint.height / (lines.length + 0.4);
    lines.forEach((line, index) => {
      context.save();
      context.translate(36, 18 + index * lineHeight);
      context.rotate(-0.025 + index * 0.012);
      context.font = `${index === 0 ? 700 : 500} ${Math.round(lineHeight * 0.72)}px "IBM Plex Mono", monospace`;
      context.fillText(line, 0, 0);
      context.restore();
    });
    const texture = new THREE.CanvasTexture(paint);
    texture.colorSpace = THREE.SRGBColorSpace;
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    );
    marker.name = 'wall_contacts_text';
    marker.position.z = 0.002;
    anchor.add(marker);
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
    cssRenderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (flight) return;
    if (screens[current]) {
      focus(current, { instant: true });
    } else {
      camera.fov = fitFov(presetLimits(current).fov, camera.aspect);
      camera.updateProjectionMatrix();
    }
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
        arrive(name);
      }
    } else if (controls.enabled) {
      controls.update();
    }
    if (rack) rack.rotation.y += (rackTarget - rack.rotation.y) * 0.15;
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  });

  return {
    focus,
    spinRack,
    setPage,
    setWallText,
    pageScroller: name => screens[name]?.scroller || null,
    setHits: hits => showOnly(/^slot_\d+$/, hits),
    setDiscs: discs => showOnly(/^disc_\d+$/, discs),
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      cssRenderer.domElement.remove();
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/kiosk/scene.js
git commit -m "feat: CSS3D pages on the TV, billboard, terminal and flyer"
```

---

### Task 8: App and styles

**Files:**
- Modify: `assets/js/app.js` (full replacement)
- Create: `assets/css/screens.css`
- Modify: `assets/css/site.css`

- [ ] **Step 1: App**

<!-- file: assets/js/app.js -->
```js
import { loadContent } from './content.js';
import { renderLoadError } from './render.js';
import { parseRoute } from './router.js';
import { neighbourId } from './kiosk/channels.js';
import { contactLinks } from './kiosk/contacts.js';
import { assignDiscs } from './kiosk/discs.js';
import { HOTSPOTS, LOCKED_PRESETS, ROUTE_PRESETS, hotspotForNode } from './kiosk/hotspots.js';
import {
  renderAboutBoard,
  renderFlyer,
  renderPageBoard,
  renderPriceBoard,
  renderTerminalScreen,
  renderTvChannel,
  renderTvGuide
} from './kiosk/pages.js';
import { assignHits } from './kiosk/slots.js';
import {
  renderBackButton,
  renderContactCard,
  renderHelpBar,
  renderHint,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderRackControls,
  renderRemote
} from './kiosk/ui.js';

const KIOSK_URL = new URL('../kiosk/kiosk.glb', import.meta.url).href;
const NARROW = window.matchMedia('(max-width: 760px)');

const state = {
  bundle: null,
  kiosk: null,
  hits: [],
  discs: [],
  faces: [],
  preset: 'home',
  rackFace: 0,
  channel: null
};

const header = document.querySelector('#site-header');
const homeView = document.querySelector('#home-view');
const flatView = document.querySelector('#overlay-view');
const liveRegion = document.querySelector('#live-region');

function announce(message) {
  liveRegion.textContent = '';
  window.requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function getPage(pageId) {
  return state.bundle?.pages.find(page => page.id === pageId);
}

function getCategory(categoryId) {
  return state.bundle?.site.categories?.find(category => category.id === categoryId) || {};
}

// Phones and devices without 3D get the same pages full screen.
function isFlat() {
  return !state.kiosk || NARROW.matches;
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

function chromeFor(name) {
  if (!LOCKED_PRESETS.includes(name)) return '';
  if (name === 'rack') return renderBackButton() + renderRackControls(rackTitle(state.rackFace));
  if (name === 'tv') return renderBackButton() + renderRemote();
  return renderBackButton();
}

// Moves the camera and swaps the close-up chrome.
function focusPreset(name, options) {
  state.preset = name;
  state.kiosk?.focus(name, options);
  document.querySelector('#kiosk-closeup-slot').innerHTML = chromeFor(name);
}

function closeFlat() {
  flatView.hidden = true;
  flatView.innerHTML = '';
}

// Shows a page on its object in the scene, or full screen when flat.
function openScreen(preset, html, options = {}) {
  if (isFlat()) {
    flatView.innerHTML = `<div class="screen-flat screen-${preset}"><div class="screen-scroll">${html}</div></div>`;
    flatView.hidden = false;
  } else {
    closeFlat();
    state.kiosk.setPage(preset, html, options);
  }
  focusPreset(preset);
}

function screenScroller() {
  if (isFlat()) return flatView.querySelector('.screen-scroll');
  return state.kiosk?.pageScroller(state.preset) || null;
}

function goHome() {
  if (window.location.hash && window.location.hash !== '#') {
    window.location.hash = '';
    return;
  }
  closeFlat();
  focusPreset('home');
}

function terminalPage() {
  return renderTerminalScreen(contactLinks(state.bundle.site.contacts));
}

function runAction(node) {
  const spot = hotspotForNode(node, state);
  if (!spot) return;
  const { action } = spot;
  if (action.type === 'route') window.location.hash = action.hash;
  if (action.type === 'note') showNote(action.text);
  if (action.type === 'focus') {
    if (action.preset === 'terminal') openScreen('terminal', terminalPage());
    else focusPreset(action.preset);
  }
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

function changeChannel(step) {
  const { projects } = state.bundle;
  if (!projects.length) return;
  const id = state.channel
    ? neighbourId(projects, state.channel, step)
    : projects[step > 0 ? 0 : projects.length - 1].id;
  window.location.hash = `#project/${encodeURIComponent(id)}`;
}

function scrollScreen(step) {
  const scroller = screenScroller();
  scroller?.scrollBy({ top: step * scroller.clientHeight * 0.8, behavior: 'smooth' });
}

function renderRoute() {
  if (!state.bundle) return;
  const route = parseRoute(window.location.hash);
  const { site, resume, projects } = state.bundle;
  const previous = state.channel;
  state.channel = null;

  if (route.view === 'project') {
    const index = projects.findIndex(project => project.id === route.id);
    if (index === -1) {
      window.location.hash = '';
      return;
    }
    const project = projects[index];
    state.channel = project.id;
    openScreen('tv', renderTvChannel(project, { index, category: getCategory(project.category).title }), {
      switching: previous !== null && previous !== project.id
    });
    announce(`Канал ${index + 1}: ${project.title}`);
    return;
  }

  if (route.view === 'catalog') {
    openScreen('tv', renderTvGuide(projects, site.categories), { switching: previous !== null });
    announce('Телепрограмма');
    return;
  }

  if (route.view === 'about') {
    const page = getPage('about') || { id: 'about', title: 'Обо мне', content: '' };
    openScreen('billboard', renderAboutBoard(site, resume, page));
    announce('Обо мне');
    return;
  }

  if (route.view === 'price') {
    openScreen('billboard', renderPriceBoard());
    announce('Прайс');
    return;
  }

  if (route.view === 'contact') {
    openScreen('flyer', renderFlyer(contactLinks(site.contacts), site.owner));
    announce('Контакты');
    return;
  }

  if (route.view === 'page') {
    const page = getPage(route.id);
    if (!page) {
      window.location.hash = '';
      return;
    }
    openScreen('billboard', renderPageBoard(page));
    announce(page.title);
    return;
  }

  closeFlat();
  focusPreset('home');
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
    document.fonts.ready.then(() => {
      state.kiosk.setWallText(['ПИШИТЕ:', ...contactLinks(state.bundle.site.contacts)
        .filter(link => link.kind !== 'behance')
        .map(link => (link.kind === 'telegram' ? `TG ${link.value}` : link.value))]);
    });
    focusPreset(ROUTE_PRESETS[parseRoute(window.location.hash).view] || 'home', { instant: true });
    renderRoute();
    loading.innerHTML = '';
    firstVisitHint();
  } catch (error) {
    console.error(error);
    state.kiosk = null;
    loading.innerHTML = '';
    showNote('Ларёк не открылся на этом устройстве. Вот всё списком.');
    if (parseRoute(window.location.hash).view === 'home') window.location.hash = '#catalog';
    else renderRoute();
  }
}

document.addEventListener('click', event => {
  const card = document.querySelector('#contact-card');
  if (card && !event.target.closest('#contact-card, [data-action="contacts-card"]')) toggleContactCard(false);

  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  const step = Number(element.dataset.step);
  if (action === 'kiosk-pick') runAction(element.dataset.node);
  if (action === 'kiosk-focus') focusPreset(element.dataset.preset);
  if (action === 'kiosk-home' || action === 'tv-off') goHome();
  if (action === 'kiosk-help') showHint();
  if (action === 'rack-spin') state.kiosk?.spinRack(step);
  if (action === 'tv-channel') changeChannel(step);
  if (action === 'tv-scroll') scrollScreen(step);
  if (action === 'tv-menu') window.location.hash = '#catalog';
  if (action === 'contacts-card') toggleContactCard();
  if (action === 'copy-contact') copyContact(element.dataset.value);
});

document.addEventListener('keydown', event => {
  if (event.target.closest?.('input, textarea')) return;
  if (event.key === 'Escape') {
    if (document.querySelector('#contact-card')) toggleContactCard(false);
    else if (LOCKED_PRESETS.includes(state.preset) || !flatView.hidden) goHome();
    return;
  }
  const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
  const vertical = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
  if (state.preset === 'rack' && horizontal) state.kiosk?.spinRack(horizontal);
  if (state.preset === 'tv' && horizontal) changeChannel(horizontal);
  if (['tv', 'billboard', 'terminal', 'flyer'].includes(state.preset) && vertical) {
    event.preventDefault();
    scrollScreen(vertical);
  }
});

window.addEventListener('hashchange', renderRoute);
NARROW.addEventListener('change', renderRoute);

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
  } catch (error) {
    homeView.innerHTML = renderLoadError(error.message);
    return;
  }
  await mountKiosk();
}

bootstrapPortfolio();
```

- [ ] **Step 2: Styles**

<!-- file: assets/css/screens.css -->
```css
/* Pages that live on objects in the scene: TV, billboard, terminal, flyer.
   On phones and without 3D the same pages fill the viewport (.screen-flat). */

.kiosk-css3d {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.screen-page {
  position: relative;
  overflow: hidden;
  opacity: 0;
  transition: opacity .35s ease;
}

.screen-page.is-on {
  opacity: 1;
}

.screen-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

/* ---------- TV ---------- */

.screen-tv {
  color: #e9f1ea;
  background: #0b0f0d;
  border-radius: 18px / 14px;
}

.screen-tv::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    repeating-linear-gradient(to bottom, rgba(255, 255, 255, .035) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at center, transparent 62%, rgba(0, 0, 0, .5));
  pointer-events: none;
}

.screen-tv.is-switching::before {
  content: '';
  position: absolute;
  z-index: 2;
  inset: 0;
  background:
    repeating-radial-gradient(circle at 17% 32%, #fff 0 1px, #000 1px 2px),
    repeating-conic-gradient(#9a9a9a 0 7%, #111 0 13%);
  background-size: 3px 3px, 7px 7px;
  animation: tv-static .45s steps(6) both;
  pointer-events: none;
}

@keyframes tv-static {
  0% { opacity: 1; background-position: 0 0, 0 0; }
  50% { background-position: 3px 1px, 5px 2px; }
  100% { opacity: 0; background-position: 1px 3px, 2px 6px; }
}

.tv-page {
  padding: 30px 40px 56px;
  font: 17px/1.55 var(--mono);
}

.tv-osd {
  position: sticky;
  z-index: 1;
  top: 0;
  margin: -8px 0 16px;
  color: #7dff8f;
  font-size: 15px;
  letter-spacing: .12em;
  text-shadow: 0 0 8px rgba(125, 255, 143, .6);
}

.tv-kicker {
  margin: 0 0 6px;
  color: #9fb4a5;
  font-size: 14px;
}

.tv-page h1 {
  margin: 0 0 12px;
  font: 700 34px/1.1 var(--mono);
}

.tv-summary {
  margin: 0 0 14px;
}

.tv-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.tv-tags li {
  padding: 2px 8px;
  border: 1px solid rgba(233, 241, 234, .3);
  font-size: 13px;
}

.tv-link {
  color: #7dff8f;
}

.tv-cover {
  width: 100%;
  margin: 18px 0;
}

.tv-section {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid rgba(233, 241, 234, .15);
}

.tv-section h2 {
  margin: 0 0 10px;
  color: #fff;
  font: 700 20px var(--mono);
}

.tv-guide-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tv-guide-list a {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 2px 14px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(233, 241, 234, .12);
  color: inherit;
}

.tv-guide-number {
  grid-row: span 2;
  color: #7dff8f;
}

.tv-guide-list small {
  grid-column: 2;
  color: #9fb4a5;
  font-size: 13px;
}

.tv-guide-list a:hover span,
.tv-guide-list a:focus-visible span {
  color: #7dff8f;
}

/* ---------- remote ---------- */

.tv-remote {
  position: fixed;
  z-index: 12;
  top: 50%;
  right: 28px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 116px;
  padding: 18px 12px 26px;
  background: linear-gradient(#2a2b30, #17181b);
  border-radius: 26px 26px 34px 34px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .08);
  transform: translateY(-50%);
}

.tv-remote button {
  height: 34px;
  color: #e9e9e4;
  background: #3a3b40;
  border-radius: 6px;
  font: 12px var(--mono);
}

.tv-remote [data-action="tv-off"] {
  grid-column: 1 / -1;
  background: #a3332b;
}

.tv-remote [data-action="tv-menu"] {
  grid-column: 1 / -1;
}

.tv-remote button:hover,
.tv-remote button:focus-visible {
  color: #1c1408;
  background: #f4e3b8;
  outline: none;
}

/* ---------- billboard ---------- */

.screen-billboard {
  color: #17181c;
  background: #efe7d4;
  box-shadow: inset 0 0 0 10px #17181c;
}

.board-page {
  padding: 34px 44px 48px;
  font: 16px/1.55 var(--mono);
}

.board-tabs {
  display: flex;
  gap: 8px;
  margin: 0 0 22px;
}

.board-tabs a {
  padding: 6px 14px;
  color: #17181c;
  border: 2px solid #17181c;
  font-weight: 700;
}

.board-tabs a[aria-current="page"],
.board-tabs a:hover,
.board-tabs a:focus-visible {
  color: #efe7d4;
  background: #17181c;
  outline: none;
}

.board-about {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  align-items: start;
}

.board-about img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.board-page h1 {
  margin: 0 0 6px;
  font: 900 40px/1 'Arial Black', 'Helvetica Neue', Arial, sans-serif;
  text-transform: uppercase;
}

.board-role {
  margin: 0 0 14px;
  font-weight: 700;
}

.board-status {
  display: inline-block;
  margin: 10px 0 0;
  padding: 4px 10px;
  color: #efe7d4;
  background: #17181c;
}

.board-resume {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 2px solid #17181c;
}

.board-resume h2 {
  margin: 0 0 10px;
  font: 900 18px 'Arial Black', Arial, sans-serif;
  text-transform: uppercase;
}

.board-resume h3 {
  margin: 0;
  font-size: 16px;
}

.board-resume p {
  margin: 0 0 4px;
}

.board-resume article {
  margin-bottom: 14px;
}

.board-resume ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* ---------- terminal ---------- */

.screen-terminal {
  color: #fff;
  background: linear-gradient(#2f7de0, #0d4fae);
}

.terminal-page {
  padding: 26px 30px;
  font: 16px/1.4 var(--mono);
}

.terminal-step {
  margin: 0;
  font-size: 13px;
  letter-spacing: .08em;
  text-transform: uppercase;
  opacity: .8;
}

.terminal-page h1 {
  margin: 6px 0 20px;
  font: 700 28px/1.15 var(--mono);
}

.terminal-buttons {
  display: grid;
  gap: 10px;
}

.terminal-button {
  display: grid;
  padding: 14px 16px;
  color: #0d4fae;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 3px 0 #0a3c85;
  font-size: 18px;
  font-weight: 700;
}

.terminal-button small {
  color: #4a6fa8;
  font-size: 13px;
  font-weight: 400;
}

.terminal-button:hover,
.terminal-button:focus-visible {
  background: #ffe680;
  outline: none;
}

.terminal-note {
  margin: 16px 0 0;
  font-size: 12px;
  opacity: .75;
}

/* ---------- flyer ---------- */

.screen-flyer {
  color: #121212;
  background: #f3f0e6;
}

.flyer-page {
  padding: 22px 22px 0;
  font: 14px/1.45 var(--mono);
  text-align: center;
}

.flyer-page h1 {
  margin: 0 0 12px;
  font: 900 30px/.95 'Arial Black', Arial, sans-serif;
}

.flyer-page img {
  width: 70%;
  aspect-ratio: 1;
  object-fit: cover;
  filter: grayscale(1) contrast(1.3);
}

.flyer-name {
  margin: 10px 0 2px;
  font-size: 18px;
  font-weight: 700;
}

.flyer-page p {
  margin: 0;
}

.flyer-ask {
  margin: 14px 0 6px !important;
  font-weight: 700;
  text-transform: uppercase;
}

.flyer-contacts {
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
}

.flyer-contacts a {
  color: inherit;
  text-decoration: underline;
}

.flyer-tabs {
  display: flex;
  margin: 0 -22px;
  border-top: 2px dashed #555;
}

.flyer-tabs button {
  flex: 1;
  height: 120px;
  padding: 8px 0;
  color: #121212;
  background: transparent;
  border-left: 2px dashed #555;
  font: 11px var(--mono);
  writing-mode: vertical-rl;
}

.flyer-tabs button:first-child {
  border-left: 0;
}

.flyer-tabs button:hover,
.flyer-tabs button:focus-visible {
  background: #e3dccb;
  outline: none;
}

/* ---------- flat mode ---------- */

#overlay-view {
  position: fixed;
  z-index: 10;
  inset: 0;
}

#overlay-view[hidden] {
  display: none;
}

.screen-flat {
  position: absolute;
  inset: 0;
  border-radius: 0;
  box-shadow: none;
}

.screen-flat .tv-page,
.screen-flat .board-page,
.screen-flat .terminal-page {
  max-width: 760px;
  margin: 0 auto;
  padding-top: 70px;
  padding-bottom: 140px;
}

.screen-flat .flyer-page {
  max-width: 420px;
  margin: 0 auto;
  padding-top: 70px;
}

#kiosk-closeup-slot .kiosk-back,
#kiosk-closeup-slot .rack-controls {
  z-index: 12;
}

@media (max-width: 760px) {
  .tv-remote {
    top: auto;
    right: 50%;
    bottom: 14px;
    grid-template-columns: repeat(6, auto);
    width: auto;
    padding: 8px;
    border-radius: 14px;
    transform: translateX(50%);
  }

  .tv-remote [data-action="tv-off"],
  .tv-remote [data-action="tv-menu"] {
    grid-column: auto;
  }

  .tv-remote button {
    padding: 0 8px;
  }

  .board-about {
    grid-template-columns: 1fr;
  }

  .board-about img {
    max-width: 260px;
  }

  .tv-page,
  .board-page,
  .terminal-page {
    padding-right: 18px;
    padding-left: 18px;
  }
}
```

In `assets/css/site.css` add `@import url('./screens.css');` as the last line, and in `assets/css/kiosk.css` delete the `#overlay-view`, `#overlay-view[hidden]`, `.overlay-scrim`, `.overlay-panel`, the three `.overlay-panel …` rules, `.catalog-list` and `.catalog-list a…` rules (they belonged to the old panel).

- [ ] **Step 3: Run all tests**

Run: `npm test` → all pass, Python `OK`.

- [ ] **Step 4: Commit**

```bash
git add assets/js/app.js assets/css/screens.css assets/css/site.css assets/css/kiosk.css
git commit -m "feat: routes open pages on objects in the scene, flat pages on phones"
```

---

### Task 9: Look at it

- [ ] **Step 1:** Headless Playwright, 1440×900: open `#project/kortex` (TV close-up with page and remote), CH+ (static, next channel), ▼ (scrolls), МЕНЮ (guide), a guide link; `#about` (billboard with tabs) and click «Прайс»; flyer click (contacts, a tear-off copies); terminal click (buttons); Esc back home; shutter marker text readable from `home`.
- [ ] **Step 2:** 390×844: `#project/kortex` and `#about` render flat with the back button and remote.
- [ ] **Step 3:** Fix what is off (camera fill, sizes, colours), `npm test`, commit `fix: tune in-scene screens after browser check`.
- [ ] **Step 4:** Screenshots to `docs/superpowers/qa/kiosk-screens/`, show Marat.
