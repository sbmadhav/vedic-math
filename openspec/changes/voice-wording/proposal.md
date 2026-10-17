# Proposal

## Why

The owner: "revisit every text prompt for the text to speech. Some are quite not right, it is very difficult for me to check them all."

Read aloud is on by default for Explorer, and any Player can tap "Hear it". Every spoken line goes through `normalize()` in `js/voice.js`, which turns question HTML into words. A review of every sentence template the game can say (4,486 of them) found 1,735 that a teacher would not read that way. Some examples:
- "What number comes right after 18 what?"
- "Keep the 3ths."
- "Find f g of 1." for f(g(1))
- "Solve:. minus 4 x minus 2 y equals negative 28"
- "4 x plus 3 to the power of 4" for (4x + 3)⁴
- "the limit as x approaches minus 4 of x2 plus x minus 12"
- "What is the missing angle?", with the known angle only in the picture

## What Changes

- **`normalize()` rules (general, tested):**
  - A "?" after a number ends the question; it is not read as "what".
  - Ordinals and "12ths" are said as words.
  - Fractions are named up to hundredths ("seven twelfths"), not "7 over 12".
  - Brackets are read by what they hold:
    - a function argument ("f of g of 1", "f inverse of x", "the cosine of 225 degrees");
    - an aside, read as a pause;
    - a point ("the point 1, 4");
    - a single term;
    - a quantity ("the quantity x minus 7, times the quantity x minus 8").
  - Powers of a bracket, powers of a sum, roots of a sum and fraction denominators keep their grouping.
  - "negative" is used at the start of a line and after a word, and "the opposite of negative 4" for −(−4).
  - Vectors, 2 by 2 matrices, ellipses, money with cents, clock times, ² and ³, "45-45-90" and what to type ("3 slash 4") are read cleanly.
- **An optional `say` on a question** (HTML, normalized the same way) when the screen text leans on a picture. `fx.speakQuestion(p)` speaks `p.say || p.q` at every question call site: Practice, Hear it, Kata, Arena tap rounds and towers, and Stars. Seven Skills get one:
  - `1-compare` and `3-fraccmp`: "Compare 89 and 57. Which sign goes in the box?"
  - `4-angles`, `10-triangle` and `8-pyth`: the known angles or sides.
  - `3-area` and `5-volume`: the side lengths.
- **The voice reads the hint that is shown** after a second wrong try. Before, it read the first hint while the second was on screen.
- **Screen fixes, where the screen was wrong too:**
  - "Keep the 3ths" becomes "Keep the thirds".
  - "1 stars" becomes "1 star".
  - "a octagon" becomes "an octagon", and "a 8% sales tax" becomes "an 8% sales tax".
  - "0.1 is 1 tenths" becomes "0.1 is 1 tenth".
  - "2 red, 1 blue marbles" becomes "2 red and 1 blue marbles".
  - "divided by (x + 0)" becomes "divided by x".
  - An empty "Subtract  from both sides" hint gets real wording.
  - An invalid `&frac43;` entity, which showed as text, becomes a real fraction.
- Answers and grading do not change.

## Modes and Players

All Modes and all Players. Explorer hears most of it, because read aloud is on by default there. Challenger and Pro hear it on "Hear it" or with read aloud turned on.

## Out of scope

- Which voice speaks: the built-in voice, the natural voice and the studio voice are covered by `openspec/changes/better-voice`.
- Bolt's lines, menus and Sky labels, which are never spoken.
- Speed trick step text that mirrors the formula on purpose, such as "Equation: 6x + 2 = -1x + -12." It is read as shown ("plus negative 12", "1 x").
- Questions whose picture is the answer (count the dots, the shaded fraction, the clock, a plotted point). Their words stay as they are.
