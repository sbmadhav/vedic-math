# Design

The tasks note says this change needed no design.md (one function and its markup). This file exists only to record the decisions made while implementing it.

## Decisions made during implementation

Made without the owner (asleep, merge authorized); each is small and reversible.

- **One try per side per question.** A miss freezes that side for 1.2 seconds (`DUEL_FREEZE_MS`) and also takes it out of the current question. If the freeze ends before the question is settled, the side still waits for the next question. Otherwise a Player could keep guessing every 1.2 seconds through four choices, and "both sides missed" might never happen. The side stays dimmed until it can answer again.
- **A freeze can run into the next question.** If Player 2 wins the question 0.3 seconds after Player 1's miss, Player 1 stays frozen for the rest of the 1.2 seconds on the new question, so a miss always costs the same time.
- **"Briefly" is 1.2 seconds.** When both sides miss, the right answer is shown on both sides for `DUEL_REVEAL_MS` = 1.2 s: the right choice is outlined and a line says it ("It was 7!" for Explorer, "Answer: 7" for Challenger and Pro, through `fx.t()`). Taps are ignored during the reveal, then both sides get the next question.
- **Pure flow as functions, not an object with methods.** `duelStart()`, `duelAnswer(state, item, side, value)` returning `{ state, event }`, `duelUnfreeze(state, side)` and `duelNext(state)` in `js/arena.js`. The timers stay in `runDuel()`, on the Duel's signal from `view-cleanup-contract`. `duelAnswer` takes the current item rather than the whole set, so it is pure and does not know how items are dealt.
- **Which questions have a picture.** "When it has one" means the item's `viz` from `makeSet()`. As in the Arena, that keeps pictures for the Explorer League only. Challenger and Pro items come without them, and a Duel shows exactly what the same League sees in the Arena.
- **Frozen dims the question and choices, not the answer line.** `.duel-side.frozen` used to set the opacity of the whole side. It now dims every child except the revealed answer, so after two misses the answer stays readable on both sides.
- **The "screenshot check at 390 px" is a layout assertion plus an attached screenshot,** not a pixel baseline. Baselines would differ between macOS and the Linux CI runners. The Playwright spec sets a 390 px viewport in light and dark, turns on face to face, and checks three things: each picture lies inside its side, the page does not scroll sideways, and only the top side is rotated. It attaches the screenshot to the report.
- **The rematch spec from view-cleanup-contract** now uses the same seeded-duel helpers as the new specs. They read the answer from the shared question, so it works with the new dealing.
- **Release check 3.1.** The manual two-person tablet check is covered by the Playwright face-to-face specs (390 px, both schemes) and the `mobile` project against a production-like local build. The live post-deploy E2E run is checked after the merge.
