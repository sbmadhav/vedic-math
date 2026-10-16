# Tasks

Prerequisites: `sparks-replace-xp` is merged (`addSparks()`, Medals instead of stars).

## 1. Pools, kinds and Dares

- [x] 1.1 `js/levels.js`: keep `vals` on each Kata problem; add `STAR_THIRDS`, `kindOf(p)`, `starPool(trick, star, rating)` and `dareFor(trick, star, exclude)`. Verify: `test/katas.test.mjs` "katas are deterministic" still passes (same problems, now with `vals`); new `test/star.test.mjs` cases: for all 63 Stars, every pool problem's Kata is inside its third; Rating 1 draws from Katas at the low end and Rating 20 at the high end of the third; every Dare comes from a harder Kata than the Star's band; for every Star at Ratings 1, 10 and 20, each of 50 dealt rounds has a same-kind rematch for each question (or the case is listed as an allowed fallback).

## 2. The round engine

- [x] 2.1 `js/star.js`: `starRound()`, `starAnswer()`, `starNext()` as pure functions with the events in design decision 5. Verify: `test/star.test.mjs`: four first-try rights give 40 and `lit`; miss then right rematch gives `comeback` +15; a second right rematch of the same kind gives +10 and no `comeback`; a different kind gives a second `comeback`; a missed rematch gives no replay and moves on; Dare is not offered before question 2, is offered once, +20 when won, and a lost Dare leaves Sparks and misses unchanged and returns to the same main question; `offer` fires once, after the second miss's replay, only when `videoAvailable`; skip on a lit Star keeps it lit.
- [x] 2.2 Dealing avoids the last round: `starRound({ last })` puts last-round keys at the back. Verify: `test/star.test.mjs`: 200 pairs of consecutive rounds on Star 1 of `sq5` share no question; with a pool of 5, the second round reuses at most 1.
- [x] 2.3 `js/store.js`: `S.sky`, `starState()`, `lightStar()`, `skipStar()`, `starLast()`, `setStarLast()`; `record(id, ok, hints, { sparks = true })`. Verify: `test/store.test.mjs`: lighting clears skipped; skipping a lit Star changes nothing; `record(..., { sparks: false })` updates counts and mastery and emits no `'sparks'` event; `exportData()` includes `sky`.

## 3. Bolt, no motion and announcements

- [x] 3.1 `js/bolt.js`: `BOLT_SVG`, `boltHTML(pose)`, `pose(el, name)` for idle, think, surprised, explain, cheer, wink; pose CSS in `math.css`; replace the `BOLT` constant in `js/app.js`. Verify: new `test/bolt.test.mjs`: the SVG has no `#` color literals, is `aria-hidden="true"`, and `pose()` rejects unknown names; Playwright `e2e/tests/dojo.spec.ts` practice-hint test still finds Bolt in the bubble.
- [x] 3.2 `js/fx.js`: `noMotion()` and `announce(text)`; `#vmLive` in `index.html`; `confetti()` uses `noMotion()`. Verify: node test with a stubbed `matchMedia`, `documentElement.classList` and `localStorage` for each of the three sources; Playwright `e2e/tests/star.spec.ts` (below) runs once with `reducedMotion: 'reduce'` and once with `html.motion-paused` set before load.

## 4. The Star view

- [x] 4.1 `js/star.js` `runStar()` and `starView()` in `js/app.js` with route `#/star/<trick>/<n>`; keypad, keyboard, digit boxes (Challenger, Explorer) or plain entry (Pro), `fields` and `choice` problems; replay with Skip and Escape; spark meter; Dare card; end screen with Play again and Back; all listeners and timers on the round signal. Verify: `test/lifecycle-scan.test.mjs` covers `js/star.js`; new Playwright `e2e/tests/star.spec.ts`:
  - four right answers on Star 1 of `sq5` (each answer computed in the test from the question text: n² for `sq5`) light the Star, show "+40 Sparks", and saved progress has `sky.lit['sq5:1']`;
  - a wrong answer shows the replay with the missed number in its first step, Escape skips it, a right rematch shows "Comeback" and the meter reads 15 more;
  - the Dare card is absent on question 1, present on question 2, a wrong Dare answer leaves the meter unchanged;
  - Challenger shows as many digit boxes as the current question's answer has digits (computed in the test), Pro shows none;
  - "Skip this Star" marks `sky.skipped['sq5:2']`, earns nothing, and the end screen waits: after `page.clock.fastForward(120_000)` the URL is unchanged;
  - with `reducedMotion: 'reduce'` no element in `.star-stage` has a running animation (`document.getAnimations()` empty) through a miss and a Comeback;
  - the live region announces "Comeback" and "15 Sparks".
- [x] 4.2 Video offer seam: `findVideo` option, `async () => null` from `starView()` (or `videoForTrick` from `js/watch.js` if `watch-shelf` has shipped). Verify: `test/star.test.mjs` (`offer` never fires when `videoAvailable` is false); Playwright `star.spec.ts`: two misses show no offer and the rematch follows.
- [x] 4.3 Entry points: Stars row on Trick pages (`skillView()`) and three Star links per Trick in `dojoView()`, hidden in Explorer. Verify: Playwright `e2e/tests/star.spec.ts`: Pro Trick page for `sq5` shows three Stars with states lit, skipped, open from seeded progress; Explorer Trick page shows none; `e2e/tests/routes.spec.ts` deep link `#/star/sq5/3` renders, `#/star/nope/1` falls back to the Dojo.

## 5. Ratings, analytics and privacy

- [x] 5.1 Dial per round from `AD.skillRating('v-' + trick)`, saved at round end and on destroy; lost Dare not counted. Verify: `test/star.test.mjs` (Dial hits per event); Playwright `star.spec.ts`: after a round of 4 rights, saved `ratings['skill:v-sq5']` is higher than before.
- [x] 5.2 `js/metrics.js`: `ANSWER_AREAS` gains `star`; route template `star/{trick:1}/star`. Verify: `test/metrics.test.mjs` route sample for `#/star/sq5/2`, answer area `star`; "every analytics call site in js/ builds paths only from allowed values" covers `js/star.js`; Playwright `e2e/tests/analytics.spec.ts` new test: a miss then a right rematch sends `math/q_answered/star/miss` then `.../right`.
- [x] 5.3 Stars post nothing. Verify: Playwright `e2e/tests/privacy.spec.ts` new test (adult Player): a full Star round leaves `cloudLog(page).writes` holding at most the weekly `xp-week-` total, and no request body contains `sky` or a Star key; record in the PR that `parentNote()` and `cloud/README.md` need no change.
- [x] 5.4 Accessibility. Verify: `e2e/tests/a11y.spec.ts` adds `#/star/sq5/1` (both schemes), during a question and during a replay, with no serious or critical axe violations.

## 6. Release check

- [ ] 6.1 Node, build and Playwright suites pass locally; after deploy the live E2E run is green. Manual check on a phone: a Star round is playable with the on-screen keypad without scrolling, in both color schemes.
