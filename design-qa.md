# Design QA — selected profile monument

## Comparison target

- Source visual truth: `docs/superpowers/specs/assets/profile-monument-selected-reference.png`
- Desktop implementation: `docs/superpowers/qa/implementation-selected-monument-1440x1024.png`
- Mobile implementation: `docs/superpowers/qa/implementation-selected-monument-390x844.png`
- Full desktop comparison: `docs/superpowers/qa/comparison-selected-monument.jpg`
- Focused monument comparison: `docs/superpowers/qa/comparison-selected-monument-focused.jpg`
- Focused chrome comparison: `docs/superpowers/qa/comparison-smooth-chrome-focused.jpg`
- Local route: `/missing-mar-portfolio/`
- State: home, first featured project selected

## Normalization

- Source pixels: 1486 × 1058.
- Desktop implementation pixels and CSS viewport: 1440 × 1024 at browser density 1.
- Mobile implementation pixels and CSS viewport: 390 × 844 at browser density 1.
- The source was center-fitted to 1440 × 1024 before placement beside the equal-size implementation capture.

## Required fidelity surfaces

- Composition: identity at upper left, the large chrome sculpture in the center, the three-project selector at right, and the personal monument grounded in the lower-left grass remain in the selected arrangement.
- Monument asset: the approved irregular dark stone surface, organic chrome rim, full upside-down seated figure, acidic yellow/blue contour, and embedded white mono copy are delivered as one transparent raster rather than reconstructed with HTML or CSS.
- Grounding: a foreground layer sampled from the exact landscape image masks the lower edge of the monument so it reads as planted in the grass instead of floating above it.
- Live interface: header navigation, all three featured-project rows, and the `Открыть проект` action remain semantic, interactive DOM controls. The monument itself is decorative and intentionally non-interactive because the live `Обо мне` link remains in the header.
- Chrome finish: the landscape background preserves the original sky, grass, silhouette, and reflections while applying a restrained local smoothing/sharpening pass to the central chrome sculpture.
- Responsiveness: desktop keeps the approved spatial hierarchy; mobile preserves the monument without horizontal overflow and continues the project list below it.

## Comparison history

### Pass 1 — blocked

- [P2] The monument initially read as a separate floating card.
  - Fix: replaced the composed HTML card with the approved transparent monument asset and added a foreground grass occlusion layer derived from the exact background.
  - Post-fix evidence: `comparison-selected-monument-focused.jpg`.
- [P2] The central chrome sculpture retained noisy, grainy texture.
  - Fix: introduced the locally retouched landscape background, limiting the adjustment to the sculpture so the environment did not drift or gain new generative artifacts.
  - Post-fix evidence: `comparison-smooth-chrome-focused.jpg`.

### Pass 2 — passed

- The monument now follows the approved silhouette, treatment, scale, and lower-left placement.
- The lower edge is partially obscured by matching grass and no longer reads as a rectangular overlay.
- The live controls remain distinct from the decorative raster and continue to work.
- No actionable P0, P1, or P2 visual differences remain.
- Residual P3: the live monument is slightly wider and lower than the normalized mock, and its grass occlusion is softer; these differences do not change the intended hierarchy or treatment.

## Primary interactions to verify

- Selecting projects 01–03 updates the active state and the destination of `Открыть проект`.
- Header `Обо мне` and `Контакт` links still open their corresponding views.
- The monument has `aria-hidden="true"` and does not introduce a duplicate focus target.

## Final result

final result: passed
