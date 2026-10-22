# Tasks

Prerequisites (owner Q15: build after the move): `learnvedicmath` is archived (the game at `/play/`, modules at `/js/`, Parent step retired); `better-voice` Part B is merged (Studio voice); `sky-home` and `star-round` are archived. Before starting, check every path below against the moved layout and fix this file if it differs. `hook-first-star` is superseded by this change and is never applied.

## 1. The engine (`js/placement.js`, pure)

- [ ] 1.1 `STEPS`, `startStep(mode)`, `placementStart({ mode, rand })`, `placementAnswer(state, ok)`, `placementResult(state)` (`{ grade, steps }`) as in design decisions 2 and 3. Verify: new `test/placement.test.mjs`: start steps K, 3, 8; right climbs one step; a miss stays and the next Skill differs; the second miss at a step ends; 12 questions end; a right answer at 12 ends; result is the highest step right, or the step below the start (K for Explorer) when none; `steps` equals right answers; Challenger with 9 rights asks grade 12 tenth.
- [ ] 1.2 `PLACEMENT_POOL` (design decision 2 table). Verify: `test/placement.test.mjs`: every step K to 12 has at least 2 Skills, every id exists in `byId` with that grade and is not a Trick, and for 200 seeds each Skill's level-2 question (after the integer redraw) has a whole-number answer or is a choice question with its answer among its choices.
- [ ] 1.3 `threeChoices(p, rand)` (decision 4). Verify: `test/placement.test.mjs`: for every pool Skill and 200 seeds, 3 distinct values, exactly one equal to the answer, none negative, numbers in ascending order.
- [ ] 1.4 `LEVEL_START`, `skillStart(grade, level)`, `beltFor(level)` (decision 6) and `raiseOnly(record, level)` (decision 7). Verify: `test/placement.test.mjs`: `LEVEL_START[MODES[m].grades[0]] === START[m]` for each Mode; `skillStart` 10, 5, 1 below, at and above; `beltFor` K to 3 white, 4 and 5 yellow, 6 orange, 7 blue, 8 purple, 9 to 12 black, and that it follows `BELTS` (computed from Trick grades, not a typed table); `raiseOnly` raises only lower Ratings, never lowers, leaves `medals`, `sky`, `belts`, `skills` and `sparks` deep-equal, and moves `placedBelt` only forward.

## 2. Ratings and suggestions

- [ ] 2.1 `js/adapt.js`: `rating(key, mode, fallback, { practice })` and `skillRating(id, mode, { practice })` use the Placement level only when `practice` is true and no Rating or mastery band applies. Pass `practice: true` from `practice()`, Endless runs, `runStar()`, game Endless practice and Arena Practice and "Practice, no clock"; the daily Arena and Ranked game rounds do not pass it. Verify: `test/adapt.test.mjs`: every scenario of the modified `ratings` requirement (Explorer at grade 5 Endless Make ten starts 7, Ranked starts 1, Challenger at grade 3 starts 5, `4-mult2` for a grade 6 Challenger is level 2, mastery band still wins).
- [ ] 2.2 `js/store.js`: `placement()`, `setPlacement({ grade, steps })` on the Player's record (kept by `exportData` and `importData`), `placementCard()`; `placedBelt` written with `updatePlayer`. Verify: `test/store.test.mjs`: round trip through the backup code; a record without the fields loads as before.
- [ ] 2.3 Skill map "Suggested for you" (L - 1 to L + 1) and Explorer's "Start here" tile. Verify: `e2e/tests/placement.spec.ts`: a seeded Explorer at grade 3 sees "Start here" first, opening a grade 3 Skill; a seeded Challenger at grade 6 sees grades 5, 6 and 7 under "Suggested for you"; an unplaced Challenger still sees "Suggested for Challenger".

## 3. The screens (`js/placement-view.js`, route `/play/#/placement`)

- [ ] 3.1 First-visit flow: Mode pick, offer (Start, "Skip, just play"), climb, result ("You climbed N steps! Bolt will start you there.", Let's go), home. Every listener and timer on the view's `signal` through `js/life.js`; each question under `child(signal)`. Verify: `test/lifecycle-scan.test.mjs` covers the new file; `placement.spec.ts`: a new visitor picks Challenger and sees the offer before home; Skip lands on home with no saved Placement and Arena Practice at 9 (Pro); leaving mid-climb saves nothing and shows no offer on home; a new Player added in Me gets the offer; a new visitor who presses a card's Try a trick (`try-trick-in-modes`) plays it first and gets the offer when it ends, instead of its Back home.
- [ ] 3.2 The climb: no clock, no hints, neutral miss line, "I'm not sure", Explorer 3 big buttons at every step, Challenger and Pro usual entry. Verify: `placement.spec.ts` with a seeded `rand` (test hook `window.__vmSeed`, already used by other specs, or add one): an Explorer reaching grade 6 sees exactly 3 buttons and no input; a Pro gets the Pro entry; after `page.clock.fastForward(300000)` the question still waits; a miss shows no answer.
- [ ] 3.3 Read aloud (design decision 5). Verify: `placement.spec.ts` with a `speechSynthesis` and Studio-audio spy (the pattern in `e2e/tests/read-aloud.spec.ts`): Explorer's first question is spoken after Start with no other tap, "Hear it again" speaks it again, nothing is spoken with Read aloud off until the replay button; Challenger speaks only on Hear it.
- [ ] 3.4 Result and grown-up wording: the kid result never names a grade; Me's small print "about grade N" with Retake; `parentNote()` sentence (decision 12). Verify: `placement.spec.ts`: result text contains "3 steps" and no "grade"; Me shows "about grade 5"; the parent note of a grade 9 Player says "Algebra 1"; an unplaced Player's note has no "Placement".
- [ ] 3.5 Existing Players' card and raise-only; Retake. Verify: `placement.spec.ts`: a seeded Player with Sparks sees the card once (Not now retires it; Me still offers "Find your level"); after a seeded climb to grade 5, Make ten Rating 2 becomes 7 and a Rating of 12 stays 12, Medals unchanged; a lower retake shows the lower grade and changes no Rating.
- [ ] 3.6 Calm, motion and screen readers (decision 13). Verify: `placement.spec.ts`: with `reducedMotion: 'reduce'` and with `vm.calm = '1'`, `document.getAnimations()` is empty while climbing; focus moves to each question heading; the live region announces the step and the result. `e2e/tests/a11y.spec.ts`: the offer, a question (Explorer and Pro) and the result, in both color schemes, with no serious or critical violations; 320 px reflow.

## 4. First Star and the Hook (from `hook-first-star`)

- [ ] 4.1 Placement writes `placedBelt = beltFor(level)` (forward only for existing Players); Bolt's suggested Star follows. Verify: `placement.spec.ts`: a new Challenger placed at grade 5 sees Bolt at `sq5` Star 1 on the Sky and in the Dojo card; at grade 8, a purple belt Trick.
- [ ] 4.2 `js/hook.js`: `HOOK_DARES`, `calcKeys`, `isNewPlayer()`, `S.hookSeen` (hook-first-star tasks 1.1 and 1.2). Verify: new `test/hook.test.mjs` as written there, plus: `isNewPlayer()` is still true after a finished Placement and after a finished Try a trick (`try-trick-in-modes`: it earns Sparks but records no answer, so the Sparks condition of hook-first-star is left out, design decision 10).
- [ ] 4.3 `runHook()` and `runStar(..., { hook })` with the easiest-first round (hook-first-star tasks 2.1 and 2.2). Verify: new `e2e/tests/hook.spec.ts`, every case listed in hook-first-star task 2.1, plus: a new Challenger placed at grade 5 opening the suggested Star gets the dare; a new Pro placed at grade 8 gets no Hook, then none on `from9` either. `test/star.test.mjs`: `starRound({ easiestFirst: true })`. Also: after a finished Try a trick (`#/try`), Play this Star on Home still opens with the Hook (a Try a trick records no answers).
- [ ] 4.4 The Hook in Calm, motion and for screen readers (hook-first-star task 3.1 and 3.2). Verify: as written there, in `hook.spec.ts` and `a11y.spec.ts`.
- [x] 4.5 Superseded (decision 14): `try-trick-in-modes` removed Try a trick's worked example card, so there is nothing for `starView` to pass or the Hook to replace. Nothing to build here.

## 5. Privacy and analytics

- [ ] 5.1 `metrics.placementDone()` sends `math/placement/done` with a fixed title; nothing on Skip; Placement answers send no `q_answered` or `first_win` and change no counters. Verify: `test/metrics.test.mjs`: the path passes the event-contents check; `e2e/tests/analytics.spec.ts`: a finished climb sends exactly one `placement/done` plus the route view, a Skip sends none, and `first_win` is still sent on the first Practice right answer afterwards.
- [ ] 5.2 Nothing leaves the device. Verify: `e2e/tests/privacy.spec.ts`: during and after a Placement no request contains the grade, the steps or an answer, and the fake Firebase records no write; `cloudLog(page)` is empty.
- [ ] 5.3 Update `parentNote()` (task 3.4) and `cloud/README.md` ("The Placement level is kept on this device with the rest of progress and is never sent"). Nothing new is sent, so the privacy policy in `docs/legal/` (learnvedicmath) only gains the same sentence.

## 6. Voice

- [ ] 6.1 Add Placement's fixed lines (offer, buttons, neutral miss lines, result templates with the step count) to the Studio voice's whole-line list and record them. Verify: `test/voice-coverage.test.mjs` (better-voice) includes them and stays at or above its coverage bar; `voice-wording`'s table reads every pool Skill's level-2 question correctly (add rows for any that do not).

## 7. Docs

- [ ] 7.1 `GLOSSARY.md`: drop "(Proposed in the `placement` change.)" from Placement, Placement level, Step and Hook once live. `docs/PLAN.md`: replace the Placement row (Age answer, grade picker and 3 items) with this design. ADR 0001: reword its last consequence (Placement does not ask the Age answer). Mark `docs/adr/0007` accepted. Verify: reviewer reads the diff; `test/copy.test.mjs` passes (no em dashes).
- [ ] 7.2 `/opsx:archive placement` after release; delete `openspec/changes/hook-first-star/` in the same commit (it was never applied). Verify: `openspec validate --strict` passes and `openspec/specs/` gains `placement` and `hook`.

## 8. Release check

- [ ] 8.1 Node, build and Playwright suites pass locally (`node e2e/local-server.mjs` on the moved layout); after deploy the live E2E run is green. Before release, run the plan's Hook test with 3 to 5 children aged 5 to 14, a parent present, each taking Placement in their own Mode; note time to finish, steps climbed and whether any child was stuck on reading.
