# Design

## Context

- Decoration today, all on the main thread:
  - `js/ambient.js`: the Moving background, a full-screen 2D canvas (`.vm-bg`) at up to 30 frames a second, device-pixel ratio up to 2, drawn with strokes (Śulba constructions, Meru-prastāra, the nakshatra wheel, Brahmi-style numerals, laghu and guru marks). It stops when the tab is hidden and draws one still frame under no motion. After `render-performance` it starts after idle, holds still during rounds and caps its pixel ratio.
  - `fx.confetti(n)`: a full-window 2D canvas with `n` rectangles for 110 frames, on bare `requestAnimationFrame`; skipped under no motion.
  - `js/star.js`: a 45-frame particle burst on a small canvas over the Star stage.
  - The Sky (`js/sky-view.js`): SVG, with two full-size pattern layers whose opacity twinkles forever, a pulse on the suggested Star and parallax on pointer and scroll. After `render-performance` it pauses off screen.
  - Mandala Studio (PR #47, `js/play/exp/art.js`, `art-draw.js`): canvas 2D drawing of times-table mandalas, Meru-prastāra in color and Śulba rope geometry; "save a wallpaper" exports the 2D canvas.
- `fx.noMotion()` is true under reduced motion, Pause motion (`html.motion-paused`) or Calm; `sitemotion` and `vmcalm` events announce changes.
- Browser support in October 2026: OffscreenCanvas with WebGL 2 in workers is in Chrome and Edge, Firefox, and Safari 17 and later. `requestAnimationFrame` in dedicated workers is in Chrome, Firefox and Safari 16.4 and later (to verify per engine, task 2.4). Module workers are everywhere the app runs.

## Goals

- Decoration that looks better and costs the main thread almost nothing during play.
- One engine, two renderers (WebGL 2 in a worker, canvas 2D), the same scene parameters for both.
- Motion settings, pausing and lifecycle rules exactly as strict as today.
- Small: no library, the whole engine within 20 KB compressed.

## Non-goals

- Any interface in WebGL, WebGPU, 3D, a graphics library.

## Decisions

### D1. What may use WebGL (ADR 0011)

Only decoration: pictures that carry no information, take no input and can disappear without anything being lost. Concretely: the Sky backdrop, the Moving background, celebrations, and Mandala Studio's glow view. Everything a Player reads, taps or needs to understand (questions, answers, Stars, Landmarks, names, scores, timers, Mandala Studio's controls and its drawing canvas) stays HTML, SVG or canvas 2D. A canvas the engine draws is always `aria-hidden="true"`, has `pointer-events: none` and sits behind or above the UI without covering any control's hit area.

### D2. The engine

```text
js/gfx/
  gfx.js          main thread: backdrop(host, scene, params, { signal }), celebrate(kind, opts), settings and caps
  caps.js         pure: decide(env) -> 'none' | 'gl-worker' | '2d' | 'still'   (tested in node)
  gfx-worker.js   module worker: OffscreenCanvas + WebGL 2, one frame loop for all mounted scenes
  gl.js           tiny WebGL 2 helpers: compile, link, buffers, one instanced-quad pipeline, blending
  scenes/sky.js       starfield + nebula     { gl: {...}, d2: {...} }
  scenes/ambient.js   the Moving background drawings
  scenes/burst.js     confetti, Star burst, Belt and Medal burst
  scenes/mandala.js   glow view of a mandala (takes the line list Mandala Studio already computes)
```

- Each scene module exports the same parameters for both renderers: `{ init(ctx, params), frame(ctx, t, dt), resize(ctx, w, h, dpr), theme(ctx, colors) }`, one object for WebGL 2 (`gl`) and one for canvas 2D (`d2`). The worker imports only the `gl` halves, the main thread only the `d2` halves, so each side loads what it uses.
- Everything is drawn with one pipeline: instanced textured quads (points, soft dots, line segments as thin quads, confetti) plus one full-screen pass for the nebula and the glow. Two shaders in all, written as strings in `gl.js` (no `eval`; the CSP needs nothing new).
- **One worker per page**, started lazily on the first mount with `new Worker(import.meta.resolve('./gfx-worker.js'), { type: 'module' })`, so it gets its `?v=` stamp (CLAUDE.md offline rule). Scenes mount and unmount by message; the worker stops its frame loop when nothing is mounted and is terminated after 60 seconds with nothing mounted.
- Canvases are handed over with `transferControlToOffscreen()`. A canvas that was transferred cannot go back, so the 2D fallback after a failure (D6) makes a new canvas element.

### D3. Choosing how to draw (`caps.decide`)

In order, re-evaluated whenever a setting changes:

1. `fx.noMotion()` (reduced motion, Pause motion, Calm): **none** for celebrations; **still** for the backdrop and the Moving background (one frame drawn with the 2D renderer, then nothing).
2. Moving background switched off: nothing for that scene.
3. Save-Data on, or `navigator.deviceMemory` at most 2: **still** (one 2D frame).
4. `OffscreenCanvas`, `HTMLCanvasElement.prototype.transferControlToOffscreen` and module workers present, and the worker reports a WebGL 2 context created with `failIfMajorPerformanceCaveat: true` (refuses software rendering such as SwiftShader): **gl-worker**.
5. Otherwise **2d** on the main thread, with half the particles, 30 frames a second, pixel ratio at most 1.5.

The decision is cached for the page in memory (not in storage) and exposed as `data-gfx` on `<html>` for tests.

### D4. Motion settings and pausing

- `gfx.js` listens (through `js/life.js`, on the app's root signal) to the reduced-motion media query, `sitemotion` (Pause motion) and `vmcalm` (Calm). Turning motion off stops every running scene at once: the worker gets `stop` and draws one still frame of the backdrop, celebrations in flight are removed. Turning it back on resumes.
- Off screen or hidden: each backdrop host is watched with `life.observe` (IntersectionObserver, from `render-performance`) and `visibilitychange`; the worker gets `pause` and `resume` per scene.
- During rounds: the Sky is not on screen during a round, and the Moving background holds still while the game shell is open (`render-performance` D9); the engine keeps that rule.
- Celebrations never start under no motion. The text or status line that goes with them (a toast, a screen reader message) is unchanged.

### D5. Quality and frame budget

- Frame caps: 30 frames a second for the backdrop and the Moving background, 60 for celebrations.
- Pixel ratio: at most 2 on a fine pointer, 1.5 on touch, 1 when `deviceMemory` is 4 or less.
- Self-check: the worker measures each frame's time. If the average over 2 seconds is above 20 ms, it halves particle counts and the pixel ratio; if it is still above 20 ms after another 2 seconds, the scene goes **still** for the rest of the page. On the 2D renderer the same rule runs on the main thread, measured with `performance.now()`.
- Celebration sizes: confetti up to 150 pieces (WebGL) or 60 (2D), at most 2 seconds. The existing `confetti(n)` call sites map to small (n under 50), medium (50 to 90) and large (over 90).

### D6. Context loss and failures

- `webglcontextlost` in the worker: stop, wait for `webglcontextrestored` for 3 seconds, rebuild buffers and continue; if it does not come back, tell the main thread, which switches that page to **2d** with new canvases.
- A worker that fails to start, throws, or does not answer `ready` within 2 seconds: **2d** for the page.
- Any error inside a scene is caught and that scene is unmounted; decoration never breaks a view.

### D7. Theming

`gfx.js` reads the colors it needs from CSS custom properties on `<body>` (`--coral`, `--teal`, `--sun`, `--sky`, `--plum`, `--ink`, `--paper`, and the Sky's own tokens in `math.css`) with `getComputedStyle`, converts them to linear RGB and sends them to the worker. It sends them again when the color scheme changes (the theme button, the system scheme, the saved override). Shaders take colors only as uniforms; a node test fails on any hex color literal in `js/gfx/`.

### D8. The scenes

- **Sky backdrop:** a canvas behind the Sky's SVG inside `.sky-frame`, the same size as the SVG viewBox on screen. About 600 stars in three depth layers (replacing the three SVG pattern layers and their twinkle), a soft nebula in the Constellation colors, slow drift, and the pointer and scroll parallax moved from SVG transforms into the scene's uniforms. The suggested Star's pulse stays in SVG (it marks something). In **still**, one frame is drawn and the SVG is unchanged.
- **Moving background:** the drawings of `js/ambient.js` move to `scenes/ambient.js` as line lists (the same strokes), drawn as thin quads. `ambient.js` keeps the setting, the music and `BG_NOTES`, and calls `gfx.backdrop(document.body, 'ambient', ...)`.
- **Celebrations:** `fx.confetti(n)` becomes a thin wrapper over `gfx.celebrate('confetti', { size })`; `star.js` calls `gfx.celebrate('star', { at: rect })`; a Belt earned and a gold Medal call `gfx.celebrate('belt' | 'gold')`. A full-window overlay canvas is created per burst and removed after it (or reused if one is running).
- **Mandala glow:** in Mandala Studio, a "Glow" toggle (off by default; hidden when motion is off) shows the current mandala's lines turning slowly with an additive glow, on a canvas over the 2D drawing canvas. The 2D canvas stays the source of truth: editing switches Glow off, and Save wallpaper always exports the 2D drawing.

### D9. Loading, offline and the budget

- `js/gfx/` is never in the entry graph or a route's static graph. `gfx.js` is imported at idle after the first view (or on the first celebration), and the worker and scenes load when first needed. They are not counted in "JS before play"; they have their own budget (performance-budget delta): all of `js/gfx/` together at most 20 KB Brotli.
- Offline: `js/gfx/*` are precached with the Sky's graph (they are small), so the Sky backdrop works offline after one visit.
- No new origin, no new CSP source (`worker-src 'self'` already).

### D10. Testing

- Node: `caps.decide` for every row of D3; scene math (particle counts, sizes, the quality step-down) with a fake clock; no hex literals in `js/gfx/`.
- Playwright (`e2e/tests/gfx.spec.ts`): chromium gets `data-gfx="gl-worker"` on the Sky; with `reducedMotion: 'reduce'` it is `none`/still and no worker starts; Calm and Pause motion turn it off live; hiding the page (`page.evaluate` dispatching visibility, or a second tab) stops the frame counter the worker reports in test builds (`data-gfx-frames`, updated every second only when `?gfxdebug=1`); leaving the Sky terminates the scene (no frames after the route change); WebKit and the mobile project record whichever path they get and check it renders without errors; a forced WebGL failure (`?gfx=2d`) shows the 2D path.
- Accessibility: axe runs with the backdrop on; a test checks every gfx canvas is `aria-hidden` and has `pointer-events: none`; a celebration's frames are checked for flashes (no more than three luminance swings above 10% of the screen per second, measured from screenshots at 10 frames a second in a test build).
- Performance: the `render-performance` Lighthouse budgets hold with gfx on (TBT must not grow by more than 20 ms on `/play/`); a manual trace on the mid Android phone shows the main thread idle during the Sky backdrop on the gl-worker path.

## Risks and trade-offs

- **GPU driver bugs on old Android phones.** `failIfMajorPerformanceCaveat`, the self-check and context-loss handling fall back to 2D or still; decoration is optional by definition.
- **Two renderers to keep alike.** Scenes share parameters and a node test renders both renderers' particle state to the same numbers; small visual differences between them are accepted.
- **Battery.** Frame caps, pausing when unseen and the self-check limit it; the Moving background switch still turns it off.
- **More code for decoration.** Held to 20 KB by the budget.

## Migration plan

Engine and `caps` first, behind `?gfx=on` (tasks 1 to 2); then celebrations (smallest, short-lived), the Sky backdrop, the Moving background, and the Mandala glow, each replacing the old code in the same commit. Rollback per scene is a revert; `?gfx=2d` and `?gfx=off` stay as debugging overrides (never stored).

## Open questions (defaults used in this change)

1. Mandala Studio's saved wallpapers stay on the 2D renderer so they look the same everywhere: default yes.
2. The Sky's twinkle layers are replaced by the WebGL backdrop (the SVG keeps everything that carries meaning): default yes.
3. Glow in Mandala Studio is off by default: default yes.
