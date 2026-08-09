# Profile Panel Reference Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating profile card with the exact stone-and-metal personal panel treatment approved in the selected Y2K reference while preserving Marat's real face.

**Architecture:** Produce one project-local raster artwork containing the weathered slab and the isolated source photograph, then keep the existing editable copy as semantic HTML layered over that artwork. Update only the profile-panel rendering and its responsive styles; all other hero elements and routes remain untouched.

**Tech Stack:** Vite, semantic HTML rendered from JavaScript, modular CSS, Pages CMS JSON content, built-in ImageGen plus local raster conversion, Browser design QA.

## Global Constraints

- `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png` is the only visual source of truth.
- Preserve Marat's real face, expression, hairstyle, piercings, clothing, pose, and body proportions.
- Remove the adjacent person and source-photo background.
- Keep the panel copy editable and preserve the existing About link.
- Do not change any unrelated hero layout, project content, route, or interaction.

---

### Task 1: Create the reference-matched panel artwork

**Files:**
- Create: `assets/media/profile/missing-mar-profile-panel-v7.png`
- Create: `assets/media/profile/missing-mar-profile-panel-v7.webp`
- Reference: `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png`
- Reference: `assets/media/profile/missing-mar-profile.jpg`

**Interfaces:**
- Consumes: the approved reference mock and the original red-clothing photograph.
- Produces: a text-free portrait panel raster with Marat isolated inside a weathered stone-and-metal slab.

- [ ] **Step 1: Generate one panel artwork from the two supplied references**

Use built-in ImageGen in identity-preserve compositing mode. Require the approved slab shape, grey worn material, upside-down cutout placement, no adjacent person, no text, and no change to Marat's face or body.

- [ ] **Step 2: Inspect the generated artwork at original resolution**

Confirm that only Marat is visible, the face matches the source, the full figure remains inside the slab, and sufficient blank space remains for editable copy.

- [ ] **Step 3: Save the selected output into the project**

Copy the selected PNG to `assets/media/profile/missing-mar-profile-panel-v7.png` and create `assets/media/profile/missing-mar-profile-panel-v7.webp` at the same dimensions.

- [ ] **Step 4: Commit the artwork**

```bash
git add assets/media/profile/missing-mar-profile-panel-v7.png assets/media/profile/missing-mar-profile-panel-v7.webp
git commit -m "feat: add reference-matched profile panel artwork"
```

### Task 2: Integrate the panel without changing its editable copy

**Files:**
- Modify: `tests/render.test.mjs`
- Modify: `assets/js/render.js`
- Modify: `assets/css/home.css`
- Modify: `assets/css/responsive.css`
- Modify: `content/site.json`
- Modify: `.pages.yml`

**Interfaces:**
- Consumes: `owner.profileCardImage` as a project-relative asset URL.
- Produces: `.profile-card-art` as the accessible raster layer, with the existing `.profile-card-copy` and `.profile-card-footer` overlays.

- [ ] **Step 1: Write a failing render test**

Add an assertion that the home view contains `class="profile-card-art"`, preserves `href="#about"`, and renders `WHERE'S MISSING MAR?` as text rather than baking it into the image.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/render.test.mjs`

Expected: FAIL because the current image still uses `profile-card-photo`.

- [ ] **Step 3: Update the render markup and content path**

Rename the image layer to `profile-card-art`, point `profileCardImage` to `/missing-mar-portfolio/assets/media/profile/missing-mar-profile-panel-v7.webp`, and update the Pages CMS help text to describe the complete panel artwork.

- [ ] **Step 4: Rebuild the desktop panel styling**

Remove the detached-card border, solid background, uniform rectangle shadow, shade overlay, and image zoom. Match the reference with the same width-to-height proportion, slight perspective, irregular artwork edges, ground contact, and copy placement. Keep the panel at the approved lower-left hero anchor.

- [ ] **Step 5: Rebuild the mobile panel styling**

Scale the same artwork proportionally, keep all editable copy readable, avoid cropping the figure, and preserve at least a 44 by 44 pixel About-link target.

- [ ] **Step 6: Run the focused test and full automated checks**

Run: `node --test tests/render.test.mjs`

Expected: PASS.

Run: `npm test && npm run validate:content && npm run build && git diff --check`

Expected: 19 or more tests pass, content validation reports 7 projects and 2 pages, Vite build exits 0, and the diff check is empty.

- [ ] **Step 7: Commit the integration**

```bash
git add tests/render.test.mjs assets/js/render.js assets/css/home.css assets/css/responsive.css content/site.json .pages.yml
git commit -m "fix: match the approved embedded profile panel"
```

### Task 3: Run blocking visual QA

**Files:**
- Modify: `design-qa.md`
- Create: `docs/superpowers/qa/profile-panel-reference-comparison-v2.jpg`
- Create: `docs/superpowers/qa/implementation-home-profile-panel-v2-1440x1024.png`
- Create: `docs/superpowers/qa/implementation-home-profile-panel-v2-390x844.png`

**Interfaces:**
- Consumes: the approved reference and the rendered implementation at matching desktop state.
- Produces: a final QA report with `final result: passed` only when no P0, P1, or P2 profile-panel mismatch remains.

- [ ] **Step 1: Open the local prototype in the in-app Browser**

Use `http://localhost:4173/missing-mar-portfolio/` and keep the home route selected.

- [ ] **Step 2: Capture desktop and mobile evidence**

Capture 1440 by 1024 and 390 by 844 screenshots after the new artwork is loaded.

- [ ] **Step 3: Build a side-by-side desktop comparison**

Place the normalized approved reference next to the desktop implementation in `docs/superpowers/qa/profile-panel-reference-comparison-v2.jpg`.

- [ ] **Step 4: Fix every P0, P1, and P2 mismatch**

Check slab integration with grass, panel size and tilt, figure isolation, unchanged facial identity, copy position, and mobile cropping. Repeat capture and comparison until only optional P3 texture differences remain.

- [ ] **Step 5: Update the QA report and commit evidence**

```bash
git add design-qa.md docs/superpowers/qa/profile-panel-reference-comparison-v2.jpg docs/superpowers/qa/implementation-home-profile-panel-v2-1440x1024.png docs/superpowers/qa/implementation-home-profile-panel-v2-390x844.png
git commit -m "test: verify corrected profile panel fidelity"
```
