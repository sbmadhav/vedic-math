# Design

## Context

- Confetti came from two places: `fx.confetti(n)` in `js/fx.js` (a full-window canvas on bare `requestAnimationFrame`) and `confetti(n)` in `js/play/kit.js` (DOM pieces with a CSS animation and a bare `setTimeout`). Both skipped under no motion; neither stopped when motion was turned off mid-burst.
- The Star round drew its own particle canvas (`burst()` in `js/star.js`) on every right answer and when a Star was lit.
- Motion rule: `fx.noMotion()` and `kit.reducedMotion()` are the same check (the device setting, `html.motion-paused`, `vm.calm`).

## Decisions

1. **One module, `js/celebrate.js`.** It depends only on `js/life.js` and the DOM, so both `js/fx.js` (which also loads the store and voice) and `js/play/kit.js` (which node tests import without a DOM) can re-export it. Its `still()` is the same motion rule.
2. **Big means the canvas confetti; small means Web Animations.** The big burst keeps the canvas (110 frames, token colours read from the body) and runs on `life.loop` under its own `AbortController`. Only one runs at a time: wins that land together (a Star lit that also earns a badge) share one burst. Small ones use `Element.animate()` with the individual `translate`, `scale` and `rotate` properties and `opacity`, so an element's own CSS `transform` (hover lifts, the Bolt poses) is untouched and nothing reflows. They need no timer; each is cancelled when the caller's signal aborts.
3. **Motion turned off stops everything at once.** The module keeps the running celebrations in a set and, the first time anything moves, listens once for the reduced-motion media query, `sitemotion` and `vmcalm`; when any makes the page still, it cancels them all and removes the canvas and the sparkle layers.
4. **Sparkles on a fixed layer.** `sparkle(el)` places a zero-size fixed layer at the element's centre and flies 8 to 12 four-point stars (clip-path, token background classes) outwards; the layer removes itself when they end. Nothing in the page moves.
5. **Picking a Mode waits about half a second.** The card pops, sparkles fly, the family cheers, then Home opens (`later(go, 560, signal)` on the view signal). Under no motion Home opens at once. A second tap during the wait is ignored.
6. **Sparks count up without confusing a screen reader.** `rollSparks(root)` turns each "+N Sparks" into a visually hidden final text and an `aria-hidden` counting copy whose width is fixed from the start (tabular numbers, `min-width` in `ch`).
7. **The heroes are CSS only.** The glow is a `::after` ring (scale and opacity) on the call to action, the arrow nudges, and the family's nine nods in the same four-second cycle; `:has()` on the hero makes the family hop while the button is hovered or focused. Reduced motion, `html.motion-paused` and Calm (`html.calm` on the landing page, before paint; `body.calm` in the app) stop all of it. The app home draws the landing page's family (`js/family.js`; `test/brand.test.mjs` keeps the two identical), with its CSS copied into `math.css` since the app does not load `theme/site.css`.
8. **Copy.** Landing: "Math tricks you can do in your head" and "Free, for ages 4 to adult." App home: "Fast, fun math for every brain" and "One trick, two minutes, no sign-up." (it keeps first-visit's line about two minutes and no sign-up). The landing lede moves under "Three ways to learn".

## Confetti call sites

| Where | Moment | Before | After |
| --- | --- | --- | --- |
| `js/app.js` modePicker | Picking a Mode | big (60) | small: card pop, sparkles, family cheer, then Home |
| `js/app.js` practice | Streak of 3, 7, every 10 | big (40) | small: streak number ticks, sparkles at 3, 7 and every 10 |
| `js/app.js` practice | Right answer | none | small: the bubble bounces, "+N Sparks" twinkles |
| `js/app.js` practice | Wrong answer | none | small: the answer field wiggles |
| `js/app.js` mixView | New best endless run | big (90) | big (unchanged) |
| `js/app.js` kataView | Kata cleared | big (90 perfect, 40 done) | big (unchanged); right answer bounces, wrong wiggles |
| `js/app.js` challengeView | Challenge Medal | big (100 gold, 40 other) | big (unchanged) |
| `js/app.js` arenaView | Arena personal best today | big (100) | big (unchanged) |
| `js/app.js` gameView | Game Level Medal | big (100 gold, 40 other) | big (unchanged) |
| `js/app.js` gameView | Best ranked score today | big (80) | big (unchanged) |
| `js/app.js` collect | Sutra card collected the first time | none | big (60) |
| `js/app.js` result screens | Sparks earned | none | small: "+N Sparks" counts up |
| `js/gamify.js` | New Title | big (110) | big (unchanged) |
| `js/gamify.js` | Badge earned | none | big (90), except First step (earned by any first answer): toast only |
| `js/gamify.js` | Skill mastered | big (70) | big (unchanged) |
| `js/star.js` | Right answer, Comeback, Dare won | particle burst (26, 40) | small: sparkles, bounce, "+N" twinkles |
| `js/star.js` | Star lit | particle burst (60) | big (110) |
| `js/arena.js` runArena, runChallenge | Every fifth combo | big (30) | small: combo ticks, sparkles; a miss wiggles the question |
| `js/play/exp/apprentice.js` | Apprentice earns a Belt | big (70) | big (unchanged) |
| `js/play/exp/scroll.js` | Chapter completed, whole scroll | big (60, 120) | big (unchanged) |
| `js/play/exp/lens.js` | Every challenge solved | big (70) | big (unchanged) |
| `js/play/exp/wall.js` | New pattern discovered | big (40) | big (unchanged) |
| `js/play/exp/wall.js` | Card saved to the wall | big (70) | small: sparkles at the card count |
| `js/play/exp/locks.js` | Lock fully cracked | big (70) | big (unchanged) |
| `js/play/exp/locks.js` | Rule discovered | big (40) | big (unchanged) |
| `js/play/exp/spells.js` | Spell cast in the lesson | big (30) | small: sparkles at the result |
| `js/play/exp/spells.js` | Every fifth combo | big (40) | small: sparkles at the monster |
| `js/play/exp/bets.js` | New best | big (50) | big (unchanged) |
| `js/play/exp/daily.js` | Three stars on the day's own puzzle | big (70) | big (unchanged) |
| `js/play/exp/daily.js` | Three stars on a practice puzzle | big (30) | small: sparkles at the board |
| `js/play/exp/ghosts.js` | Race won | big (50) | big (unchanged) |
| `js/play/exp/party.js` | Relay team goal, podium | big (50, 90) | big (unchanged) |
| `js/play/exp/art.js` | Doubled square shown, root 2 rope done | big (30, 40) | small: sparkles |
| `js/play/exp/tala.js` | Right guess, back on sam | big (40, 24) | small: sparkles |
| `js/play/exp/tala.js` | Tihai solved | big (70) | big (unchanged) |
| all buttons, Mode cards, tiles, keys | Press | none | small: squish (`scale: .95` while pressed, motion allowed only) |

`test/celebrate.test.mjs` holds this list for the big confetti: a new `confetti(` call fails until it is added with its win.

## Risks

- **Badges that come with everyday moments.** "First step" is earned by any first answer, so the big confetti there would read as confetti for a right answer; it keeps its toast and sound only. Other badges need real progress.
- **Half a second before Home** after a Mode pick. Short enough not to feel slow, and skipped under no motion.
- **`:has()`** (Chrome 105, Safari 15.4, Firefox 121): without it the family does not hop on hover; nothing else depends on it.
