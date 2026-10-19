# Tasks

## 1. Owner decision

- [ ] 1.1 Owner confirms option 3 (hide what Explorer is not offered) over offering Stars in Explorer or a second way to earn Belts. The PR body states the options.

## 2. Code

- [x] 2.1 `js/gamify.js`: `modes` on the four badges and `badgesFor`. Verify: `test/gamify.test.mjs`.
- [x] 2.2 `js/app.js`: Me page lists `badgesFor`; Dojo in Explorer has the honest lede, no counts, no Sutras button. Verify: `e2e/tests/dojo.spec.ts`, `e2e/tests/progress.spec.ts`.
- [x] 2.3 `js/guide.js` Dojo section Explorer wording; `GLOSSARY.md` Belt entry. Verify: `test/guide.test.mjs`, `test/copy.test.mjs`.
- [x] 2.4 Coverage specs for the two new scenarios: `e2e/tests/cov/star-round-16-explorer.spec.ts`, `e2e/tests/cov/badges-6-explorer.spec.ts`.

## 3. After release

- [ ] 3.1 Archive this change so `openspec/specs` describes what is live.
