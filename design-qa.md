# Design QA — smooth chrome, Y2K color, identity-preserved portrait

## Comparison target

- Source visual truth: `assets/media/y2k/landscape-profile-y2k-v3.png`
- Original portrait truth: `docs/superpowers/specs/assets/missing-mar-profile-source.jpg`
- Desktop implementation: `docs/superpowers/qa/implementation-y2k-chrome-face-v3-pass2-1440x1024.png`
- Mobile implementation: `docs/superpowers/qa/implementation-y2k-chrome-face-v3-390x844.png`
- Full desktop comparison: `docs/superpowers/qa/comparison-y2k-chrome-face-v3-pass2-1440x1024.jpg`
- Focused chrome/profile comparison: `docs/superpowers/qa/comparison-y2k-chrome-face-v3-pass2-focused.jpg`
- Local route: `/missing-mar-portfolio/`
- State: home, first featured project selected

## Normalization

- Source pixels: 1486 × 1059.
- Desktop implementation pixels and CSS viewport: 1440 × 1024 at browser density 1.
- Mobile implementation pixels and CSS viewport: 390 × 844 at browser density 1.
- The source was resized with `cover` to 1440 × 1024 before equal-size side-by-side comparison.

## Required fidelity surfaces

- Fonts and typography: identity, navigation, featured-project labels, CTA, and footer caption remain live text using the existing Exo 2 and IBM Plex Mono hierarchy.
- Spacing and layout rhythm: the landscape composition, monument location, central chrome silhouette, project selector, and navigation preserve the selected desktop structure. Mobile keeps its stacked monument layout with no horizontal overflow.
- Colors and visual tokens: the final image uses saturated cobalt/cyan sky, clean white clouds, vivid emerald/acid-lime grass, cool silver-blue chrome, and the existing acid UI state color. The final scene is displayed without a dark color wash.
- Image quality and asset fidelity: the central sculpture uses continuous polished reflections, clean highlight bands, crisp edges, and no generative speckle. The plaque is integrated into the same landscape raster. The portrait inside it comes from `missing-mar-profile-monument-v1.png`, which preserves the exact face pixels from the original supplied photo; ImageGen was not used to reconstruct the face in the final composite.
- Copy and content: identity, three featured projects, About, Contact, project CTA, and archive content remain unchanged and live.

## Comparison history

### Pass 1 — blocked

- [P2] The initial implementation was visibly darker and less acid than the selected image.
  - Cause: `.landscape-hero::after` applied a navy 5% wash over the entire generated scene.
  - Evidence: `implementation-y2k-chrome-face-v3-1440x1024.png` and `comparison-y2k-chrome-face-v3-1440x1024.jpg`.

### Pass 2 — passed

- Fix: removed the color wash and kept the full scene behind the live interface at `z-index: 1`.
- Fix: mobile now uses the same smooth-chrome, saturated no-plaque landscape while retaining the original transparent monument asset.
- Post-fix evidence: `implementation-y2k-chrome-face-v3-pass2-1440x1024.png`, `comparison-y2k-chrome-face-v3-pass2-1440x1024.jpg`, `comparison-y2k-chrome-face-v3-pass2-focused.jpg`, and `implementation-y2k-chrome-face-v3-390x844.png`.
- No actionable P0, P1, or P2 differences remain. Minor screenshot color-management variation is classified as P3 because the browser renders the exact source asset without a CSS tint.

## Primary interactions tested

- Project 02 becomes pressed and updates `Открыть проект` to `#project/pik`.
- Header `Обо мне` and `Контакт` links render their corresponding views.
- Desktop and mobile have no horizontal overflow.
- Browser warning/error log is empty.

## Final result

final result: passed
