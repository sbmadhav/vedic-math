# Proposal

Status: plan only, not yet approved for implementation. The owner decisions it cites answer design questions; they do not approve this change, and merging this plan is not that approval.

Superseded in part (owner, 2026-10-19): three.js through React Three Fiber (`react-typescript`, ADR 0013) supersedes this plan's "no three.js", its 20 KB budget (now 170 KB Brotli for the 3D code) and its OffscreenCanvas worker (3D renders on the main thread and pauses when the tab is hidden). The Sky ships in `react-typescript` as the first 3D scene. This change is re-planned for React before it is built (`react-typescript` task 12.5), last of the follow-on changes. This text is not revised for that yet.

## Why

The app's decoration is drawn on the main thread today: the moving background (`js/ambient.js`) paints a full-screen 2D canvas up to 30 times a second, confetti (`fx.confetti`) and Star bursts (`js/star.js`) are 2D canvases with hundreds of shapes, and the Sky twinkles with SVG opacity animations. On a mid Android phone that work competes with taps and timers during play. The owner wants the Sky, celebrations and Mandala art to feel richer without making the app slower, and decided (2026-10-17, M4, accepted):

- WebGL only for decoration (the Sky, celebrations, Mandala art);
- in an OffscreenCanvas worker where supported, with a canvas 2D fallback;
- off with Calm, Pause motion and reduced motion;
- the UI stays HTML.

This is the last of the three changes after the learnvedicmath.com move (M6), built after `render-performance` (which already pauses unseen work and holds the background still during rounds) and `duel-online`.

## What Changes

- **One small decoration engine**, `js/gfx/`, with no library: a main-thread front (`gfx.js`) that decides how to draw, a module worker (`gfx-worker.js`) that renders WebGL 2 on an OffscreenCanvas, a canvas 2D renderer for the fallback, and one file per scene with both renderers.
- **Scenes:**
  - **Sky backdrop:** a starfield and soft nebula behind the SVG Sky, with slow drift and twinkle. It replaces the two SVG twinkle layers; Stars, lines, names, Bolt and Landmarks stay SVG and HTML links.
  - **Moving background:** `js/ambient.js`'s drawings (Śulba ropes, Meru-prastāra, the nakshatra wheel, drifting numerals) move into the engine, so they are drawn off the main thread where possible.
  - **Celebrations:** confetti, the Star burst, and a new Belt and gold Medal burst, all short (at most 2 seconds), replacing the 2D code in `fx.js` and `star.js`.
  - **Mandala art:** Mandala Studio (PR #47) gains a glowing, slowly turning view of the Player's mandala; drawing, editing and the saved wallpaper stay on the existing 2D code, so a saved picture is the same on every device.
- **Deciding how to draw**, in order: nothing (static) when motion is off; WebGL 2 in a worker when OffscreenCanvas, module workers and a hardware WebGL 2 context are available; canvas 2D on the main thread otherwise (fewer particles, 30 frames a second); a static frame if even that is too slow.
- **Off with Calm, Pause motion and reduced motion,** at once and after a reload: the backdrop shows one still frame, celebrations do not run (the existing announcements still do).
- **Never in the way:** decoration is `aria-hidden`, takes no pointer events, carries no information, never flashes more than three times a second, pauses when off screen or the tab is hidden, holds still during rounds, and lowers its own quality (then stops) when frames run slow. It loads after the first view and idle time, and has its own byte budget (20 KB compressed).
- **Theme-aware:** colors come from the design tokens (Daybreak and Deep Space), read on the main thread and sent to the worker; no raw hex in shaders.

## Out of scope

- Any UI, text, button, question or game drawn in WebGL (ADR 0011).
- WebGPU (a later change may add it behind the same engine if measured worthwhile).
- 3D, physics, or a library such as three.js or PixiJS. (Superseded by `react-typescript` and ADR 0013, owner 2026-10-19: three.js through React Three Fiber, 170 KB Brotli, main thread.)
- Changing what Mandala Studio teaches or saves.
- Sound.

## Modes and Players affected

Every Mode and every Player whose device allows motion. Explorer, Challenger and Pro get the same scenes; celebration size follows the existing call sites (a Belt is bigger than a combo). Players with reduced motion, Pause motion or Calm see no moving decoration, as today. Nothing is sent or stored except the existing Moving background setting; `parentNote()` does not change.

## Capabilities

### New Capabilities

- `decoration-effects`: what may be drawn with WebGL, how the renderer is chosen, motion settings, pausing, quality, theming, accessibility, context loss and its byte budget.

### Modified Capabilities

- `view-lifecycle`: ADDED "Decoration stops with its page".
- `accessibility`: ADDED "Decoration never flashes or hides content".
- `performance-budget` (added by `render-performance`): ADDED "Decoration has its own budget".

ADR 0011 (WebGL limited to decoration). Numbers follow `learnvedicmath` (0004 to 0006), `placement` (0007, 0008) and `duel-online` (0009, 0010).

## Impact

- New `js/gfx/` (`gfx.js`, `gfx-worker.js`, `gl.js`, `caps.js`, `scenes/sky.js`, `scenes/ambient.js`, `scenes/burst.js`, `scenes/mandala.js`).
- `js/fx.js` (`confetti` calls `gfx.celebrate`), `js/star.js` (burst), `js/sky-view.js` and `math.css` (the backdrop canvas replaces the twinkle layers), `js/ambient.js` (drawing moves to the scene; settings and music stay), `js/play/exp/art.js` (the glow view).
- `build.py`: the gfx modules are lazy (not in JS before play), the worker is started with `import.meta.resolve()` so it gets its stamp, and the decoration budget.
- Tests: `test/gfx-caps.test.mjs`, `test/gfx-scenes.test.mjs`, `test/lifecycle-scan.test.mjs` (covers `js/gfx/`), Playwright `e2e/tests/gfx.spec.ts`, `sky.spec.ts`, `a11y.spec.ts`, `offline.spec.ts` (the gfx files are saved for offline with the Sky).
- Docs: `docs/adr/0011`, `GLOSSARY.md` (Decoration), `CLAUDE.md` (the WebGL rule).
