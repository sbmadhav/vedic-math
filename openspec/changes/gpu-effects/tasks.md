# Tasks

Last of the follow-on changes after `react-typescript` (owner, 2026-10-19, with N5 of 2026-10-20): it is built after `react-typescript` is archived, so every view is a React route module and `scenes-3d` (with `Scene3D`, the chooser, the Sky and the 3D budget) is live. Re-planned 2026-10-21 (`react-typescript` task 12.5): the first plan's `js/gfx/` engine, OffscreenCanvas worker, 20 KB budget and Sky backdrop tasks are gone. "Verify:" says how a task is checked. Every code task keeps Vitest, the node tests, the build, the byte budgets (first load and the 3D budget) and the Playwright suite green, and adds one cov spec per new scenario in `e2e/tests/cov/`.

## 0. Before building

- [ ] 0.0 **[OWNER]** Approve this change for implementation (merging the plan is not approval).
- [ ] 0.1 Confirm `react-typescript` (with `scenes-3d`, the 3D budget and the Sky, tasks 10.1 to 10.3) and `render-performance` are archived; merge `main` in. Record the 3D budget total after the Sky from `tools/budget.ts` here.
- [ ] 0.2 **[OWNER]** Answer the open questions in `design.md` (the first three Sutra illustrations, wallpaper source, Glow off by default).
- [ ] 0.3 Record a trace of a Deep dive, a confetti burst and the Moving background on the mid Android phone used for `docs/perf/baseline.md` (main-thread time per second for each). Verify: the numbers are in `docs/perf/baseline.md` under "Before gpu-effects".

## 1. Foundation (D2, D5)

- [ ] 1.1 `Scene3D` context loss: `webglcontextlost` stops the scene; no `webglcontextrestored` within 3 seconds switches the page to `2d` and shows each scene's 2D drawing; an error boundary around each scene shows its 2D drawing. Verify: Vitest for the timer with a fake clock; `scenes-3d.spec.ts` forces a context loss on the Sky (`WEBGL_lose_context` in a test build) and sees `data-scene="2d"` after 3 seconds with Stars still usable.
- [ ] 1.2 The lifecycle lint and the "no hex in scene code" check cover every new file under `app/src/scenes-3d/`. Verify: a fixture with a bare `setTimeout` and one with a hex color in a scene fail lint and the check.

## 2. Scenes, in the owner's order (D3)

- [ ] 2.1 Sutra deep-dive illustrations: `sutra/pictures.ts`, `StillSvg.tsx` and `SutraIllustration.tsx` for the three Sutras of open question 1; the host on the Deep dive route, space reserved in the prerendered page. Verify: Vitest checks each picture's numbers against its first Worked example; `sutra-modal.spec.ts` (host with no canvas with JavaScript off, no layout shift as the still SVG and the scene appear, no host for a Sutra without a picture); `scenes-3d.spec.ts` for the illustration's paths and Deep Space colors; the PR records the 3D budget total and the chunk.
- [ ] 2.2 Celebrations: `celebrate/bursts.ts` and `Celebration.tsx` (confetti, star, belt, gold); `confetti` mounts it when loaded and on `3d`, today's 2D confetti otherwise; routes that can celebrate request the chunk at idle; a celebration asked for during a round waits for the result screen; Belt and gold Medal call sites added. Verify: `scenes-3d.spec.ts` (a burst ends within 2 s and removes its canvas; 2D confetti before the chunk is ready; none under reduced motion, Calm or Pause motion, and one in flight removed when Pause motion turns on); `practice.spec.ts`, `star.spec.ts` and the Arena's end screen still celebrate; the flash check of D8; the PR records the 3D budget total and the chunk.
- [ ] 2.3 Moving background: `ambient/lines.ts` shared by today's 2D canvas and `MovingBackground.tsx`; still during a round; the setting removes the scene. Verify: Vitest checks the line lists against today's strokes; a screenshot of the still frame under reduced motion matches the 2D drawing within a small pixel difference; `scenes-3d.spec.ts` (still during an Arena round, Calm live, the setting off removes the canvas, 2D without WebGL); the PR records the 3D budget total and the chunk.
- [ ] 2.4 Mandala glow: `MandalaGlow.tsx` and Mandala Studio's Glow toggle (off by default, hidden when motion is off or without WebGL, off while editing); Save wallpaper unchanged. Verify: `play.spec.ts` "Saving with Glow on" compares the saved image bytes with Glow off and on; `scenes-3d.spec.ts` (paused in a hidden tab, no toggle under reduced motion); the PR records the 3D budget total and the chunk.

## 3. Checks

- [ ] 3.1 `a11y.spec.ts`: axe with a Deep dive illustration, the Moving background and a celebration running; every scene canvas is `aria-hidden` with no pointer events; buttons under a celebration stay clickable.
- [ ] 3.2 The `react-typescript` perf job: the first-load and 3D budgets hold; median total blocking time of Home, the Arena and a Deep dive within 20 ms of `main`; a Deep dive does not request the Sky's chunk.
- [ ] 3.3 Repeat task 0.3's trace and add "After gpu-effects" to `docs/perf/baseline.md`. Verify: no round has 3D frames, and main-thread time per second for the Moving background is recorded for both paths.
- [ ] 3.4 **[OWNER]** Look at a Deep dive illustration, a Belt burst, the Moving background and Mandala Glow on your phone and an older iPad in both color schemes; check Pause motion and Calm stop everything.

## 4. Close out

- [ ] 4.1 `docs/agent/` notes for the scenes (where they live, the 2D fallbacks, the budget line per scene); `GLOSSARY.md` Decoration and 3D scene entries match the shipped scenes.
- [ ] 4.2 `openspec validate gpu-effects --strict`; archive with `/opsx:archive` after release.
