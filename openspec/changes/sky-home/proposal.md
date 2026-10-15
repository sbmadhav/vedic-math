# Proposal

## Why

The owner wants Players to feel "inside a game, instead of tasks and tabs" (`docs/star-quest.md`, the ask and decision 1). Today home is a grid of tiles per Mode (`home()`, `js/app.js:148`): Challenger gets a Dojo card, quests and six tiles; Pro gets the Arena board, quests and six tiles. Belts are earned by mastering three Trick Skills (`beltProgress()`, `js/gamify.js:19`), which has nothing to do with the Stars `star-round` adds. The grilling settled the world (decisions 1 to 6), the path and Belts (8, 9) and the rollout (28 to 30).

## What Changes

- **The Sky** becomes home for Challenger and Pro Players who turn on "Try the new Sky" on the Me page (per Player, off by default). Explorer keeps its home and never sees the switch.
- **17 Constellations**, one per Sutra that has Tricks, each holding its Tricks' Stars (63 in all), drawn as lines with the Sutra's name over the 27-nakshatra wheel, with parallax star layers and Bolt. The Sky holds Tricks only.
- **Star states** on the Sky: lit, skipped (dashed outline, skip badge, "skipped"), not yet lit. Every Star is open.
- **Suggested path in Belt order**: Bolt waits at the first Star, white belt to black, that is neither lit nor skipped; a dotted path shows the next two. A Placement result (a later change) can set the starting Belt.
- **Belts by Stars**: a Belt is earned by lighting all 9 Stars of its 3 Tricks; Belts already earned stay earned. The White, Green and Black belt badges follow.
- **Landmarks** at the edge: Arena (race track), Duel (ring), Games (arcade), Watch (observatory), Skill map (library).
- **All places**: a plain, keyboard-first list of every Constellation, Star, Landmark and other place (`#/places`).
- **Back to the Sky**: a Star's Back button returns to the Sky, focus on that Star.
- **Progress migration** (every Player, every Mode, once): a Star starts lit when at least half the Katas in its third are done; earned Belts are kept.
- **Anonymous counts**: Star lit, Star skipped, Comeback, Dare taken, Dare won, through `js/metrics.js`; the Sky and All places get their own route views.

Out of scope:

- Making the Sky the default for everyone (about two weeks after release, in a follow-up change; this change keeps the default in one constant).
- The tower Landmark (Daily Sutra and Boards): it arrives with the Daily Sutra, which does not exist yet.
- Placement itself (its questions and the Age answer timing); this change only reads a starting Belt if one is saved.
- Explorer Constellations and read-aloud prompts.
- Per-Constellation illustrations.
- The Hook (`hook-first-star`) and Calm switch (`game-shell-and-calm`).

Affected: Challenger and Pro Players who turn the Sky on (new home). Every Player in every Mode: Belts now follow lit Stars (with earned Belts kept), and Kata progress lights Stars once. Explorer Players see no other change.

## Capabilities

### New Capabilities

- `sky`: the opt-in Sky home, Constellations, Star states, the suggested path, Belts by Stars, the progress migration, Landmarks, All places, Back to the Sky, and the Sky's art and Calm.

### Modified Capabilities

- `analytics`: ADDED "Star Quest counts" and "Sky views are counted".
- `badges`: ADDED "Belt badges follow Belts".

## Impact

- New `js/sky.js` (pure: `CONSTELLATIONS`, `SKY_LAYOUT`, `PATH`, `suggested()`, `beltOf()`, `migrateSky()`), new `js/sky-view.js` (`skyView()`, `placesView()`).
- `js/gamify.js`: `beltProgress()`, `currentBelt()` and the belt badge texts from lit Stars plus kept Belts; `init()` runs `migrateSky()`.
- `js/store.js`: `S.belts` (kept Belts), `S.skyMigrated`; the Player record's `sky` flag.
- `js/app.js`: `home()` shows the Sky when on; route `#/places`; the Me page switch; `starView()` back target; Dojo and Challenger home copy about Belts.
- `js/star.js`: emits Star Quest counts through `metrics.starEvent()`.
- `js/metrics.js`: `starEvent()`, `STAR_EVENTS`, route `places`, view name `sky`.
- `math.css`: the Sky, Landmarks, All places.
- Tests: new `test/sky.test.mjs`; `test/gamify.test.mjs`, `test/metrics.test.mjs`, `test/store.test.mjs`; Playwright new `e2e/tests/sky.spec.ts`, plus `analytics.spec.ts`, `a11y.spec.ts`, `modes.spec.ts`, `offline.spec.ts`, `routes.spec.ts`.
- Nothing new is sent to World boards; the new counts are anonymous GoatCounter events already described by the parent note's usage sentence. `parentNote()` and `cloud/README.md` need no change.
- **Order:** after `star-round` (Stars, `S.sky`, `runStar`) and `sparks-replace-xp` (`katasDone`). `hook-first-star` needs only `star-round`, but follows this change in the build order so the Hook's first Star is the one Bolt suggests on the Sky.
