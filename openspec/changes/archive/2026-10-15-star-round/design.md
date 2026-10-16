# Design

## Context

- Katas: `kata(trickId, n)` (`js/levels.js:43`) returns 5 problems (Katas 1 to 10), 6 (11 to 30) or 8 (31 to 50), seeded by `kata:<trick>:<n>`, each built by `problemFor(t, vals)` (`js/vedic.js:327`) as `{ q, kind: 'num' | 'fields' | 'choice', answer | fields | choices, hints, steps }`. The numbers (`vals`) are not kept on the problem today.
- A Trick's steps: `t.steps(vals)` returns `[{ say, show }]` (`js/vedic.js`), which the Trick page animator plays (`mountAnimator`, `js/app.js:1054`).
- Ratings: `AD.skillRating('v-' + trick, mode)`, `AD.Dial`, `AD.saveRating('skill:v-' + trick, dial)` (`js/adapt.js`), already used by `practice()` for Tricks.
- Lifecycle: views get `{ signal }`; rounds and questions use `child(signal)`; `test/lifecycle-scan.test.mjs` rejects bare `addEventListener`, `setTimeout` and `requestAnimationFrame` in view and round code.
- Motion today: `matchMedia('(prefers-reduced-motion: reduce)')` checks in `js/fx.js` (confetti), `js/ambient.js` and `js/app.js` (sutra dialog). The site-wide "Pause motion" control being added to `/assets/explore.js` (sbmadhav.github.io, not merged yet) sets `html.motion-paused`, exposes `window.siteMotion.paused()` and fires a `sitemotion` event on `document`.
- The prototype's rules (`SPARK`, `ROUND`, `TARGET`) were placeholders; the grilling set the values on the Sparks scale (decision 21).

## Goals / Non-Goals

**Goals:**
- A Star round that is a pure, testable state machine, with a thin view.
- Everything a Player sees has a no-motion equivalent and a screen-reader announcement.
- Ship and test without the Sky or the video list.

**Non-Goals:**
- The Sky map, migration, Belts and Star counts (`sky-home`).
- A Calm switch (`game-shell-and-calm`).

## Decisions

**1. Thirds and the band.**
`STAR_THIRDS = [[1, 17], [18, 34], [35, 50]]`. At round start the Trick's Rating `r` (1 to 20) sets a position `p = lo + round((r - 1) * (hi - lo) / 19)`, and the band is Katas `p - 3` to `p + 3`, clipped to the third (7 Katas, 35 to 56 problems). `starPool(trick, star, rating)` returns the band's problems, each with `key` (`<kata>:<index>`), `vals`, and `kind`.
- Rejected: drawing from the whole third. A Rating-3 Player and a Rating-17 Player would see the same spread, which ignores decision 11.

**2. Dealing.** `starRound({ trick, star, rating, last })` shuffles the band with `Math.random` (unseeded: Stars are Practice, so nothing needs to be identical for two Players), puts problems whose `key` is in `last` at the back, and takes 4. The 4 keys are saved as the Star's `last` when the round starts (so leaving mid-round still counts as "previous round").

**3. Kind of question.** `kindOf(p) = p.vals.map(v => String(Math.abs(Math.trunc(v))).length).join('x')`, for example `2` for 85², `3` for 115², `2x2` for 97 × 94. It is computed from the numbers, so it works for every Trick without per-Trick tables. The rematch is the first unused problem of the same kind in the band, else of the same kind anywhere in the third, else any unused problem in the band.
- Rejected: one Comeback per round. Decision 17 says "once per kind of question", which rewards fixing each kind of mistake.

**4. Dare.** `dareFor(trick, star)`: a random problem from Katas `hi + 1` to `hi + 5` of the next third for Stars 1 and 2, and from Katas 46 to 50 for Star 3, excluding anything dealt this round.

**5. The state machine** (`js/star.js`, no DOM):
- State: `{ qs[4], k, mode: 'main' | 'rematch' | 'dare' | 'replay' | 'offer' | 'end', current, sparks, misses, usedKinds: Set, dareOffered, dareDone, offerShown, results[] }`.
- `starAnswer(state, ok)` returns `{ state, events }`. Events drive the view and tests: `right`, `miss`, `comeback`, `dare-won`, `dare-lost`, `replay`, `rematch`, `offer`, `lit`, `end`, each with the Sparks delta.
  - main right: +10, next main. main miss: `misses++`, Dial miss, `replay` then `rematch`.
  - rematch right: kind unused: +15 `comeback`, mark kind; else +10. rematch miss: `misses++`, show answer, next main.
  - dare right: +20 `dare-won`, Dial hit; dare miss: `dare-lost`, `replay`, back to the same main question; no Dial change, `misses` unchanged.
  - after a replay ends: if `misses === 2 && !offerShown && videoAvailable`, `offer` (then the rematch).
  - after main question 4 (and any rematch): `end`; `lit` if `sparks >= 40`.
- `dareOffered` becomes true once `k >= 1` in main mode; the view shows the Dare card until it is taken or the round ends.
- Pure functions make every rule a node test (Sparks totals, Comeback once per kind, Dare costs nothing, offer once).

**6. Sparks and mastery.** Each Sparks event calls `store.addSparks(n, 'star')` at once, so leaving mid-round keeps what was earned. Each main and rematch answer calls `store.record('v-' + trick, ok, false, { sparks: false })` (counts, mastery, quests, badges; no Practice Sparks). Dares are recorded the same way. `store.record` gains the `{ sparks }` option (default true).

**7. Rating.** One `AD.Dial` per round, started at `AD.skillRating('v-' + trick, mode)`; `hit(ok)` on main and rematch answers, `hit(true)` on a won Dare, nothing on a lost Dare; `AD.saveRating('skill:v-' + trick, dial)` when the round ends or the view is destroyed.

**8. Store.** `S.sky = { lit: { '<trick>:<n>': time }, skipped: { ... }, last: { ... } }`. `starState(trick, n)` returns `'lit' | 'skipped' | 'open'`; `lightStar()` deletes the skipped mark; `skipStar()` does nothing to a lit Star. All on the device; `exportData()` includes it.

**9. The view** (`runStar(root, { trick, star, signal, back, findVideo })`):
- Layout from the prototype: header (Trick title, Star n of 3, Skip this Star), the stage (question, digit boxes, keypad), a spark meter (`role="progressbar"`, 0 to 40), Bolt with a speech bubble, question dots, the Dare card.
- Entry: `kind: 'num'` uses digit boxes (Challenger, Explorer) or a plain `output` (Pro), driven by the keypad and keys 0 to 9, minus, Backspace, Enter (one `keydown` listener on the round signal); `fields` shows one entry per field; `choice` shows choice buttons. Checking uses `checkOne()` as Katas do.
- Replay: `t.steps(vals)` rendered as a list that grows one step every 2.5 s (Bolt in `explain`), each step's `say` sent to the live region; "Skip" and Escape jump to the end. Steps stay on screen, so nothing disappears before it can be read.
- End screen: Sparks earned, lit or "N more Sparks to light it", Play again (`mount()` again), and Back (`back.href`, `back.label`). No timer navigates.
- `back`: set by `starView()` from the route the Player came from (Trick page or Dojo; default `#/dojo`). `sky-home` changes the default to the Sky.

**10. Bolt.** `js/bolt.js` exports `BOLT_SVG` (one SVG with the parts the prototype uses: body, eyes, pupils, mouths, arms, pointer stick, spark) and `pose(el, name)` setting `data-pose`. Fills use CSS classes and tokens (`var(--teal)`, `var(--ink)`, `var(--sun)`, `var(--coral)`), never raw hex. Pose CSS swaps parts with short transitions, none under no-motion. The existing `BOLT` constant in `js/app.js` (raw hex) is replaced by `boltHTML('idle')` in Practice and Kata bubbles.

**11. No motion and announcements.** `fx.noMotion()` is true when `prefers-reduced-motion: reduce` matches, `document.documentElement.classList.contains('motion-paused')`, or `localStorage['vm.calm'] === '1'` (the preference `game-shell-and-calm` will expose). Bursts (a small canvas, tied to the round signal with `life.loop`) are skipped under no-motion; the replay and pose changes still happen, just without movement. CSS mirrors it: every Star animation rule sits under `@media (prefers-reduced-motion: reduce)`, `html.motion-paused` and `body.calm` blocks that set `animation: none; transition: none`. `fx.announce(text)` writes to one visually hidden `role="status"` `aria-live="polite"` region (`#vmLive`, added to `index.html`), clearing it first so repeats are read.

**12. Video offer seam.** `runStar` takes `findVideo(trickId, mode)` returning a Promise of a video or `null`. This change passes `async () => null` from `starView()`, so no offer appears (the spec's "no video" case); `watch-shelf` owns the real lookup (`videoForTrick()`) and the player, and wires them in. If `watch-shelf` has already shipped when this change is built, pass `videoForTrick` here instead. The offer also needs `navigator.onLine`.

**13. Entry points.** `skillView()` for a Trick adds a "Stars" row (three buttons, state as text and a marker: lit, skipped with a dashed outline, open) above "Watch it work"; `dojoView()` adds three small Star links to each Trick cell. Both are hidden in Explorer.

**14. Route.** `#/star/<trick>/<n>` (n 1 to 3); unknown Trick or n falls back to the Dojo. `metrics.routePath` template `star/{trick:1}/star`.

## Risks / Trade-offs

- [Some bands have few problems of a kind, so a rematch may change kind] → The fallback order in decision 3; the node test checks every Trick and Star has at least one same-kind rematch for each of its 4 questions at Ratings 1, 10 and 20, and lists any exception.
- [Replays on long Tricks (osculator, cube roots) run long] → Skip and Escape at any time; steps auto-advance at 2.5 s.
- [Farming Sparks by replaying an easy lit Star] → 40 Sparks a round is on the same scale as Practice (about 10 per answer); the weekly Board cap is unchanged.
- [`fx.noMotion()` reads `vm.calm` before a switch exists] → Harmless: nothing writes it until `game-shell-and-calm`.

## Migration Plan

New progress (`S.sky`) starts empty; nothing to migrate in this change (`sky-home` lights Stars from Kata progress). Rollback: revert; `S.sky` is ignored by older code.

## Files touched

- New: `js/star.js`, `js/bolt.js`, `test/star.test.mjs`, `test/bolt.test.mjs`, `e2e/tests/star.spec.ts`
- `js/levels.js`, `js/store.js`, `js/app.js`, `js/fx.js`, `js/metrics.js`, `math.css`, `index.html` (the live region)
- Tests: `test/katas.test.mjs`, `test/metrics.test.mjs`, `test/store.test.mjs`, `test/lifecycle-scan.test.mjs`; `e2e/tests/analytics.spec.ts`, `a11y.spec.ts`, `privacy.spec.ts`, `routes.spec.ts`
- Docs: `GLOSSARY.md` unchanged (Star, Comeback, Dare, Skip already defined)
