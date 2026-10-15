# Tasks

## 1. Quest record and baseline (bug 6)

- [x] 1.1 Add `questDay` to the progress record in `js/store.js` (`blank()` at `js/store.js:6`) with getters and a setter, and rewrite `startDay()` (`js/gamify.js:60-68`) to replace it on a new date with baselines for every pooled counter. Verify: new node test `test/gamify.test.mjs` (with a `localStorage` shim) shows day-1 progress is 0 then 1 after one answer, and a new date resets to 0.
- [x] 1.2 Rewrite `quests()` and `checkQuests()` (`js/gamify.js:55-73`) to use `floor`, clamp to the goal, key `done` by quest id, and add 25 XP once. Verify: node tests for floor and clamp, one-time XP, and that a Mode switch after completing a Challenger quest marks no Pro quest done.
- [x] 1.3 Mode change mid-day: Verify with a node test that switching Challenger to Explorer with 500 lifetime right answers leaves "Get 5 right" at today's count only.
- [x] 1.4 `questsHTML()` (`js/app.js:114-117`) shows whole numbers and the quest label per Mode. Verify: Playwright spec in `e2e/tests/progress.spec.ts` (the plan's "day-1 quests"): a fresh device in Challenger answers one Practice question and the home card shows `1/15`-style text and no `.`.

## 2. Rotation

- [x] 2.1 Replace `QUESTS` (`js/gamify.js:50-54`) with per-Mode pools of 6 to 8 quests with ids and a seeded pick of three per date and Mode (always one answer quest). Verify: node tests that the pick is identical for two calls on the same date and Mode, differs across at least 5 of 7 consecutive dates, and always includes an answer quest.

## 3. Badges (bug 10)

- [x] 3.1 Duelist on completion: bump `duelsDone` in the Duel `onEnd` (`js/app.js:694`) and test it in `BADGES` (`js/gamify.js:40`); update the "how" text. Verify: Playwright spec in `e2e/tests/arena.spec.ts`: Start a Duel and leave, no badge toast and the Me page shows Duelist locked; finish a Duel, the badge is earned.
- [x] 3.2 Sutra scholar at 10 collected cards: move `collectedCard` from `js/app.js:506` into `js/gamify.js`, change the test at `js/gamify.js:43` and its text. Verify: node test with 9 then 10 seen cards; Playwright: opening `#/sutras` alone does not award it.
- [x] 3.3 Video learner after 60 seconds in the player: in `openPlayer()` (`js/app.js:805-824`) bump `watchedMinute` after 60 s open, cancelled on close; change the test at `js/gamify.js:44` and its text. Verify: Playwright with `page.clock` (the YouTube iframe is routed to an empty page in the test): closing after 5 s awards nothing, staying 60 s awards the badge.
- [x] 3.4 Earned badges stay: Verify with a node test that a stored `badges.duel` from before the change is still reported earned and never removed.

## 4. Release check

- [x] 4.1 Node and e2e suites pass against `_site`, then live. Verify: CI and post-deploy E2E green; on a fresh phone browser the home quests read whole numbers on day 1.
