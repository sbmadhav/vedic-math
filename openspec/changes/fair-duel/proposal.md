# Proposal

## Why

A Duel is meant to be a fair race on one screen, often a parent against a child, but today each side races a different question. Verified against the current code (line numbers as of `origin/main` 272230c):

- **Bug 9, confirmed.** `runDuel()` builds one set (`js/arena.js:86`) and `deal(p)` gives each side the next unused item, `set[k++ % set.length]` (`js/arena.js:89`). The two sides start on different questions (`js/arena.js:95`) and drift further apart with every answer, so one Player can get 2 + 3 while the other gets 9 + 8.
- **Explorer Duel shows no dots, confirmed.** `makeSet()` keeps the picture only for the Explorer League (`js/arena.js:29`), but the Duel markup has no picture slot and `deal()` writes only `q.q` and the choices (`js/arena.js:88-89`). Explorer counting questions such as "How many dots?" are unanswerable without the picture.

## What Changes

- Both sides see the **same question** with the same choices at the same time.
- The first right answer wins the point, and then both sides get the next question together.
- A wrong answer freezes only that side for 1.2 seconds (as today); the other side can still win the question. If both sides miss, the right answer is shown briefly and both get the next question.
- Every Duel question shows its picture when it has one, on both sides; in the Explorer League this is every question that comes with dots or a ten frame.
- The face-to-face option keeps rotating the top Player's side, picture included.

Out of scope:

- The Phase 2 "Fair same-screen Duel" items: keyboard sides (QWER and UIOP) and a handicap by Mode for parent versus kid.
- Seeded or shareable Duel sets, Duel Boards or posting anything; Duels stay on the device.
- The Duel rematch double-tap bug (`js/arena.js:90`, same listener pattern as Arena bug 1), fixed by `view-cleanup-contract`.
- The Duelist badge rule (owned by `quests-and-badges-fixes`).

Affected: families and friends sharing one screen in any Duel level (Explorer, Challenger, Pro); Explorer-level Duels most of all.

## Capabilities

### New Capabilities

- `duel`: how a same-screen Duel deals questions, scores, handles misses and shows pictures.

### Modified Capabilities

(none: no specs exist yet)

## Impact

- `js/arena.js`: `runDuel()` deals one shared question, renders `viz` on both sides, and resolves a question when one side is right or both have missed.
- `math.css`: a picture slot in `.duel-side` (`math.css:430-441`) that fits both phone layouts and the flipped side; tokens only.
- Tests: node test in `test/arena.test.mjs` for the Duel question flow if the dealing logic is split out as a pure function; Playwright spec in `e2e/tests/arena.spec.ts` (the existing "duel: two players answer on one screen" test at `e2e/tests/arena.spec.ts:70-78` is updated).
- Nothing sent or kept changes; `parentNote()` and `cloud/README.md` are untouched.
- **Order:** land after `view-cleanup-contract` (both edit `runDuel()`; the contract changes its signature and listener handling). `quests-and-badges-fixes` hooks the Duel's `onEnd`; whichever lands second rebases.
