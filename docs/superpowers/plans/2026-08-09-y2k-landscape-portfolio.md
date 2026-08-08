# Y2K Landscape Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Windows XP portfolio interface with the approved Y2K digital landscape while preserving Pages CMS editing, all existing projects, responsive behavior, and working case-study navigation.

**Architecture:** Keep the existing static HTML/CSS/ES-module/JSON application. Add pure selector and route modules, render semantic views from the current content bundle, and keep the visual layer separate from content loading. Use the approved scene as a clean background asset, place the personal photo and all controls as real responsive elements, and use hash routes for project, About, and Contact views.

**Tech Stack:** HTML5, modular CSS, vanilla JavaScript ES modules, JSON content, Node test runner, Vite for local preview, Pages CMS, GitHub Pages.

## Global Constraints

- Final visual target: `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png` at 1440 x 1024.
- Primary identity: `missing mar / Марат Дреев`.
- Role: `Product & Visual Designer`.
- Personal-card copy must remain exactly `WHERE'S MISSING MAR?`, `I DESIGN CLEAR SYSTEMS`, `WITH A STRANGE EDGE.`, `PRODUCT & VISUAL DESIGNER`, `МОСКВА · 2026`, `ОБО МНЕ ↗`.
- The first screen shows exactly three CMS-selected featured projects and a visible `Все проекты — N` action.
- Every published project appears in the archive directly below the first screen.
- Keep the existing pixel cursor as the only direct Windows XP reference.
- Preserve Pages CMS editing for projects, pages, resume, contacts, identity copy, personal photo, featured selection, and ordering.
- Do not use the selected mockup as one flattened website screenshot; controls, text, photo, and project content must remain responsive and interactive.
- Do not add a framework, backend, authentication, WebGL, or a custom admin panel.
- Support `prefers-reduced-motion` and keyboard navigation.
- Keep public media paths rooted at `/missing-mar-portfolio/assets/media/` for GitHub Pages.

## File Map

- `index.html`: semantic application shell and static metadata only.
- `assets/js/content.js`: loading, validation, normalization, and media-path collection.
- `assets/js/selectors.js`: pure featured-project, archive-filter, and cover-resolution functions.
- `assets/js/router.js`: hash parsing and hash creation for home, project, About, Contact, and additional CMS page views.
- `assets/js/render.js`: escaped HTML renderers for the hero, archive, case study, About, Contact, generic CMS pages, resume, and errors.
- `assets/js/app.js`: browser state, event delegation, view transitions, focus restoration, parallax, and bootstrapping.
- `assets/css/site.css`: CSS entrypoint importing the focused style files.
- `assets/css/fonts.css`: local font-face declarations.
- `assets/css/base.css`: reset, tokens, typography, focus, and shared controls.
- `assets/css/home.css`: landscape hero, personal card, featured selector, and archive.
- `assets/css/views.css`: case study, About, Contact, resume, and error views.
- `assets/css/responsive.css`: mobile layout and reduced-motion behavior.
- `assets/media/y2k/landscape-background.webp`: clean sky/grass/chrome scene without UI or text.
- `assets/media/profile/missing-mar-profile.jpg`: approved source photograph used by the personal card.
- `assets/fonts/*.woff2`: local Exo 2 and IBM Plex Mono files.
- `.pages.yml`: visual editor controls for new identity and featured-project fields.
- `content/site.json`: approved identity, personal-card copy, and photo path.
- `content/projects.json`: featured flags, featured order, short labels, accent colors, and cover paths.
- `tests/selectors.test.mjs`: featured ordering, fallback selection, filtering, and cover resolution.
- `tests/router.test.mjs`: route parsing and serialization.
- `tests/render.test.mjs`: semantic view rendering, escaped text, rich case content, safe links, and accessibility labels.
- `tests/content.test.mjs`: updated schema normalization and media-path validation.
- `tests/pages-config.test.mjs`: CMS field coverage.
- `design-qa.md`: final comparison report against the selected visual target.

---

### Task 1: Extend the editable content model

**Files:**
- Create: `assets/js/selectors.js`
- Create: `tests/selectors.test.mjs`
- Modify: `content/site.json`
- Modify: `content/projects.json`
- Modify: `assets/js/content.js`
- Modify: `tests/content.test.mjs`
- Modify: `.pages.yml`
- Modify: `tests/pages-config.test.mjs`

**Interfaces:**
- Produces: `selectFeaturedProjects(projects, count = 3): Project[]`
- Produces: `filterProjects(projects, categoryId = 'all'): Project[]`
- Produces: `resolveProjectCover(project): string`
- Produces: normalized `site.owner` fields `brandName`, `name`, `role`, `profileImage`, `cardTitle`, `cardTagline`, `cardMeta`, and `cardAction`.
- Produces: normalized project fields `featured`, `featuredOrder`, `shortLabel`, `accent`, and `cover`.
- Produces: normalized page field `showInNavigation` so added or deleted pages update the site menu without code changes.

- [ ] **Step 1: Write failing selector tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProjects,
  resolveProjectCover,
  selectFeaturedProjects
} from '../assets/js/selectors.js';

const projects = [
  { id: 'surf', title: 'Surf', order: 40, featured: false, sections: [] },
  { id: 'uchi', title: 'Учи.ру', order: 30, featured: true, featuredOrder: 30, sections: [] },
  { id: 'kortex', title: 'KORTEX', order: 10, featured: true, featuredOrder: 10, sections: [] },
  { id: 'pik', title: 'ПИК', order: 20, featured: true, featuredOrder: 20, sections: [] }
];

test('selects exactly three featured projects in featured order', () => {
  assert.deepEqual(
    selectFeaturedProjects(projects).map(project => project.id),
    ['kortex', 'pik', 'uchi']
  );
});

test('fills missing featured slots from published project order', () => {
  const values = projects.map(project => ({ ...project, featured: project.id === 'kortex' }));
  assert.deepEqual(
    selectFeaturedProjects(values).map(project => project.id),
    ['kortex', 'pik', 'uchi']
  );
});

test('filters the archive and resolves an authored cover', () => {
  assert.equal(filterProjects([{ category: 'uxui' }, { category: 'graphic' }], 'graphic').length, 1);
  assert.equal(resolveProjectCover({ cover: '/missing-mar-portfolio/assets/media/a.jpg' }), '/missing-mar-portfolio/assets/media/a.jpg');
  assert.equal(resolveProjectCover({ cover: '' }), '');
});
```

- [ ] **Step 2: Run the selector tests and verify the module is missing**

Run: `node --test tests/selectors.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `assets/js/selectors.js`.

- [ ] **Step 3: Implement the pure selector module**

```js
const collator = new Intl.Collator('ru');

function byOrderThenTitle(a, b) {
  return (Number(a.order) || 0) - (Number(b.order) || 0)
    || collator.compare(a.title || '', b.title || '');
}

export function selectFeaturedProjects(projects, count = 3) {
  const featured = projects
    .filter(project => project.featured)
    .sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
  const used = new Set(featured.map(project => project.id));
  const fallback = projects.filter(project => !used.has(project.id)).sort(byOrderThenTitle);
  return [...featured, ...fallback].slice(0, count);
}

export function filterProjects(projects, categoryId = 'all') {
  return categoryId === 'all'
    ? [...projects]
    : projects.filter(project => project.category === categoryId);
}

export function resolveProjectCover(project) {
  return typeof project.cover === 'string' ? project.cover : '';
}
```

- [ ] **Step 4: Add the approved identity and project presentation data**

Set `content/site.json` owner fields to:

```json
{
  "brandName": "missing mar",
  "name": "Марат Дреев",
  "role": "Product & Visual Designer",
  "profileImage": "/missing-mar-portfolio/assets/media/profile/missing-mar-profile.jpg",
  "cardTitle": "WHERE'S MISSING MAR?",
  "cardTagline": "I DESIGN CLEAR SYSTEMS\nWITH A STRANGE EDGE.",
  "cardMeta": "МОСКВА · 2026",
  "cardAction": "ОБО МНЕ ↗"
}
```

Mark `kortex`, `pik`, and `uchi` as featured with `featuredOrder` values `10`, `20`, and `30`. Give the remaining projects `featured: false`. Set `shortLabel` to the title shown in the selector and use `#c9ff18` as the default `accent`.

- [ ] **Step 5: Expose every new field in Pages CMS**

Add project controls for `featured`, `featuredOrder`, `shortLabel`, and `accent`. Add owner controls for `brandName`, `name`, `role`, `profileImage`, `cardTitle`, `cardTagline`, `cardMeta`, and `cardAction`. Keep `profileImage` as an image field rooted under `profile`.

Replace the obsolete XP labels with a page-level `showInNavigation` boolean. Set it to `true` for the existing About and Contact pages.

- [ ] **Step 6: Strengthen CMS and normalization tests**

Extend `tests/pages-config.test.mjs` to assert the field names:

```ruby
project_fields = entries[0].fetch('fields').map { |field| field.fetch('name') }
%w[featured featuredOrder shortLabel accent].each do |name|
  abort "missing project field #{name}" unless project_fields.include?(name)
end
owner = entries[3].fetch('fields').find { |field| field['name'] == 'owner' }
owner_fields = owner.fetch('fields').map { |field| field.fetch('name') }
%w[brandName name role profileImage cardTitle cardTagline cardMeta cardAction].each do |name|
  abort "missing owner field #{name}" unless owner_fields.include?(name)
end
```

Add a content test that asserts `site.owner.brandName` survives normalization and that `profileImage` is returned by `collectMediaPaths`.

- [ ] **Step 7: Run schema and CMS verification**

Run: `npm test && npm run validate:content`

Expected: all tests pass and validation reports the current published project/page count.

- [ ] **Step 8: Commit the content-model change**

```bash
git add .pages.yml content/site.json content/projects.json assets/js/content.js assets/js/selectors.js tests/content.test.mjs tests/selectors.test.mjs tests/pages-config.test.mjs
git commit -m "feat: add editable Y2K portfolio presentation fields"
```

---

### Task 2: Add deterministic hash routing

**Files:**
- Create: `assets/js/router.js`
- Create: `tests/router.test.mjs`

**Interfaces:**
- Produces: `parseRoute(hash): { view: 'home' | 'project' | 'about' | 'contact' | 'page', id: string }`
- Produces: `routeToHash(route): string`
- Consumes later: `app.js` uses both functions for links, browser back, and focus restoration.

- [ ] **Step 1: Write route tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeToHash } from '../assets/js/router.js';

test('parses supported portfolio routes', () => {
  assert.deepEqual(parseRoute(''), { view: 'home', id: '' });
  assert.deepEqual(parseRoute('#project/kortex'), { view: 'project', id: 'kortex' });
  assert.deepEqual(parseRoute('#about'), { view: 'about', id: '' });
  assert.deepEqual(parseRoute('#contact'), { view: 'contact', id: '' });
  assert.deepEqual(parseRoute('#page/press'), { view: 'page', id: 'press' });
});

test('falls back to home for unknown routes and serializes safe ids', () => {
  assert.deepEqual(parseRoute('#unknown'), { view: 'home', id: '' });
  assert.equal(routeToHash({ view: 'project', id: 'учи ру' }), '#project/%D1%83%D1%87%D0%B8%20%D1%80%D1%83');
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/router.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement exact route parsing and serialization**

```js
export function parseRoute(hash = '') {
  const value = String(hash).replace(/^#/, '');
  if (!value) return { view: 'home', id: '' };
  if (value === 'about' || value === 'contact') return { view: value, id: '' };
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
  if (view === 'about' || view === 'contact') return `#${view}`;
  return '#';
}
```

- [ ] **Step 4: Run and commit the routing tests**

Run: `node --test tests/router.test.mjs`

Expected: PASS.

```bash
git add assets/js/router.js tests/router.test.mjs
git commit -m "feat: add portfolio hash routing"
```

---

### Task 3: Produce and store the approved visual assets

**Files:**
- Create: `assets/media/y2k/landscape-background.png`
- Create: `assets/media/y2k/landscape-background.webp`
- Create: `assets/media/profile/missing-mar-profile.jpg`
- Modify: `content/site.json`

**Interfaces:**
- Produces: a full-bleed scene image with no UI or readable text.
- Produces: the approved high-resolution personal photo at the public media path already stored in `site.owner.profileImage`.

- [ ] **Step 1: Copy the approved profile source non-destructively**

Copy `docs/superpowers/specs/assets/missing-mar-profile-source.jpg` to `assets/media/profile/missing-mar-profile.jpg`. Keep the documentation source unchanged.

- [ ] **Step 2: Generate a clean landscape plate from the final reference**

Use the built-in Image Gen tool with `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png` attached and this exact art direction:

```text
Use case: precise-object-edit
Asset type: responsive full-bleed website background plate, 2048 x 1152
Primary request: remove every UI element, personal card, navigation label, project list, button, logo, and readable word from the supplied portfolio mockup. Reconstruct the removed areas as continuous cobalt-blue sky, natural white clouds, vivid green rolling grass, rocks, and open landscape. Preserve the central polished liquid-chrome star sculpture, the small floating chrome pebble on the left, the lower chrome pebble, the white sphere on the right, the lighting, perspective, CRT texture, and Y2K realism. Extend the scene cleanly to all edges for responsive cropping.
Constraints: no text, no letters, no logos, no interface, no card, no frame, no watermark; keep the chrome sculpture centered slightly left; retain usable dark-blue negative space across the upper third and open sky on the right.
```

Save the generated PNG as `assets/media/y2k/landscape-background.png` and inspect it at original detail.

- [ ] **Step 3: Create the web-delivery version**

Convert the approved PNG to `assets/media/y2k/landscape-background.webp` at quality 88. Confirm the output remains at least 1920 pixels wide and visually matches the approved plate.

- [ ] **Step 4: Verify content paths and asset dimensions**

Run: `npm run validate:content`

Expected: validation succeeds and resolves `missing-mar-profile.jpg`.

Inspect both images and confirm there is no embedded UI text in the landscape plate.

- [ ] **Step 5: Commit the visual assets**

```bash
git add assets/media/y2k/landscape-background.png assets/media/y2k/landscape-background.webp assets/media/profile/missing-mar-profile.jpg content/site.json
git commit -m "feat: add approved Y2K landscape and profile assets"
```

---

### Task 4: Replace the XP document with semantic view shells

**Files:**
- Modify: `index.html`
- Modify: `package.json`
- Create: `vite.config.js`
- Modify: `tests/render.test.mjs`
- Modify: `assets/js/render.js`

**Interfaces:**
- Produces: `renderHome({ site, projects, categories, activeProjectId, activeCategory }): string`
- Produces: `renderProjectView(project, category): string`
- Produces: `renderAboutView(site, resume, page): string`
- Produces: `renderContactView(site): string`
- Produces: `renderGenericPageView(page): string`
- Produces: stable DOM anchors `#site-header`, `#home-view`, `#overlay-view`, `#featured-list`, `#project-archive`, and `#live-region`.

- [ ] **Step 1: Rewrite render tests around the approved page model**

```js
import {
  renderAboutView,
  renderContactView,
  renderGenericPageView,
  renderHome,
  renderProjectView
} from '../assets/js/render.js';

test('renders the approved identity, three featured projects, and complete archive', () => {
  const html = renderHome({
    site: bundle.site,
    projects: [
      { id: 'a', title: 'A', shortLabel: 'A', featured: true, featuredOrder: 10, category: 'uxui', sections: [] },
      { id: 'b', title: 'B', shortLabel: 'B', featured: true, featuredOrder: 20, category: 'uxui', sections: [] },
      { id: 'c', title: 'C', shortLabel: 'C', featured: true, featuredOrder: 30, category: 'graphic', sections: [] },
      { id: 'd', title: 'D', featured: false, category: 'graphic', sections: [] }
    ],
    categories: bundle.site.categories,
    activeProjectId: 'a',
    activeCategory: 'all'
  });
  assert.match(html, /missing mar/);
  assert.match(html, /WHERE&#39;S MISSING MAR\?/);
  assert.equal((html.match(/class="featured-project/g) || []).length, 3);
  assert.match(html, /Все проекты — 4/);
  assert.match(html, /data-project-id="d"/);
});

test('renders a linkable case study and safe contact links', () => {
  assert.match(renderProjectView({ id: 'x', title: 'Case', sections: [] }, { title: 'UX/UI' }), /data-view="project"/);
  assert.match(renderContactView(bundle.site), /mailto:marrorball@gmail\.com/);
  assert.match(renderAboutView(bundle.site, { experience: [] }, bundle.pages[0]), /Обо мне/);
  assert.match(renderGenericPageView({ id: 'press', title: 'Пресса', content: '<p>Материал</p>' }), /Материал/);
});
```

- [ ] **Step 2: Verify the updated render tests fail**

Run: `node --test tests/render.test.mjs`

Expected: FAIL because the new render exports do not exist.

- [ ] **Step 3: Replace the XP markup with the semantic application shell**

Use this document shape in `index.html`:

```html
<body>
  <a class="skip-link" href="#main-content">К содержанию</a>
  <header id="site-header"></header>
  <main id="main-content">
    <div id="home-view"></div>
    <div id="overlay-view" hidden></div>
  </main>
  <div id="live-region" class="sr-only" aria-live="polite"></div>
  <script type="module" src="assets/js/app.js"></script>
</body>
```

Set the title to `missing mar / Марат Дреев — Product & Visual Designer` and the description to `Портфолио Марата Дреева: продуктовый, цифровой и визуальный дизайн.`

- [ ] **Step 4: Implement the new escaped render functions**

Render the hero as a `<section class="landscape-hero">`, the card as an `<a href="#about" class="profile-card">`, featured items as buttons carrying `data-action="select-featured"`, and the archive as a numbered list inside `<section id="project-archive">`. Render published pages with `showInNavigation !== false`; show the first two as header text links and all published navigation pages inside the grid menu. Keep `section.content` and page `content` as owner-authored rich HTML while escaping all titles, summaries, labels, and attributes.

- [ ] **Step 5: Add Vite local-preview support**

Run `npm install --save-dev vite` to create the locked development dependency.

Update scripts to:

```json
{
  "dev": "vite",
  "build": "vite build",
  "test": "node --test tests/*.test.mjs",
  "validate:content": "node scripts/validate-content.mjs"
}
```

Add Vite as a development dependency and create:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/missing-mar-portfolio/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', 'terminal.local']
  }
});
```

- [ ] **Step 6: Run render tests and a production build**

Run: `npm test && npm run build`

Expected: all tests pass and Vite creates `dist/index.html` without an error.

- [ ] **Step 7: Commit the semantic shell**

```bash
git add index.html package.json package-lock.json vite.config.js assets/js/render.js tests/render.test.mjs
git commit -m "feat: render semantic Y2K portfolio views"
```

---

### Task 5: Build the approved visual system

**Files:**
- Modify: `assets/css/site.css`
- Create: `assets/css/fonts.css`
- Create: `assets/css/base.css`
- Create: `assets/css/home.css`
- Create: `assets/css/views.css`
- Create: `assets/css/responsive.css`
- Create: `assets/fonts/Exo2-ExtraBoldItalic.woff2`
- Create: `assets/fonts/IBMPlexMono-Regular.woff2`
- Create: `assets/fonts/IBMPlexMono-Medium.woff2`

**Interfaces:**
- Consumes: class names emitted by Task 4.
- Produces: a 1440 x 1024 match to the approved reference and a usable 390 x 844 mobile layout.

- [ ] **Step 1: Add local OFL fonts**

Use Exo 2 ExtraBold Italic for the `missing mar` display lockup and IBM Plex Mono Regular/Medium for navigation, labels, and body text. Store the exact `.woff2` files locally and declare them with `font-display: swap`.

- [ ] **Step 2: Define the approved design tokens**

```css
:root {
  --ink: #f7f8f2;
  --ink-muted: #c9d4e6;
  --night: #071d52;
  --cobalt: #0b3f91;
  --acid: #caff18;
  --line: rgba(235, 244, 255, .62);
  --panel: rgba(7, 25, 67, .74);
  --focus: #ffffff;
  --display: "Exo 2", sans-serif;
  --mono: "IBM Plex Mono", monospace;
  --page-pad: clamp(20px, 3.4vw, 54px);
}
```

Use solid colors, real images, borders, opacity, and blur. Do not recreate the landscape or chrome sculpture with CSS drawings or gradients.

Keep `cursor: url("../media/system/cursor.svg") 4 2, default` on the document and do not retain any other XP-specific visual rule.

- [ ] **Step 3: Recreate the desktop hero geometry**

At 1440 x 1024, match these anchors from the approved reference:

- header: 40–60px from the top and page edges;
- identity: top-left, starting near x=48px and y=132px;
- profile card: lower-left, approximately 390px wide and 410px tall;
- central sculpture: provided by the background plate, kept near the visual center;
- featured selector: right side, approximately 365px wide and vertically centered;
- archive action: directly below featured rows;
- background: `landscape-background.webp`, `cover`, centered, with a dark solid fallback.

- [ ] **Step 4: Style the personal card with the real photograph**

Use the source photo in an `<img>`, rotate it 180 degrees, and set `object-fit: cover`. Keep enough image area to show clothing, legs, shoes, bag, and concrete. Limit the face to roughly one-fifth of the card. Place the exact card copy as HTML above the image and keep `ОБО МНЕ ↗` visibly clickable.

- [ ] **Step 5: Style the archive and secondary views**

Use one shared large preview beside a numbered list, compact category controls, strong focus states, and no three-column project-card grid. Case studies use a readable light content surface with the Y2K landscape retained as a controlled background accent.

- [ ] **Step 6: Add responsive and reduced-motion rules**

At `max-width: 720px`, stack the identity, photo card, sculpture area, and featured selector; turn featured projects into a horizontal three-item rail; keep all touch targets at least 44px. Under `prefers-reduced-motion: reduce`, disable parallax, image drift, smooth scrolling, and transition transforms.

- [ ] **Step 7: Build and commit the styles**

Run: `npm run build`

Expected: CSS imports and local font files resolve without build warnings.

```bash
git add assets/css assets/fonts
git commit -m "feat: recreate the approved Y2K landscape styling"
```

---

### Task 6: Wire real interactions and browser history

**Files:**
- Modify: `assets/js/app.js`
- Modify: `assets/js/render.js`
- Modify: `tests/render.test.mjs`

**Interfaces:**
- Consumes: `loadContent`, `selectFeaturedProjects`, `filterProjects`, `parseRoute`, `routeToHash`, and Task 4 renderers.
- Produces: working featured selection, archive filters, route changes, overlays, back behavior, focus restoration, and reduced-motion-aware parallax.

- [ ] **Step 1: Replace XP state with portfolio view state**

Use one state object:

```js
const state = {
  bundle: null,
  activeFeaturedId: '',
  activeArchiveId: '',
  activeCategory: 'all',
  route: { view: 'home', id: '' },
  lastTrigger: null
};
```

- [ ] **Step 2: Bootstrap the home view from CMS content**

After `loadContent()`, choose the first result from `selectFeaturedProjects(bundle.projects)`, render the CMS-driven header and home view, then apply `parseRoute(location.hash)`. If content loading fails, render `renderLoadError(error.message)` inside `#home-view` with a reload button.

- [ ] **Step 3: Implement event delegation**

Handle these actions from one document click listener:

- `select-featured`: update `activeFeaturedId`, active row, live-region text, and CTA destination;
- `open-project`: set `location.hash` using `routeToHash`;
- `filter-projects`: update `activeCategory` and rerender the archive only;
- `scroll-projects`: call `#project-archive.scrollIntoView({ behavior })`;
- `open-about` and `open-contact`: update the hash;
- `open-page`: update the hash with the selected CMS page id;
- `toggle-page-menu`: open or close the grid menu and manage `aria-expanded`;
- `close-view`: use `history.back()` when possible, otherwise set `location.hash = '#'`.

On `focusin` and pointer hover, preview featured/archive rows without opening them. On `hashchange`, render the requested view and move focus to its heading. On Escape, close the page menu or an open project/About/Contact/generic page view.

- [ ] **Step 4: Add pointer parallax without blocking input**

Update CSS custom properties `--pointer-x` and `--pointer-y` inside one `requestAnimationFrame` callback. Apply only small background/card offsets, and skip registration entirely when reduced motion is requested or the pointer is coarse.

- [ ] **Step 5: Verify the core journey manually**

Using the in-app browser, confirm:

1. selecting each featured project updates the active state;
2. `Открыть проект` opens the correct case;
3. browser Back returns to the same home selection;
4. `Все проекты — N` scrolls to the archive;
5. filters update the list;
6. About, Contact, an added generic page, the grid menu, Escape, and Back work;
7. adding/removing a published page in JSON updates the menu after reload;
8. keyboard focus never disappears.

- [ ] **Step 6: Run and commit interaction changes**

Run: `npm test && npm run validate:content && npm run build`

Expected: all checks pass.

```bash
git add assets/js/app.js assets/js/render.js tests/render.test.mjs
git commit -m "feat: add portfolio navigation and interactions"
```

---

### Task 7: Finish case studies, About, Contact, and media fallbacks

**Files:**
- Modify: `assets/js/render.js`
- Modify: `assets/js/selectors.js`
- Modify: `tests/render.test.mjs`
- Modify: `tests/selectors.test.mjs`
- Modify: `assets/css/views.css`
- Modify: `content/projects.json`

**Interfaces:**
- Consumes: existing `project.sections[].content`, resume JSON, pages JSON, categories, and safe external URLs.
- Produces: complete full-page case studies, About, Contact and generic CMS page panels, and deterministic project-cover behavior.

- [ ] **Step 1: Add failing tests for safe case links and cover fallback**

```js
test('uses the first local gallery image when cover is empty', () => {
  assert.equal(resolveProjectCover({
    cover: '',
    gallery: ['/missing-mar-portfolio/assets/media/gallery/first.jpg']
  }), '/missing-mar-portfolio/assets/media/gallery/first.jpg');
});

test('does not render an unsafe external project link', () => {
  const html = renderProjectView({
    id: 'x', title: 'X', behance: 'javascript:alert(1)', sections: []
  }, { title: 'UX/UI' });
  assert.doesNotMatch(html, /javascript:/);
});
```

- [ ] **Step 2: Implement deterministic cover resolution**

Use `project.cover` first, then the first item from `project.gallery`, then the first local `/missing-mar-portfolio/assets/media/` image found in section HTML. If none exist, render the project as a text-led editorial preview using its title, accent, and summary; do not render a broken image.

- [ ] **Step 3: Render full case-study sections**

Include title, summary, category, year, tags, cover, safe external link, sticky section index, authored HTML panels, and a `Назад к проектам` control. Preserve existing section order and image aspect ratios.

- [ ] **Step 4: Render About and Contact from the existing editable sources**

About combines `site.owner.bio`, the `about` page content, resume experience, education, tools, and skills. Contact uses safe `mailto:`, `https://t.me/`, and HTTPS Behance links. Additional published pages render their authored content through `renderGenericPageView`. Every view retains the landscape dimmed behind a focused readable panel.

- [ ] **Step 5: Add authored covers where source imagery already exists**

Set covers for Surf Coffee and logo projects from their existing repository media. For KORTEX, ПИК Production, and Учи.ру, use approved screenshots from their current Behance/Figma sources when accessible; otherwise keep the text-led fallback until Marat adds a cover through Pages CMS.

- [ ] **Step 6: Run and commit the complete content views**

Run: `npm test && npm run validate:content && npm run build`

Expected: all tests pass; no project displays a broken image.

```bash
git add assets/js/render.js assets/js/selectors.js assets/css/views.css content/projects.json tests/render.test.mjs tests/selectors.test.mjs
git commit -m "feat: complete project and profile views"
```

---

### Task 8: Run responsive, accessibility, and visual QA

**Files:**
- Modify: `assets/css/base.css`
- Modify: `assets/css/home.css`
- Modify: `assets/css/views.css`
- Modify: `assets/css/responsive.css`
- Modify: `assets/js/app.js`
- Create: `design-qa.md`

**Interfaces:**
- Consumes: the final local app and `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png`.
- Produces: `design-qa.md` with `final result: passed` and a locally running preview.

- [ ] **Step 1: Run the full automated verification**

Run: `npm test && npm run validate:content && npm run build`

Expected: every test passes, content validation succeeds, and the production build completes.

- [ ] **Step 2: Start the local preview**

Run: `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`

Open the preview in the in-app browser at the app's local URL and keep it running through QA.

- [ ] **Step 3: Compare the desktop home view**

Capture the app at 1440 x 1024. Open the capture and the final reference together. Check identity placement, profile-card scale, landscape crop, chrome-sculpture prominence, featured-selector geometry, white/acid contrast, and bottom ornaments. Record visible differences by priority in `design-qa.md`.

- [ ] **Step 4: Test mobile and interaction states**

Inspect 390 x 844, keyboard-only navigation, reduced motion, each featured selection, the archive, each category filter, a case study, About, Contact, browser Back, and missing-cover behavior. Confirm there are no horizontal scrollbars, clipped controls, console errors, or touch targets smaller than 44px.

- [ ] **Step 5: Fix every P0, P1, and P2 QA issue**

Adjust the responsible CSS/JS/render file, rerun the full automated verification, recapture the same viewport/state, and compare again. Repeat until only optional P3 polish remains.

- [ ] **Step 6: Complete the QA report**

End `design-qa.md` with:

```text
final result: passed
```

Include any remaining P3 polish as follow-up notes without blocking handoff.

- [ ] **Step 7: Commit the verified redesign**

```bash
git add assets/css assets/js/app.js design-qa.md
git commit -m "test: verify responsive Y2K portfolio redesign"
```

- [ ] **Step 8: Confirm the final branch state**

Run: `git status --short && git log --oneline -8`

Expected: no unintended changes in the implementation worktree and a clear task-by-task commit history.
