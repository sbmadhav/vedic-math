# Proposal

## Why

Daily quests and badges are the first rewards a new Player sees, and both misreport. Verified against the current code (line numbers as of `origin/main` 272230c):

- **Bug 6, confirmed.**
  - `startDay()` stores each quest's baseline with `store.bump(..., now || 0.0001)` (`js/gamify.js:66`), because a baseline of 0 cannot be told apart from a missing one in `store.count()`. On a first day the baseline is 0.0001, so `quests()` (`js/gamify.js:57`) computes progress 0.9999 after one action and the home card prints it raw (`js/app.js:116`, `${q.prog}/${q.goal}`): "0.9999/1".
  - Quests are keyed by position (`quest:${day}:${i}`, `js/gamify.js:57` and `:72`), so after a Mode change the quest in slot 0 of the new Mode shows as already done if slot 0 of the old Mode was.
  - Baselines exist only for the Mode active at the first `startDay()` of the day (guarded by `day:` at `js/gamify.js:62`). A counter the new Mode uses but the old one did not (Explorer's `games` and `right`, `js/gamify.js:51`) has no baseline, so its progress is the Player's lifetime total and the quest completes instantly.
  - Every day shows the same three quests per Mode (`js/gamify.js:50-54`): there is no rotation.
- **Bug 10, confirmed.** Two badges are earned by starting or opening something, not by doing it:
  - "Duelist" (`js/gamify.js:40`) tests `count('duels')`, bumped when Start is pressed (`js/app.js:694`), before anyone answers.
  - "Sutra scholar" (`js/gamify.js:43`) tests `seen('sutras')`, set by opening the Sutras page (`js/app.js:511`).
  - "Video learner" (`js/gamify.js:44`) is earned by clicking any Watch link (`js/app.js:800`); its text says "Open a video or link", which is accurate but is the same "opening a page" pattern the plan names, so it is included here.
  - Every other badge already needs completion or correct answers (for example "Arena debut" is bumped in the round's `onEnd`, `js/app.js:665`; "Game explorer" in the game's `finish`, `js/app.js:750`).

## What Changes

- Quest progress starts at a true 0 each day and is shown as a whole number, never a decimal.
- Quests are keyed by a stable quest id, so a Mode change never marks a different quest done.
- Baselines are taken for every counter any Mode's quests use, so changing Mode mid-day starts the new Mode's quests at 0 instead of completing them.
- Each Mode has a pool of quests; three are picked per local date by a seeded draw, the same for every Player in that Mode on that date.
- Badges are awarded on completion or correct use: **Duelist** when a Duel ends with a winner; **Sutra scholar** when a Player has collected 10 Sutra cards; **Video learner** when a video has played in the in-page player for at least 60 seconds. Badge copy changes to match.
- Badges already earned are kept.

Out of scope:

- New reward systems (the plan's "Not doing in 2026" list), quest XP amounts (stay 25), level and title rules.
- Sutra cards earned by use (Phase 2).
- Any change to what is posted: XP from quests still counts toward the weekly XP total exactly as today.

Affected: all three Modes. Every Player on day 1 (the 0.9999 display), Players who change Mode during a day, and Players aged about 11 and up who notice badges for doing nothing.

## Capabilities

### New Capabilities

- `quests`: how daily quests are chosen, counted from a daily baseline, displayed and completed.
- `badges`: what earns each badge, and that earned badges are kept.

### Modified Capabilities

(none: no specs exist yet)

## Impact

- `js/gamify.js`: `QUESTS` becomes per-Mode pools with ids; `startDay()`, `quests()`, `checkQuests()`; the three badge definitions.
- `js/store.js`: a per-day quest record per Player (`questDay: { day, base, done }`) instead of `q:` counters and `quest:` seen keys. Old keys are left in place and ignored.
- `js/app.js`: `questsHTML()` (`js/app.js:114-117`); the Duel `onEnd` (`js/app.js:694`); the video player open time (`openPlayer`, `js/app.js:805-824`).
- Tests: new `test/gamify.test.mjs` (node, with a localStorage shim like the existing tests' support), Playwright `e2e/tests/progress.spec.ts` (day-1 quests from the plan's regression net) and `e2e/tests/arena.spec.ts` (Duel badge).
- Nothing sent or kept beyond the device changes; `parentNote()` and `cloud/README.md` are untouched.
- **Order:** independent. The Duel badge hook sits in `duelView()`, which `view-cleanup-contract` and `fair-duel` also edit; land after `view-cleanup-contract` and rebase on `fair-duel` if it lands first. `analytics-events` may count quest completions later; not part of this change.
