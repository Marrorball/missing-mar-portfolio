# Design QA — missing mar portfolio

## Comparison target

- Source visual truth: `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png`
- Final desktop implementation: `docs/superpowers/qa/implementation-home-final-1440x1024.png`
- Final mobile implementation: `docs/superpowers/qa/implementation-home-final-390x844.png`
- Combined desktop comparison: `docs/superpowers/qa/comparison-home-final.jpg`
- Local route: `/missing-mar-portfolio/`
- State: home, first featured project selected, archive below the fold

## Normalization

- Source pixels: 1487 × 1058.
- Desktop implementation pixels and CSS viewport: 1440 × 1024.
- Mobile implementation pixels and CSS viewport: 390 × 844.
- The source was resized to 1440 × 1024 before the final side-by-side comparison. The Browser screenshot API returned CSS-pixel-sized captures, so no additional density scaling was needed.

## Full-view comparison evidence

The final combined image places the normalized source on the left and the browser-rendered implementation on the right. The implementation preserves the dominant cobalt sky, green hill, centered chrome sculpture, upper-left identity, lower-left personal card, right-side three-project selector, and acid active state. The project selector, card, identity, and horizon maintain the same visual grouping and reading order.

The implementation intentionally omits the source mock's faint CRT scanlines and decorative lower-corner HUD ornaments. They are non-functional P3 details, and omitting them keeps the live interface clearer and less visually noisy, consistent with the user's request for more air.

## Focused-region evidence

Separate crops were not needed: the 2904 × 1024 combined comparison keeps the identity, card copy, featured rows, and image crops readable at original detail. The profile card and display title were also inspected in dedicated browser captures during iteration.

## Required fidelity surfaces

- Fonts and typography: local Exo 2 ExtraBold Italic and IBM Plex Mono files load successfully. The display lockup is horizontally expanded and vertically compressed to match the racing/Y2K silhouette of the source. Small labels retain readable mono weights and line height.
- Spacing and layout rhythm: desktop anchors match the source's header, identity, photo card, central sculpture, and selector zones. Mobile stacking keeps the identity first, sculpture second, photo card third, and project selector below.
- Colors and visual tokens: cobalt, white, dark navy, translucent dividers, and acid green match the selected art direction. Active, hover, and focus treatments retain usable contrast.
- Image quality and asset fidelity: the landscape plate is a real generated raster asset at 2048 × 1457 with a WebP delivery version. The personal card uses a dedicated 1122 × 1402 generated photo asset grounded in the approved mock and original high-resolution photograph. No CSS or inline-SVG substitute is used for the hero scene or photo.
- Copy and content: `missing mar / Марат Дреев`, `Product & Visual Designer`, the personal-card copy, three featured project names, and all project/page content match the approved content model.
- Icons: the visible navigation and arrow icons use the local Phosphor icon font with consistent weight and alignment.
- Accessibility and responsiveness: semantic headings/landmarks, skip link, alt text, live region, keyboard focus, reduced-motion rules, and 44 × 44 minimum visible mobile header targets are present.

## Comparison history

### Pass 1 — blocked

- [P2] The 16:9 background crop made the chrome sculpture too large at the 1440 × 1024 comparison viewport.
  - Fix: restored the generated plate's original landscape ratio and delivered it at 2048 × 1457.
  - Post-fix evidence: `implementation-home-1440x1024.png` and `comparison-home-pass-1.jpg`.
- [P2] The display wordmark was too narrow for the approved racing-style silhouette.
  - Fix: expanded the Exo 2 lockup horizontally, then reduced its vertical scale to match the source's proportions.
  - Post-fix evidence: `implementation-home-final-1440x1024.png`.
- [P2] The original profile crop made the face feel too close.
  - Fix: generated a dedicated zoomed-out portrait card image from the approved mock plus the original photograph, preserved the upside-down composition, and exposed it as a separate editable CMS field.
  - Post-fix evidence: `implementation-home-pass-3-1440x1024.png` and `implementation-home-final-1440x1024.png`.

### Pass 2 — blocked

- [P2] The mobile header mark and page menu measured 22 × 22 and 32 × 46, below the practical minimum target size.
  - Fix: expanded both interactive hit areas to at least 44 × 44 without changing their visual alignment.
  - Post-fix evidence: browser measurement returned 44 × 44 for both controls; `implementation-home-final-390x844.png` shows the unchanged composition.

### Pass 3 — passed

- No actionable P0, P1, or P2 visual differences remain.
- Residual P3 differences: the live site uses a cleaner texture than the source and does not include the source's decorative lower-corner HUD ornaments.

## Primary interactions tested

- Selecting each featured project updates the active state and `Открыть проект` destination.
- Opening a selected project updates the hash route and renders the full case study.
- Category filters update the archive list; UX/UI correctly returns three projects.
- About and Contact routes render and remain reachable from the header.
- The email contact resolves to `mailto:marrorball@gmail.com`.
- Browser console warnings/errors checked: none.
- Automated checks: 19 tests passed; content validation reports 7 projects and 2 pages; production build succeeds.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- [P3] If more retro texture is desired after user review, add a real lightweight raster scanline/noise asset rather than CSS-drawn lines.
- [P3] Optional decorative lower-corner HUD imagery can be generated as real assets after the main composition is approved.

## Final result

final result: passed
