# Proposal

## Why

Views and round runners add listeners, timers and animation-frame loops to elements that outlive them, and nothing removes them. Three of the plan's trust bugs come from this one cause, and the same pattern hides more. Verified against the current code (line numbers as of `origin/main` 272230c):

- **Bug 1, confirmed.** `runArena()` adds a click listener to its `root` on every call (`js/arena.js:66`). The Arena view passes the same `#arShell` element for every round (`js/app.js:646`, `:664`), so from round 2 every keypad tap is handled twice: digits are entered twice (`js/arena.js:70`) and, in Explorer tap mode, one tap answers two questions (`js/arena.js:67`). The same defect is in `runDuel()` (`js/arena.js:90`): a rematch reuses `#dShell` (`js/app.js:694`), so every tap scores twice. `runChallenge()` has the same pattern (`js/arena.js:140`), but today the tower's "Play again" re-renders the whole view (`js/app.js:499`), so it cannot be reproduced there; it is fixed by the same contract.
- **Bug 2, confirmed.** `practice()` calls `wire()` for every question (`js/app.js:281`), and `wire()` adds a click listener to the persistent `root` (`js/app.js:311`). After n answered questions a symbol key inserts its character n + 1 times, and the "Want a hint?" link (`js/app.js:313`) uses n + 1 hints. `practice()` returns a no-op cleanup (`js/app.js:326`).
- **Bug 7, confirmed.** In five games the explanation for the answered question is written and the next question is drawn in the same tick, so the explanation sits under a different question: Number bonds (`js/games.js:198`), Times sprint (`js/games.js:210`), Fraction face-off (`js/games.js:259`), Answer checker (`js/games.js:324`) and Balance the scale (`js/games.js:366`). Other games already wait with an untracked `setTimeout` (for example `js/games.js:132`, `:143`, `:176`, `:281`, `:355`) that keeps running after Stop or leaving the page.

## What Changes

- **View cleanup contract.** Every route view receives an `AbortSignal` that is aborted when the route changes, and returns `{ destroy }`. Every listener, timer, interval and animation-frame loop a view starts is tied to that signal.
- **Rounds get their own signal.** Arena rounds, Duels, tower challenges, game rounds, Katas and each Practice question run under a child signal that is aborted when the round or question ends, so starting the next one on the same element never stacks handlers. This fixes bugs 1 and 2 and the Duel rematch.
- **Answered item and explanation stay together.** After a miss in a game, the answered question and its explanation stay on screen together for 1.2 seconds before the next question; after a right answer the next question appears at once and the explanation line is cleared. The hold timer is tied to the round's signal. This fixes bug 7.
- Leaving a view, or stopping a round, leaves no timer, loop or listener behind.

Out of scope:

- The Phase 1 game shell and Calm mode, which build on this contract.
- Any change to scoring, Ratings, question sets or Board posting.
- A framework or bundler (the plan keeps vanilla ES modules).
- The global, page-lifetime listeners that are added once (`hashchange` at `js/app.js:86`, the Watch click handler at `js/app.js:798`, the sutra and video dialogs at `js/app.js:557-561` and `:807-815`, the ambient background in `js/ambient.js`). They are not per view and do not leak.

Affected: all three Modes. Everyone in the Arena from round 2 (Explorer taps and Challenger and Pro keypad), Duel rematches, every Practice and Endless run session (symbol keys are shown for grades 3 and up, so mostly Challenger and Pro), and Players of the five games above.

## Capabilities

### New Capabilities

- `view-lifecycle`: what happens to a view's and a round's handlers, timers and loops when the route changes, a round ends or the next question starts, and how answered items and their explanations are shown.

### Modified Capabilities

(none: no specs exist yet)

## Impact

- `js/app.js`: router `render()` (`js/app.js:69-84`) owns an `AbortController` per render; every view function takes `{ signal }` and returns `{ destroy }`; the module-level `cleanup` variable (`js/app.js:36`) goes away. `practice()`, `arenaView()`, `duelView()`, `challengeView()`, `kataView()`, `gameView()`, `skillView()` (animator) and `openSutra()` scenes move onto signals.
- `js/arena.js`: `runArena`, `runDuel`, `runChallenge` take a `signal` and return `{ destroy }`.
- `js/games.js`: `timer()`, `kit()` and every game's `run(area, ctx)` use `ctx.signal`; a shared `hold(ms)` helper for the answered-item hold.
- New small helper module (for example `js/life.js`) with `on`, `later`, `every` and `loop` bound to a signal.
- Tests: node tests in `test/` for the helper (Node has `EventTarget` and `AbortController`), Playwright specs in `e2e/tests/arena.spec.ts`, `e2e/tests/games.spec.ts` and a new Practice spec. The plan's regression net items "2 Arena rounds, 5 Practice questions" are delivered here.
- Nothing sent or kept changes, so `parentNote()` and `cloud/README.md` are untouched.
- **Order:** land this before the Phase 1 game shell. `fair-duel` and `pro-arena-mental-arithmetic` both edit `js/arena.js`; land this first and rebase them onto it. `analytics-events` hooks round ends and benefits from the single `onEnd` path this creates, so it should land after.
