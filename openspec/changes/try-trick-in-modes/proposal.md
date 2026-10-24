# Proposal

> **Approved by the owner.** On 2026-10-21 the owner asked: "The try a trick should be inside the 3 levels and it should teach or aligned to some novel vedic math sutra that is applicable." Earlier they said to build everything, move fast and not ask questions. That message is the owner's approval of this change for implementation; the decisions made on their behalf are recorded in `design.md`.

## Why

- **Try a trick sits outside the Modes.** The landing (the Mode picker) has one primary Try a trick button above the three Mode cards. It guesses Challenger for everyone, so a 5-year-old who presses it gets a Challenger Star with typed answers, and a grown-up gets the same Star as a 9-year-old. The three levels are the Modes; the trick should belong to the level the Player is in.
- **It does not teach a Sutra.** The trial Star is Bolt's first Trick, `from9` ("all from 9 and the last from 10", subtract from 100), the one trick every Vedic math site shows first. Its new worked example (`try-trick-teaches`) shows the steps but never says which Sutra they come from or why. A newcomer's first minute should be the surprise that Vedic math is known for, with the Sutra named and explained.

## What Changes

- **Try a trick inside every Mode.** Each Mode card on the Mode picker gets its own Try a trick button under it, and each Mode's Home shows a Try a trick card until the Player has finished that Mode's one. The single Try a trick button above the cards goes, and with it the Mode guess: pressing a card's Try a trick picks that Mode, as the card does.
- **One Sutra per Mode, really applied.** Each Try a trick (route `#/try`, for the Player's Mode) teaches one Trick from Bharati Krishna Tirtha's 1965 book under the Sutra it belongs to in the app's own Sutra data:
  - **Explorer: "The 11 sandwich"**, a special case of Ūrdhva-Tiryagbhyām (vertically and crosswise). 23 × 11: split 23 into 2 and 3, add them (2 + 3 = 5, the crosswise part), put 5 in the middle: 253. The questions keep the sum under 10, and the Explorer taps one of three big number buttons for the middle.
  - **Challenger: squares of numbers ending in 5**, Ekādhikena Pūrveṇa (by one more than the one before). 35²: the digit before the 5 is 3, one more is 4, 3 × 4 = 12, then 25: 1225.
  - **Pro: multiplying numbers near 100**, Nikhilaṃ Navataścaramaṃ Daśataḥ (all from 9 and the last from 10). 97 × 96: the sutra gives each distance from 100 (3 and 4), 97 − 4 = 93, 3 × 4 = 12: 9312.
- **Teach, then try.** Each Try a trick opens on one card: the Trick in the Mode's words, the Sutra's name with its Say it button, its meaning and one line on why this Trick is that Sutra, and the worked example with every step shown at once. One button starts three questions, none of them the worked example. A miss shows the Trick's steps on that question's numbers (Explorer first gets a second try). The end card shows how many were right, links to the Sutra's deep dive, and offers the next step: Star 1 of the same Trick for Challenger and Pro, Home for Explorer (no Stars).
- **A lesson, not practice.** Right answers earn 10 Sparks each and count the day, as play does; nothing changes a Rating, mastery, Keep going, a Star or a Belt.
- **Reachable and still.** The start button takes focus (Enter, Space or Escape start), each question takes focus, results are announced in the polite live region, and nothing moves or waits, so Calm and Pause motion see the same screens. Under motion a right answer flies a few sparkles, which stop under no motion.
- **Nothing new is spoken.** The cards and questions are not read aloud. The Sutra name plays its existing name clip only after a tap on Say it, and an Explorer with Read aloud on hears only the two lines already recorded ("You got it!" and "Not quite. Try again!"). No studio voice re-record is needed.
- **Analytics.** `math/try/start` stays, sent once for each Try a trick pressed; `math/try/mode/<mode>` (a fixed Mode word, like `math/landing/mode/<mode>`) says which Mode's; the route view is `math/view/try`; each answer sends `math/q_answered/try/<right|miss>`, so the first right answer still counts as `math/first_win`.
- **Retired:** the Mode guess written by Try a trick, the trial Star's worked example card (`starIntro()`, `runStar({ intro })`, `starView.introFor`) and their tests. A Player record that still carries a guess from before keeps its "our guess" note until a Mode is picked.

Out of scope:

- Placement, the Hook and the grade question (`placement`, `age-bands`). How they fit is in `design.md`; `placement`'s design and tasks are updated for the new first visit.
- The landing page at `/` (its Mode cards are links to `/play/?mode=<id>`, which open Home, where the Try a trick card is).
- A spoken Try a trick. Recording its lines whole is for the owner to approve and pay for (listed in `design.md`, open items).

Modes and Players affected: new Players in every Mode (the picker and Home), Explorer included; returning Players see the Home card once for each Mode they have not tried. Players whose record holds a Mode guess keep seeing it named until they pick.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `first-visit`: Try a trick moves from one guessed-Challenger Star before any choice to one Sutra lesson inside each Mode (the Mode picker's cards and each Mode's Home); the picker's lede, cards and hero ("One plain lede, and the Mode cards stay", "The app's hero says little") are restated without the single button; "Home fits a phone" and "Keep going does not repeat the first door" follow the new path; the Mode guess is no longer set; Back from a Star opened at the end of a Try a trick goes Home.
- `analytics`: Try a trick also names its Mode with a fixed word; answers in a Try a trick are counted as untimed answers.

## Impact

- New `js/try.js`: the three Try a tricks as data (pure, node-tested) and `runTry()`, which draws them on the view's signal through `js/life.js`.
- `js/app.js`: the Mode picker (a Try a trick under each card, no hero button), `#/try` and `tryView()`, the Home Try a trick card, Back home from a Star opened at the end of a Try a trick; `starView.introFor` removed.
- `js/star.js`: `starIntro()`, `teach()` and the `intro` option removed.
- `js/fx.js`, `js/store.js`: `setMode()` and `setPlayerMode()` no longer take `guess`; `modeGuessed()` still reads an old record.
- `js/metrics.js`: `tryStart(mode)`, the `try` answer area, the `#/try` route view.
- `math.css`: the picker's card and button pairs, the Try a trick card, steps and the Explorer sandwich (tokens only); the hero button's rules removed.
- Tests: new `test/try.test.mjs`; `test/star.test.mjs`, `test/store.test.mjs`, `test/metrics.test.mjs`, `test/lifecycle-scan.test.mjs`; new `e2e/tests/try-trick.spec.ts`; `e2e/tests/first-visit.spec.ts`, `e2e/tests/hero.spec.ts`; `e2e/tests/try-trick-teaches.spec.ts` removed; cov `first-visit-1`, `first-visit-2`, `first-visit-3`, `first-visit-4` and `analytics-11` rewritten for the new scenarios, new `analytics-13` (`analytics-12` went to install-app); `test/brand.test.mjs` and `test/guide.test.mjs` follow the picker and the new route.
- `js/guide.js`: the Play modes section covers `#/try`.
- `docs/perf/baseline.json`: first load raised by 4,166 bytes Brotli for `js/try.js` (design, risks).
- Docs: `GLOSSARY.md` (Try a trick, Mode guess); the `placement` plan where it names the old Try a trick (decisions 9, 10 and 14). Nothing new is sent beyond fixed words, and nothing new is kept beyond a seen mark in the Player's progress, so `parentNote()` and `cloud/README.md` do not change.
