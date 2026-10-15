# Design

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
