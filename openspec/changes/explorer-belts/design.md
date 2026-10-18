# Design

## Decision: hide what Explorer cannot do, do not invent a new way to earn it

Belts by Stars (sky-home) and "Explorer SHALL NOT be offered Stars" (star-round) are both deliberate. Giving Explorer Stars would put Trick rounds for grade 3 and up in front of 4 to 7 year olds; giving Explorer a second definition of Belt would split a GLOSSARY term. So Explorer's Dojo becomes an honest Trick library and the Me page lists only badges Explorer can earn, plus any it already holds.

## Code

- `js/gamify.js`: `modes: ['challenger', 'pro']` on belt-white, belt-green, belt-black and sutras; `badgesFor(mode, got)` = BADGES filtered to `!b.modes || b.modes.includes(mode || 'challenger') || got[b.id]`. `checkBadges` is unchanged: a badge is awarded whenever its test passes, whatever the Mode, so a Belt lit by link in Explorer still counts.
- `js/app.js` `meView`: the grid and the count use `badgesFor(fx.mode(), got)`.
- `js/app.js` `dojoView`: `ex = fx.mode() === 'explorer'` switches the lede, drops the "N of 7 belts earned" line and each belt's `<small>n/9 Stars</small>`, and drops the Sutras button. `dojoStars` already returns nothing in Explorer.
- `js/guide.js`: the Dojo section's Explorer `what` ends with the same sentence.

## Tests

- `test/gamify.test.mjs`: badgesFor per Mode and the kept-badge case.
- `e2e/tests/dojo.spec.ts`: Explorer Dojo shows the Tricks in seven groups, no Star counts, the honest line, no Sutras button; Challenger still sees counts.
- `e2e/tests/progress.spec.ts` or a new spec: Explorer Me page lists no belt badge until one is kept.
- `e2e/tests/cov/star-round-16-explorer.spec.ts` and `e2e/tests/cov/badges-6-explorer.spec.ts`: one test per new scenario.
