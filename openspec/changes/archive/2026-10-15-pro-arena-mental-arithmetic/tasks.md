# Tasks

Prerequisites: `view-cleanup-contract` (new `runArena` signature) and `answer-checking-fixes` (`practice()` edits) are merged.

## 1. Mental arithmetic families

- [x] 1.1 Add `js/mental.js` with `mul2x2`, `square`, `percent`, `nearBase` and `divide`, each with a 20-step ladder and integer answers of at most 7 digits. Verify: new node test `test/mental.test.mjs` draws 200 seeded questions per family and difficulty, re-computes each answer from the question text with exact arithmetic (as `test/support/verify.mjs` does for tower sets), checks integers and the 7-digit keypad limit, and checks that the median answer size rises with difficulty.

## 2. Pro Arena sets

- [x] 2.1 Replace `POOLS.pro` (`js/arena.js:11`) with the mental families and give `makeSet()` a `{ ramp }` option; the Pro daily seed becomes `v2:daily-<day>-pro`. Keep Explorer and Challenger pools and seeds unchanged. Verify: `test/arena.test.mjs` new cases: the Pro daily set for 30 dates has only mental families and a non-decreasing difficulty; the same seed gives the same set; Explorer and Challenger daily sets for a fixed date are byte-identical to a snapshot taken before the change.
- [x] 2.2 Update the Pro cap comment at `cloud/firestore.rules:53` (cap value unchanged). Verify: `test/cloud.test.mjs` still passes (it checks the cap values against the rules).
- [x] 2.3 Duel: keep the Duel on the League's pool via `makeSet()` (Pro Duels now use mental families). Verify: `e2e/tests/arena.spec.ts` Duel test passes at the Pro level.

## 3. Ratings

- [x] 3.1 Generalize `rating()` and `saveRating()` in `js/adapt.js` to full keys and update game callers in `js/app.js` (`:704`, `:716`, `:743`, `:751`). Verify: `test/adapt.test.mjs` new cases for `arena:pro` and `skill:<id>` keys, Mode starts, the under-4-answers rule, and that existing `game:` values read the same.
- [x] 3.2 Arena Practice rounds use a Dial from `rating('arena:' + league)`; daily rounds observe answers with a Dial; both save at round end; the result line shows the Arena Rating. Verify: Playwright spec in `e2e/tests/arena.spec.ts` with `page.clock`: a Pro Player seeded with `arena:pro` = 15 sees a first Practice question at that difficulty (assert via a `data-d` attribute on `#arQ`), and the lobby shows a changed Rating after a full Practice round; the daily round shows the same first question for two Players with different Ratings (two contexts, same date, `page.clock.setFixedTime`); `cloudLog(page).writes` is empty for the Practice round.
- [x] 3.3 Practice uses one Dial per Skill from `rating('skill:' + id)` (fallback from the current mastery level), maps it to the Skill's generator level, and saves on session end and every 10 answers. Verify: node test for the band mapping and fallback; Playwright spec in `e2e/tests/practice.spec.ts`: 10 right answers on a 3-level Skill raise `skill:<id>` in the Player's saved progress and move later questions to level 2 (seeded generator); the mastery value after a fixed answer sequence equals the value from the same sequence before the change.

## 4. Docs

- [x] 4.1 Update GLOSSARY.md Rating ("A Player's 1 to 20 number for one game, the Arena, or one Skill. Right answers raise it, misses lower it, and it picks how hard the next question is.") and the "Difficulty fit" row in `docs/PLAN.md`. Verify: reviewer reads the diff; the copy scan from `copy-and-honest-framing` (if merged) passes.
- [x] 4.2 Confirm nothing new is sent: Verify with `e2e/tests/privacy.spec.ts` that after Arena and Practice rounds no request body contains `rating` or `arena:`; `parentNote()` and `cloud/README.md` need no change (record this in the PR).

## 5. Release check

- [x] 5.1 Node and e2e suites pass against `_site`; deploy on a Monday. Verify: CI and post-deploy E2E green; a manual Pro daily round on a phone shows only products, squares, percents, near-base and division.
  Done 2026-10-15 without a Monday: the switch-over is gated on the date instead (design.md, Decisions made during implementation, 1), so the new Pro daily set starts on Monday 2026-10-19 whatever the deploy day. The phone check is the Playwright mobile project.
