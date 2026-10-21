# Proposal

Status: plan only, not yet approved for implementation. The owner decisions it cites answer design questions; they do not approve this change, and merging this plan is not that approval.

Re-planned 2026-10-21 (`react-typescript` task 12.5, design D13 "How gpu-effects must be revised") for the stack the owner chose on 2026-10-19 (ADR 0013): three.js through React Three Fiber and drei, in `app/src/scenes-3d/`, browser only, on the main thread and paused when the tab is hidden (Q22). The first plan's hand-written engine (`js/gfx/`: `gfx.js`, `gl.js`, the two shaders, the OffscreenCanvas worker and the two-renderer scene format), its "no library" rule and its 20 KB budget are gone; the scenes count toward `react-typescript`'s 170 KB Brotli 3D budget and never enter a first load. The Sky backdrop moved to `react-typescript`, which ships the Sky as its first 3D scene (task 10.3). What stays is the owner's M4 rule (WebGL for decoration only, the UI stays HTML, off with Calm, Pause motion and reduced motion) and the scenes that come after the Sky, in the owner's order: Sutra deep-dive illustrations, then celebrations, the Moving background and Mandala glow. It is built last of the follow-on changes, so it assumes `react-typescript` is archived (every view is a React route module and `scenes-3d` is a live capability).

## Why

The owner wants the Sky, Sutra deep-dive illustrations, game effects and Mandala art to become 3D (ADR 0013), without making the app slower. `react-typescript` builds the 3D foundation (`Scene3D`, the chooser of `3d`, `still`, `2d` and `paused`, token colors, the 3D budget and its build checks) and the Sky. Everything else is still 2D on the main thread: the Moving background (`js/ambient.js`) paints a full-screen 2D canvas up to 30 times a second, the big confetti of `js/celebrate.js` (the `celebrations` change) is a 2D canvas of rectangles, the Star burst in `js/star.js` is a small 2D canvas, the Sutra deep dives have text and Worked examples but no picture, and Mandala Studio (`js/play/exp/art.js`) draws flat. The owner decided (2026-10-17, M4, accepted; revised by ADR 0013 on 2026-10-19):

- WebGL only for decoration; the UI stays HTML;
- off with Calm, Pause motion and reduced motion;
- three.js through React Three Fiber, bundled from our own origin, loaded late, on the main thread, paused when hidden;
- the order: the Sky (in `react-typescript`), then Sutra deep-dive illustrations, then game effects and Mandala.

## What Changes

- **No engine of our own.** Every scene is a React Three Fiber component in `app/src/scenes-3d/`, mounted through `react-typescript`'s `Scene3D` host, which already chooses `3d`, `still`, `2d` or `paused`, reports it as `data-scene`, takes colors from the tokens and frees GPU resources on unmount. This change adds scenes and the rules each needs; it does not change `Scene3D`'s chooser except to add context loss (below).
- **Scenes, in the owner's order:**
  - **Sutra deep-dive illustrations:** a small, slowly turning 3D picture at the top of a Deep dive, of the idea the Sutra's first Worked example uses (for Ekādhikena Pūrveṇa, 25² as 625 dots: 2 × 3 = 6 blocks of a hundred, then the 25 from 5 × 5). It carries nothing the Worked examples do not already say in text. The Deep dive page is prerendered (`react-typescript` Q20), so the server writes only the illustration's host with its space reserved; the still SVG of the same picture is drawn in the browser after start-up, and the 3D scene fades in after that.
  - **Celebrations:** the big confetti (`celebrate.confetti`, for true wins only, as the `celebrations` change sorted them), the Star burst, and a new Belt and gold Medal burst, at most 2 seconds each. The call sites stay; `confetti`'s body chooses the 3D scene when it is loaded and allowed, and today's 2D confetti otherwise. The small helpers (`sparkle`, `pop`, `bounce` and the rest) stay CSS and SVG.
  - **Moving background:** the drawings of `js/ambient.js` (Śulba ropes, Meru-prastāra, the nakshatra wheel, drifting numerals) as 3D lines with slow depth and parallax. The setting, the music and `BG_NOTES` stay where they are; today's 2D canvas is the fallback.
  - **Mandala glow:** Mandala Studio gains a "Glow" toggle (off by default, hidden when motion is off or WebGL is missing) that shows the Player's mandala turning slowly with an additive glow. Drawing, editing and the saved wallpaper stay on the existing 2D code, so a saved picture is the same on every device.
- **No 3D during a round** (`react-typescript` D13): a celebration starts only after a round's last answer is checked, and the Moving background holds still while a round is in play (the rule `render-performance` sets for the 2D background moves to the scene).
- **Context loss:** a lost WebGL context that does not come back within 3 seconds switches that scene to its 2D drawing for the rest of the page; the view keeps working.
- **Never in the way:** every scene canvas is `aria-hidden` with no pointer events, never covers a control's hit area, never flashes more than three times a second, and stops with its page.
- **Budget:** every scene is its own dynamic `import()`, so a route downloads only the scenes it shows; all 3D code together stays within `react-typescript`'s 170 KB Brotli 3D budget (the Sky spike, task 10.1, records how much is left). Going over goes back to the owner (ADR 0013).

## Out of scope

- Any UI, text, button, question or game drawn in WebGL (ADR 0011).
- The Sky in 3D, `Scene3D`, the chooser, the 3D budget and its build checks: `react-typescript` (`scenes-3d`, `performance-budget`, tasks 10.1 to 10.3).
- WebGPU (three.js can add it later if measured worthwhile).
- An OffscreenCanvas worker (superseded by Q22: main thread, paused when hidden).
- Physics, sound, and changing what Mandala Studio teaches or saves.

## Modes and Players affected

Every Mode and every Player whose device allows motion. Explorer, Challenger and Pro get the same scenes; celebration size follows the existing call sites (a Belt is bigger than a Star burst). Players with reduced motion, Pause motion or Calm see a still frame or nothing moving, as today, and the messages that go with a win are shown and announced as before. Nothing is sent or stored except the existing Moving background setting and Mandala Studio's Glow toggle on the device; `parentNote()` does not change.

## Capabilities

### New Capabilities

None. The scenes are requirements on `scenes-3d`, which `react-typescript` adds.

### Modified Capabilities

- `scenes-3d` (added by `react-typescript`): ADDED "Sutra deep-dive illustrations", "The Deep dive illustration appears without a shift", "Celebrations in 3D", "The Moving background in 3D", "Mandala glow never changes the wallpaper", "No 3D during a round", "A lost context falls back to 2D" and "Every scene follows the 3D rules".
- `view-lifecycle`: ADDED "A celebration stops with its page".
- `accessibility`: ADDED "Decoration never flashes or hides content".
- `performance-budget` (added by `react-typescript`): ADDED "Every scene loads on its own inside the 3D budget".

ADR 0011 (WebGL limited to decoration, revised 2026-10-21) and ADR 0013 (three.js for 3D decoration).

## Impact

- New `app/src/scenes-3d/` scenes: `SutraIllustration.tsx` (with its still SVG), `Celebration.tsx` (confetti, star, belt, gold), `MovingBackground.tsx`, `MandalaGlow.tsx`; `Scene3D.tsx` gains context-loss handling.
- The React celebration module (today's `js/celebrate.js`, `confetti`), the Star burst, the Belt and gold Medal call sites, the Moving background (today's `js/ambient.js`: the drawing moves to the scene, the setting and music stay), the Deep dive route (the illustration host) and Mandala Studio (the Glow toggle).
- Tests: Vitest for each scene's pure parts (line lists, particle counts, the context-loss timer), `app/src/scenes-3d/` under the lifecycle lint, Playwright `e2e/tests/scenes-3d.spec.ts` (new scenarios per scene), `sutra-modal.spec.ts`, `a11y.spec.ts`, `play.spec.ts` ("Saving with Glow on"), `offline.spec.ts`, and one cov spec per new scenario in `e2e/tests/cov/`.
- Docs: ADR 0011 (revised), `GLOSSARY.md` (Decoration, 3D scene), `docs/agent/` (the scenes).
