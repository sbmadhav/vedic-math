# Tasks

## 1. Lifecycle helper

- [ ] 1.1 Add `js/life.js` with `on`, `later`, `every`, `loop` and `child`, all bound to an `AbortSignal` and throwing when none is given. Verify: node test `test/life.test.mjs` with Node's `EventTarget`, `AbortController` and `node:test` mock timers: handlers stop firing, timers and intervals never run, and a child aborts with its parent.
- [ ] 1.2 Add a node test `test/lifecycle-scan.test.mjs` that fails on bare `addEventListener(` against a view or round root in `js/app.js` and `js/arena.js`, and on bare `setTimeout(` or `requestAnimationFrame(` in `js/games.js` and `js/arena.js` (page-lifetime listeners listed in the proposal are allow-listed). Verify: it fails on today's code and passes after group 3.

## 2. Router contract

- [ ] 2.1 In `render()` (`js/app.js:69-84`), create an `AbortController` per render, call `view(params, { signal })`, call a returned `destroy()` and then abort on the next render; remove the `cleanup` variable (`js/app.js:36`). Verify: `e2e/tests/routes.spec.ts` still passes for every route, and a new assertion that navigating away from `#/arena` mid-countdown never starts a round (no `#arQ` text after 3 s, `cloudLog(page).writes` empty).

## 3. Rounds on child signals

- [ ] 3.1 `runArena` (`js/arena.js:38-82`): take `signal`, use `child(signal)` for the round, attach the keypad listener (now `js/arena.js:66`) with it, return `{ destroy }`; update `arenaView()` (`js/app.js:635-680`). Verify: Playwright spec in `e2e/tests/arena.spec.ts` with `page.clock`: play an Arena Practice round to the end, start a second, tap 1 then 2, expect `#arEntry` to read `12`; Explorer variant: one tap answers one question (the score changes once and `#arQ` changes once).
- [ ] 3.2 `runDuel` (`js/arena.js:85-97`) the same; update `duelView()` (`js/app.js:681-698`). Verify: Playwright spec: finish a Duel, start a rematch, one right tap raises that side's count by exactly 1. (This spec must be rebased onto `fair-duel` if that lands first, since it changes how questions are dealt.)
- [ ] 3.3 `runChallenge` (`js/arena.js:101-150`) and `challengeView()` (`js/app.js:473-503`) the same. Verify: existing tower spec passes; new assertion that "Play again" then one keypad tap enters one digit.
- [ ] 3.4 `practice()` (`js/app.js:264-327`): one child signal per question from `next()`, the delegated click handler (now `js/app.js:311`) attached once with the view signal or per question with the question signal, return `{ destroy }`; update `skillView`, `mixView`. Verify: new Playwright spec `e2e/tests/practice.spec.ts` answers 5 Practice questions on a grade 4 skill (reveal with "Show me" to move on), then taps "/" once and expects exactly one "/" in the input, and taps "Want a hint?" once and expects one hint line.
- [ ] 3.5 `kataView()` (`js/app.js:402-445`), the trick animator (`mountAnimator`, `js/app.js:878-890`) and sutra scenes (`mountScene` stop in `openSutra`) on the view signal. Verify: `e2e/tests/dojo.spec.ts` passes; a new assertion that leaving a Kata mid-question and coming back shows a fresh Kata.

## 4. Games

- [ ] 4.1 Pass `signal` in the game `ctx` from `gameView()` (`js/app.js:767`); move `timer()` (`js/games.js:14-20`) and the Multiple rain loop (`js/games.js:340-344`) to `loop`, and every `setTimeout` in `js/games.js` to `later` with the round signal. Verify: the lifecycle scan test passes; `e2e/tests/games.spec.ts` "launches and accepts an answer" passes for all 14 games.
- [ ] 4.2 Add `answered(ok, explainHtml, next)` to `kit()` and use it in Number bonds (`js/games.js:198`), Times sprint (`:210`), Fraction face-off (`:259`), Answer checker (`:324`) and Balance the scale (`:366`). Verify: Playwright spec in `e2e/tests/games.spec.ts` with `page.clock`: in Number bonds, a wrong pick keeps the same question and its explanation for 1.2 s and ignores a tap during the hold; a right answer in Times sprint shows the next question with an empty `.g-tip`.
- [ ] 4.3 Stop then start: Verify with a Playwright spec that pressing Stop in a Ranked round of Balloon pop during its 0.9 s wait and starting again shows only the new round (round counter starts at question 1, no extra `g-ok`/`g-no` flash).

## 5. Release check

- [ ] 5.1 Full node and e2e runs pass locally against `_site`, then live. Verify: CI and the post-deploy E2E workflow are green; manual phone check of two Arena rounds and a Duel rematch.
