# Design

> **Superseded by `placement` (owner Q14, 2026-10-17).** The Hook now opens the first Star that Placement points to. Its requirements live in `openspec/changes/placement/specs/hook/spec.md` and its tasks in `placement`'s tasks.md section 4. Do not apply or archive this change; `placement` task 7.2 deletes this folder.

## Checked against main, 2026-10-30: not built, delete this folder

**Call (owner-delegated, 2026-10-30): do not build this change; it is fully superseded as a change.** Reasons:

- **Nothing that shipped does the Hook's job.** `first-visit`, `try-trick-in-modes` (archived 2026-10-27), `sutras-first`, `play-nav-by-mode` and `working-memory-scaffolds` give the first minute a Sutra lesson (Try a trick on Home), a Star round that names its Sutra, and two-part answer boxes, but no race against a calculator: nothing in `js/`, `app/src/` or `shared/src/` draws one. The Star round's own Dare (GLOSSARY: a harder optional question) is a different thing. So the Hook still adds something, and it stays planned.
- **Its plan already lives in `placement`.** The owner folded the Hook into Placement (Q14) and set Placement to be built after the move to React (Q15, `react-typescript` D3). `placement`'s design decision 10 re-plans it for `app/src/logic/hook.ts` and `app/src/views/star/Hook.tsx`, and already absorbed what `try-trick-in-modes` changed (Sparks from a Try a trick do not make a Player old). Building `js/hook.js` in the Legacy Star view now would go against Q14 and Q15 and against the coding standard that new code is TypeScript and React, and it would be rewritten when the Star view moves.
- **Nothing is lost by deleting it.** `placement`'s tasks 4.2 to 4.4 and 4.6 now carry every Verify case this file's tasks listed (they used to point here with "as written there"), so this folder can go now rather than wait for `placement` task 7.2.

Task by task:

| Task here | Where it is now | What shipped since that touches it |
| --- | --- | --- |
| 1.1 `HOOK_DARES`, `calcKeys` | `placement` 4.2, in `app/src/logic/hook.ts` | Nothing. |
| 1.2 `isNewPlayer()`, `S.hookSeen` | `placement` 4.2 | `try-trick-in-modes`: a Try a trick earns Sparks and records no answer, so the "no Sparks" condition is dropped (`placement` decision 10). |
| 2.1 `runHook()`: dare, race, reveal, Skip | `placement` 4.3, `Hook.tsx` and `Calculator.tsx` | `sutras-first`: the replay the reveal reuses names the Trick's Sutra. `play-nav-by-mode`: a Deep dive's Try it yourself and Home's Play this Star are now the usual ways into a first Star; the Mode picker has no Try a trick buttons (Try a trick is on Home). `working-memory-scaffolds`: Challenger's digit boxes mark the two parts, which the dare's entry reuses. |
| 2.2 easiest-first deal | `placement` 4.3 (`starRound({ easiestFirst: true })`) | Nothing: `starRound()` still shuffles its band. |
| 3.1 Calm, motion, announcements | `placement` 4.4 | `fx.calmOn()` has shipped (`game-shell-and-calm`), so the fallback this file allowed for is not needed. |
| 3.2 Accessibility | `placement` 4.4 | Nothing. |
| 4.1 ADR 0001 and `docs/PLAN.md` | `placement` 7.1 | `docs/PLAN.md` already says the Hook moved into `placement` and that the replay and rematch replaced the Mistake Museum. ADR 0001's "once the Hook ships" line is still to reword. |
| 4.2 nothing is sent | `placement` 4.6 | Nothing. |
| 5.1 release check and the kids' Hook test | `placement` 8.1 | Nothing (an owner task: children, a parent, a phone). |

## Context

- `star-round` provides `runStar(root, { trick, star, signal, back, findVideo })`, the replay renderer (steps every 2.5 s, Skip and Escape), `fx.noMotion()`, `fx.announce()` and Bolt's poses.
- `sky-home` makes Bolt suggest `from9` Star 1 (white belt) to a Player with no progress.
- New-Player signals in the store: `store.count('answers')`, `store.sparks()`, `S.sky.lit` and `S.sky.skipped`.
- ADR 0001's last consequence says Placement asks the Age answer up front "once the Hook ships".
- `docs/PLAN.md` Phase 1: "First screen dares 'Square 85 before the calculator does'. The player loses, sees a 20-second reveal, then wins 3 times ... The race must be honest (0.45s per key plus '='), using only problems humans really win."

## Goals / Non-Goals

**Goals:**
- A first minute that shows a Trick beating a calculator, fairly.
- No change for anyone who has played before.

**Non-Goals:**
- Placement; Explorer; a Hook before the Mode picker.

## Decisions

**1. Where the Hook lives: inside the first Star.** `starView()` calls `runStar(root, { ..., hook: isNewPlayer() && mode !== 'explorer' && HOOK_DARES[trick] })`. `runStar` runs `runHook()` under a child signal, then the round. The Hook has no route of its own, so Back, deep links and analytics route views stay the Star's.
- Rejected: a separate first screen before home (the plan's original). Decision 25 makes it the first Star's opening, and it keeps one place where the Trick is taught and practised.

**2. Who is new.** `isNewPlayer() = count('answers') === 0 && sparks() === 0 && no lit or skipped Star && !S.hookSeen`. `S.hookSeen` is set when the dare appears (so leaving mid-Hook counts as seen) and when it is skipped. A returning Player who has played on this device before Star Quest has answers or Sparks, so they never see it.

**3. Hook dares.** `HOOK_DARES` maps 11 Tricks to one fixed problem each, chosen by hand from that Trick's Star 1 range so the numbers are friendly (`sq5: [85]`, `from9: [357]` as 1000 − 357, `by11: [63]`, and so on), stored as `vals` and turned into a question with `problemFor()`. `calcKeys(trick, vals)` returns the key sequence a four-function calculator needs (squares as `a × a`, "1000 − 357" as typed, products as typed), always ending with `=`. A node test asserts at least 6 keys for every dare and that `problemFor()`'s answer equals the calculator's result.
- Tricks with equations, remainders, digit questions or roots (`check9`, `div9`, `recip`, `osculator`, `sqroot`, `cuberoot`, `transpose`, `add-sub`, `ratio-zero`, `zero-sum`) have no Hook dare: a basic calculator cannot type them in one go, so the race would not be honest. A new Player whose first Star is one of them gets no Hook, and `hookSeen` is set (they are past the first minute).
- Rejected: always daring 85² whatever the Star. The reveal would teach a different Trick from the round that follows.

**4. The race.** The dare screen shows the problem, the Player's entry (keypad and keyboard, the Star's entry for the Mode), and a calculator drawing whose display adds one key every 450 ms through `life.every` on the Hook's signal, then shows the result. The first of (Player right, calculator done) decides the outcome; a wrong Player answer just clears the entry (no penalty). Outcomes: Bolt `cheer` "You beat the calculator!" or Bolt `wink` "The calculator won this time. Want to see how to beat it?" Both go on to the reveal (a "Show me" button, auto after 3 s). A Player who has not typed when the calculator finishes simply loses.

**5. The reveal and quick wins.** The reveal reuses `star-round`'s replay renderer on the dare's `vals`, with the step pace set to `min(2.5 s, 20 s / steps)` so it always ends within 20 s. Then `runStar` deals its 4 questions and sorts them by Kata number ascending (only for this round), so the first ones are the easiest of the band.
- Rejected: three extra "quick win" questions before the round. The plan's "wins 3 times" is met by the easiest-first round, and a longer first session works against decision 9 (rounds stay short).

**6. Calm, motion and announcements.** With `fx.calmOn()` (from `game-shell-and-calm`; until it ships, the same `vm.calm` read through `fx.noMotion()`'s helper), the dare shows "A calculator needs 2.7 seconds to type this" and no timer runs; the reveal follows the Player's answer or Skip. With `fx.noMotion()` the calculator display still changes key by key (a text change, not motion) and the drawing does not animate. `fx.announce()` gets the dare text, then the outcome, then each reveal step; the calculator's display is `aria-hidden="true"` and its final result is part of the outcome message.

**7. ADR 0001.** Its last consequence becomes: "Placement asks it up front once Placement ships. Until then it is asked the first time a Score or weekly Sparks total would be posted." The Hook asks nothing about age.

## Risks / Trade-offs

- [Kids shrug at the race] → The plan's Hook test with real kids gates Phase 1; the Hook is one function call from `starView()` and can be switched off without touching rounds.
- [A new Player beats the calculator without the Trick] → Fine: they still see the reveal and the round.
- [Hook dares feel repetitive for siblings on one device] → Each Player sees it once; it is the first minute only.

## Migration Plan

None: `S.hookSeen` starts unset; Players with any history are not new. Rollback: revert; the flag is ignored.

## Files touched

- New: `js/hook.js`, `test/hook.test.mjs`, `e2e/tests/hook.spec.ts`
- `js/star.js`, `js/app.js`, `js/store.js`, `js/fx.js` (if `calmOn` is not there yet, a `calmPref()` read), `math.css`
- `docs/adr/0001-parent-step-follows-the-age-answer.md`, `docs/PLAN.md` (Phase 1 table: Hook folded into the first Star)
- Tests: `test/star.test.mjs`, `test/lifecycle-scan.test.mjs`; `e2e/tests/a11y.spec.ts`
