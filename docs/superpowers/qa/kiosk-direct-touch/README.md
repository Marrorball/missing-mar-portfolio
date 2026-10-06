# Direct touch interaction

Removed the rejected touch-label overlay and exploration menu, including their runtime code, styles and obsolete test scripts. Touch devices have no automatic hint or hover labels. The usual footer remains with projects, about, contacts and enter/exit. Desktop mouse hover/click behavior is preserved.

The scene uses the same object actions for fingertip taps. Exact ray hits take priority; taps that miss may find a visible object within 14px using the same occlusion checks. Any drag exceeding 6px remains a drag even if it returns to its starting point. Portrait and short landscape overviews fit the interactive kiosk/rack/terminal/billboard bounds; mobile reading pages retain their responsive full-screen layout and scrolling.

Browser QA (`scripts/kiosk/check-direct-touch-browser.js`): Chromium touch emulation at 390×844, 320×568, 820×1180 and 844×390. Actual touchscreen taps on the contact flyer, price sheet, terminal, billboard, rack, showcase and interior TV all open the expected view. No extra hint/menu nodes or horizontal document overflow. Native pointer drags returning to their start do not activate objects. No page errors. Desktop 1280×720 still shows hover text and opens the rack by mouse click. These are browser checks, not physical iOS hardware tests.

134 JavaScript + 9 Python tests pass. Production build passes with the existing chunk-size advisory; `git diff --check` passes. No GLB rebuild.
