# Design

## Context

- `render()` (`js/app.js:69-84`) calls a module-level `cleanup` function (`js/app.js:36`) and then the route handler. Some views set `cleanup` (`skillView`, `mixView`, `challengeView`, `arenaView`, `duelView`, `gameView`), the rest do not.
- Round runners write `root.innerHTML` and then call `root.addEventListener`, so the element survives across rounds while the markup inside it is replaced (`js/arena.js:66`, `:90`, `:140`; `js/app.js:311`).
- Games run as `g.run(area, ctx)` (`js/games.js`), return an optional stop function, and use bare `setTimeout`, `requestAnimationFrame` and `timer()` (`js/games.js:14-20`).
- Targets are evergreen browsers: `addEventListener(type, fn, { signal })` is supported everywhere the app runs (Safari 15+). `AbortSignal.any` is newer (Safari 17.4), so it is not relied on.

## Goals / Non-Goals

**Goals:**
- One mechanism, the `AbortSignal`, for every listener, timer and loop, so a missed cleanup is a visible omission in review instead of a silent leak.
- Small diffs per view; no framework.

**Non-Goals:**
- Rewriting views as components or changing markup.
- Changing round timing, scoring or the Board flow.

## Decisions

**1. Router owns an `AbortController` per render.**
`render()` aborts the previous controller, creates a new one, and calls `view(params, { signal })`. A view may return `{ destroy }` for extra work (for example closing a dialog); `render()` calls it before aborting. The `cleanup` variable is removed.
- Rejected: keeping `cleanup` and fixing each `addEventListener`. Fixes the three bugs but leaves the pattern, and the plan explicitly asks for the root cause.

**2. A tiny lifecycle helper, `js/life.js`.**
`on(target, type, fn, signal)`, `later(fn, ms, signal)`, `every(fn, ms, signal)`, `loop(fn, signal)` (rAF) and `child(signal)` (a new controller aborted when the parent aborts, using one `abort` listener, so no `AbortSignal.any`). Each returns nothing to remember: abort is the only way to stop. Node-testable with fake timers.
- Rejected: returning disposer functions from each call. Easy to drop on the floor, which is how the current leaks happened.

**3. Rounds and questions use child signals.**
`runArena(root, { league, seed, onEnd, signal })` creates `child(signal)` for the round and aborts it on end or `destroy()`. The view keeps its own signal for the lobby. The same for `runDuel`, `runChallenge`, game `run(area, { ...ctx, signal })`, `kataView` and each Practice question in `practice()` (one child per `next()`), so per-question handlers are attached with the question's signal. Delegated listeners that should live for the whole session (such as the Practice symbol keys) may instead be attached once with the view's signal; either way there is exactly one.

**4. Answered-item hold for games.**
`kit(ctx)` gains `answered(ok, explainHtml, next)`: on a miss it disables the game's inputs, keeps the current question and writes the explanation, then `later(next, 1200, roundSignal)`; on a right answer it clears the explanation line and calls `next()` at once. The five games at `js/games.js:198`, `:210`, `:259`, `:324`, `:366` switch to it; games that already wait use `later` with the round signal instead of bare `setTimeout`. In timed games the clock keeps running during the hold.
- Rejected: holding 1.2 s after every answer, as the plan's first wording suggests. In 60-second games it would cut a fast Player's answers by about a third, change every Level's star goals (`js/games.js` `LEVELS`, computed from `perQ`) and lower Ranked scores against this week's Boards. Holding only on a miss keeps right-answer pace and still shows each explanation with its own question.
- Rejected: prefixing the explanation with the old question ("Last one: 7 × 8 = 56") and moving on. Cheaper, but young Players read it as being about the new question, which is the bug.

**5. Tests use Playwright's clock for full rounds.**
`page.clock.install()` and `page.clock.runFor(61_000)` finish an Arena round in milliseconds. The two-round spec uses the Arena "Practice round" so no Score is even attempted.

## Risks / Trade-offs

- [A view forgets to pass the signal] → `on`, `later`, `every` and `loop` require it (throw without one), and a node test scans `js/` for bare `addEventListener(` on view roots and bare `setTimeout(` inside `js/games.js` and `js/arena.js`.
- [Hold on a miss changes game feel] → Only after misses, and the clock is unchanged; real-kid sessions in the Hook test will show if it drags.
- [Large diff touching every view] → Mechanical; land in one commit per file group with the e2e suite green between them.

## Migration Plan

Client-only. No data or Board change. Rollback is a revert.
