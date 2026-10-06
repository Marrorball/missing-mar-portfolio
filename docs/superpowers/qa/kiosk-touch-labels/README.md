# Touch labels

Compact, translucent tappable paper labels use `(hover: none), (any-pointer: coarse)` so phones, tablets and tablets with trackpads do not need mouse hover. At most two labels appear on phones (up to 600px), or three on wider touch devices. The overview prioritises projects and the contacts flyer; close-ups prioritise central visible objects. Labels respect occlusion and the current preset, and avoid overlapping one another or the footer. Their visible chips are about 21px high, inside transparent tap areas of at least 44px. Labels remain stationary during camera gestures, fade out over 180ms and return after 260ms of camera/rack stability. Reduced-motion preferences disable the fade. Individual project labels appear at the rack/showcase; room details appear inside. The away note retains its physical paper sign without an extra label covering the fascia. Reading pages, the contact card, notes and camera transitions hide the scene labels. Desktop mouse tooltips remain.

Browser checks: Chromium touch emulation at 390×844, 820×1180 and 1180×820; desktop at 1280×720. Verified initial label limits without pointer movement, 44px tap targets, no overlaps, footer contacts and project navigation by tap, hiding labels over reading pages, visible interior labels and desktop hover. Actual camera drags hide labels until settled; a separate normal-motion phone run confirmed opacity 0 during movement and 1 afterwards with a 180ms transition. Phone rotation to 844×390 recalculated placements above the footer. No page errors. Screenshots include overview, rack and interior at each touch size. This is browser emulation, not a physical iOS-device check.

Repeat with `scripts/kiosk/check-touch-labels-browser.js` through the Playwright browser tool while Vite is running.

Validation: 140 JavaScript tests + 9 Python tests pass; Vite production build passes, retaining the existing 500kB chunk advisory; `git diff --check` passes. No 3D model rebuild was required.

Complete object/project access is provided by the touch «Осмотреть» menu; see `../kiosk-explore/README.md`. The limited scene labels are supplementary, not the only way to open an object.
