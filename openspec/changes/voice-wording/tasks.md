# Tasks

## 1. Review

- [x] 1.1 Sample every spoken source and keep one example per template (design, Review). Round 1 had 4,486 templates and 1,735 flagged; round 2 had 3,989 templates and 69 flagged.
  - Verify: the counts and fix classes are in `design.md`.

## 2. normalize() rules

- [x] 2.1 `js/voice.js` `normalize()`:
  - group brackets by what they hold (function argument, aside, point, term, quantity);
  - powers, roots and denominators keep their grouping;
  - the negative rules;
  - ordinals, fraction names to hundredths, money with cents, clock times, ellipses, vectors, 2 by 2 matrices, unicode powers and what to type.

  It exports `ordinalWord()` and `denomWord()`.
  - Verify: `node --test test/voice-normalize.test.mjs`. Its table covers every fix class and the lines that were already right.
  - Verify: the sweep test in the same file runs every generator, seeded, and fails on leftovers: symbols, digits then letters, "10 what", doubled words, stray punctuation, or a sentence over 160 characters with no comma.

## 3. Spoken text for picture questions

- [x] 3.1 `fx.speakQuestion(p)` speaks `p.say || p.q`.
  - It is used for the Practice question, Hear it, the Kata question, Arena tap rounds and towers, and the Star question.
  - Arena items carry `say`.
- [x] 3.2 Add `say` to `1-compare`, `3-fraccmp`, `4-angles`, `3-area`, `5-volume`, `8-pyth` and `10-triangle`.
  - Verify: `test/voice-normalize.test.mjs` "a question with a say" checks that the seven Skills have a `say` that differs from `q` and has no "blank".
  - Verify: Playwright `e2e/tests/read-aloud.spec.ts`:
    - Explorer `1-compare` is heard as "Compare a and b. Which sign goes in the box ..." while the screen keeps the box.
    - Hear it on `8-pyth` says the sides.
- [x] 3.3 `js/app.js`: after a second wrong try, read the hint that is shown.
  - Verify: `read-aloud.spec.ts` "after a second wrong try the voice reads the hint that is shown" (`k-sub10`).

## 4. Screen fixes

- [x] 4.1 Fix the screen text:
  - "Keep the thirds" (`lib.js` `denomName`);
  - "1 star";
  - "an octagon" and "an 8% sales tax";
  - "1 tenth";
  - "2 red and 1 blue marbles";
  - "divided by x" with no "+ 0", in remainders and limits;
  - the empty "Subtract  from both sides" hint;
  - the four thirds sphere formula.
  - Verify: `node --test 'test/**/*.test.{js,mjs}'`.
    - `test/support/verify.mjs` still checks every challenge answer.
    - The two Explorer daily set snapshots in `test/arena.test.mjs` were retaken. The questions and answers are the same; only "1 marbles" and "1 stars" changed.

## 5. Release

- [x] 5.1 `docs/prototypes/voice/tools/inventory.mjs` samples `say` when present.
- [x] 5.2 Run the full suite and the build: `node --test 'test/**/*.test.{js,mjs}'`, `python3 build.py --out /tmp/vw-site`, and `cd e2e && npx playwright test read-aloud practice arena star games dojo`.
- [ ] 5.3 Owner listens to a sample of Explorer lines on a device before release.
- [ ] 5.4 After release, archive this change. Then `openspec/specs/read-aloud-wording/spec.md` describes what is live.
