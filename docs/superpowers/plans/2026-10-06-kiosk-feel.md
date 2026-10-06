# Kiosk Feel Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marat's notes after the Codex pass (2026-10-06): pages must stop looking like the old site and belong to the kiosk; inside look-around turns the wrong way; the cola can is a food tin with a real brand on it and needs a twin on the counter; close-ups should feel like walking up to the object instead of a page popping on top; clicking beside a close-up should step back to where you stood; the street DVD rack is sticks in the air; picking a disc should walk you to the TV instead of jumping; the TV body should be dark plastic.

**Architecture:**
- *Pages:* every screen gets its own period look, set in the PT type family (ParaType, OFL, Cyrillic) self-hosted from `@fontsource`: the TV is a DVD title menu on a CRT (chapter list, subtitle-yellow headings), the TV guide is Teletext page 100, the billboard is a printed street poster with a red stamp, the flyer is a photocopy with tape and tear-offs, the terminal is an orange payment-terminal UI. The site chrome (help bar, back, notes, labels, rack controls, contact card) becomes paper labels. Owner case HTML (`cs-*` classes from the XP era) is restyled inside each page.
- *Approach:* during the flight to a screen, the page is laid on the screen's projected quad with a CSS `matrix3d` homography (`quadTransform`, pure and tested), hidden while something stands between the camera and the screen, fading in as the camera arrives. At arrival the quad is the centred rectangle, so the page lands exactly where it rests.
- *Way back:* entering a close-up from a free view stores a snapshot (preset, position, target, fov, inside look). A click on empty scene around a close-up, the back button and Esc fly back to that snapshot.
- *Walking routes:* flights between outside and inside go around the kiosk and through the back door along a Catmull-Rom path built from Blender waypoints (`path_side_left/right`, `path_door_out`, `path_door_in`); route choice is a pure, tested function.
- *Model:* a real street DVD spinner (`rack.py`): weighted round base, square column, sheet backing panels, pocket trays with wire lips, a four-sided «ВСЕ ПРОЕКТЫ» header; same `disc_*` positions. A 0.33 l can (`can.py`, unbranded «КОЛА») on the bin rim and on the counter. TV body in dark plastic.

**Tech Stack:** three.js r186, Blender 5.0 bpy, `@fontsource/pt-sans`, `pt-sans-narrow`, `pt-mono`, `node --test`.

Deviation from the earlier plans' format: this pass is a set of independent fixes, so the plan lists files, tests and decisions; code lives in the commits.

---

## Tasks

### Task 1: Look-around follows the mouse
- Modify `assets/js/kiosk/look.js`: horizontal drag adds to yaw (grab-the-world, same as the orbit outside).
- Test (`tests/kiosk-look.test.mjs`): dragging right turns the view so a point on the right moves towards the centre — `turnLook({yaw:0,pitch:0}, 100, 0).yaw > 0`.

### Task 2: Model fixes
- `scripts/kiosk/rack.py` (new): the spinner; `interior.py` stops building the rack.
- `scripts/kiosk/can.py` (new): `build_can(name, loc, rot_z, M)`; cans on the bin rim and on the counter; `street.py` drops `_cola`.
- `palette.py`: `tv_plastic` (near-black, satin) for the TV body and the DVD player.
- `kiosk.py`: path waypoints `path_side_left`, `path_side_right`, `path_door_out`, `path_door_in`.
- Test (`tests/kiosk-scene-file.test.mjs`): `rack_base`, `rack_panels`, `rack_header`, `cola_can_bin`, `cola_can_counter`, the four path nodes exist; no node or mesh is named after a real brand.

### Task 3: Routes and homography (pure)
- `assets/js/kiosk/routes.js`: `isInside(preset)`, `walkingRoute(fromPreset, toPreset, fromPosition, waypoints)` → ordered waypoint names.
- `assets/js/kiosk/quad.js`: `quadTransform(width, height, quad)` → 16 numbers of a CSS `matrix3d`.
- Tests: routes between outside/inside presets and on the same side; a quad maps the four element corners onto the four points.

### Task 4: Scene behaviour
- `scene.js`: path flights, perspective page during approach with occlusion check, snapshot/restore, `onEmptyClick` in close-ups, dark TV material handled by the model.
- `app.js`: store the snapshot when entering a close-up from a free view; empty click / back / Esc / ВЫКЛ return to it.

### Task 5: Period pages
- Fonts: `scripts/vendor-fonts.mjs` copies Cyrillic and Latin `woff2` subsets to `assets/fonts/pt/`; `@font-face` in `assets/css/fonts.css`; test that the files exist.
- `pages.js`: TV channel gets a DVD chapter menu (`data-action="tv-chapter"`), guide becomes Teletext 100, billboard gets the stamp, flyer gets tape, terminal gets its header bar; tests updated.
- `assets/css/screens.css` rewritten; chrome in `assets/css/kiosk.css` becomes paper labels.

### Task 6: Look at it
- Built-in browser pane (real GPU): home, rack, disc → TV walk, TV page, guide, billboard, flyer, terminal, inside drag direction, empty-click back; phone size.
