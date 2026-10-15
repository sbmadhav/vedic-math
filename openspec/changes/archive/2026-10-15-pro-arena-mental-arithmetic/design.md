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

## Decisions made during implementation

Implemented on Thursday 2026-10-15 while the owner was away; each assumption below was made without asking.

1. **Board-safe switch-over instead of a Monday release.** The release is not on a Monday, so `dailySet(league, day)` in `js/arena.js` gates the new Pro sets on the date: Pro daily rounds dated before `MENTAL_FROM = '2026-10-19'` (Monday, first day of ISO week 2026-W43) keep the old pool (`POOLS.proV1`) and the old seed `daily-<day>-pro`, byte-identical to before (snapshot test in `test/arena.test.mjs`); from that date they use the mental families with the seed `v2:daily-<day>-pro`. Boards are named after the Player's local date and ISO week, and the gate uses the same local date, so no daily Board and no weekly Board holds Scores from both sets, in any time zone. Chosen over new Board ids because Board ids, the rules' `validBoard()` pattern, the World board readers and the rules tests would all have had to change, and the Board ids would carry a version forever. Board ids are unchanged, so the rules' Board-id pattern accepts them as before; no rules deploy is needed (the only rules edit is the Pro cap comment). Explorer and Challenger daily rounds are unchanged and byte-identical. Pro Arena Practice rounds and Pro Duels use the mental families at once (they are not on Boards). `POOLS.proV1` and the gate can be removed in a later change once 2026-W42 Boards are frozen. The cached-old-client risk above still applies after the switch day (accepted for one day, as before).
2. **Ladders.** Each family's 20 steps are in `js/mental.js`. Squares go past 2 digits at the top (101 to 299, endings in 5 up to 295) so the ladder keeps rising; 97² sits at d 12. Near-base products use bases 100 (d 1 to 10) and 1000 (d 11 to 20); the base itself is never dealt. Division shows `divisor × quotient ÷ divisor`, so it is always exact. Products skip multiples of 10. "Median answer size rises" is tested on the averages of each ladder's bottom, middle and top thirds (d 1 to 7, 8 to 14, 15 to 20) plus d 20 above d 1, because difficulty is not only size (12 × 18 is harder than 15², and 98 × 97 is easier than 87 × 96), so a strict per-step rise would force easy items to the top.
3. **Daily item shape.** Mental items carry `family` and `d` instead of `skill`; `#arQ` has `data-d` when the item has a difficulty (Pro daily and every Practice item), so tests can see it. The Duel keeps calling `makeSet(league, null, 120)`; for Pro an unseeded set uses the same ramp (6 to 16), so a Duel starts at about 6.
4. **Arena Practice.** `runArena(root, { league, day, dial, signal, onEnd })`: `day` (YYYY-MM-DD) means a daily round from `dailySet`; no `day` means Practice, where each next question is `practiceItem(league, dial.lv)` drawn through `dial.fresh()` (no repeats in a round). Pro Practice picks a random family per question (the daily round's round-robin order is only needed for identical sets). The lobby shows the Arena Rating (`#arRating`, worded per Mode with `fx.t()`), and the result line adds "Arena Rating up to N." when it moved (nothing for rounds under 4 answers).
5. **What counts as right for a Skill Rating.** In Practice, only a first try with no hint raises the Dial; a right answer after a miss, a hint or Show me counts as a miss for the Rating. Mastery is recorded exactly as before (`store.record` is unchanged).
6. **Skill Rating saving.** "Every 10 answers" is per Skill: when a Skill's Dial reaches 10 answers it is saved and replaced by a new Dial at the same difficulty, so the next save does not count those answers twice. The rest is saved in the view's `destroy()` (the router calls it on every route change); a session left with fewer than 4 unsaved answers on a Skill keeps its last saved Rating.
7. **Fallback for Skills practiced before Skill Ratings.** No saved Rating and `store.started(id)`: the Rating starts at the middle of the band for `store.level(id)` (level 1: 4, level 2: 10, level 3: 17), so questions stay at the level the Player had. A Skill never practiced starts at the Mode start (Explorer 1, Challenger 5, Pro 9), so a new Pro Player now sees level 2 questions on a new Skill where the old code gave level 1, and a new Challenger Player sees level 1 Arena Practice questions where the old code gave level 2. Both follow the ratings spec. The specs gained a scenario for the fallback and a requirement for the switch-over.
8. **Rating keys.** `rating(key, mode, fallback)` and `saveRating(key, dial)` take full keys only; the game callers in `js/app.js` pass `'game:' + id`. Stored `game:` values are unchanged.
9. **Tests.** The daily-round test for "two Players with different Ratings" uses two Players on one device in one browser context (the fixtures' fake Firebase and analytics guards attach to that context; a second bare context would not have them). The mastery test compares the saved mastery with the pre-change formula worked out in the test. The manual phone check in task 5.1 is covered by the Playwright `mobile` project (Pixel 7) and the live E2E run; no person checked a phone.
