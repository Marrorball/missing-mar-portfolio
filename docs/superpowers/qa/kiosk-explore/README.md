# Complete touch exploration

The touch help bar now has an «Осмотреть» button opening a native modal dialog. Its list exposes all 12 unique fixed objects (door aliases are deduplicated) and all 7 projects independently of camera orientation, occlusion and the two/three-label limit. The main phone view now prioritises the contacts flyer and project rack. Small labels still fade during camera gestures.

Menu navigation uses existing object actions and native project anchors. Radio and calendar selections first move inside and face the chosen object. The door switches to «Выйти на улицу» while inside. Native dialog modality provides focus containment; closing restores focus to the opener. Escape closes the menu without also navigating the scene. Outside taps close the dialog.

Browser validation through `scripts/kiosk/check-explore-browser.js`: Chromium touch emulation at 390×844, 820×1180 and 1180×820. All 12 object destinations exercised on each size, all 7 projects opened on the phone (one project on each tablet size). Direct contact-flyer label, opening/closing dialog, focus return, Escape and menu exit verified. Radio/calendar camera direction checked against their visible geometry. No page errors. Physical iOS hardware was not used.

The earlier `check-touch-labels-browser.js` also passes for these three sizes and desktop 1280×720: label limits, taps, gesture fading and desktop hover remain intact.

Validation: 140 JavaScript + 9 Python tests pass; production build passes with the existing chunk-size advisory; `git diff --check` passes. Screenshots show menu and opened flyer for each touch size.
