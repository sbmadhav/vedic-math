# Proposal

Status: approved by the owner on 2026-10-27; built in the pull request on branch `confetti-by-time` (tasks 1 and 2). Task 3 (the archive and its coverage spec) follows the release.

## Why

The big confetti (`confetti(n)` in `js/celebrate.js`, openspec spec `celebrations`) moves its pieces one step per animation frame and ends after 110 frames. Its length is a frame count, not a time, so it depends on how fast the device draws:

- On a 60 Hz screen it lasts about 1.8 s (110 frames of 16.7 ms), the length every celebration was tuned to.
- On a slow device, or a browser that draws few frames, it lasts much longer. Headless WebKit on Linux draws it at about 21 frames a second, so a burst lasts about 5.2 s, and past 15 s beside two other browsers (#149, which found it: `celebrations.spec.ts` failed on WebKit in every run from 2026-10-20 until it counted frames instead of seconds). A Player on a slow phone sees the burst crawl and cover the end screen for several seconds.
- On a 120 Hz screen it lasts about 0.9 s, and every piece moves twice as fast.
- In a tab the browser throttles or hides, no frames are drawn, so the burst never ends while the tab is away, and `bursting` (one burst at a time) stays set until it comes back.

#149 recorded this as a finding and left it, since changing it changes behavior.

## What Changes

- **The big confetti lasts a fixed time: 1,833 ms**, which is 110 frames of a 60 Hz screen, so a Player on a 60 Hz screen sees the same burst as today. A timer through `js/life.js` (`later`, on the burst's own signal) ends it, so it ends on time whatever the frame rate, and a tab that draws no frames still removes it and frees the next burst. It never ends earlier, and a late timer (a busy device, a hidden tab) still ends it within 3,000 ms of its start.
- **Each piece is where it would be on a 60 Hz screen at that moment.** Each frame draws the pieces at the time elapsed since the burst started (the same launch, gravity and drag as today's per-frame steps, written as a function of time), so a slow device draws fewer frames of the same path and a fast screen draws more, at the same speed.
- **Unchanged:** when it fires (true wins only), how many pieces each win asks for, one burst at a time, the colours (tokens), the fixed canvas layer, and the motion rule: under reduced motion, Pause motion or Calm it never starts, and turning any of the three on removes a running burst at once. The small animations already run on time (Web Animations, and `rollUp` counts by elapsed time), so they do not change.
- **Tests.** `test/celebrate.test.mjs` checks the path against today's per-frame steps and the length. `e2e/tests/celebrations.spec.ts` stops counting frames (#149): it times the burst from the canvas being added to it being removed, on every project, and adds a slow frame rate, a fast one and no frames at all (the page's `requestAnimationFrame` paced by an init script).

Out of scope: a fade at the end, a shorter or longer burst, a different burst per win, and the Sky and Moving background (`render-performance`, `gpu-effects`).

Affected: every Player who earns a true win with motion allowed; on a 60 Hz screen nothing they can see changes. Every Mode (Explorer, Challenger, Pro) the same way.

## Capabilities

### Modified Capabilities

- `celebrations`: ADDED "The big confetti lasts the same time on every screen" (a fixed length of 1,833 ms whatever the frame rate, removed on time in a tab that draws no frames) and ADDED "The big confetti moves at the same speed on every screen" (each piece where it would be on a 60 Hz screen at that moment). "Celebrations hold still under no motion" is unchanged and still covers the big confetti.

## Impact

- `js/celebrate.js` (`confetti`: the timer, and the path as a function of elapsed time; a named constant for the length).
- `test/celebrate.test.mjs` (the path and the length).
- `e2e/tests/celebrations.spec.ts` (the frame count replaced by a timed check; three paced frame rates). On archive, `e2e/tests/cov/celebrations-2.spec.ts` for the new scenarios.
- No change to first-load bytes beyond a few dozen (`docs/perf/baseline.json` is updated only if the build says so), no analytics, nothing stored or sent. `js/celebrate.js` is shared by the Legacy views and the Play experiences and is not a Locked view; no open migration pull request touches it (2026-10-26).
