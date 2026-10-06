# Touch labels

Permanent, tappable paper labels use `(hover: none), (any-pointer: coarse)` so phones, tablets and tablets with trackpads do not need mouse hover. Labels follow visible scene objects, respect occlusion and the current preset, and avoid overlapping one another or the footer. Individual project labels appear at the rack/showcase; room details appear inside. The away note retains its physical paper sign without an extra label covering the fascia. Reading pages, the contact card, notes and camera transitions hide the scene labels. Desktop mouse tooltips remain.

Browser checks: Chromium touch emulation at 390×844, 820×1180 and 1180×820; desktop at 1280×720. Verified initial labels without pointer movement, 44px tap targets, no overlaps, contact and project navigation by tap, hiding labels over reading pages, visible interior labels and desktop hover. Phone rotation to 844×390 recalculated placements above the footer. No page errors. Screenshots include overview, rack and interior at each touch size. This is browser emulation, not a physical iOS-device check.

Repeat with `scripts/kiosk/check-touch-labels-browser.js` through the Playwright browser tool while Vite is running.

Validation: 137 JavaScript tests + 9 Python tests pass; Vite production build passes, retaining the existing 500kB chunk advisory; `git diff --check` passes. No 3D model rebuild was required.
