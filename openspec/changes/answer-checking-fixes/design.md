# Design

## Context

- `checkOne(spec, input)` (`js/check.js:60-112`) is shared by Practice, Endless runs, Katas and the tower. `num` answers go through `evalNum()`, a safe expression parser, so any expression with the right value passes.
- `test/check.test.mjs:9-17` deliberately accepts `35^2`, `35²` and `1200+25` for 1225. That stays true for non-arithmetic specs; the plain rule is opt-in per problem.
- Problems are plain objects from `skill.gen(level)`; skills carry `grade` (`'K'`, 1 to 12, or `'V'` for tricks) and `strand` (`'frac'` for 11 skills).
- `answerText(p)` (`js/app.js:252-260`) only knows the problem, not the skill.

## Goals / Non-Goals

**Goals:**
- One place that decides "is this plain-number only" and one place that formats a revealed answer.
- No generator rewrites beyond the two factoring keys.

**Non-Goals:**
- A typed fraction or mixed-number widget.
- Changing what any game accepts.

## Decisions

**1. Mixed numbers in `normalize()`.** Before whitespace is stripped, rewrite a whole input of the shape `^\s*(-?)(\d+)\s+(\d+)\s*/\s*(\d+)\s*$` to `$1($2+$3/$4)`, so the leading minus applies to the whole value. After that rewrite, any remaining digit, space, digit sequence makes the input unreadable (today `1 225` silently becomes `1225`), so it fails with the existing "Type a number" message.
- Rejected: reading `1 3/4` as `1 * 3/4` through implicit multiplication. Wrong value, and it is what a Player in grade 4 means least.

**2. Plain-number rule as `spec.plain`.** When `spec.plain` is true, `checkOne` first matches the raw input (after trimming and Unicode minus folding, before space removal) against: optional sign, then an integer with optional thousands commas, a decimal, `a/b`, or a mixed number. Anything else returns `{ ok: false, notAnswer: true, msg: 'Type just the answer, like 56 or 3/4.' }`. `practice()` and `kataView()` treat `notAnswer` like `empty`: no try, no record, no XP.
- Where `plain` is set: `withPlain(skill, problem)` in `js/skills/index.js` adds `plain: true` to `num` problems when `skill.grade` is `'K'`, 1 to 8 or `'V'`, unless the skill opts out with `exprOk: true`. Both call sites (`practice()` `next()` and Kata problem lists in `js/levels.js`) pass through it. A sweep test runs every generator at levels 1 to 3 and checks that every plain problem's own answer, formatted by `answerText`, is accepted under the plain rule.
- Rejected: plain by default for all `num` problems. Grade 9 to 12 skills legitimately expect `4sqrt(3)` and `pi/6` (`js/check.js:1-2`).
- Rejected: per-skill tags on all 135 skills. The grade boundary matches the plan's "arithmetic skills" and Mode grades (Explorer K to 2, Challenger 3 to 8), with `exprOk` for exceptions.

**3. Shared formatter `js/answers.js`.** `answerText(p, skill)` moves out of `js/app.js`. For `num`: whole numbers as today; non-whole answers as a fraction when `skill.strand === 'frac'` or `p.simplest` or `p.asFraction`, unless `p.asDecimal`; the fraction is found by the existing denominator search (`js/app.js:257`, up to 5000) and shown as `n/d` plus ` = a b/c` when `|n| > d`. The "Write as a decimal" branch of `4-decimals` (`js/skills/middle.js:163`) sets `asDecimal: true`. `js/arena.js:132` uses the same function, given the challenge item's skill.

**4. Signed factor keys.** `js/skills/high.js:24-25` build keys with a `factor(a, p)` helper: `(x - 1)`, `(2x + 3)`, dropping a coefficient of 1. The checker compares by value, so accepted answers do not change; only the shown key does. A sweep test asserts no generated `expr` answer contains `+-`, `--`, `+0` or a `1x` not preceded by a digit.

## Risks / Trade-offs

- [A Challenger skill really wants an expression answer] → `exprOk: true` opt-out; the sweep test shows each such case once.
- [Players who typed `35^2` on purpose for a trick skill now get a nudge] → It is the intended behavior: the trick is to compute it.
- [Kata stars change if refused inputs no longer count as misses] → Only inputs that were never answers are affected.

## Migration Plan

Client-only, no stored data changes. Rollback is a revert.
