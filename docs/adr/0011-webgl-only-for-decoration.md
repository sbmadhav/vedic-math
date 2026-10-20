# WebGL only for decoration

The Sky, the Moving background, celebrations and Mandala art should look richer without slowing play on mid-range phones. We draw them with WebGL 2, in an OffscreenCanvas module worker where the browser supports it, with a canvas 2D fallback on the main thread, and nothing moving under reduced motion, Pause motion or Calm. WebGL is used only for decoration: pictures that carry no information, take no input and can disappear without anything being lost. Every question, answer, Star, Landmark, name, score, timer and control stays HTML, SVG or canvas 2D, and every canvas the engine draws is hidden from assistive technology and takes no pointer input.

Status: proposed 2026-10-17 in the `gpu-effects` change (owner decision M4, accepted). Partly superseded by ADR 0013 (owner, 2026-10-19): three.js through React Three Fiber replaces the "no library" choice, the 20 KB budget (now 170 KB Brotli for the 3D code) and the OffscreenCanvas worker (3D renders on the main thread and pauses when the tab is hidden). The rule that WebGL is decoration only, never interface, stands. `react-typescript` is approved for implementation (owner, 2026-10-19; work starts once the `learnvedicmath` move is live); `gpu-effects` is not yet approved for implementation, and is re-planned first (`react-typescript` task 11.4).

## Considered Options

- **Interface in WebGL or a canvas engine (game-style UI):** smooth and uniform, but text, focus, screen readers, zoom, translation and form controls would all have to be rebuilt, and accessibility is a hard requirement of this app.
- **A library (three.js, PixiJS):** faster to write, but 40 to 150 KB compressed for what two shaders and instanced quads do; the decoration budget is 20 KB.
- **WebGPU:** the better API, but not yet everywhere the app runs (older iPads, many Android WebViews); it can be added behind the same engine later.
- **Keep everything in canvas 2D and SVG:** simplest, but full-screen 2D drawing on the main thread is what competes with taps today.

## Consequences

- One engine (`js/gfx/`) with two renderers per scene; a scene that cannot run well drops to 2D or a still frame by itself.
- Any future proposal to draw interface in WebGL needs a new ADR that supersedes this one.
- Mandala Studio's saved wallpapers keep coming from the 2D drawing, so they look the same on every device.
- The decoration code has its own byte budget and never loads before the first view.
