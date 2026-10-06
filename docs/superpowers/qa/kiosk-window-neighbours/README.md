# Apartment windows

Two occupied windows in the distant apartment blocks: a smoking neighbour
on the third floor of the left block and a neighbour looking outside from
the seventh floor of the next block, above the billboard. Waist-up shapes,
profiles, bent arms, window sills and a small cigarette/smoke detail are
modelled in the existing GLB. They remain background details.

Lit windows mix the existing warm light with amber, soft white, cool white
and dim warm light. A separate deterministic random source preserves the
existing lit/dark pattern; only the two occupied windows are forced on.
Figures and trim are merged meshes; no new browser animations or lights.

`home.png` is the native browser overview used for visual verification.

Validation: `npm test` (120 JavaScript and 9 Python checks), `npm run build`,
GLB draw-call/file budget and `git diff --check`.
