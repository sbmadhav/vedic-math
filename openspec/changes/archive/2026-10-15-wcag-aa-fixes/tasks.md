# Tasks

## 1. Focus

- [x] 1.1 `keepFocus()` in `js/games.js`, started by the game shell in `js/app.js`; `onAbort` exported from `js/life.js`. Verify: node test for `onAbort` in `test/life.test.mjs`; `test/lifecycle-scan.test.mjs` still passes; Playwright `e2e/tests/wcag.spec.ts` answers twice by keyboard in more-less, bonds, sequence, make-ten, quick-look, balance, check-it and frac-faceoff and asserts focus stays in `#gArea`, and that a mouse click outside is left alone.

## 2. Status messages

- [x] 2.1 `#arSay` status in `runArena` and `runChallenge` (`js/arena.js`); Times sprint says "Right! N so far." Verify: Playwright checks the Arena status text and that `#arPop` stays `aria-hidden`, and the Times sprint status line; the existing view-lifecycle test still sees an empty explanation line after a right answer.

## 3. Layout

- [x] 3.1 `.belts-mini` wraps, `.vv-set` gets a shrinkable column, sutra faces sit in the flow and break long words (`math.css`). Verify: Playwright checks `#/`, `#/me`, `#/sutras` and `#/games` at 320px with and without the text spacing override, and that no sutra card clips.

## 4. Motion and semantics

- [x] 4.1 `fx.motionOff()` used by `fx.js`, `app.js`, `games.js`, `scenes.js`; `ambient.js` follows `html.motion-paused` live. Verify: Playwright pauses motion from the Explore menu, sees the background canvas and CSS loops stop, stay stopped after a reload and restart when resumed; the Moving background switch removes the canvas.
- [x] 4.2 `.pr-keys` gets `role="group"`. Verify: Playwright finds the group by name.
