# Physical screen zoom on mobile

The width-based full-screen page mode is removed. Every device with a working 3D scene uses the same screen anchors, camera approach and projected HTML content as desktop. Flat pages remain only as a fallback if the 3D scene cannot initialise. ResizeObserver reframes the current physical screen after viewport changes.

Screen fitting reserves space for Back and the footer, including short landscape phones. Named container queries size teletext, project headings and terminal contents according to the physical screen's width. Content remains scrollable inside that screen; no touch hints/exploration menu are introduced.

Browser validation: `scripts/kiosk/check-mobile-zoom-browser.js` uses touchscreen taps at 390×844, 320×568, 820×1180 and 844×390. Flyer, price sheet, terminal and billboard render within their physical screen bounds and the safe viewport, without a `.screen-flat` page or horizontal content overflow. Rack/showcase and interior TV remain tappable; TV content fits horizontally. No page errors. A project opened by tapping the physical TV channel list remained on the TV.

Normal-motion check at 390×844 confirmed a real camera flight after touching the flyer: position changed while `inFlight` was true, continued to a distinct final position, and Back restored the original camera within 0.01m. No flat page appeared during approach. The ordinary-motion check is separate from reduced-motion tests used for deterministic destination QA.

134 JavaScript + 9 Python tests and production build pass; existing chunk-size advisory remains. `git diff --check` passes. Browser emulation, not physical iOS hardware. No GLB rebuild.
