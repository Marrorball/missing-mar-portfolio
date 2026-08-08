# Y2K Landscape Portfolio Redesign

## Status

Approved visual direction: the revised first concept from the 2026-08-09 ideation set, including the personal profile card and final copy.

Final reference image: [assets/y2k-landscape-selected-reference-v2.png](assets/y2k-landscape-selected-reference-v2.png)

Profile source image: [assets/missing-mar-profile-source.jpg](assets/missing-mar-profile-source.jpg)

## Goal

Redesign the portfolio as a memorable Y2K digital landscape while keeping it easy to understand and easy for Marat to edit without touching code.

The site should feel like an authored digital world rather than a conventional landing page. The first screen is a single cinematic scene with a clear project selector, not a split hero and not a grid of cards.

## Brand and visual direction

- Primary identity: `missing mar`.
- Secondary identity on the same line: `/ Марат Дреев`.
- Role: `Product & Visual Designer`.
- Core palette: cobalt sky, vivid grass green, silver chrome, white, acid lime.
- Supporting effects: subtle CRT scanlines, restrained pixel details, cool blue glow, soft photographic grain.
- Main decorative language: one large liquid-metal star/blob, a few smaller chrome objects, and project imagery placed inside the landscape.
- Keep the current pixel cursor as the only direct Windows XP reference.
- Remove XP windows, taskbar, startup flow, desktop icons, and other operating-system imitation.

## Home screen

The first desktop viewport is a full-screen landscape.

1. A compact navigation line sits across the top: `Проекты`, `Обо мне`, `Контакт`.
2. The identity lockup sits in the upper-left. `missing mar` is large and distinctive; `/ Марат Дреев` is smaller and aligned on the same baseline.
3. A large chrome sculpture occupies the center without blocking the main controls.
4. A personal editorial profile card sits in the lower-left and introduces Marat rather than a specific project.
5. A vertical project selector sits on the right. It shows exactly three featured projects with an obvious active state.
6. The primary action under the selector is `Открыть проект →`.
7. A visible `Все проекты — N` action scrolls to the complete archive directly below the first screen.

The homepage initially selects the first featured project. Hovering or focusing another project previews it; clicking selects it. Clicking the active project or the primary action opens the case study.

The header is driven by published Pages CMS pages. `Проекты` stays fixed, the first two navigation pages appear as text links, and the grid control opens the complete page menu when more pages exist. Adding or deleting a page in Pages CMS therefore updates the site navigation without code changes.

## Personal profile card

The lower-left card uses Marat's approved red-outfit photograph, zoomed out to show the pose, clothing, legs, shoes, bag, and surrounding concrete. The photograph keeps the playful upside-down orientation from the reference. The face remains recognizable but occupies no more than roughly 20% of the card.

The card copy is fixed as:

- `WHERE'S MISSING MAR?`
- `I DESIGN CLEAR SYSTEMS`
- `WITH A STRANGE EDGE.`
- `PRODUCT & VISUAL DESIGNER`
- `МОСКВА · 2026`
- `ОБО МНЕ ↗`

The card links to the About view. It may use a subtle scan/halftone hover treatment, but the photograph and text must remain readable.

## Project content

The existing project content remains the source of truth. The Pages CMS panel continues to control projects, pages, resume, contacts, and site text.

Projects gain editable presentation fields:

- `featured`: whether the project appears in the three-item home selector;
- `featuredOrder`: position in that selector;
- `cover`: the main preview image;
- `accent`: the small active-state color;
- `shortLabel`: an optional compact title for the selector.

If more than three projects are marked as featured, the first three by `featuredOrder` are used. If fewer than three are marked, the remaining slots are filled by published projects in their normal order.

Adding or deleting a project in the visual editor updates the site automatically. Missing optional imagery falls back to a neutral project treatment rather than breaking the layout.

## Project archive

The complete archive begins immediately below the cinematic first screen. `Проекты` and `Все проекты — N` scroll directly to it, so the remaining work is visible without opening a hidden route or modal.

- The archive uses a clean numbered list with large project titles, year, category, and one preview image for the active row.
- It does not use a three-column card grid.
- Category filters remain available as compact text controls.
- Keyboard focus, hover, and selection states are visually distinct.
- Every published project appears here automatically, including the three featured projects.
- Hovering or focusing a row updates the shared large preview; clicking opens its case study.

## Case-study view

Each project opens as a full-page editorial case study rather than an XP window.

- The header contains the project title, summary, year, tags, external link, and cover.
- Existing editable project sections render in their saved order.
- Section navigation becomes a sticky text index on desktop and a compact horizontal list on mobile.
- Images keep their natural aspect ratio and can span the content width.
- A clear back action returns to the project archive or the previous home selection.

Existing project HTML content remains supported during the redesign so current cases do not need to be rewritten immediately.

## About and contact

`Обо мне` and `Контакт` open as focused full-screen panels with the landscape dimmed behind them.

- About shows the existing bio, experience, location, tools, and resume content.
- Contact shows email, Telegram, and Behance as clear text links.
- Both panels have an obvious close/back action and work with the browser back button.

Any additional published CMS page opens in the same focused panel pattern and renders its authored rich content. A page-level `showInNavigation` switch controls whether it appears in the header/page menu.

## Motion and interaction

- The chrome sculpture has a very slow pointer parallax and a small idle drift.
- Smaller chrome objects move at different depths to make the landscape feel dimensional.
- Switching projects crossfades the preview image and moves the active marker.
- Panels and case studies use short, direct transitions; no long intro animation blocks access to content.
- `prefers-reduced-motion` disables parallax, drift, and animated transitions.

## Responsive behavior

Desktop remains the primary art-directed layout.

On mobile:

- the identity and navigation remain at the top;
- the chrome sculpture becomes smaller and moves behind the content;
- the project selector becomes a horizontal three-item rail near the bottom;
- the selected project preview remains visible as one large image;
- all actions keep at least a 44px touch target;
- no essential text or control is hidden behind decorative objects.

## Asset strategy

The final page will not use the concept screenshot as a flattened background. It will be recreated from separate assets so navigation, project selection, motion, and responsive layout remain real.

Required assets:

- sky-and-grass background plate;
- large transparent chrome sculpture;
- two or three smaller chrome objects;
- project cover images supplied by the CMS;
- optional scanline/noise texture.

Generated decorative assets must share the reference's cold chrome, cobalt sky, natural grass, and acid-lime accent. They will be stored inside the repository rather than referenced from temporary generation paths.

## Technical approach

- Keep the existing static HTML, CSS, JavaScript modules, JSON content, GitHub Pages deployment, and Pages CMS workflow.
- Replace the XP-specific rendering layer with view modules for home, archive, project, about, and contact.
- Keep content loading and validation isolated from the visual layer.
- Use URL hash/history state so project and panel views can be linked and the browser back button works.
- Update the Pages CMS configuration and content validation for the new optional presentation fields.
- Preserve safe URL handling and HTML escaping already used by the current renderer.

## Accessibility and failure states

- All interactive elements work with keyboard navigation and visible focus states.
- Text and controls keep readable contrast against the photographic background.
- Decorative images use empty alternative text; project covers use project titles.
- If content cannot load, show a readable error panel with a retry action.
- If a decorative asset fails, the page remains navigable on the base sky/grass background.

## Verification

- Existing content and CMS tests continue to pass after schema updates.
- Add tests for featured-project selection, fallback ordering, route state, safe links, and missing cover behavior.
- Verify the selected desktop reference at 1440 x 1024.
- Verify mobile at 390 x 844.
- Test project selection, opening a case, browser back, archive filters, about, contact, keyboard navigation, and reduced motion.
- Complete visual comparison against the selected reference before handoff.

## Out of scope for this redesign

- Authentication or a custom backend admin panel.
- Replacing Pages CMS.
- A return to draggable XP windows or a simulated desktop.
- Heavy 3D/WebGL that would make the portfolio slow or fragile.
- Publishing the redesign before Marat approves the local result.
