# Design

## Context

`confetti(n)` in `js/celebrate.js` makes `n` pieces at 35% of the screen's height, each with a random sideways speed (up to 6 px a frame either way), an upward speed (4 to 16 px a frame), a size, a token colour, an angle and a spin. Every animation frame (`loop` from `js/life.js`, on the burst's own `AbortController`) it moves each piece one step (`x += vx; y += vy; vy += .35; vx *= .99; a += s`), draws it, and after the 110th frame aborts the controller, which removes the canvas, untracks the burst and clears `bursting`. `keep()` aborts it when reduced motion, Pause motion or Calm turns on; `still()` keeps it from starting.

Every step is in pixels per frame, so both the path's speed and the burst's length are set by the frame rate. The callers pass only the number of pieces (40 to 120, `test/celebrate.test.mjs` lists them), never a length.

## Decisions

### D1. The length is a time: 1,833 ms

Options weighed:
- (a) **A fixed time equal to today's length on a 60 Hz screen** (110 × 1000 / 60 = 1,833 ms). What a Player on the common screen sees is unchanged; a slow device and a fast screen get the same length.
- (b) A round number (1.5 s or 2 s). Simpler to say, but it changes what every Player sees, which this change does not set out to do.
- (c) Keep the frame count and cap it with a time (110 frames or 1.833 s, whichever comes first). Fixes the slow device, but a 120 Hz screen still gets 0.9 s.

Chosen: (a). The constant is written as `110 * 1000 / 60` with a comment, so its origin is plain.

### D2. A timer ends the burst; frames only draw

Options weighed:
- (a) **`later(end, 1833, ctl.signal)`** from `js/life.js`: the burst ends on time even when the browser draws no frames (a hidden or throttled tab), so `bursting` is freed for the next true win. A hidden tab may run timers late by up to about a second, which no one sees; the spec bounds the end at 3,000 ms after the start, which covers that and a busy main thread.
- (b) Check the elapsed time inside the frame loop and stop there. One mechanism, but in a tab with no frames the canvas and `bursting` stay until the tab is shown again.
- (c) Both (the loop stops itself once past the time, and the timer as a backstop). Two ways to end the same burst, for no gain over (a): the timer's abort already stops the loop.

Chosen: (a). The timer and the loop share `ctl.signal`, so aborting it (the timer, `keep()` under no motion) stops both and removes the canvas exactly as today. `test/lifecycle-scan.test.mjs` already accepts `later` with a signal.

### D3. The path is a function of elapsed time

Options weighed:
- (a) **Closed form**: with `f = elapsed / (1000 / 60)` (frames of a 60 Hz screen, a real number), each piece is at `x = x0 + vx · (1 − 0.99^f) / 0.01`, `y = y0 + vy · f + 0.35 · f (f − 1) / 2`, angle `a0 + s · f`: exactly today's position after `f` frames whenever `f` is a whole number, whatever the frame rate, and no state carried between frames.
- (b) Scale each step by the frame's length (`k = dt / 16.7`, `x += vx · k`, and so on). Close to today's path, but the error grows with long frames (a 200 ms stall jumps 12 steps of Euler integration), and a frame after a stall needs a clamp.
- (c) Keep per-frame steps and only end on time (D1 and D2 alone). At 21 frames a second the pieces would make only 38 of their 110 steps: they would rise and stop near the top of their arc, a different and odd-looking burst.

Chosen: (a). `elapsed` is the frame's `now` (the `requestAnimationFrame` time `loop` passes) minus the burst's start, read from `performance.now()` when it starts; the first frame draws the pieces at their start positions plus that small elapsed time. The function is exported (as `confettiAt(piece, ms)` or similar) so `test/celebrate.test.mjs` can check it against today's steps without a canvas.

### D4. How the tests time the burst

The e2e check must hold on every project, including WebKit on Linux beside two other browsers, where frames are slow and the machine is busy.

Options weighed:
- (a) **Time it inside the page**: the init script's `MutationObserver` (already counting `fx-confetti`) records `performance.now()` when the canvas is added and when it is removed; the spec reads both and expects the length to be between 1,800 ms and 3,000 ms. The upper bound is the spec's; the lower bound is the spec's 1,833 ms less a margin for the browsers' coarsened `performance.now()`, and it catches a burst cut short (a 120 Hz frame count would read about 900 ms). The upper bound is well under today's 5.2 s on WebKit and leaves room for a busy runner's late timer.
- (b) Poll from Playwright (`toHaveCount(0, { timeout })`). Its polling and round trips add up to a few hundred milliseconds of noise, and it cannot see a burst that is too short.
- (c) Keep counting frames (#149). The thing being fixed is that frames are the wrong unit.

Chosen: (a). The frame rate is set by an init script that wraps `requestAnimationFrame` before the app loads: a slow device delivers frames every 48 ms (about 21 a second, WebKit on Linux), a 120 Hz screen every 8 ms, and a tab with no frames delivers none for the burst's whole length. Under each, the burst lasts 1,800 to 3,000 ms and the canvas is gone after it; with no frames, a second true win straight after it draws its own burst (`bursting` was freed). The 120 s test budget #149 added goes back to the default. Playwright has no way to hide a page, so a hidden tab itself is not tested: holding back every frame is what a hidden tab does to the burst, and the browser's late timers there fall inside the 3,000 ms bound. The path is checked with fixed pieces (the same start positions, speeds, angles and spins at both frame rates) in `test/celebrate.test.mjs`, not with the random ones a burst makes.

## Risks

- **A late timer on a busy device.** A main thread blocked by other work runs the timer late, so the burst can run a little past 1.8 s, never 5 s; the pieces stay on their path while it does.
- **Frames before the timer.** The last frame drawn may be up to one frame short of 1,833 ms of path; no one sees the difference.
