# Design

## Context

- Every spoken line reaches `fx.speak()` (`js/fx.js`), which calls `voice.speak()`, which calls `normalize()` (`js/voice.js`). The call sites are listed in `openspec/changes/better-voice/design.md` (Context).
- `normalize()` was a list of regular expressions over the tag-stripped text. It dropped every bracket, read `?` after a space as "what", knew fraction names only for halves, thirds and quarters, and read `<sup>` inside a fraction as plain digits ("x2").
- The better-voice inventory listed two findings to fix: "the 12ths" and "make 10 what?". This change fixes both and every other one found below.

## Review

**Sample.** A collector reused the better-voice inventory sources:
- 1,500 draws for each Skill and generator level, with every hint (135 Skills x 3 levels).
- All 1,050 Katas, which are also what Stars deal.
- Explorer Arena sets (60 days); Challenger, Pro and old Pro sets (20 days each); and Arena Practice at every difficulty.
- Every Pro mental family at difficulties 1 to 20.
- Every third tower challenge.
- The Balloon pop prompts and counts, and the fixed lines.

That came to 1,343,972 lines. Each line was normalized and reduced to a template (numbers replaced by #), keeping one example per template.

**Round 1.** All 4,486 templates were read by eight reviewers working in parallel, one per grade band. Each read them as a teacher reading aloud to a child.
- 1,735 were flagged.
- 1,696 are fixed.
- 39 were kept by decision (decision 6).

**Round 2.** After the fix, the new wording was reviewed again. Templates were counted with fraction words also replaced, which gives 3,989.
- 69 were flagged, mostly from the new bracket rules.
- 68 are fixed.
- 1 was kept: "5 squared equals 25, so the tens digit is 5".

| | Count |
|---|---|
| Lines sampled | 1,343,972 |
| Templates reviewed, round 1 | 4,486 |
| Flagged, round 1 | 1,735 |
| Fixed | 1,696 |
| Kept by decision | 39 |
| Templates reviewed, round 2 (new wording) | 3,989 |
| Flagged and fixed, round 2 | 69 and 68 |

## Fix classes

| Class | Flagged | Before | After |
|---|---|---|---|
| Negative read as "minus" at a line start or after a word | 580 | Solve:. minus 4 x minus 2 y equals negative 28 | Solve: negative 4 x minus 2 y equals negative 28 |
| | | the limit as x approaches minus 4 | the limit as x approaches negative 4 |
| | | x equals negative negative 4 | x equals the opposite of negative 4 |
| Brackets dropped, so the grouping is lost | 366 | Expand: x minus 7 times x minus 8 | Expand: x minus 7, times x minus 8 |
| | | 4 x plus 3 to the power of 4 | 4 x plus 3, all to the power of 4 |
| | | x to the power of 5 cubed | x to the power of 5, all cubed |
| | | Column 1 times straight down : 0 times 0 | Column 1, straight down: 0 times 0 |
| | | 6 times negative x minus 6 plus 6 x | 6 times, negative x minus 6, plus 6 x |
| | | the integral from 1 to 3 of 2 x plus 2 d x | the integral from 1 to 3 of 2 x plus 2, d x |
| Function notation | 337 | Find f g of 1. | Find f of g of 1. |
| | | F x equals ... / Evaluate p 0. | F of x equals ... / Evaluate p of 0. |
| | | Find f to the power of negative 1 times x. | Find f inverse of x. |
| | | the exact value of cos 225 degrees | the exact value of cosine of 225 degrees |
| Fractions read as "over" | 101 | 6 over 4 divided by 1 over 7 | six fourths divided by one seventh |
| | | 7 over 12 | seven twelfths |
| | | pi r cubed (the 4/3 was dropped) | four thirds pi r cubed |
| Points heard as a list of numbers | 89 | the midpoint of negative 5, negative 5 and negative 11, 3 | the midpoint of the points negative 5, negative 5, and negative 11, 3 |
| Screen wording that was wrong too | 79 | divided by x plus 0 | divided by x |
| | | Leo has 1 stars | Leo has 1 star |
| | | a octagon | an octagon |
| | | Subtract  from both sides. | The x terms are already on one side. Get 4 x alone. |
| Ellipses | 44 | 1 over 19 equals 0., and so on, What is digit ... | 1 over 19 equals 0 point, and so on. What is digit ... |
| | | 1 plus 2 plus 3 plus, and so on, plus 6 | 1 plus 2 plus 3, and so on, up to 6 |
| | | Type the right side of y equals, and so on | Type the right side of y equals |
| Picture-only and the compare box | 40 | 99 blank 67 | Compare 99 and 67. Which sign goes in the box: less than, equals, or greater than? |
| | | Find the hypotenuse c. | A right triangle has legs 6 and 8. Find the hypotenuse c. |
| | | What is the missing angle? | One angle is 40 degrees. What is the missing angle? |
| Vectors and matrices | 34 | the magnitude of the vector the vector 7, 24 | the magnitude of the vector 7, 24 |
| | | the dot product the vector 4, negative 3 times the vector 1, 2 | the dot product of the vector 4, negative 3, and the vector 1, 2 |
| | | the matrix with rows 1, 5, and 5, negative 1 | the matrix with top row 1, 5, and bottom row 5, negative 1 |
| Exponents | 25 | x2 plus x minus 12 (a power inside a fraction) | x squared plus x minus 12 |
| | | 9³ equals 729 (the symbol left in) | 9 cubed equals 729 |
| "?" after a number read as "what" | 10 | What number comes right after 18 what? | What number comes right after 18? |
| | | 124 divided by 5 equals what remainder what? | 124 divided by 5 equals what, remainder what? |
| Clock times, typing, special triangles, units | 11 | Type it like 3 over 4. | Type it like 3 slash 4. |
| | | Type it like 3:25. | Type it like 3 25. |
| | | A 45-45-90 triangle | A 45 45 90 triangle |
| | | What is the perimeter of the rectangle? units | What is the perimeter of the rectangle in units? |
| Ordinals | 5 | Keep the 3ths. / the 6th multiple / The 1st is 3. | Keep the thirds. / the sixth multiple / The first is 3. |
| Speed trick steps written as "1x" and "+ -n" | 14 | Equation: 6 x plus 2 equals negative 1 x plus negative 12 | Equation: 6 x plus 2 equals negative x minus 12 (fixed on screen) |

Round 2 added these fixes:
- A bracketed negative with a power, with "times" before it: "4(−x)³" is now "4 times, negative x, all cubed". Before it was "4 minus x, cubed".
- A pause after a power: "r to the power of n, minus 1".
- Powers of sums end with a pause: "3 to the power of x plus 1, equals 1".
- Roots of sums end with a pause: "the square root of x squared plus y squared,".
- Denominators with two terms: "x squared minus 7 x plus 6, all over x minus 6".
- A comma between two function definitions: "f of x equals 3 x minus 3, and g of x ...".
- Every fraction name to hundredths, so "18 thirtieths" is no longer "18 over 30".
- "2 pi r h" is no longer "2 pi rh".
- A list aside is read as its own sentence.
- "then 2 and what, and so on".
- On screen: "an 8% sales tax" and "1 tenth".

## Decisions

1. **General rules in `normalize()` first.** Brackets are resolved innermost first. Each group is read by what it holds:
   - a function argument (f, g, h, p, q, F, G, H, P, Q, sin, cos, tan, log, ln);
   - a square root;
   - an aside with words (read as a pause, or as its own sentence when it ends in a full stop or holds a list);
   - a point (two or three numbers or letters);
   - one term;
   - a group of terms: a comma pause after it; "times," before it after a number or letter ("2 times, x plus 3"); "times" after another group ("x minus 7, times x minus 8"); a pause after an operator; and "all" before a power ("4 x plus 3, all to the power of 4").

   A private marker ends each group, so a minus right after a group stays "minus".
2. **`say` only when the screen leans on a picture.** It is HTML and is normalized like `q`. It is used in seven Skills. Callers use `fx.speakQuestion(p)`, and Arena items carry `say` through. A question with no `say` is heard as before, from `q`.
3. **Speed trick steps in clean form** (owner, 2026-10-17). `js/vedic.js` `lin()` writes signed sums with no coefficient 1, no "+ -", "- -" or "+ −", and no 0x terms. It is used in the transpose, zero-sum, add-sub and ratio-zero steps and questions, so the screen shows "Equation: 6x + 2 = −x − 12." and the voice says "6 x plus 2 equals negative x minus 12". The same clean form is used in the 9-expand, 11-inverse and 12-integral hints. Questions that practise "+ −" on purpose (for example "Simplify: −2(−2x − 6) + −8x") and substitution hints such as "−2·5² + −4·5" are unchanged.
4. **Screen text changes only where the screen was wrong.**
   - The Explorer daily sets for 2026-10-14 and 2026-10-18 each held one "1 marbles" or "1 stars" question. Their snapshot hashes in `test/arena.test.mjs` were retaken. The questions, their order and the answers are the same.
   - `test/support/verify.mjs` accepts "divided by x." and "2 red and 1 blue marbles".
5. **Fourths, not quarters** (owner, 2026-10-17). The voice says "one fourth", "three fourths", and ¼ and ¾ the same way. The guide now says "3 fourths" and the like-fractions hint says "Keep the fourths". "Quarter" as a coin or "quarter past" would stay, but no such copy exists today.
6. **Kept by decision (39 templates):**
   - "Double again: what?" (6). The colon is a natural pause.
   - "Point 5, 4." (32). The question starts with the word Point.
   - "What are the coordinates of the point?" (1). The picture is the answer.

## Risks

- **New rules can misread a pattern that appears later.**
  - `test/voice-normalize.test.mjs` holds 91 input and output pairs.
  - Its sweep runs every generator, seeded, and fails on a leftover:
    - any of the characters < > & # _ ^ { } | or a math symbol;
    - digits followed by letters, as in "12ths";
    - "10 what";
    - "what what" or another doubled word;
    - stray punctuation;
    - a sentence over 160 characters with no comma.
- **Lines get longer.** By owner decision there is no "the quantity"; the comma pause and "all" carry the grouping. Grades 9 to 12 average 77.8 spoken characters per template against 76.6 before this change. The longer lines are the ones that were wrong before, such as two points ("the points ..."), "all over" and "negative" for "minus". The 160-character sentence splitter still breaks at commas, and the sweep checks that each sentence has one.
- **The studio voice (better-voice) records Explorer lines by their words.** It must record after this change lands, or record again. The coverage test it plans will catch any line missing audio.
