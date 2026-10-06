# Mobile layout and interactive motion

Small physical scene screens now use a compact composition: the banner's photo and text are side by side, with smaller headings/body copy and a separate stamp. Terminal contacts use three compact rows; inherited 120px grid rows, redundant step text and duplicate footer controls no longer consume the display. Project metadata uses one column on small screens and case typography is scaled consistently. TV remote and rack controls sit above the main navigation. Long content scrolls inside its physical screen.

Screen distance now considers horizontal and vertical limits independently, so reserving space for Back/footer does not unnecessarily shrink a portrait phone's screen width. Phones use up to 86% of available width; desktop retains its previous sizing and typography.

Navigation animations no longer finish instantly because the viewport changes. On resize, an active approach is retargeted from its current camera position with its remaining duration. Unchanged ResizeObserver notifications do nothing. At the user's explicit request, camera travel, rack rotation, billboard lamellae and disc insertion remain animated even when reduced motion is enabled; continuous snow/flicker still respect that preference. Initial page loading/direct links can still position the camera instantly.

## Verification

`scripts/kiosk/check-mobile-polish-browser.js` passed at 320×568, 390×844, 430×932, 844×390 and 820×1180 (Chromium touch emulation, not physical iOS hardware). Each size checked physical banner, price/contacts sheets, terminal and TV; no flat mobile overlay or horizontal content overflow. Initial banner title is visible and small-screen heading is at most 22px. All three terminal contacts fit initially and retain 44px targets on small displays. All seven projects were opened/scrolled on 390px; one project on each other size. Remote/rack controls fit and avoid the footer. Rack rotation animates; actual CDP touch drag turns the interior camera; exit restores the rack view. No page errors.

A normal-motion phone recording `camera-and-banner.webm` shows approach to the banner, a viewport-height change during the approach, lamella switching to the price face and return home. Resize did not cancel the flight. Desktop 1280×720 retains its 66px billboard headline and physical screen layout.

134 JavaScript + 9 Python tests pass. Production build passes with the existing chunk-size advisory. `git diff --check` passes. No GLB rebuild.
