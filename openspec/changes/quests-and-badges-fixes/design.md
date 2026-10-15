# Design

## Context

- `store.count()` returns `S.counts[c] || 0`, so a stored 0 is indistinguishable from "never set"; that is why `startDay()` writes 0.0001 (`js/gamify.js:66`).
- Quest state today lives in two places: `q:<day>:<counter>:start` counters and `quest:<day>:<i>` seen keys, both per Player in that Player's progress record. Neither is ever cleaned up.
- `fx.mode()` is per Player (`js/fx.js:12`), and `startDay()` runs on boot, on Player switch (`js/gamify.js:84`) and after a Mode is picked (`js/app.js:106`, `:856`).

## Goals / Non-Goals

**Goals:**
- One small per-day quest record, replaced each day, so storage stops growing.
- Seeded daily choice that matches the "same for everyone in a mode" comment (`js/gamify.js:49`).

**Non-Goals:**
- Server-side quests or anything posted.

## Decisions

**1. A per-day quest record.** `S.questDay = { day, base: { [counter]: n }, done: { [questId]: ts } }` in the Player's progress. On the first `startDay()` of a date it is replaced: `base` records the current value of every counter used by any quest in any Mode's pool (so a Mode change needs no new baseline), `done` starts empty. Progress = `floor(count(counter) - base[counter])`, clamped to `[0, goal]`.
- Rejected: keeping `q:` counters with a sentinel. It is what produced 0.9999.

**2. Pools with ids and a seeded pick.** `QUEST_POOL[mode]` holds 6 to 8 entries `{ id, counter, goal, label }` built only from counters that already exist (`answers`, `right`, `gamesPlayed`, `arena`, `tricksWatched`, `katas`, `runs`, `bestStreak` is excluded because it is not daily). Three are picked with the same seeded shuffle used by the Arena (`mulberry32(hash('v1:quests:' + day + ':' + mode))`), with a version prefix so editing a pool can be rolled out on a new version without changing a day already in progress. Labels are worded per Mode.

**3. Badge rules.** Duelist tests a new `duelsDone` counter bumped in the Duel's `onEnd`; the old `duels` counter (Start presses) stays for history and is no longer used by a badge. Sutra scholar tests the number of collected cards (`collectedCard`, `js/app.js:506`) is at least 10; this moves `collectedCard` into `js/gamify.js` so the test can use it. Video learner tests a `watchedMinute` counter bumped when the player dialog has been open for 60 seconds (a `later(…, 60000, signal)` tied to the dialog's open, aborted on close).
- Rejected for Sutra scholar: "read a deep dive to the end". Scroll depth is unreliable on phones and still rewards opening.
- Rejected for Video learner: the YouTube iframe API to detect real playback. It adds a third-party script, against the plan's light first load.

**4. No badge revocation.** `checkBadges()` only adds (`js/gamify.js:76`); unchanged.

## Risks / Trade-offs

- [Rotation makes a favorite quest disappear some days] → Pools keep one "answer N questions" quest in every day's draw (the first pick is always from the answer group).
- [Old `q:` and `quest:` keys stay in storage] → Small; they are ignored. A later cleanup can drop them.
- [Sutra scholar becomes harder] → 10 of 29 cards; cards also come from mastering tricks.

## Migration Plan

Client-only. On first load after release, `startDay()` builds today's `questDay` from current counts, so today's quests restart at 0 for everyone once. Rollback is a revert; old keys still work for the old code.
