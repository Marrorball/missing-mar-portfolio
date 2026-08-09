# Design QA — flattened profile scene

## Comparison target

- Source visual truth: `docs/superpowers/specs/assets/profile-monument-selected-reference.png`
- Desktop implementation: `docs/superpowers/qa/implementation-profile-scene-flattened-1440x810.jpg`
- Mobile implementation: `docs/superpowers/qa/implementation-profile-scene-flattened-390x844.jpg`
- Full desktop comparison: `docs/superpowers/qa/comparison-profile-scene-flattened-1440x810.jpg`
- Local route: `/missing-mar-portfolio/`
- State: home, first featured project selected

## Normalization

- Source pixels: 1486 × 1058.
- Desktop implementation pixels and CSS viewport: 1440 × 810 at browser density 1.
- Mobile implementation pixels and CSS viewport: 390 × 844 at browser density 1.
- The source was resized with `cover` to 1440 × 810 before side-by-side placement with the equal-size implementation capture.

## Required fidelity surfaces

- Fonts and typography: live identity, navigation, featured-project labels, and CTA retain the existing Exo 2 and IBM Plex Mono hierarchy. Text embedded inside the personal monument remains part of the selected raster, as in the visual target.
- Spacing and layout rhythm: the desktop scene follows the source crop and keeps the personal monument in the same lower-left zone while the live project selector remains at right. Mobile retains the existing stacked layout without horizontal overflow.
- Colors and visual tokens: the cobalt sky, acid yellow-green states, dark stone, chrome rim, and grass tones come directly from the approved source and existing landscape.
- Image quality and asset fidelity: desktop no longer combines a sharp transparent monument with a separately softened grass mask. The monument, its contact shadow, surrounding blades, nearby hill, and sky are one alpha-masked crop taken directly from the approved full image, so their sharpness and compression are internally consistent. The mask fades only through matching background pixels outside the monument.
- Copy and content: identity, three featured projects, About, Contact, and CTA copy remain unchanged and live.

## Comparison history

### Pass 1 — blocked

- [P2] The monument looked sharper than the landscape and read as an independent foreground card.
  - Cause: `missing-mar-profile-monument-v1.webp` was rendered as a standalone high-resolution element with its own drop shadows.
- [P2] The grass below the monument looked soft and artificial.
  - Cause: `landscape-foreground-grass.webp` was a second full-screen alpha mask that was resampled independently from both the monument and background.

### Pass 2 — passed

- Fix: desktop now renders `profile-scene-reference-overlay.png`, extracted from the exact approved image at its full 1486 × 1058 canvas size. It contains the monument and the immediately surrounding real grass as one flattened visual layer.
- Fix: removed the separately blurred foreground-grass image and all desktop monument transforms/drop shadows.
- Post-fix evidence: `implementation-profile-scene-flattened-1440x810.jpg` and `comparison-profile-scene-flattened-1440x810.jpg`.
- No actionable P0, P1, or P2 differences remain in the requested desktop scene.
- Residual P3: mobile uses the standalone monument asset because the wide reference crop would remove it from a narrow viewport; this preserves the existing responsive layout and has no horizontal overflow.

## Primary interactions tested

- Project 02 becomes pressed and updates `Открыть проект` to `#project/pik`.
- Header `Обо мне` and `Контакт` links render their corresponding views.
- Browser warning/error log is empty.

## Final result

final result: passed
