# Design

## Context

- Rounds draw into cards inside the page: `arenaView()` into `#arShell`, `gameView()` into `#gShell`, `challengeView()` into `#chShell`, `duelView()` into `#dShell`, `starView()` (from `star-round`) into its own stage (`js/app.js`).
- Clocks: `runArena()` uses `ROUND_SECS = 60` and a `loop()` (`js/arena.js:19`, `:130`) with ticks in the last 5 s; `runChallenge()` has `ch.secs` (Sprint 60 s) and Time attack counts seconds (`js/arena.js:198-248`); games call `k.timed(area, secs)` unless `ctx.endless` (`js/games.js:43`). Ranked rounds: the Arena daily round (`type === 'daily'`) and ranked game rounds (`mode === 'ranked'`).
- The Arena typed entry is a hidden `<input id="arType" inputmode="numeric">` focused on pointer-fine devices (`js/arena.js`), plus an on-screen keypad.
- Motion: `fx.noMotion()` (from `star-round`) reads `prefers-reduced-motion`, `html.motion-paused` and `localStorage['vm.calm']`. `js/ambient.js` draws the background with its own `reduced()` and offers "Moving background" (`bgOn()`, `setBg()`), also on the Me page.
- The site-wide control in `/assets/explore.js` (in progress in sbmadhav.github.io): `html.motion-paused`, `window.siteMotion.paused()`, `document` event `sitemotion` with `{ paused }`, saved under `localStorage['motion']`.
- Device preferences live in `localStorage` as `vm.<name>` (`fx.soundOn`, `fx.voiceOn`).

## Goals / Non-Goals

**Goals:**
- No scrolling and no covered keypad during any timed round or Star.
- Every Practice time limit can be turned off (WCAG 2.2.1), with one switch.
- One rule for motion, whichever control turned it off.

**Non-Goals:**
- Ghost race; changing explore.js; untimed Ranked rounds.

## Decisions

**1. A shell, not a new route.** `openShell(title, { signal, onExit })` (new `js/shell.js`) creates a `<section class="play-shell" role="region" aria-label="<title>">` fixed over the viewport (`position: fixed; inset: 0; height: 100dvh` with a `100vh` fallback), sets `inert` on `#view`'s other content, the header and footer, and returns `{ area, header, close }`. The round renders into `area` exactly as today. `close()` (also on signal abort) removes it, clears `inert` and focuses the start button. The route stays the same, so Back, deep links, analytics and the view lifecycle are unchanged.
- Layout: a CSS grid `header / stage / keypad`; the stage uses `container-type: size` and `clamp()` font sizes so the question shrinks before anything scrolls; the keypad row has `padding-bottom: env(safe-area-inset-bottom)`.
- The system keyboard: on coarse pointers the hidden inputs get `inputmode="none"` and `readonly` so tapping never opens the OS keyboard over the custom keypad; physical keyboards still work through one `keydown` listener on the round signal (already the Arena's and Star's pattern). On fine pointers nothing changes.
- Rejected: a full-screen API request (`requestFullscreen`). It needs a gesture per round, behaves differently on iOS, and hides the browser UI kids use to leave.

**2. Calm is one device preference.** `fx.calmOn()` reads `vm.calm`; `fx.setCalm(on)` writes it, toggles `body.calm`, fires a `vmcalm` event on `document`, and announces "Calm on. No clocks in Practice, no motion." or "Calm off." through `fx.announce()`. The shell header and the Me page render the same switch (`md-switch`, `role="switch"`, `aria-checked`).
- Per device like sound and read-aloud, and like the site's Pause motion. Rejected: per Player. Motion sensitivity belongs to whoever holds the device, and a per-Player setting would switch motion back on when a sibling's Player is chosen.

**3. Clocks in Calm.** Each round gets `ranked: boolean`. `runArena({ untimed })`, `runChallenge(..., { untimed })` and the game kit check `untimed = calmOn() && !ranked` (or the explicit untimed choice):
- Arena untimed: 20 questions, a "Question n of 20" counter instead of the timer, a Finish button; Score as today (10 plus combo).
- Tower Sprint untimed: 20 questions, no Medal (the result says "Medals for Sprint need the clock"); Time attack untimed: its questions, no Medal. Survival, Sharpshooter and Boss have no clock already and keep Medals.
- Games: `k.timed()` does nothing when untimed; a timed game's round ends after `g.perQ` questions through the kit's `over()`; game Level Medals are not awarded in an untimed run of a timed game (Pairs, Target and other untimed games keep them).
- Ranked rounds: clock unchanged; no ticks (`sfx('tick')` skipped) and no motion. The Arena lobby, with Calm on, shows under "Daily challenge": "The daily challenge is a timed race for everyone. Practice has no clock in Calm."
- Sparks: untimed rounds earn by the same formulas (Arena `round(score / 5)`, games and tower as today, without the Medal part).

**4. One motion rule.** `fx.noMotion()` is the single check: `matchMedia('(prefers-reduced-motion: reduce)').matches || documentElement.classList.contains('motion-paused') || calmOn()`. `fx.onMotionChange(fn, signal)` calls `fn` on the media query's `change`, `sitemotion` and `vmcalm`. CSS: every `@media (prefers-reduced-motion: reduce)` block in `math.css` gets the same rules repeated under `html.motion-paused` and `body.calm` (a node test checks each such block has both twins). Pause motion does not set Calm, and Calm does not set `motion-paused` (each control owns its own state; clocks follow Calm only).
- `js/ambient.js`: `reduced()` becomes `fx.noMotion()`; the background redraws one still frame and stops its loop on a motion change, and restarts when motion is back on and `bgOn()`. The "Moving background" switch keeps its meaning (draw it or not). The Me page settings become one group, "Calm and motion": Calm, Moving background, Text size, and the note "Pause motion in the Explore menu stops motion on every page of sbmadhav.com."

**5. Text size.** `fx.textSize()` is `'a'` or `'a+'` (`vm.text`); `body.text-plus` sets `--play-scale: 1.25`, used by the shell's question, choices and keypad sizes. Two buttons "A" and "A+" (`aria-pressed`) in the shell header and on the Me page.

**6. Untimed Arena Practice choice.** The Arena lobby's round type group gets a third chip, "Practice, no clock". With Calm on and no choice made this visit, it is selected. Track event `math/arena/<league>/untimed` uses the existing `track('arena/' + league + '/' + type)` call with the new fixed type word; `round_end/arena/...` is sent when it ends, as for any round.

## Risks / Trade-offs

- [`inert` support] → Supported in current Chrome, Safari and Firefox; where missing, the shell still covers the page and focus starts inside it.
- [`100dvh` on old Safari] → `100vh` fallback first; the keypad row is pinned with `position: sticky` inside the grid as a second guard.
- [Players use Calm to collect Sparks without time pressure] → Sparks are on the same per-answer scale either way; time-based Medals need the clock.
- [The explore.js control ships later or changes its API] → Only the class `html.motion-paused` is required; the event is a convenience. The node test stubs both.

## Migration Plan

New preferences start unset (Calm off, text A). Rollback: revert; the `vm.calm` and `vm.text` keys are ignored by older code (except `fx.noMotion()` from `star-round`, which still reads `vm.calm`, as intended).

## Files touched

- New: `js/shell.js`, `test/shell.test.mjs`, `e2e/tests/shell.spec.ts`
- `js/fx.js`, `js/arena.js`, `js/games.js`, `js/app.js`, `js/ambient.js`, `js/star.js` (run inside the shell), `math.css`, `GLOSSARY.md`
- Tests: `test/arena.test.mjs`, `test/games.test.mjs`, `test/lifecycle-scan.test.mjs`; `e2e/tests/arena.spec.ts`, `games.spec.ts`, `a11y.spec.ts`, `analytics.spec.ts`, `star.spec.ts`
