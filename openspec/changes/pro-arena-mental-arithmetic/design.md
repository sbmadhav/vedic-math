# Design

## Context

- `makeSet(league, seedText, n)` (`js/arena.js:19-33`) temporarily replaces `Math.random` with a seeded `mulberry32` and draws skills from `POOLS[league]`. The same function feeds the Duel (`js/arena.js:86`, unseeded).
- Games already adapt: `AD.Dial` (`js/adapt.js:19-57`) moves difficulty per answer; `saveRating(gameId, dial)` (`:60-66`) blends 40/60 into `store.rating('game:' + id)`, skipping rounds under 4 answers. `START` by Mode is at `js/adapt.js:10`.
- Skill generators take a level of 1, 2 or 3 (`s.gen(store.level(s.id))`, `js/app.js:268`).
- Times sprint already has a 20-step multiplication ladder (`timesQ(lv)`, `js/games.js:40-50`) that can seed the product family.

## Goals / Non-Goals

**Goals:**
- Fair, identical Pro daily rounds with mental arithmetic only.
- One Rating mechanism (Dial plus `saveRating`) reused for games, the Arena and Skills.

**Non-Goals:**
- Difficulty-weighted Arena scoring. Arena Scores stay 10 plus combo, so caps and Boards are comparable before and after.
- More generator levels for Skills.

## Decisions

**1. A mental arithmetic module with 20 steps per family.**
`js/mental.js` exports `FAMILIES = ['mul2x2', 'square', 'percent', 'nearBase', 'divide']` and `mentalQ(family, d)` returning `{ q, answer, family, d }` with integer answers. Each family's ladder goes from easy (d 1: 12 × 11, 15², 10% of 40, 98 × 97, 84 ÷ 4) to hard (d 20: 87 × 96, 97², 17.5% of 640, 1004 × 997, 9936 ÷ 24). Every answer fits the keypad's 7 digits (`js/arena.js:53`). Ladders reuse `timesQ()` steps where they overlap.
- Rejected: keeping skill generators (`v-near-base`, `6-percent`, ...) at fixed level 2. They cannot express 20 difficulty steps and two of them produce non-integers that are then dropped.

**2. Daily ramp, not Rating, for daily rounds.**
`makeSet('pro', 'v2:daily-<day>-pro', 80, { ramp: [6, 16] })` draws the family round-robin from a seeded shuffle and difficulty rising linearly from 6 to 16 across the 80 items (a Player reaching item 44 in 60 s, the cap pace, is at about 12). The `v2:` prefix versions the seed (plan, "Seed everything with versions").
- Rejected: per-Player adaptive daily rounds. Different Players would race different questions on one Board, which is what made the Duel unfair (bug 9).

**3. Arena Practice uses a Dial.**
For Practice rounds `runArena` draws each next question from `mentalQ` (Pro) or from the League's pool at the generator level for the Dial's band (Explorer, Challenger: 1 to 7 is level 1, 8 to 13 level 2, 14 to 20 level 3), using `dial.fresh()` to avoid repeats. At round end `saveRating('arena:' + league, dial)`.
- Daily rounds also call `saveRating` with a Dial that only observes answers (it does not choose questions), so Pro Players who only play dailies still get a sensible Practice start.

**4. Skill Ratings in Practice.**
`practice()` keeps one Dial per Skill seen in the session (Endless practice mixes Skills), starts each from `rating('skill:' + id, mode)` (falling back to a value derived from today's `store.level(id)` so existing Players do not restart at the Mode start), maps the Dial to the Skill's level band as above, and saves each Skill's Rating when the session ends (view `destroy`, after `view-cleanup-contract`) or every 10 answers.
- Rejected: a single Practice Rating per Player. Skills differ too much (counting versus calculus).

**5. Generalized keys.** `rating(key, mode)` and `saveRating(key, dial)` take full keys (`game:<id>`, `arena:<league>`, `skill:<id>`); `rating(gameId, mode)` callers are updated. Stored data under `game:` keys is unchanged.

## Risks / Trade-offs

- [Pro Scores shift on the release day] → Release on a Monday; note in the PR and `docs/PLAN.md`. The cap of 1200 stays generous for mental arithmetic (2 × 2 products are slower than tapping trick answers).
- [Players on a cached old version get the old Pro set for the same Board] → `sw.js` serves page loads network first, so a reload gets the new version; old and new sets both stay within the cap and rules. Accepted for one day.
- [Practice Ratings feel no different with only 3 generator levels] → They react within a session instead of after mastery; finer steps need generator work, out of scope.
- [Explorer and Challenger Arena Practice mapping is coarse] → Same mapping as Practice; their daily rounds are unchanged.

## Migration Plan

1. Ship the client on a Monday. No rules deploy is needed (comment-only edit to `cloud/firestore.rules:53`; deploy it with the next real rules change).
2. Existing Players: Arena and Skill Ratings start at their Mode start, or for Skills from current mastery level; game Ratings unchanged.
3. Rollback: revert; `arena:` and `skill:` Rating keys are ignored by the old code.
