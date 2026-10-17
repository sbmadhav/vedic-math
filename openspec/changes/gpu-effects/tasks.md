# Tasks

Last of the three changes after the learnvedicmath.com move (owner M6), after `render-performance` and `duel-online`. "Verify:" says how a task is checked. Every code task keeps the node tests, the build, the byte budgets and the Playwright suite green.

## 0. Before building

- [ ] 0.1 Confirm `render-performance` (budgets, `life.observe`, `life.idle`, the paused Sky and background) and PR #47 (Mandala Studio) are archived; rebase onto `main`.
- [ ] 0.2 **[OWNER]** Answer the open questions in `design.md` (wallpaper source, twinkle layers replaced, Glow off by default).
- [ ] 0.3 Record a trace of the Sky, a confetti burst and the Moving background on the mid Android phone used for `docs/perf/baseline.md` (main-thread time per second for each). Verify: the numbers are in `docs/perf/baseline.md` under "Before gpu-effects".

## 1. Engine (D2, D3)

- [ ] 1.1 `js/gfx/caps.js` with `decide(env)` for every row of D3. Verify: `test/gfx-caps.test.mjs` covers each row and each setting change.
- [ ] 1.2 `js/gfx/gl.js`: compile, link, buffers, the instanced-quad pipeline and the full-screen pass; two shaders. Verify: unit tests for the pure parts (buffer layouts, matrix helpers); no `eval` or `new Function` (the CSP has no `unsafe-eval`).
- [ ] 1.3 `js/gfx/gfx-worker.js`: OffscreenCanvas, WebGL 2 with `failIfMajorPerformanceCaveat`, `ready` handshake, one frame loop, mount, unmount, pause, resume, stop, theme, resize messages, frame caps, the self-check, context loss. Started with `import.meta.resolve()`. Verify: `gfx.spec.ts` (chromium) reports `gl-worker`; a forced context loss (`WEBGL_lose_context` in a test build) recovers or falls back.
- [ ] 1.4 `js/gfx/gfx.js`: `backdrop()` and `celebrate()`, the decision, the 2D path, motion listeners, `life.observe` and `visibilitychange`, worker end after 60 s idle, `data-gfx` on `<html>`, `?gfx=2d|off` overrides (never stored). Verify: `lifecycle-scan.test.mjs` covers `js/gfx/`; `gfx.spec.ts` "Leaving the Sky" and "Nothing mounted" (with a shortened timeout in test builds).
- [ ] 1.5 Theme colors from tokens, re-sent on scheme change; node test fails on any hex literal in `js/gfx/`. Verify: `gfx.spec.ts` "Switching to Deep Space" compares two screenshots of the backdrop.
- [ ] 1.6 `build.py`: `js/gfx/` excluded from JS before play, the 20 KB decoration budget, precached with the Sky graph. Verify: `test/budget.test.mjs` fixture over 20 KB fails; the build table shows the gfx line.

## 2. Scenes

- [ ] 2.1 `scenes/burst.js` (confetti, star, belt, gold) with both renderers; `fx.confetti` and `star.js` use it; Belt and gold Medal call sites added. Remove the old 2D code. Verify: `gfx.spec.ts` checks a burst ends within 2 s and removes its canvas; the flash check from D10; existing confetti call sites still work (`practice.spec.ts`, `star.spec.ts`).
- [ ] 2.2 `scenes/sky.js`: starfield and nebula behind the SVG; the parallax moves into the scene; the two twinkle pattern layers and their CSS are removed; the suggested Star's pulse stays. Verify: `sky.spec.ts` (Stars and Landmarks are links with names; axe clean; paused off screen; still under reduced motion).
- [ ] 2.3 `scenes/ambient.js`: `js/ambient.js`'s drawings as line lists; `ambient.js` keeps the switch, music and notes. Verify: a screenshot of the still frame under reduced motion matches the 2D renderer within a small pixel difference; the Moving background switch still turns it off.
- [ ] 2.4 Check `requestAnimationFrame` in dedicated workers on WebKit and Firefox; fall back to a 33 ms timer in the worker where missing. Verify: `gfx.spec.ts` on the webkit project renders frames (or reports the 2D path) with no console errors.
- [ ] 2.5 `scenes/mandala.js` and Mandala Studio's Glow toggle (off by default, hidden when motion is off, off while editing); Save wallpaper unchanged. Verify: `play.spec.ts` "Saving with Glow on" compares the saved image bytes with Glow off and on.

## 3. Checks

- [ ] 3.1 `a11y.spec.ts`: axe with the backdrop and a celebration running; every gfx canvas is `aria-hidden` with no pointer events; buttons under a celebration stay clickable.
- [ ] 3.2 Lighthouse (from `render-performance`): budgets hold; TBT on `/play/` within 20 ms of `main`.
- [ ] 3.3 Repeat task 0.3's trace and add "After gpu-effects" to `docs/perf/baseline.md`. Verify: main-thread time per second for the Sky and the Moving background is lower on the gl-worker path.
- [ ] 3.4 **[OWNER]** Look at the Sky, a Belt burst and Mandala Glow on your phone and an older iPad in both color schemes; check Pause motion and Calm stop everything.

## 4. Close out

- [ ] 4.1 `CLAUDE.md`: "WebGL is for decoration only (ADR 0011)", the engine's files, the `?gfx` overrides. `GLOSSARY.md` Decoration entry is already in this change.
- [ ] 4.2 `openspec validate gpu-effects --strict`; archive with `/opsx:archive` after release.
