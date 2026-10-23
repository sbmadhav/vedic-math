# Proposal

## Why

The landing's lede promises "Learn a mental math trick in a minute, then race the clock with it", but Try a trick opens Star 1 of Bolt's first Trick (today `from9`, "Subtract from 100, 1000, 10000") straight on a question such as "100 − 84 = ?". The Trick is shown only after a miss. A curious visitor who has never heard of "all from 9 and the last from 10" is asked before they are taught, so the first thing the trial teaches is that they got it wrong.

The owner chose this fix (option 3) on 2026-10-20: a small new change, separate from `hook-first-star` (which stays superseded by `placement`), so that Try a trick teaches before it asks. It awaits the owner's review of its pull request.

## What Changes

- **The trial Star teaches first.** When Try a trick opens its Star, the round starts on one card before the first question: the Trick's name, its one-line idea, a worked example on concrete numbers (for `from9`, for example, "100 − 84": the digits of 84; 9 − 8 = 1, 10 − 4 = 6; so 100 − 84 = 16), and one button, "Start the Star". The example is a problem of the Star's own band that the round does not deal, so the four questions stay fresh.
- **Accessible and still.** The Start button takes focus and Enter or Space starts; Escape also starts, as it ends a replay. The card is announced once through the polite live region. Every step is shown at once: nothing moves and nothing times out, so Calm and Pause motion see the same card.
- **Only on the Try a trick path.** A Star opened from Home, the Dojo, the Sky, a Trick page or a link, a Play again, and a reload of the trial Star go straight to the first question, as today.
- **The landing promise stays honest.** The lede and the "About two minutes" line do not change; the trial now does what they say.

Out of scope:

- The Hook (the calculator dare and reveal) and Placement: they stay in `placement`. See design for how `placement` absorbs this card.
- Any new spoken line. Read aloud reads the first question as today; the card itself is not spoken, so no studio voice recording is needed.
- New analytics events. `math/try/start` and the Star's route view already mark the trial.
- Changes to the Star round's rules, Sparks or Ratings.

Modes and Players affected: new visitors who press Try a trick (Challenger as a guess). No change for Players who picked a Mode card, for Explorer (no Stars), for Pro, or for returning Players opening Stars anywhere else.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `first-visit`: Try a trick's first tap now shows the worked example, and a new requirement says what the card holds, how it is reached by keyboard and screen reader, how it behaves under Calm and Pause motion, and that it shows only on the Try a trick path.

## Impact

- `js/star.js`: pure `starIntro(state)` (picks the worked example, marks it used); `runStar(..., { intro })` draws the card before `ask()`.
- `js/app.js`: Try a trick remembers its Star route in memory (`starView.introFor`); `starView` passes `intro` once.
- `math.css`: the card's few rules (tokens only; steps without their entry animation).
- Tests: `test/star.test.mjs` (`starIntro`); new `e2e/tests/try-trick-teaches.spec.ts`; `e2e/tests/first-visit.spec.ts`, `e2e/tests/cov/first-visit-1.spec.ts` and `e2e/tests/cov/analytics-11.spec.ts` press Start the Star after Try a trick; new `e2e/tests/cov/first-visit-3.spec.ts` for the new scenarios.
- Docs: `GLOSSARY.md` (Try a trick). Nothing new is sent or kept, so `parentNote()` and `cloud/README.md` do not change.
