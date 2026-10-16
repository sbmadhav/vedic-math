# Tasks

Prerequisites: `star-round` is merged (`fx.noMotion()`, `fx.announce()`, Star rounds). `sky-home` and `hook-first-star` may land before or after; they already read `vm.calm`.

## 1. Calm, motion and text size in fx

- [x] 1.1 `js/fx.js`: `calmOn()`, `setCalm()` (`body.calm`, `vmcalm` event, announcement), `onMotionChange(fn, signal)`, `noMotion()` including `motion-paused` and Calm, `textSize()`, `setTextSize()` (`body.text-plus`). Verify: new `test/shell.test.mjs` with stubbed `localStorage`, `matchMedia` and `documentElement`: each of reduced motion, `motion-paused` and Calm makes `noMotion()` true; Pause motion leaves `calmOn()` false; `setCalm(true)` persists, sets the class and fires one `vmcalm`; a `sitemotion` event calls `onMotionChange` listeners, which stop after the signal aborts.
- [x] 1.2 `math.css`: every `prefers-reduced-motion` block has `html.motion-paused` and `body.calm` twins; `body.text-plus` scale. Verify: `test/shell.test.mjs` parses `math.css` and fails on a reduced-motion block without both twins.

## 2. The play shell

- [x] 2.1 `js/shell.js` `openShell()`: fixed full-screen region, header with Calm switch, A/A+ and Stop or Back, `inert` on the rest, focus back to the start button on close, everything on the round signal. Verify: `test/lifecycle-scan.test.mjs` covers `js/shell.js`; new Playwright `e2e/tests/shell.spec.ts` (projects chromium, webkit, mobile):
  - an Arena round on the mobile project: the question, entry and all 12 keypad keys are inside the viewport and `document.scrollingElement.scrollTop` stays 0 through 10 answers;
  - tapping the entry on the mobile project does not focus an element with an OS keyboard (`inputmode` of the focused element is `none` or nothing is focused);
  - at 844 by 390 (landscape) every key is still inside the viewport;
  - after the round, leaving the result focuses `#arGo`;
  - the rest of the page is `inert` while the shell is open.
- [x] 2.2 Move Arena, Duel, game rounds, tower challenges and Star rounds into the shell (`arenaView()`, `duelView()`, `gameView()`, `challengeView()`, `starView()`); coarse-pointer hidden inputs get `inputmode="none"` and `readonly`. Verify: existing `e2e/tests/arena.spec.ts`, `games.spec.ts` ("a ranked round shows the game leaderboards and starts the clock", "Times sprint", "Number bonds" tests), `star.spec.ts` and `routes.spec.ts` ("leaving the Arena during the countdown never starts the round") pass with selectors updated to the shell.

## 3. No clocks in Practice

- [x] 3.1 `js/arena.js`: `runArena({ untimed })` (20 questions, counter, Finish) and `runChallenge(..., { untimed })`; no ticks in Calm. Verify: `test/arena.test.mjs`: untimed Practice draws 20 adapting questions with no repeats; Playwright `e2e/tests/arena.spec.ts`: "Practice, no clock" shows no `#arTime` timer, ends after 20 answers or on Finish, and `cloudLog(page).writes` holds no Arena board write; with `vm.calm = '1'` the lobby selects it by default and the daily chip shows the timed note.
- [x] 3.2 `js/games.js` kit: `timed()` skips the clock when `calmOn() && !ranked`; timed games end after `g.perQ` questions. Medal rules in `js/app.js`: no Medal for untimed runs of timed games, tower Sprint and Time attack, with the result note. Verify: `test/games.test.mjs`: untimed Times sprint ends after `perQ` answers; Playwright `games.spec.ts` new test: with Calm on, Times sprint Level 4 has no `.g-timer`, ends after its questions, shows Sparks and "Medals for this game need the clock", and saves no Medal; a ranked Times sprint round with Calm on still shows `.g-timer`.
- [x] 3.3 Tower in Calm. Verify: Playwright `e2e/tests/shell.spec.ts`: with Calm on, challenge 1 (Sprint) shows no timer bar and the result says Medals for Sprint need the clock; challenge 2 (Sharpshooter) still awards a Medal.

## 4. One motion rule

- [x] 4.1 `js/ambient.js` uses `fx.noMotion()` and `fx.onMotionChange()`; still frame on change; restart when motion returns and `bgOn()`. Verify: Playwright `shell.spec.ts`: with the moving background on, setting `html.motion-paused` (and dispatching `sitemotion`) leaves the `.vm-bg` canvas present and stops its frames (two `toDataURL()` reads 1 s apart are equal); clearing it restarts them; the Calm switch stays off throughout.
- [x] 4.2 Me page "Calm and motion" group (Calm, Moving background, Text size, the Pause motion note). Verify: Playwright `shell.spec.ts`: Calm turned on in a game header shows on in `#/me` and after reload; screen reader announcement text appears in `#vmLive`; `e2e/tests/a11y.spec.ts` checks the Me page and an open shell (both schemes).
- [x] 4.3 Calm stops motion in Stars and the Sky. Verify: Playwright `star.spec.ts` runs its miss-and-Comeback test with `vm.calm = '1'` and asserts `document.getAnimations()` is empty.

## 5. Text size

- [x] 5.1 A and A+ in the shell header and on Me. Verify: `shell.spec.ts`: A+ grows the question's computed font size by about 25% and, on the mobile project, every key is still inside the viewport during a Star round.

## 6. Docs, analytics and privacy

- [x] 6.1 GLOSSARY.md: add **Calm** ("A setting for play with no clocks in Practice and no motion. Ranked rounds keep their clock." _Avoid_: zen mode, relaxed mode, reduced motion (that is the device setting)). Verify: reviewer reads the diff.
- [x] 6.2 Analytics: `math/arena/<league>/untimed` and `round_end/arena/...` for untimed rounds. Verify: `test/metrics.test.mjs` call-site scan passes; Playwright `analytics.spec.ts` new test: an untimed Arena Practice round sends one `round_end/arena/<league>/r1`.
- [x] 6.3 Nothing new is sent. Verify: `e2e/tests/privacy.spec.ts` new test: no request body contains `calm` or `text`; record in the PR that `parentNote()` and `cloud/README.md` need no change.

## 7. Release check

- [ ] 7.1 Node, build and Playwright suites pass locally; after deploy the live E2E run is green. Manual checks: an iPhone and a touch Chromebook play an Arena round and a Star round without scrolling or a covered keypad; VoiceOver hears the Calm switch state.
