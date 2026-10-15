# Design

## Focus after an answer

Games rebuild options in many places (`next()`, `draw()`, the miss hold in `kit().answered()`), so a per-game call would be easy to miss in a new game. Instead `keepFocus(area, signal, startInside)` in `js/games.js` runs once per round from the game shell in `js/app.js`:

- It tracks whether focus was last inside `#gArea` (a document `focusin`; a `pointerdown` outside clears it).
- A `MutationObserver` on the area (child list and the `disabled` attribute) restores focus when it has fallen to `<body>`: to the first enabled control inside a `role="group"`, or, on a board marked `data-keep-index`, to the control at the same position.
- The observer is disconnected through `onAbort(signal)`, now exported from `js/life.js`, so the round's signal owns it like every other listener.

## Status messages

A visually hidden `role="status"` paragraph (`#arSay`, class `vm-sr`) holds one message per answer. The running score in the message keeps consecutive messages different, so screen readers announce each one. Times sprint uses the game's existing status line (`#gSay`), and leaves the explanation line under the question empty after a right answer (view-lifecycle spec).

## Motion

`fx.motionOff()` is the one check: OS reduced motion or `html.motion-paused`. `ambient.js` observes the `class` attribute of `<html>` (it already observed `data-theme`) to stop or restart its frame loop.
