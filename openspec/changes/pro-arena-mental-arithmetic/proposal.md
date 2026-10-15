# Proposal

## Why

The product's promise is "become the human calculator", but the Pro Arena is half algebra homework, and the Arena and Practice ignore the Rating that already makes games fit each Player. Verified against the current code (line numbers as of `origin/main` 272230c):

- **Pro Arena pool, confirmed.** `POOLS.pro` (`js/arena.js:11`) mixes speed tricks with Exponents (`6-exp`, `js/skills/upper.js:47`), Two-step equations (`7-twostep`, `:100`), Exponent rules (`8-exprules`, `:179`), Variables on both sides (`8-multistep`, `:223`) and Logarithms (`11-logs`, `js/skills/high.js:162`). Every item is generated at a fixed level 2 (`js/arena.js:26`), and items whose answer is not an integer are dropped (`js/arena.js:27`), which skews the mix further. The rules' cap comment still describes the Pro League as "squares, roots, percents, logs, algebra" (`cloud/firestore.rules:53`).
- **Arena and Practice use fixed difficulty, confirmed.** Arena rounds call `s.gen(league === 'explorer' ? 1 : 2)` (`js/arena.js:26`) whatever the Player's skill. Practice picks each question's level from mastery, `store.level(s.id)` (`js/app.js:268`, defined at `js/store.js:48`), which only moves after several answers and has three steps. Ratings exist only for games (`js/adapt.js:17`, key `game:<id>`), as the plan's "Where things stand" table notes.

## What Changes

- **Pro Arena becomes mental arithmetic.** The Pro Arena uses five question families only: 2-digit by 2-digit products, squares, percents of a number, near-base products and exact division. Each family has a difficulty scale from 1 to 20. Algebra, exponents and logarithms leave the Arena (they stay in the skill map and Practice).
- **Daily rounds stay identical for everyone.** The Pro daily round is seeded per date and League as today, with a fixed difficulty ramp through the round, so every Pro Player races the same questions. Its seed gains a version prefix so a future generator edit never changes a day already in progress.
- **Arena Rating.** Each Player gets an Arena Rating (1 to 20) for their League. Arena Practice rounds start at it and adapt answer by answer (right answers raise it, misses lower it). Daily and Practice rounds both update it; daily questions never depend on it.
- **Practice Ratings.** Each Skill a Player practices gets its own Rating (1 to 20). It starts from the Player's Mode (Explorer 1, Challenger 5, Pro 9, as for games), adapts within a session, and picks each Practice and Endless run question's generator level. Mastery rings are unchanged.
- **BREAKING (Pro League Boards):** Pro daily and weekly Arena Scores from before and after the release come from different question sets. Release on a Monday so only one daily Board and no weekly Board mixes the two.
- GLOSSARY.md: Rating is redefined as "a Player's 1 to 20 number for one game, the Arena, or one Skill".

Out of scope:

- Explorer and Challenger Arena pools and their daily rounds (unchanged questions; only their Arena Practice rounds adapt).
- The challenge tower, Katas and the Daily Sutra (fixed sets by design).
- Score caps and the scoring formula (10 plus combo); `cloud/firestore.rules` changes only in a comment.
- Placement (Phase 1), which will later set starting Ratings.
- New generator levels for the 135 Skills; Practice Ratings map onto each Skill's existing levels.

Affected: Pro Players (13 to adult) in the Arena, daily and Practice rounds. Explorer and Challenger Players in Arena Practice rounds. Every Player in Practice and Endless runs (question level follows their Skill Rating).

## Capabilities

### New Capabilities

- `arena`: what questions the Arena deals per League, how daily rounds stay identical for a League, and how Arena Practice rounds adapt.
- `ratings`: the 1 to 20 Rating per Player for each game, the Arena and each Skill: where it starts, how it moves, and what it controls.

### Modified Capabilities

(none: no specs exist yet; game Ratings are live but unspecified, and `ratings` records them alongside the new ones)

## Impact

- New `js/mental.js`: the five families with `gen(kind, d)` for d from 1 to 20, integer answers, seeded through `Math.random` like `makeSet()`.
- `js/arena.js`: `POOLS.pro` replaced by the mental families; `makeSet(league, seed, n, { ramp | dial })`; `runArena` takes a Dial for Practice rounds.
- `js/adapt.js`: `rating(key, mode)` and `saveRating(key, dial)` generalized from `game:` keys to `arena:<league>` and `skill:<id>`.
- `js/app.js`: `arenaView()` (Practice rounds use the Dial; result line shows the Arena Rating), `practice()` (`js/app.js:268` uses the Skill Rating).
- `cloud/firestore.rules:53` comment; `test/cloud.test.mjs` unchanged (caps unchanged).
- GLOSSARY.md Rating entry; `docs/PLAN.md` "Where things stand" row once shipped.
- Tests: `test/arena.test.mjs` (Pro sets contain only mental families; the same seed gives the same set; answers verified with exact arithmetic), new `test/mental.test.mjs`, `test/adapt.test.mjs` (new keys), Playwright `e2e/tests/arena.spec.ts`.
- Nothing new is sent: Ratings stay on the device with the rest of progress, which the parent note already covers ("Progress ... stay in this browser only"). `parentNote()` and `cloud/README.md` need no change.
- **Order and conflicts:** land after `view-cleanup-contract` (both change `runArena()` and `arenaView()`; Arena bug 1 is fixed there) and after `answer-checking-fixes` (both edit `practice()` at `js/app.js:268`). `fair-duel` uses `makeSet()`; if the `makeSet` signature changes here, update the Duel call. `analytics-events` round events work unchanged.
