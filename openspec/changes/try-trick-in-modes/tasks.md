# Tasks

Owner asked for this on 2026-10-21 (approval for implementation, see `proposal.md`). Unit tests run with `pnpm test` (Vitest, legacy tests through `test/support/node-test.mjs`). Playwright runs on chromium, webkit and mobile against a local build: `python3 build.py && node e2e/local-server.mjs 8350 _site`, then `cd e2e && BASE_URL=http://localhost:8350 pnpm exec playwright test`.

## 1. The three Try a tricks (`js/try.js`, pure)

- [x] 1.1 `TRY` per Mode (Trick, Sutra, copy, worked example, three questions, steps, answers, next step), `tryFor`, `sutraOf`, `choicesFor`, `finished`. Verify: `test/try.test.mjs`: each Trick is filed under its Sutra in both `js/vedic.js` and `js/sutras.js`; worked examples 253, 1225 and 9312 end their steps; every answer is right and no question is the example; Explorer sums under 10 and the digits-with-sum-between rule holds; three distinct choices, never below 0; no em dash or Vedas claim, the 1965 book credited, Explorer sentences at most 10 words; the only literal spoken lines are the two recorded ones.

## 2. The lesson (`js/try.js` `runTry`, `js/app.js`, `math.css`)

- [x] 2.1 `runTry()`: the card (Sutra with Say it, why line, steps at once, start button focused, announced once, Escape starts), three questions (typed with one try, or Explorer's three buttons with a second try), Next after each result, the end card (count, Sparks, next step, deep dive link) and the seen mark; on child signals through `js/life.js`. Verify: `test/lifecycle-scan.test.mjs` ("Try a trick (js/try.js)"); `e2e/tests/try-trick.spec.ts`; `e2e/tests/cov/first-visit-3.spec.ts`.
- [x] 2.2 `#/try` and `tryView()`; the route view `math/view/try`; the Guide's Play modes section covers `#/try`. Verify: `test/metrics.test.mjs` (route sample), `test/guide.test.mjs` (every route covered).
- [x] 2.3 Sparks and the day only: `addSparks`, `touchDay`, `metrics.answered('try', ok)`; no `store.record`. Verify: `try-trick.spec.ts` "a right answer earns 10 Sparks ... nothing else changes" (skills, Ratings, `last` and Stars unchanged).
- [x] 2.4 CSS with tokens only: `.mode-opt`, `.mode-try`, `.try*`, the sandwich; the hero button rules and `.star-intro*` removed. Verify: `pnpm lint` (stylelint); screenshots at 320, 375 and 390 px in Daybreak and Deep Space (picker, each card, a miss, the end, Home), checked by eye and kept out of the repo; no sideways scroll (`try-trick.spec.ts`, five widths); axe on the picker and on each Mode's card, question, miss and end in both schemes (`e2e/tests/a11y.spec.ts`).

## 3. Entry points (`js/app.js`, `js/fx.js`, `js/store.js`, `js/metrics.js`)

- [x] 3.1 The picker: no hero button, "Pick who is playing", a Try a trick under each card named "Try a trick as <Mode>", picking that Mode and opening `#/try`. Verify: `try-trick.spec.ts` "the Mode picker"; `e2e/tests/first-visit.spec.ts` "the picker"; `e2e/tests/hero.spec.ts` "app home (the Mode picker)"; `test/brand.test.mjs`.
- [x] 3.2 Home's Try a trick card after the doors (after the tiles in Explorer), not primary, until finished; counted as a Try a trick pressed. Verify: `try-trick.spec.ts` "Home shows the Try a trick card ..." and the Pro Home test; `first-visit.spec.ts` "Home: three doors first" unchanged and passing.
- [x] 3.3 No Mode guess written: `fx.setMode(m)`, `store.setPlayerMode(m)`; an old guess still read and cleared by a pick. Verify: `test/store.test.mjs`; `e2e/tests/cov/first-visit-1.spec.ts` (Home after the trial, Picking clears the guess, Try a trick sets no guess).
- [x] 3.4 `metrics.tryStart(mode)`: `math/try/start` then `math/try/mode/<mode>` (a Mode word only); the `try` answer area. Verify: `test/metrics.test.mjs`; `e2e/tests/cov/analytics-11.spec.ts`, new `e2e/tests/cov/analytics-12.spec.ts`.
- [x] 3.5 Back home from a Star opened from the end of a Try a trick. Verify: `try-trick.spec.ts` "Play Star 1 from the end card"; `cov/first-visit-1.spec.ts` "After the trial".

## 4. Retire the trial Star

- [x] 4.1 Remove `starIntro()`, `teach()`, `runStar({ intro })`, `starView.introFor`, `firstStarHref()` and their tests (`test/star.test.mjs`, `e2e/tests/try-trick-teaches.spec.ts`); rewrite `e2e/tests/first-visit.spec.ts`, `cov/first-visit-1`, `cov/first-visit-2` and `cov/first-visit-3` for the new path. Verify: the suites in section 5.

## 5. Docs and checks

- [x] 5.1 `GLOSSARY.md` (Try a trick, Mode guess); `placement` design decisions 9 and 10 and tasks 3.1, 4.2 and 4.3; `find-and-home-polish` scenarios and design note. No spoken line changes (no studio voice re-record). Verify: `openspec validate try-trick-in-modes --strict`, `openspec validate placement --strict`, `openspec validate find-and-home-polish --strict`.
- [x] 5.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py --out /tmp/vm-site`, and the full Playwright suite on the local server. Verify: the pull request lists the results.
- [ ] 5.3 After `try-trick-teaches` and `celebrations` are archived on main: merge main, re-run `openspec validate try-trick-in-modes --strict` (the REMOVED requirements then exist in `openspec/specs/first-visit/spec.md`).
- [ ] 5.4 After release: `openspec archive try-trick-in-modes -y`.
