# Proposal

## Why

The plan's big idea is "become the human calculator", and every persona's best moment in the age panel was seeing a Trick work (`docs/PLAN.md`, "Panel insight"). Phase 1 planned a separate "Beat the calculator" Hook screen; the grilling folded it into Star Quest: the Hook becomes the opening of a new Player's first Star, and returning Players skip it (`docs/star-quest.md` decision 25). Today a new Player picks a Mode and lands on a tile home (`modePicker()`, `home()`, `js/app.js:119`, `:148`) with nothing that shows a Trick beating anything.

## What Changes

- **The Hook** plays before the first Star a new Challenger or Pro Player opens (from the Sky, a Trick page or the Dojo): a dare to beat an on-screen calculator on one problem for that Star's Trick, a reveal of the Trick on the dare's numbers (at most 20 seconds, skippable), then the Star's round, dealt easiest first so the first answers are quick wins.
- **An honest race:** the calculator types the problem as a basic calculator would, one key every 0.45 seconds, then "=". Every Hook problem needs at least 6 key presses (2.7 seconds) and is one a Player who knows the Trick can beat.
- **Hook dares** for the 11 Tricks whose answer a basic calculator can produce in one go (from9, by11, times5, sq5, by9s, ends10, near-base, square-near, crosswise, duplex, sub-base). A first Star on another Trick starts without the Hook.
- **Returning Players skip it:** a Player who has answered any question, has Sparks, or has lit or skipped a Star never sees it; once seen or skipped, it never plays again.
- **Calm and screen readers:** with Calm on there is no race (the dare states the calculator's time); with reduced or paused motion the calculator still updates but nothing moves; the dare, the result and every reveal step are announced, the calculator's keys are not.
- ADR 0001's consequence ("Placement asks it up front once the Hook ships") is reworded to tie the up-front Age answer to Placement, which is not part of this change.

Out of scope:

- Placement (the Age answer, grade picker and three items after the Hook): a later change. The Age answer stays at the first would-be post.
- Moving the Hook before the Mode picker (the plan's "the mode question comes after"): the Mode picker stays first, since the Hook needs a Mode to word its copy.
- Explorer: no Hook until Explorer has its own Constellations.
- New analytics events (the existing `first_win` and route views cover the first minute).

Affected: new Challenger and Pro Players, on their first Star. No change for returning Players or Explorer.

## Capabilities

### New Capabilities

- `hook`: who gets the Hook, the honest calculator race, the reveal, quick wins, skipping, and Calm and screen-reader behavior.

### Modified Capabilities

(none: the "easiest first" exception for the round after the Hook is written into `star-round`'s requirement, which is not archived yet)

## Impact

- New `js/hook.js`: `HOOK_DARES` (one problem per eligible Trick), `calcKeys(problem)`, `isNewPlayer()`, and `runHook(root, { trick, signal, onDone })`.
- `js/star.js`: `runStar()` takes `{ hook: true }`, plays `runHook()` first and deals the round easiest first.
- `js/app.js`: `starView()` decides `hook` with `isNewPlayer()` and the Mode.
- `js/store.js`: `S.hookSeen`.
- `math.css`: the calculator and dare styles (tokens only; Calm and reduced-motion rules).
- `docs/adr/0001-parent-step-follows-the-age-answer.md`: one consequence line.
- Tests: new `test/hook.test.mjs`; `test/star.test.mjs`; Playwright new `e2e/tests/hook.spec.ts`, plus `a11y.spec.ts`.
- Nothing new is sent or kept beyond a device-only flag; `parentNote()` and `cloud/README.md` need no change.
- **Order:** needs `star-round`. Built after `sky-home` so the first Star a new Player meets is the one Bolt suggests (`from9` Star 1, white belt). Works with or without the Sky. Uses `fx.calmOn()` if `game-shell-and-calm` has shipped; until then it reads the same `vm.calm` preference, which nothing sets.
