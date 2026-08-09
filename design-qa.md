# Design QA — missing mar profile panel

## Comparison target

- Source visual truth: `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png`
- Desktop implementation: `docs/superpowers/qa/implementation-home-profile-panel-v2-1440x1024.jpg`
- Mobile implementation: `docs/superpowers/qa/implementation-home-profile-panel-v2-390x844.jpg`
- Combined desktop comparison: `docs/superpowers/qa/profile-panel-reference-comparison-v2.jpg`
- Local route: `/missing-mar-portfolio/`
- State: home, first featured project selected

## Normalization

- Source pixels: 1487 × 1058.
- Desktop implementation pixels and CSS viewport: 1440 × 1024 at browser density 1.
- Mobile implementation pixels and CSS viewport: 390 × 844 at browser density 1.
- For the side-by-side evidence, the source was center-fitted to 1440 × 1024 and placed beside the equal-size implementation capture.

## Full-view comparison evidence

The normalized comparison shows the personal panel in the same lower-left zone, at nearly the same scale, clockwise angle, horizon contact, dark stone/metal treatment, white mono copy, and full seated upside-down pose as the approved reference. The user is isolated from the second person. Both legs, shoes, hands, head, face, and the right sleeve are preserved. The right arm now exits at the physical panel edge, matching the source-photo crop instead of ending inside the surface.

## Focused-region evidence

The profile panel is readable at full size in both the 2880 × 1024 combined comparison and the dedicated 1100 × 1000 source asset. A separate crop was not needed because the panel occupies roughly 430 × 400 pixels in the desktop capture and its figure edges, text wrapping, frame texture, and arm termination remain visible.

## Required fidelity surfaces

- Fonts and typography: the card uses the existing mono family, white uppercase copy, a forced two-line `WHERE'S / MISSING MAR?` title, compact tagline, and small footer metadata matching the source hierarchy.
- Spacing and layout rhythm: desktop panel size, lower-left position, slight clockwise tilt, copy inset, divider, and footer align closely with the approved composition. Mobile keeps the whole panel inside the initial 390 × 844 viewport.
- Colors and visual tokens: the panel uses dark charcoal stone, worn silver borders, pale concrete, white copy, and restrained shadowing consistent with the reference.
- Image quality and asset fidelity: `missing-mar-profile-panel-v7.png` is a 1100 × 1000 project raster. The panel texture was generated as an empty asset; the person is composited from the original photograph with a contracted, feathered local foreground mask, so the face, clothing, pose, legs, hands, and shoes are not AI-redrawn. The companion mask is subtracted, the source-photo hair boundary is tapered, and the extended sleeve is clipped behind the inner metal frame. No CSS-art or placeholder substitute is used.
- Copy and content: title, tagline, role, location/year, and About action match the approved card content.
- Icons and affordance: the panel remains a semantic link to About with the existing focus treatment and accessible label.
- Accessibility and responsiveness: the image has alt text, the card is keyboard reachable, and the desktop/mobile captures show no clipping that hides the panel content.

## Comparison history

### Pass 1 — blocked

- [P2] The first generated panel removed the seated legs and changed the original pose.
  - Fix: replaced the generated person with the full subject extracted from the original photograph.
  - Post-fix evidence: `missing-mar-profile-panel-v7.png` and both final browser captures.
- [P2] The companion remained partially attached to the subject mask.
  - Fix: generated a separate foreground instance mask and subtracted it before compositing.
  - Post-fix evidence: only one person appears in the final panel.

### Pass 2 — blocked

- [P2] The panel initially read as a floating generic card and did not match the source slab proportions.
  - Fix: used the dedicated weathered stone/metal panel, removed the generic CSS border/background, matched the source aspect ratio, scale, position, and clockwise tilt.
- [P2] The right arm ended inside the plate, making the sleeve look visibly severed.
  - Fix: moved the unmodified full subject horizontally and clipped the original photo boundary behind the panel's inner silver frame.
  - Post-fix evidence: `implementation-home-profile-panel-v2-1440x1024.jpg` and `implementation-home-profile-panel-v2-390x844.jpg`.
- [P2] The first mask left gray pavement contamination and a hard rectangular crop around the hair.
  - Fix: contracted and feathered the alpha mask, removed the artificial drop shadow, and tapered the original bottom-photo boundary through the hair.
  - Post-fix evidence: `missing-mar-profile-panel-v7.png`.

### Pass 3 — passed

- No actionable P0, P1, or P2 differences remain for the profile panel.
- Residual P3: the live panel texture is slightly cleaner than the mock's painted treatment; this does not affect the silhouette, identity, or interaction.

## Primary interaction tested

- Activating the personal panel navigates to `#about` and renders the About page.
- Desktop and mobile home states render the full seated pose and one-person mask.

## Findings

No actionable P0, P1, or P2 findings remain for the profile panel.

## Final result

final result: passed
