# Selected Profile Monument Design

## Visual source of truth

The selected target is the displayed ImageGen result copied to `docs/superpowers/specs/assets/profile-monument-selected-reference.png`. Only the lower-left monument and the surface quality of the central chrome sculpture are new targets. The current live header, identity, featured-project controls, archive, routes, and interactions remain real HTML and stay unchanged.

## Profile monument

- Render the lower-left object as one non-interactive raster artwork with an irregular stone face, polished chrome exoskeleton, acid-lime and cobalt registration outlines, printed grain, Marat's upside-down seated pose, and the approved printed copy.
- Use the original red-clothing photograph as the identity source. Preserve Marat's face, expression, hair, piercings, clothing, pose, hands, legs, shoes, and proportions. Remove the adjacent person.
- Keep the artwork's outer silhouette transparent so it can sit over the existing landscape without a rectangular image boundary.
- Ground the monument with believable scale, visible material thickness, a short contact shadow, and foreground grass crossing its lower edge.
- The monument is decorative and not a link. The existing header link to `Обо мне` remains the accessible navigation path.

## Landscape refinement

- Preserve the current sky, cloud placement, hill, rocks, floating chrome pebble, golf ball, and composition.
- Refine only the large central sculpture so its chrome reads smooth, crisp, reflective, and metallic rather than grainy or AI-smudged.
- Do not bake navigation, project controls, identity copy, or captions into the landscape image.

## Responsive behavior

- Desktop: match the selected reference's lower-left size, irregular silhouette, tilt, and grass contact without covering the title or project selector.
- Mobile: scale the same artwork proportionally and keep the title, project controls, face, shoes, and monument silhouette visible without horizontal overflow.

## Acceptance criteria

- The selected reference and the rendered desktop hero have the same overall composition and monument character.
- All header and project controls remain interactive HTML.
- The monument is non-interactive and has no duplicate HTML copy over the printed artwork.
- The background stays sharp outside the central chrome refinement.
- The central metal sculpture is visibly smoother and crisper than the previous implementation.
- No white/grey hair halo, floating limb, stretched panel, rectangular crop edge, or floating-card shadow is visible.
