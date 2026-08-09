# Design QA — natural grass profile scene

## Comparison target

- Source visual truth: `docs/superpowers/specs/assets/profile-scene-natural-grass-selected.png`
- Desktop implementation: `docs/superpowers/qa/implementation-natural-grass-v2-1440x810.jpg`
- Mobile implementation: `docs/superpowers/qa/implementation-natural-grass-v2-390x844.png`
- Full desktop comparison: `docs/superpowers/qa/comparison-natural-grass-v2-1440x810.jpg`
- Local route: `/missing-mar-portfolio/`
- State: home, first featured project selected

## Normalization

- Source pixels: 1485 × 1059.
- Desktop implementation pixels and CSS viewport: 1440 × 810 at browser density 1.
- Mobile implementation pixels and CSS viewport: 390 × 844 at browser density 1.
- The source was resized with `cover` to 1440 × 810 before side-by-side placement with the equal-size implementation capture.

## Required fidelity surfaces

- Fonts and typography: live identity, navigation, featured-project labels, and CTA retain the existing Exo 2 and IBM Plex Mono hierarchy. Text embedded inside the personal monument remains part of the selected raster, as in the visual target.
- Spacing and layout rhythm: the profile monument is uniformly reduced to about 85% of its previous scale and sits farther inside the lower-left landscape. The live project selector remains at right. Mobile retains the existing stacked layout without horizontal overflow.
- Colors and visual tokens: the cobalt sky, acid yellow-green states, dark stone, chrome rim, and natural green field preserve the approved Y2K palette.
- Image quality and asset fidelity: the desktop foreground is one flattened scene layer. Medium-long grass has individually visible blades, natural wind direction and distance falloff; stones have irregular mineral texture, lichen, grounded shadows, and grass growing around their bases. The monument, its contact shadow, surrounding grass, and foreground rocks share the same raster sharpness, so the plaque no longer reads as pasted on.
- Copy and content: identity, three featured projects, About, Contact, and CTA copy remain unchanged and live.

## Comparison history

### Pass 1 — blocked

- [P2] The monument looked sharper than the landscape and read as an independent foreground card.
  - Cause: `missing-mar-profile-monument-v1.webp` was rendered as a standalone high-resolution element with its own drop shadows.
- [P2] The grass below the monument looked soft and artificial.
  - Cause: `landscape-foreground-grass.webp` was a second full-screen alpha mask that was resampled independently from both the monument and background.

### Pass 2 — improved but not final

- Fix: desktop now renders `profile-scene-reference-overlay.png`, extracted from the exact approved image at its full 1486 × 1058 canvas size. It contains the monument and the immediately surrounding real grass as one flattened visual layer.
- Fix: removed the separately blurred foreground-grass image and all desktop monument transforms/drop shadows.
- Remaining P2: the grass still had repeated AI-like curls, rocks lacked believable mineral detail, and the monument sat too close to the viewer.

### Pass 3 — passed

- Fix: desktop now renders `profile-scene-natural-grass-v2.png`, built from the selected full-scene reference after a constrained image edit using the three supplied grass references.
- Fix: grass was replaced with medium-length, wind-swept blades with visible strand detail; rocks were rebuilt as irregular field stones with grounded shadows and vegetation at their bases.
- Fix: the entire monument group was uniformly reduced and integrated into the same foreground raster, keeping all live site controls separate and interactive.
- Post-fix evidence: `implementation-natural-grass-v2-1440x810.jpg` and `comparison-natural-grass-v2-1440x810.jpg`.
- No actionable P0, P1, or P2 differences remain in the requested desktop scene.
- Residual P3: mobile uses the standalone monument asset because the wide reference crop would remove it from a narrow viewport; this preserves the existing responsive layout and has no horizontal overflow.

## Primary interactions tested

- Project 02 becomes pressed and updates `Открыть проект` to `#project/pik`.
- Header `Обо мне` and `Контакт` links render their corresponding views.
- Browser warning/error log is empty.

## Final result

final result: passed
