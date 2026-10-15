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

## Decisions made during implementation

Made without the owner (asleep, merge authorized); each is small and reversible.

- **`destroy` is optional.** Views return `{ destroy }` only when they have work beyond the signal (Practice does, to end its session). Every round and countdown is a child of the view's signal, so aborting the view signal already stops them; `arenaView`, `duelView`, `challengeView` and `gameView` return nothing. The router calls a returned `destroy()` before aborting, as designed.
- **`mount(fn)` for views that draw themselves again.** "Play again" (Kata, tower challenge, game level) and "Run again" (Endless run) used to call the view function directly, which bypassed the router. They now go through `mount()`, the same teardown-then-new-signal path `render()` uses, so the old view's signal is aborted first.
- **Sutra deep dives keep the page's signal.** When a `#/sutras/<id>` link opens or swaps the dialog over the sutras page, `render()` returns before tearing down, so the page underneath keeps its signal. The dialog's animated scene gets its own controller (`sutraScene`), aborted when the dialog closes or swaps; `mountScene(host, scene, signal)` no longer returns a stop function.
- **`loop(fn, signal)` stops when `fn` returns `false`.** Round clocks end themselves at zero; returning `false` is how a loop says it has reached its own end, without handing out a disposer. Abort is still the only way to stop a loop from outside.
- **What the hold disables and how taps are ignored.** `kit(ctx, area, { tip })` takes the game area and, optionally, the explanation element (otherwise the explanation goes to the say line in the game header). During the 1.2 s hold every enabled button and input in the area is disabled, and a capturing `click`/`submit` listener on the area (on the round signal) swallows anything that still arrives, so a tap counts for neither question. The Stop / Finish button is outside the area and still works.
- **Right answers in the five games clear the explanation line.** Number bonds, Answer checker and Balance the scale used to write an explanation after right answers too; per the spec, a right answer now moves on at once with the line cleared (Fraction face-off keeps its generic "Right!", which is about no question in particular, and clears its fraction bars). Points and the flash still confirm the answer.
- **The other waiting games clear their line on the next question.** Balloon pop, Which is more?, Quick look, Number line sniper and Pattern spotter already waited before the next question, but left the last answer's message under the new one. Their `next()` now clears it, which the "An explanation stays with its question" requirement covers. Their wait times are unchanged and now use the round signal.
- **Two bugs from the proposal did not reproduce, and their tests stay as regression nets.** On `origin/main` the Explorer Arena tap in round 2 and the Duel rematch tap were each handled once: the stale round's handler returned early on its own `over` flag. Only the keypad path (no `over` check) entered digits twice. The countdown was also already cleared by the old `cleanup`. The new specs for these pass on the old code, unlike the keypad, Practice, hold and Stop-then-start specs, which fail on it.
- **The Practice spec went into the existing `e2e/tests/practice.spec.ts`**, which already existed for answer checking; the hint check counts writes to the say line with a `MutationObserver`, because one hint and six stacked hints can show the same text.
- **Stop then start is checked through read-aloud.** In Balloon pop a stale wait from the stopped round could only show itself by reading its next question aloud (its other writes go to detached elements), so the spec counts `speechSynthesis.cancel()` calls, which every read-aloud makes first.
- **Arena specs jump the clock.** They use `page.clock.fastForward(61_000)` then a short `runFor`, because running every animation frame of a minute timed out on WebKit.
- **Release check 5.1.** The manual phone check of two Arena rounds and a Duel rematch is covered by the Playwright `mobile` project (Pixel 7) running the same specs against a production-like local build; the live post-deploy E2E run is checked after the merge.
