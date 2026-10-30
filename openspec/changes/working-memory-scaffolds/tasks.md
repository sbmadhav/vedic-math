# Tasks

Playwright specs run against a local build (`python3 build.py && node e2e/local-server.mjs 8642 _site`, `BASE_URL=http://localhost:8642`).

## 1. Memory lock answer slots

- [x] 1.1 `parts(vals)` on `sq5`, `near-base`, `square-near`, `by9s`, `ends10` in `js/vedic.js`; `problemFor()` passes them on as `p.parts`. Verify: `test/parts.test.mjs` (the parts join to the answer for random numbers of each Trick, 112 × 112 is 125 and 44, the other Tricks have none).
- [x] 1.2 The slots in `answerUI()` and one helper for Practice and the Katas in `js/app.js` (lock, Enter, the one box switch saved as `vm.split`, the two partial messages); styles in `math.css`. Verify: `e2e/tests/split-answer.spec.ts`; `e2e/tests/cov/split-answer-1.spec.ts` to `split-answer-5.spec.ts`.
- [x] 1.3 The Star round's boxes in two parts for Challenger (`js/star.js`). Verify: `e2e/tests/cov/split-answer-6.spec.ts`.

## 2. Digit connectors

- [x] 2.1 `js/connectors.js`: `linksFor(trickId, vals, step)` for `near-base` and `crosswise`, markup and text alternative. Verify: `test/connectors.test.mjs`; `test/late-import.test.mjs` (outside the static import graph).
- [x] 2.2 The animator draws the diagram for the current step, loaded with `lateImport`; Space and the arrows on the focusable steps board; draw-in animation off under reduced motion, Pause motion and Calm. Verify: `e2e/tests/cov/trick-connectors-1.spec.ts` to `trick-connectors-4.spec.ts`.

## 3. Trophy case

- [x] 3.1 The chip's Belt knot and name (Challenger and Pro), redrawn on a Belt. Verify: `e2e/tests/cov/trophy-case-1.spec.ts`, `e2e/tests/cov/sparks-6.spec.ts`.
- [x] 3.2 The Trophy case on Me; the Belts stat leaves the stats row. Verify: `e2e/tests/cov/trophy-case-2.spec.ts`, `trophy-case-3.spec.ts`; `e2e/tests/sky.spec.ts` (Stars lit now in the Trophy case).

## 4. Checks

- [x] 4.1 `openspec validate working-memory-scaffolds --strict`; no spoken line changes (no studio voice re-record); `a11y.spec.ts` on Me, a Trick page and a Kata.
- [ ] 4.2 After release: archive this change.
