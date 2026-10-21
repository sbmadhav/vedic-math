# WebGL only for decoration

The Sky, Sutra deep-dive illustrations, the Moving background, celebrations and Mandala art should look richer without slowing play on mid-range phones. WebGL is used only for decoration: pictures that carry no information, take no input and can disappear without anything being lost. Every question, answer, Star, Landmark, name, score, timer and control stays HTML, SVG or canvas 2D, and every WebGL canvas is hidden from assistive technology and takes no pointer input. How the decoration is drawn is ADR 0013: 3D scenes with three.js through React Three Fiber in `app/src/scenes-3d/`, browser only, on the main thread, paused when the tab is hidden, with a still frame under reduced motion, Pause motion or Calm and the 2D drawing when WebGL is missing or too slow.

Status: proposed 2026-10-17 in the `gpu-effects` change (owner decision M4, accepted). Partly superseded by ADR 0013 (owner, 2026-10-19): three.js through React Three Fiber replaces the "no library" choice and the hand-written `js/gfx/` engine, the 170 KB Brotli 3D budget replaces the 20 KB decoration budget, and main-thread rendering that pauses when the tab is hidden (Q22) replaces the OffscreenCanvas worker. The rule that WebGL is decoration only, never interface, stands. Revised 2026-10-21 (`react-typescript` task 12.5) to read as the rule that is in force; the first version's engine is kept below only as history. `gpu-effects` was re-planned onto `app/src/scenes-3d/` the same day; it is not yet approved for implementation.

## Considered Options

- **Interface in WebGL or a canvas engine (game-style UI):** smooth and uniform, but text, focus, screen readers, zoom, translation and form controls would all have to be rebuilt, and accessibility is a hard requirement of this app.
- **A library (three.js, PixiJS):** rejected in the first version as 40 to 150 KB compressed for what two shaders and instanced quads do. Since chosen by ADR 0013 (three.js through React Three Fiber), because the owner wants real 3D, which a hand-written engine cannot do without a lot of code nobody else knows.
- **A hand-written WebGL 2 engine in an OffscreenCanvas worker (`js/gfx/`, the first version):** about 20 KB and off the main thread, but 2D-style particles only and two renderers per scene to keep alike. Superseded by ADR 0013.
- **WebGPU:** the better API, but not yet everywhere the app runs (older iPads, many Android WebViews); three.js can add it later without changing this rule.
- **Keep everything in canvas 2D and SVG:** simplest, but it cannot do the depth the owner asked for. It stays as the fallback for every scene.

## Consequences

- Decoration is a 3D scene in `app/src/scenes-3d/` (ADR 0013). A scene that cannot run well drops to the 2D drawing or a still frame by itself.
- Any future proposal to draw interface in WebGL needs a new ADR that supersedes this one.
- Mandala Studio's saved wallpapers keep coming from the 2D drawing, so they look the same on every device.
- The decoration code counts toward the 170 KB Brotli 3D budget and never enters a first load (ADR 0013, `react-typescript` performance-budget spec).
