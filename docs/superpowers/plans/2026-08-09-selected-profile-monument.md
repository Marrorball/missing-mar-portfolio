# Selected Profile Monument Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the selected irregular Y2K profile monument as a non-interactive raster layer and refine the central sculpture into smooth, crisp chrome while preserving all live controls.

**Architecture:** Keep the landscape, profile monument, foreground grass contact, and interactive UI as separate layers. The monument owns its printed copy and portrait treatment; the existing JavaScript renders only a decorative image for it. A refined landscape asset changes only the central sculpture, while the header and project selector remain semantic HTML above both raster layers.

**Tech Stack:** Vite, JavaScript template rendering, modular CSS, JSON content, PNG/WebP raster assets, Node test runner, in-app Browser design QA.

## Global Constraints

- Visual source: `docs/superpowers/specs/assets/profile-monument-selected-reference.png`.
- Preserve the current sky, grass, rocks, layout, content, routes, and working controls.
- Preserve Marat's real identity and complete seated pose from the supplied red-clothing photograph.
- The profile monument is decorative and non-interactive.
- Only the central sculpture's surface quality may change in the landscape asset.

---

### Task 1: Persist and produce the approved raster assets

**Files:**
- Create: `docs/superpowers/specs/assets/profile-monument-selected-reference.png`
- Create: `assets/media/profile/missing-mar-profile-monument-v1.png`
- Create: `assets/media/profile/missing-mar-profile-monument-v1.webp`
- Create: `assets/media/y2k/landscape-background-smooth-chrome.png`
- Create: `assets/media/y2k/landscape-background-smooth-chrome.webp`

**Interfaces:**
- Consumes: selected full-screen reference, current clean landscape, and original red-clothing photograph.
- Produces: one transparent monument artwork and one UI-free landscape artwork at production resolution.

- [ ] **Step 1: Copy the selected reference into the project**

Copy the exact selected ImageGen result without resizing so later QA has a stable source of truth.

- [ ] **Step 2: Create the monument artwork**

Build an isolated, high-resolution monument matching the selected irregular chrome/stone silhouette. Keep the approved printed text inside the raster. Preserve real facial features and the complete seated pose. Export PNG with transparency and a WebP derivative.

- [ ] **Step 3: Create the smooth-chrome landscape**

Edit only the large central sculpture in the current clean landscape. Preserve all other pixels and export full-resolution PNG and WebP assets.

- [ ] **Step 4: Inspect both assets at original resolution**

Check alpha edges, hair, hands, shoes, chrome sharpness, grass detail, sky detail, dimensions, and absence of baked UI.

### Task 2: Render a decorative monument through TDD

**Files:**
- Modify: `tests/render.test.mjs`
- Modify: `assets/js/render.js`
- Modify: `content/site.json`

**Interfaces:**
- Consumes: `owner.profileCardImage` as the monument asset URL.
- Produces: `<div class="profile-monument" aria-hidden="true"><img class="profile-monument-art" ...></div>` with no link or duplicate copy.

- [ ] **Step 1: Write the failing render test**

Replace the current profile-card assertions with:

```js
assert.match(html, /class="profile-monument" aria-hidden="true"/);
assert.match(html, /class="profile-monument-art"/);
assert.match(html, /missing-mar-profile-monument-v1\.webp/);
assert.doesNotMatch(html, /href="#about" class="profile-card"/);
assert.equal((html.match(/WHERE&#39;S/g) || []).length, 0);
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --test tests/render.test.mjs`

Expected: the first test fails because the current markup is still the linked `.profile-card` with HTML copy.

- [ ] **Step 3: Implement the minimal render change**

Replace `renderProfileCard` with `renderProfileMonument`, render only the decorative image, call it from `renderHome`, and update `profileCardImage` to `/missing-mar-portfolio/assets/media/profile/missing-mar-profile-monument-v1.webp`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/render.test.mjs`

Expected: all render tests pass.

### Task 3: Match placement and keep controls live

**Files:**
- Modify: `assets/css/home.css`
- Modify: `assets/css/responsive.css`

**Interfaces:**
- Consumes: `.profile-monument` and `.profile-monument-art`.
- Produces: responsive desktop and mobile placement with no click target, no rectangular crop, and no duplicate HTML copy.

- [ ] **Step 1: Replace profile-card styles**

Use the selected reference's desktop footprint, bottom-left anchor, natural aspect ratio, visible irregular alpha edge, restrained perspective, and ground contact. Remove link, card-copy, card-footer, and floating rectangular shadow rules.

- [ ] **Step 2: Point the hero at the refined landscape**

Set the hero background to `landscape-background-smooth-chrome.webp` and preserve existing cover positioning.

- [ ] **Step 3: Add mobile placement**

Scale the monument proportionally, keep it within the viewport, and retain the existing mobile project-control layout.

- [ ] **Step 4: Run complete automated checks**

Run: `npm test && npm run validate:content && npm run build && git diff --check`

Expected: all tests pass, content validation succeeds, Vite exits 0, and no whitespace errors are reported.

### Task 4: Run visual and interaction QA

**Files:**
- Modify: `design-qa.md`
- Create: `docs/superpowers/qa/implementation-selected-monument-1440x1024.png`
- Create: `docs/superpowers/qa/implementation-selected-monument-390x844.png`
- Create: `docs/superpowers/qa/comparison-selected-monument.jpg`

**Interfaces:**
- Consumes: selected reference plus browser-rendered desktop/mobile implementation.
- Produces: evidence-backed `design-qa.md` with `final result: passed` only when no actionable P0/P1/P2 mismatch remains.

- [ ] **Step 1: Capture the home page at 1440 by 1024 and 390 by 844**

Use the in-app Browser and wait for both raster assets to finish loading.

- [ ] **Step 2: Exercise the live controls**

Verify the three project selectors, `Открыть проект`, `Проекты`, `Обо мне`, and `Контакт`; confirm the decorative monument has no click target and check the browser console.

- [ ] **Step 3: Compare the source and implementation in one image**

Normalize both to the same viewport, create a side-by-side comparison, and inspect the full hero plus focused monument and central-chrome regions.

- [ ] **Step 4: Fix and repeat**

Correct every P0/P1/P2 mismatch, recapture at the same viewport, and record the comparison history.

- [ ] **Step 5: Run final verification**

Run: `npm test && npm run validate:content && npm run build && git diff --check`

Expected: all commands exit successfully and `design-qa.md` ends with `final result: passed`.
