# Tasks

## 1. Owner decision

- [x] 1.1 Owner confirms option 3 (hide what Explorer is not offered) over offering Stars in Explorer or a second way to earn Belts. The PR body states the options. Done 2026-10-21 (PR #121): option 3 is the option shipped. PR #68 (merged 2026-10-18, titled "owner decision") built it, and on 2026-10-21 the owner asked for everything on the plan to be built as given, so this records option 3 as the decision; options 1 and 2 are not built. Confirmed in the code: `badgesFor()` in `js/gamify.js` and the Me page in `js/app.js` list a Belt or Sutra scholar badge to Explorer only once earned; the Explorer Dojo lede says "Belts and Stars come with Challenger and Pro." with no counts; `js/guide.js` has the same Explorer wording. Verify: `pnpm exec vitest run test/gamify.test.mjs test/guide.test.mjs test/copy.test.mjs` (50 passed); `e2e/tests/dojo.spec.ts`, `e2e/tests/progress.spec.ts`, `e2e/tests/cov/badges-6-explorer.spec.ts` and `e2e/tests/cov/star-round-16-explorer.spec.ts` on chromium, webkit and mobile (57 passed; the 3 skips are the world-boards test that waits for task 8.5 of `learnvedicmath`).

## 2. Code

- [x] 2.1 `js/gamify.js`: `modes` on the four badges and `badgesFor`. Verify: `test/gamify.test.mjs`.
- [x] 2.2 `js/app.js`: Me page lists `badgesFor`; Dojo in Explorer has the honest lede, no counts, no Sutras button. Verify: `e2e/tests/dojo.spec.ts`, `e2e/tests/progress.spec.ts`.
- [x] 2.3 `js/guide.js` Dojo section Explorer wording; `GLOSSARY.md` Belt entry. Verify: `test/guide.test.mjs`, `test/copy.test.mjs`.
- [x] 2.4 Coverage specs for the two new scenarios: `e2e/tests/cov/star-round-16-explorer.spec.ts`, `e2e/tests/cov/badges-6-explorer.spec.ts`.

## 3. After release

- [x] 3.1 Archive this change so `openspec/specs` describes what is live. Done 2026-10-21 (PR #121): live on learnvedicmath.com since PR #68 (the deploy of `1401890` that `docs/perf/baseline.md` measured includes it); `openspec archive explorer-belts -y`; `openspec validate --all --strict` passes.
