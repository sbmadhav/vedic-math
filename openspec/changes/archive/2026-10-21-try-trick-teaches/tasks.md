# Tasks

Owner chose this change on 2026-10-20 (option 3); it is implemented in the pull request that proposes it, for the owner's review. Playwright specs run on chromium, webkit and mobile against the local server (`node e2e/local-server.mjs 8176`, `BASE_URL=http://localhost:8176`).

## 1. The worked example (`js/star.js`, pure)

- [x] 1.1 `starIntro(state)`: the lowest-Kata problem of the band the round does not deal, else of the Star's third, marked used; the input state unchanged. Verify: `test/star.test.mjs`: for all 63 Stars the example is not dealt, is the lowest Kata left, is marked used, and a rematch never returns it; `from9` Star 1 gives a "100 − nn" example whose last step is the result; with nothing left there is no example.

## 2. The card (`js/star.js`, `js/app.js`, `math.css`)

- [x] 2.1 `runStar(..., { intro })`: when true, `teach()` draws the card (tag, title, idea, worked example, steps at once, Start the Star, "Then 4 questions like it."), hides the pad and the Dare, focuses Start, announces once, starts on click or Escape and focuses the first question; on its own child signal through `js/life.js`. Verify: `test/lifecycle-scan.test.mjs` passes; `e2e/tests/try-trick-teaches.spec.ts`.
- [x] 2.2 Try a trick sets `starView.introFor` to its Star route; `starView` passes `intro` once and clears it. Verify: `e2e/tests/try-trick-teaches.spec.ts`: Play again, a reload and Play this Star from Home open on the first question.
- [x] 2.3 CSS with tokens only; the steps without their entry animation. Verify: screenshots at 390 px in Daybreak and Deep Space; no sideways scroll at 390 px; axe on the card in both schemes.

## 3. Tests and docs

- [x] 3.1 Update `e2e/tests/first-visit.spec.ts`, `e2e/tests/cov/first-visit-1.spec.ts` ("Two taps to a question") and `e2e/tests/cov/analytics-11.spec.ts` to press Start the Star after Try a trick.
- [x] 3.2 New `e2e/tests/cov/first-visit-3.spec.ts`: one test per new scenario (worked example, not one of the questions, only from Try a trick, keyboard, screen reader, Calm).
- [x] 3.3 `GLOSSARY.md`: Try a trick shows the Trick worked once before the first question.
- [x] 3.4 After release: `openspec archive try-trick-teaches -y`, and add the Hook note of design decision 4 to `placement`'s design and tasks. Done 2026-10-21 (PR #121): released in PR #95, live on learnvedicmath.com since the deploy of `1401890` (the commit `docs/perf/baseline.md` measured on the live site); archived; `placement` design decision 14 and task 4.5 carry the note; `openspec validate --all --strict` passes.
