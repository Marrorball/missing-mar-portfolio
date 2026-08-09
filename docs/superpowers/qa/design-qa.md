# Design QA — approved full-screen reference raster

- Reference: `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png`
- Production asset: `assets/media/y2k/y2k-selected-reference-hero-v1.png`
- Browser capture: `docs/superpowers/qa/implementation-home-reference-raster-1440x1024.png`
- Comparison: `docs/superpowers/qa/reference-raster-comparison.png`
- Viewport: 1440 × 1024
- State: home

## Result

The production asset is a byte-identical copy of the approved reference. The former layered grass, chrome object, profile card, and visible coded header/identity/project-selector UI are not rendered over the raster. The personal stone panel is part of the single background image and has no link or hover behavior.

- P0: none
- P1: none
- P2: none

Status: passed.
