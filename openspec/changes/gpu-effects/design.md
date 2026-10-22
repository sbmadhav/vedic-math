# Design

Re-planned 2026-10-21 (`react-typescript` task 12.5) to follow ADR 0013. The first plan's `js/gfx/` engine (`gfx.js`, `caps.js`, `gfx-worker.js`, `gl.js`, the two hand-written shaders and the two-renderer scene format), its OffscreenCanvas worker, its 20 KB budget and its Sky backdrop are gone; this design keeps what still applies (what may be drawn, motion, pausing, flashes, theming, context loss, the wallpaper rule) on top of `react-typescript`'s `scenes-3d`.

## Context

- When this change is built, `react-typescript` is archived. It provides:
  - `app/src/scenes-3d/Scene3D.tsx`: renders only its host element, with its space reserved, on the server and during hydration; draws the 2D picture in the browser after start-up; requests the 3D code with a dynamic `import()` after the route has rendered and the browser is idle; and chooses `still` under Calm, Pause motion or reduced motion, `2d` without WebGL or when the scene stays under 30 frames a second for 3 seconds (Q25), `paused` when the tab is hidden or the host is off screen, and `3d` otherwise, reported as `data-scene` on the host. Colors come from the tokens; GPU resources are freed on unmount.
  - The Sky as the first 3D scene (task 10.3), with `e2e/tests/scenes-3d.spec.ts`.
  - The 3D budget (`tools/budget.ts`: every 3D file summed against 170 KB Brotli, none reachable from an entry's static imports, none in `PRECACHE`, none in the server build) and an ESLint ban on drei helpers that fetch from other origins.
  - The lifecycle lint (no bare listeners, timers or frame loops in a component; `view-lifecycle` spec).
- Decoration still drawn in 2D on the main thread after `react-typescript`:
  - The Moving background (today's `js/ambient.js`, moved to React by `react-typescript`): a full-screen 2D canvas at up to 30 frames a second, drawn with strokes (Śulba constructions, Meru-prastāra, the nakshatra wheel, Brahmi-style numerals, laghu and guru marks); one still frame under no motion. After `render-performance` it starts after idle and holds still during rounds.
  - Celebrations (the `celebrations` change, `js/celebrate.js`): `confetti(n)` is the big burst for true wins only, one at a time, a full-window 2D canvas; the small helpers (`sparkle`, `pop`, `bounce`, `twinkle`, `wiggle`, `tick`, `cheer`, `rollUp`, `rollSparks`) are CSS and SVG. `js/star.js` has a small particle burst over the Star stage.
  - The Sutra deep dive (`sutra-deep-dive` spec, prerendered by `react-typescript`, Q20): text and Worked examples, no picture.
  - Mandala Studio (`js/play/exp/art.js`, `art-draw.js`): canvas 2D drawing of times-table mandalas, Meru-prastāra in color and Śulba rope geometry; "Save a wallpaper" exports the 2D canvas.

## Goals

- The owner's next 3D scenes after the Sky, in order: Sutra deep-dive illustrations, then celebrations, the Moving background and Mandala glow.
- Each scene a React Three Fiber component on `Scene3D`, so it gets the chooser, the fallbacks, pausing, token colors and disposal without new code.
- Motion settings, pausing and lifecycle rules exactly as strict as today; nothing 3D during a round.
- Inside the 170 KB Brotli 3D budget, with each scene its own chunk.

## Non-goals

- Any interface in WebGL; WebGPU; physics; an engine or worker of our own.
- Changing the Sky, `Scene3D`'s chooser (except context loss, D5) or the 3D budget.

## Decisions

### D1. What may be 3D (ADR 0011)

Only decoration: pictures that carry no information, take no input and can disappear without anything being lost. Concretely: Sutra deep-dive illustrations, celebrations, the Moving background and Mandala Studio's glow view (the Sky is `react-typescript`'s). Everything a Player reads, taps or needs to understand (questions, answers, Stars, Landmarks, names, scores, timers, Worked examples, Mandala Studio's controls and its drawing canvas) stays HTML, SVG or canvas 2D. A scene canvas is always `aria-hidden="true"`, has `pointer-events: none` and never covers a control's hit area.

### D2. Scenes on `Scene3D`

```text
app/src/scenes-3d/
  Scene3D.tsx              from react-typescript; gains context loss (D5)
  sky/                     from react-typescript (task 10.3)
  sutra/SutraIllustration.tsx   one scene, a picture per Sutra from a small data table
  sutra/pictures.ts             pure: Sutra id -> point and line lists (Vitest)
  sutra/StillSvg.tsx            the same picture as a still SVG (the 2D and still frame)
  celebrate/Celebration.tsx     confetti, star, belt, gold
  celebrate/bursts.ts           pure: particle counts, sizes, timings (Vitest)
  ambient/MovingBackground.tsx  the Moving background drawings as 3D lines
  ambient/lines.ts              pure: today's strokes as line lists, shared with the 2D canvas
  mandala/MandalaGlow.tsx       glow view of the mandala's line list
```

- Each scene is its own dynamic `import()` from its route or caller, so a route downloads only the scenes it shows and the Sky's chunk is not pulled in by a Deep dive.
- three.js classes are registered with `extend()` per scene, only those it uses; drei pieces are imported by path. A scene adds no new dependency without a measured budget line (D7).
- Each scene's 2D drawing is the fallback `Scene3D` shows for `2d` and `still`: the still SVG for Sutra illustrations, today's 2D confetti for celebrations, today's 2D canvas for the Moving background, and nothing for Mandala glow (the Glow toggle is hidden, the 2D drawing is already there).
- No bare `useFrame` side effects outside React Three Fiber's loop, and no listener, timer or frame loop outside the app's lifecycle hooks (lifecycle lint).

### D3. The scenes

- **Sutra deep-dive illustrations.** A host of fixed height at the top of the Deep dive, above the Worked examples. The prerendered page holds only the host with its space reserved (no canvas, `react-typescript` D14); the still SVG is drawn after start-up, and the 3D scene fades in after idle. The picture shows the idea of the Sutra's first Worked example (for Ekādhikena Pūrveṇa, 25² as 625 dots: 2 × 3 = 6 blocks of a hundred, then the 25 from 5 × 5; for Nikhilaṃ Navataścaramaṃ Daśataḥ, 100 − 43 as the 4 taken from 9 and the 3 taken from 10; for Ūrdhva-Tiryagbhyām, the vertical and crosswise lines of 12 × 13), turning slowly. It is decoration: the same idea is already in the Worked example's text. Sutras without a picture in `pictures.ts` show no host. The first three are Ekādhikena Pūrveṇa, Nikhilaṃ and Ūrdhva-Tiryagbhyām (open question 1); more are added as content, each with a Vitest check that its picture's numbers match its first Worked example.
- **Celebrations.** `confetti(n)` keeps its call sites and its rule (true wins only, one at a time). Its body mounts `Celebration` in a full-window overlay host when the scene is loaded and `3d` is allowed, and today's 2D confetti otherwise. A route that can celebrate (the Star round's result, a Medal, a Belt, katas, the Arena's end screen, Play experiences that use `confetti`) requests the celebration chunk at idle after it renders; a win that comes before it is ready gets the 2D confetti. Sizes: small (n under 50), medium (50 to 90), large (over 90), at most 150 pieces in 3D, at most 2 seconds. The Star burst calls `Celebration` with `kind: 'star'` at the Star stage's rect; a Belt earned and a gold Medal call it with `'belt'` and `'gold'`. The overlay host is removed when the burst ends.
- **Moving background.** `ambient/lines.ts` turns today's strokes into line lists that both the 2D canvas and the scene draw, so the pictures match. The scene adds slow depth and a little parallax from the page's pointer and scroll position, read by a window listener started through the app's lifecycle hooks; the canvas itself still takes no input (`pointer-events: none`). The Moving background setting, the music and `BG_NOTES` stay where they are; turning the setting off unmounts the scene.
- **Mandala glow.** In Mandala Studio, a "Glow" toggle (off by default; hidden when motion is off or WebGL is missing) shows the current mandala's line list (the one Mandala Studio already computes) turning slowly with an additive glow, in a host over the 2D drawing canvas. The 2D canvas stays the source of truth: editing switches Glow off, and Save wallpaper always exports the 2D drawing.

### D4. Motion, pausing and rounds

- `Scene3D` already gives every scene the still frame under Calm, Pause motion and reduced motion (live and after a reload), `paused` when the tab is hidden or the host is off screen, and disposal on unmount. Celebrations never start under no motion, and one in flight is removed at once when motion turns off; the message or announcement that goes with the win is unchanged.
- Nothing 3D during a round (`react-typescript` D13): `confetti` called while a round is in play waits until the round's last answer has been checked (the result screen); the Moving background scene holds a still frame while a round is in play (the rule `render-performance` sets for the 2D background moves to the scene, as its proposal says). The Sutra illustration and Mandala glow are never on screen during a round.
- Frame rate: the Q25 rule (under 30 frames a second for 3 seconds switches to 2D for the page) applies to every scene through `Scene3D`. Celebrations last at most 2 seconds and so never trip it; once the page has switched any scene to `2d`, celebrations use the 2D confetti too.
- Pixel ratio through drei's `AdaptiveDpr`: at most 2 on a fine pointer, 1.5 on touch, 1 when `navigator.deviceMemory` is 4 or less.

### D5. Context loss and failures

- `webglcontextlost` on a scene's canvas: the scene stops; if `webglcontextrestored` does not come within 3 seconds, `Scene3D` switches that page to `2d` (reported as `data-scene="2d"`) and shows the scene's 2D drawing. This is the one addition to `Scene3D`, so the Sky gets it too.
- An error inside a scene is caught by an error boundary around the scene, which shows its 2D drawing; decoration never breaks a view, and the error is not reported to analytics as a crash.
- A 3D chunk that fails to load (offline, never cached) leaves the 2D drawing in place with no error.

### D6. Theming

Colors come from the tokens through `Scene3D` (`--coral`, `--teal`, `--sun`, `--sky`, `--plum`, `--ink`, `--paper` and the Sky's own tokens), read with `getComputedStyle` and passed to the scene as props, updated when the color scheme changes (the theme button, the system scheme, the saved override). No hex color literal in `app/src/scenes-3d/` (the `scenes-3d` rule "Colors from the design tokens", checked by a test).

### D7. Loading, offline and the budget

- No scene is reachable from an entry's static imports, none is in `PRECACHE`, none is in the server build (the `react-typescript` 10.1 checks cover `app/src/scenes-3d/`). A scene is requested only on a route that shows it, after it has rendered and the browser is idle.
- Offline: scene chunks are hashed files the worker caches on first use (cache first after that); a scene never loaded online shows its 2D drawing offline.
- The budget: all 3D code together (three, React Three Fiber, drei, the Sky and these scenes) stays within 170 KB Brotli. The 10.1 spike records the total after the Sky; each scene's task records the new total and its own chunk in the PR. A scene that would take the total over 170 KB goes back to the owner before it merges (ADR 0013).
- Turning the scenes on does not raise the median total blocking time of `/learn/`, `/learn/arena` or a Deep dive by more than 20 ms in the Lighthouse check (`react-typescript` perf job).
- No new origin and no new CSP source.

### D8. Testing

- Vitest: each scene's pure module (`pictures.ts` against the first Worked examples, `bursts.ts` sizes and timings, `lines.ts` matching today's strokes), the context-loss timer with a fake clock, the "wait for the round's end" rule of `confetti`.
- Playwright, `e2e/tests/scenes-3d.spec.ts` (chromium), for each scene: `3d` with motion; `still` under `reducedMotion: 'reduce'`, Calm and Pause motion, switching live; `2d` with WebGL made unavailable by an init script; `paused` after a `visibilitychange` to hidden (Moving background and Mandala glow); a forced context loss (`WEBGL_lose_context` in a test build) that ends in `2d` after 3 seconds; Deep Space colors after a scheme switch; canvas `aria-hidden` with no pointer events; no 3D file requested before the first tap and none from the Mode picker. WebKit and the mobile project record the path they get and render without errors.
- `sutra-modal.spec.ts`: the prerendered Deep dive holds the host with its space and no canvas; no layout shift as the still SVG and then the scene appear.
- `a11y.spec.ts`: axe with a scene and a celebration running; buttons under a celebration stay clickable; a celebration's frames are checked for flashes (no more than three luminance swings above 10% of the screen in any second, from screenshots at 10 frames a second in a test build).
- `play.spec.ts` "Saving with Glow on": the saved image bytes are the same with Glow off and on.
- One cov spec per new scenario in `e2e/tests/cov/`.

## Risks and trade-offs

- **The 3D budget is shared.** React Three Fiber, drei and the Sky may leave little room; each scene's chunk is measured before it is built, and the owner decides if the total would go over 170 KB.
- **Main thread.** 3D shares the main thread with taps (Q22). Nothing 3D runs during a round, scenes pause when unseen, and the Q25 rule drops a slow device to 2D.
- **GPU driver bugs on old phones.** Context loss, the error boundary and the frame-rate rule fall back to 2D; decoration is optional by definition.
- **Battery.** Pausing when unseen, the still frame and the Moving background switch limit it.

## Migration plan

After `react-typescript` is archived: Scene3D's context loss first, then the Sutra deep-dive illustrations (the owner's order), then celebrations, the Moving background and Mandala glow, each replacing the old 3D-less path in the same PR and keeping the 2D drawing as its fallback. Rollback per scene is a revert; the 2D drawing is always there.

## Open questions (defaults used in this change)

1. The first Sutra deep-dive illustrations are Ekādhikena Pūrveṇa, Nikhilaṃ Navataścaramaṃ Daśataḥ and Ūrdhva-Tiryagbhyām; the rest are added as content later: default yes.
2. Mandala Studio's saved wallpapers stay on the 2D drawing so they look the same everywhere: default yes.
3. Glow in Mandala Studio is off by default: default yes.

The first plan's question on the Sky's twinkle layers moved to `react-typescript` with the Sky.
