# Proposal

## Why

Four bugs make right answers look wrong, wrong inputs count as right, or the answer key unreadable. All four were verified against the current code (line numbers as of `origin/main` 272230c):

- **Bug 3, confirmed.** `normalize()` removes all whitespace last (`js/check.js:8`, `.replace(/\s+/g, '')`), so the mixed number `1 3/4` becomes `13/4` = 3.25 and is marked wrong. The grade 4 skill "Add and subtract like fractions" tells Players to "Rename as a mixed number if it is more than 1" (`js/skills/middle.js:143`), so following the lesson fails the check.
- **Bug 4, confirmed.** `answerText()` prints any non-integer `num` answer as a rounded decimal unless the problem sets `simplest` (`js/app.js:257`). "What fraction is shaded?" (`js/skills/middle.js:74`) and "Add and subtract like fractions" (`js/skills/middle.js:146`) do not set it, so 5/3 is revealed as `1.666667` in Practice (`js/app.js:285`), Katas (`js/app.js:432`) and "Watch me do one" (`js/app.js:249`). The tower reveal has its own copy of the same rounding (`js/arena.js:132`).
- **Bug 5, confirmed in part.** "Factor quadratics" builds its key by string concatenation: `(x+${p})(x+${q})` (`js/skills/high.js:25`) and `(${a}x+${p})(x+${q})` (`js/skills/high.js:24`). With negative roots the reveal reads `(x+-1)(x+-2)` (`answerText` for `expr`, `js/app.js:258`). The `1x` half of the bug could not be reproduced: `a` is 2 or 3 when it is printed, and other algebra keys go through `polyText()` (`js/lib.js:53-60`), which already drops `1x`. The fix still covers it in the shared formatter.
- **Bug 8, confirmed.** For `num` answers, `checkOne()` evaluates any expression (`js/check.js:69`), so typing the question back (`44*72`) is accepted as the answer to 44 × 72 and counts toward mastery, XP and stats. The Arena keypad already strips operators (`js/arena.js:53`), but Practice, Endless runs and Katas do not.

## What Changes

- Mixed numbers are accepted wherever a number is: `1 3/4`, `-2 1/2` and `1 3/4` with extra spaces all equal 1.75 (or -2.5). A space between two whole numbers (`1 225`) is still rejected, not read as 1225.
- **Arithmetic skills accept plain numbers only:** an integer, a decimal, a fraction `a/b` or a mixed number, with an optional sign and thousands commas. An expression such as `44*72`, `35^2` or `1200+25` gets a friendly "Type just the answer" message and does not count as a try. Arithmetic skills are the skills in grades K to 8 and the speed-trick skills. Algebra and higher keep expression input (`3x+2`, `4sqrt(3)`, `pi/6`).
- The right answer to a fraction skill, or to a problem that asks for a fraction or simplest form, is shown as a fraction (unless the problem asks for a decimal), plus the mixed number when it is more than 1 (`5/3 = 1 2/3`), in every reveal: Practice, Endless run, Katas, "Watch me do one" and the tower.
- Algebra answer keys are formatted with real signs: `(x − 1)(x − 2)`, never `+-`, `--`, `+0` or `1x`.

Out of scope:

- New input methods (fraction keypad, mixed-number fields). The current text input and symbol keys stay.
- The Arena daily round and Duel (integer answers through the keypad or choices).
- Game answers in `js/games.js` (each game checks its own taps).
- Mastery and XP rules themselves.

Affected: Challenger Players in grades 3 to 5 (mixed numbers and fraction reveals), Pro Players in algebra (answer key), and every Player in Practice, Endless runs and Katas (plain-number rule). Explorer Practice uses big choice buttons for small whole-number answers (`js/app.js:270`), so it is affected only for its few typed answers.

## Capabilities

### New Capabilities

- `answer-checking`: which typed answers count as right, including mixed numbers and the plain-number rule for arithmetic skills.
- `answer-display`: how the right answer is written when it is revealed (fractions, mixed numbers, algebra signs).

### Modified Capabilities

(none: no specs exist yet)

## Impact

- `js/check.js`: mixed-number normalization before whitespace removal; a plain-number mode for `num` specs (`spec.plain`).
- `js/skills/index.js` (or the problem pipeline in `js/app.js` `practice()` and `kataView()`): mark problems from arithmetic skills as `plain`.
- New shared formatter (for example `js/answers.js`) holding `answerText()` (moved from `js/app.js:252-260`), used by `js/app.js` and `js/arena.js:132`.
- `js/skills/high.js:24-25`: build the factored key from a signed-term helper.
- Tests: `test/check.test.mjs` (the existing "numbers in many spellings" case keeps accepting `35^2` and `1200+25` for non-plain specs, and gains plain-spec cases), a new `test/answers.test.mjs`, a sweep over every skill generator (`SKILLS` from `js/skills/index.js`, as `test/arena.test.mjs` already does for tower sets) and a Practice spec in `e2e/`.
- Nothing sent or kept changes; `parentNote()` and `cloud/README.md` are untouched.
- **Order:** independent of the other changes. If `view-cleanup-contract` lands first, its `e2e/tests/practice.spec.ts` is the natural home for this change's Practice assertions. `pro-arena-mental-arithmetic` changes how `practice()` picks each question's level (Practice Ratings) on the same lines this change edits (`js/app.js:268`); land this first and rebase that one.
