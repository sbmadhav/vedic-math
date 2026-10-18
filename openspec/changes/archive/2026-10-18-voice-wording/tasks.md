# Tasks

## 1. Review

- [x] 1.1 Sample every spoken source and keep one example per template (design, Review). Round 1 had 4,486 templates and 1,735 flagged; round 2 had 3,989 templates and 69 flagged.
  - Verify: the counts and fix classes are in `design.md`.

## 2. normalize() rules

- [x] 2.1 `js/voice.js` `normalize()`:
  - group brackets by what they hold (function argument, aside, point, term, group of terms with a comma pause and "all");
  - powers, roots and denominators keep their grouping;
  - the negative rules;
  - ordinals, fraction names to hundredths, money with cents, clock times, ellipses, vectors, matrices, unicode powers and what to type.

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

## 5. Owner answers (2026-10-17)

- [x] 5.1 Fractions say "fourths": `denomWord(4)`, ¼ and ¾, `lib.js` `denomName`, and the guide's "3 fourths".
  - Verify: `test/voice-normalize.test.mjs` "fourths" and "ordinal and denominator words".
- [x] 5.2 Speed trick steps and questions are clean on screen (`js/vedic.js` `lin()`): "x − 12", not "1x + -12"; no "+ -", "- -" or 0x terms. The same is done for the 9-expand, 11-inverse and 12-integral hints.
  - Verify: `test/katas.test.mjs` "speed trick steps and questions are written in clean form" checks every Kata question and step and the animator at edge inputs. `test/support/verify.mjs` still works out every Kata answer from the new question text.
- [x] 5.3 No "the quantity": a group of terms gets a comma pause, with "times," before it after a number and "all" before a power or "over".
  - Verify: the table cases "number times a sum (owner example)", "product of brackets" and "power of a bracket".

## 6. Release

- [x] 6.1 `docs/prototypes/voice/tools/inventory.mjs` samples `say` when present.
- [x] 6.2 Run the full suite and the build: `node --test 'test/**/*.test.{js,mjs}'`, `python3 build.py --out /tmp/vw-site`, and `cd e2e && npx playwright test read-aloud practice arena star games dojo`.
- [x] 6.3 Explorer lines can be sampled for a listen before release. (The automated part: the listening prototype in docs/prototypes/voice samples the lines; the owner merged #43 on 2026-10-17. The device listen is 6.5.)
- [x] 6.4 After release, archive this change. Then `openspec/specs/read-aloud-wording/spec.md` describes what is live. (Archived in this PR; openspec/specs/read-aloud-wording/spec.md now describes what is live.)
- [ ] 6.5 Owner follow-up after archiving: listen to a sample of Explorer lines on a device.
