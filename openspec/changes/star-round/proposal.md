# Proposal

## Why

The owner wants teaching to be instant and mistakes to be rewarded: "made a mistake, learn and earn" (`docs/star-quest.md`, the ask). Today a miss in Practice gives "Not quite. Try once more", a hint, then a list of steps (`practice()`, `js/app.js:339-343`), and a Kata miss shows the answer and three lines of text (`kataView`, `js/app.js:464`). Nothing rewards fixing a mistake, nothing invites a harder try, and the Trick animator (`mountAnimator`, `js/app.js:1054`) only runs on the Trick page, never on the number the Player just got wrong. The grilling settled what a Star is (decisions 7, 10 to 19 and 21), and the prototype (`docs/prototypes/star-quest/index.html`) shows the look: one stage, Bolt's six poses, a spark meter, the replay, the Dare card and Calm.

This change builds one Star end to end, so it can be played and tested before the Sky exists (`sky-home`).

## What Changes

- **Stars:** each of the 21 Tricks gets three Stars (63 in all), drawing from thirds of its 50 Katas (1 to 17, 18 to 34, 35 to 50). Every Star is open.
- **A Star round:** 4 main questions, freshly drawn and shuffled each round, avoiding the previous round's questions on that Star. The Trick's own Rating (its Skill Rating, shared with Practice) picks where in the third they come from, and moves with the answers.
- **Sparks in a Star:** right first time 10, Comeback 15, Dare 20; 40 earned in one round lights the Star. A lit Star stays lit and still pays when replayed.
- **The mistake loop:** a miss replays the Trick step by step on the missed question's own numbers (skippable by button or Escape), then a rematch of the same kind. A right rematch is a Comeback (once per kind of question per round); a missed rematch shows the answer and moves on.
- **Dare:** from question 2, one optional harder question per round; right pays 20, a miss costs nothing and still replays the Trick.
- **Skip:** "Skip this Star" marks it skipped (not if lit) and earns nothing.
- **Answer entry:** on-screen keypad and keyboard; digit boxes show the answer's digit count in Challenger, nothing in Pro.
- **Back by button only:** the end screen offers Play again and Back; it never navigates on its own.
- **Bolt:** one inline SVG with six poses (idle, think, surprised, explain, cheer, wink), token colors; it also replaces the current fixed `BOLT` drawing in Practice and Kata bubbles.
- **Video offer:** after two misses in a round, Bolt offers one short in-page video for the Trick, once per round, earning nothing. Until `watch-shelf` ships, the lookup finds nothing and no offer appears.
- **Calm path:** every replay, burst and lighting has a no-motion path (reduced motion, the site-wide motion pause, or Calm), and every result and replay step is announced to screen readers.
- **Entry points** until the Sky exists: the three Stars on each Trick page and in the Dojo, for Challenger and Pro.
- Analytics: Star answers send `q_answered/star/...`; the route `#/star/<trick>/<n>` is counted as `star/<trick>/star`.

Out of scope:

- The Sky, Constellations, Belts by Stars, migrating Kata progress into lit Stars, and the Star Quest counts (lit, skipped, Comeback, Dare): `sky-home`.
- The Hook before a new Player's first Star: `hook-first-star`.
- The full-screen shell, the Calm toggle and text size: `game-shell-and-calm`. This change honors Calm when it is on but adds no switch.
- The video data and player rules: `watch-shelf`.
- Explorer Stars (Explorer gets its own Constellations, with prompts read aloud, in a later change).
- Changing Katas themselves; they stay as they are in the Dojo.

Affected: Challenger and Pro Players (Stars on Trick pages and in the Dojo). Explorer Players only by direct link. Every Player's Trick Ratings now also move from Star rounds.

## Capabilities

### New Capabilities

- `star-round`: what a Star is, how a round is dealt and scored, the mistake loop, Comeback, Dare, Skip, Bolt, the video offer, Calm and announcements, and where Stars are offered.

### Modified Capabilities

- `ratings`: ADDED "A Star uses its Trick's Rating".
- `analytics`: MODIFIED "Answer events in untimed play" (Star rounds) and "Route views are counted" (the Star route).
- `answer-display`: MODIFIED "Fraction answers are shown as fractions" (Star rounds).

## Impact

- New `js/star.js`: the round as a pure state machine (`starRound()`, `starAnswer()`, `starNext()`) plus `runStar(root, opts)` that draws it; new `js/bolt.js`: the SVG and `pose()`.
- `js/levels.js`: `STAR_THIRDS`, `starPool(trick, star, rating)`, `dareFor(trick, star)`, `kindOf(problem)`; `kata()` problems also carry their `vals`.
- `js/store.js`: `sky` progress (`lit`, `skipped`, `last`), `starState()`, `lightStar()`, `skipStar()`, `starLast()`; `record()` gains `{ sparks: false }`.
- `js/app.js`: route `#/star/<trick>/<n>` and `starView()`; Stars on `skillView()` for Tricks and in `dojoView()`; `BOLT` replaced by `bolt.js`.
- `js/fx.js`: `noMotion()` (reduced motion, `html.motion-paused`, or the saved Calm preference) and `announce()`.
- `js/metrics.js`: `ANSWER_AREAS` gains `star`; route template for `#/star/...`.
- `math.css`: Star stage, keypad, digit boxes, spark meter, Dare card, Bolt poses, bursts, with `prefers-reduced-motion`, `html.motion-paused` and `body.calm` rules.
- Tests: new `test/star.test.mjs`, `test/bolt.test.mjs`; `test/katas.test.mjs`, `test/metrics.test.mjs`, `test/lifecycle-scan.test.mjs` (covers `js/star.js`); Playwright new `e2e/tests/star.spec.ts`, plus `analytics.spec.ts`, `a11y.spec.ts`, `privacy.spec.ts`, `routes.spec.ts`.
- Nothing new is sent: Star progress stays on the device with the rest of progress, and only the weekly Sparks total (already described) can change. `parentNote()` and `cloud/README.md` need no change.
- **Order:** after `sparks-replace-xp` (uses `addSparks()` and the free word "star"). Before `sky-home`, `hook-first-star` and `game-shell-and-calm`, which build on `js/star.js`. Independent of `watch-shelf`, which plugs the real video lookup into the offer.
