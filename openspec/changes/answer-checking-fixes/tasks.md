# Tasks

## 1. Mixed numbers (bug 3)

- [ ] 1.1 In `normalize()` (`js/check.js:4-9`), rewrite a whole mixed-number input to `sign(whole + n/d)` before whitespace is stripped, and make a leftover digit-space-digit input unreadable. Verify: `test/check.test.mjs` new case "mixed numbers": `1 3/4`, ` 1  3/4 `, `-2 1/2` accepted for 1.75 and -2.5; `1 225` and `13/4` rejected for 1.75 and 1225 as appropriate; every existing case still passes.
- [ ] 1.2 Verify in the app: Playwright spec in `e2e/tests/practice.spec.ts` (create it if `view-cleanup-contract` has not) on `#/skill/4-fracadd` with a seeded `Math.random` (`page.addInitScript`) so the sum is more than 1, typing the mixed number is marked right.

## 2. Plain-number rule (bug 8)

- [ ] 2.1 Add `spec.plain` to `checkOne()` (`js/check.js:60-77`): raw input must be a plain number (sign, integer with optional commas, decimal, `a/b` or mixed number), else `{ ok: false, notAnswer: true, msg }`. Verify: `test/check.test.mjs` new case "plain numbers only": `44*72`, `35^2`, `1200+25`, `3x` refused with `notAnswer` for a plain spec; `1225`, `1,225`, `1225.0`, `3/4`, `1 3/4`, `-7` accepted; the simplest-form cases behave the same under `plain`.
- [ ] 2.2 Add `withPlain(skill, problem)` in `js/skills/index.js` (grades K to 8 and `'V'`, `num` kind, unless `exprOk`) and use it in `practice()` (`js/app.js:268`) and for Kata problems (`js/levels.js`). Verify: node sweep test `test/answers.test.mjs` runs every skill generator at levels 1 to 3 (seeded) and asserts each plain problem's own displayed answer passes `checkOne` under the plain rule.
- [ ] 2.3 In `practice()` and `kataView()`, treat `notAnswer` like an empty answer: show the message, no try, no `store.record`, no XP. Verify: Playwright spec on a grade 3 multiplication skill: typing the question back shows "Type just the answer", the session score stays `0/0`, and XP in the nav chip is unchanged.

## 3. Showing fractions (bug 4)

- [ ] 3.1 Move `answerText()` from `js/app.js:252-260` to `js/answers.js`, taking the skill; show non-whole answers as `n/d` (plus ` = a b/c` above 1) for `frac` skills, `simplest` or `asFraction`, unless `asDecimal`; set `asDecimal` on the "Write as a decimal" branch of `4-decimals` (`js/skills/middle.js:163`). Verify: `test/answers.test.mjs` cases: 5/3 shows `5/3 = 1 2/3`, 3/8 shows `3/8`, 7/10 as a decimal shows `0.7`, a percent answer of 12.5 shows `12.5`; the sweep asserts no `frac` skill reveal contains a decimal point unless `asDecimal`.
- [ ] 3.2 Use the shared formatter in Practice reveal (`js/app.js:285`), Katas (`:432`), "Watch me do one" (`:249`) and the tower (`js/arena.js:132`). Verify: Playwright spec: "Show me" on a seeded `4-fracadd` question reveals `5/3 = 1 2/3`-style text and no `.666`.

## 4. Algebra keys (bug 5)

- [ ] 4.1 Build the factored keys in `js/skills/high.js:24-25` with a signed `factor(a, p)` helper. Verify: sweep test asserts no `expr` answer from any generator contains `+-`, `--`, `+0` or a bare `1x`, and `checkOne(p, p.answer)` is still right for every generated factoring problem (300 seeded draws).
- [ ] 4.2 Verify in the app: Playwright spec on `#/skill/9-factor` with a seeded draw that has negative roots, "Show me" reveals `(x − 1)(x − 2)`-style text.

## 5. Release check

- [ ] 5.1 `node --test 'test/**/*.test.{js,mjs}'` and the e2e suite pass against `_site`, then live. Verify: CI and post-deploy E2E are green.
