# Serving-window note, terminal and contact links

Based on Claude's current scene at `ac2e4dd`.

- The away note is white matte paper, 49 × 22 cm, taped in front of the
  serving pane and within the opening, clear of the diamond grille. Large
  black type reads «ОТОШЁЛ / НА 5 МИНУТ». The existing hotspot is retained.
- The terminal's physical header reads «ПОПОЛНЕНИЕ / БАЛАНСА»; its page
  header uses the same name.
- All three flyer tear-off strips are native links. Telegram and Behance
  open a new tab; email uses `mailto:`. The footer contact card has three
  whole-row links and no copy buttons. The unused clipboard handler was removed.

Validation: 134 JavaScript tests and 9 Python tests pass; Vite build and
`git diff --check` pass. The existing bundle-size advisory remains.

`scripts/kiosk/check-contact-links-browser.js` verifies all three destinations
from the flyer and the footer at 1280×720 and 390×844, including actual
external-link popup navigation. External pages are intercepted locally;
email clicks are captured without launching the mail app. No page errors.

Native browser images: `window.png`, `terminal.png`, `contacts.png`, `flyer.png`.
