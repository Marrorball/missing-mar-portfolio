# Profile panel reference-match design

## Approved visual target

The only source of visual truth is `docs/superpowers/specs/assets/y2k-landscape-selected-reference-v2.png`, specifically the lower-left personal panel. The rest of the home page must remain unchanged.

## Required result

- Recreate the personal panel at the same apparent size, position, slight perspective, and ground contact as the approved reference.
- The panel must read as a heavy weathered stone-and-metal slab embedded in the landscape, not as a floating web card.
- Its lower edge must visually meet the grass and carry a restrained contact shadow. There must be no clean detached rectangular card treatment.
- Preserve the panel's dark grey translucent texture, worn rim, subtle scan/print grain, and integrated collage feeling from the reference.
- Use the supplied red-clothing photograph as the person source.
- Remove the adjacent person and the original photographic background so Marat appears alone as a cutout inside the panel.
- Preserve Marat's real face, expression, hairstyle, piercings, clothing, pose, and body proportions. Do not regenerate, beautify, reshape, replace, or reinterpret the face.
- Keep the upside-down orientation and match the figure scale and placement shown in the reference during side-by-side QA.
- Preserve the existing copy and its placement: `WHERE'S MISSING MAR?`, `I DESIGN CLEAR SYSTEMS WITH A STRANGE EDGE.`, `PRODUCT & VISUAL DESIGNER`, `МОСКВА · 2026`, and `ОБО МНЕ ↗`.
- Keep the personal panel linking to the About page and keep its copy editable through the existing content model.

## Asset strategy

Create a new project-local raster asset for the slab, texture, and isolated photographic figure. The photograph must remain recognizably the supplied source rather than an AI-redrawn portrait. Text remains an accessible HTML overlay so the owner can edit it visually later.

## Responsive behavior

- Desktop: match the approved lower-left composition and integrate the slab into the hill.
- Mobile: keep the same slab artwork and collage treatment, scale it proportionally, and avoid cropping the head, shoes, or copy.

## Acceptance checks

- Side-by-side comparison with the approved reference shows the same panel character and integration with the landscape.
- Marat is the only person visible.
- The face matches the supplied photograph and is not regenerated.
- The panel no longer reads as a floating rectangular card.
- No unrelated layout, content, routes, or interactions change.
