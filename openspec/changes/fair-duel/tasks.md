# Tasks

Design note: no `design.md` for this change; it touches one function and its markup. The question flow is split into a small pure function so it can be node-tested.

## 1. Shared question flow

- [ ] 1.1 Split the Duel's dealing into a pure `duelState` (current item, who is frozen, who missed, points) in `js/arena.js`, with `answer(side, value)` returning the next state, and use it from `runDuel()` (`js/arena.js:85-97`). Verify: node test in `test/arena.test.mjs`: both sides share item 0 at start; a right answer by side 1 gives it a point and moves both to item 1; a miss freezes only that side; two misses move both on with no points; the 10th point ends the Duel and later answers are ignored.
- [ ] 1.2 Render the same question and choices on both sides (replacing `deal(p)` at `js/arena.js:89`), freeze for 1.2 s on a miss, and show the right answer briefly when both miss. Verify: update the Playwright test at `e2e/tests/arena.spec.ts:70-78`: `#dQ0` and `#dQ1` have equal text at start and after a point; a wrong tap freezes only that side; both wrong shows the answer and then a new shared question.

## 2. Pictures

- [ ] 2.1 Add a picture slot per side in the Duel markup (`js/arena.js:88`) filled from the item's `viz`, and style it in `math.css` (`.duel-side`, `math.css:430-441`) with tokens, working in the single-column phone layout and the flipped side. Verify: Playwright spec at the Explorer Duel level: when a question has a picture, both `.duel-side` elements contain an `svg`; screenshot check at 390 px width in light and dark schemes; `e2e/tests/a11y.spec.ts` adds `#/duel` after Start with no new serious axe violations.

## 3. Release check

- [ ] 3.1 Node and e2e suites pass against `_site`, then live. Verify: CI and post-deploy E2E green; a manual two-person Duel on a tablet in face-to-face mode shows the same question on both sides.
