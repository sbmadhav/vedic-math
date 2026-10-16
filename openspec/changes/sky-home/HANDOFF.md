# Handoff: sky-home

## State

- Branch `sky-home`, worktree `/Users/sbmadhav/Documents/codebase/wt-sky-home`, rebased on origin/main `d7e9ba0` (star-round and watch-shelf merged and archived; CI actions pinned).
- PR: https://github.com/sbmadhav/vedic-math/pull/29 (open, not merged).
- Done and ticked: tasks 1.1 to 5.2.
- Not done: **6.1 release check**. After deploy: the live E2E run (workflow `e2e.yml` on the push to `main`), then the owner's manual check on a phone and a Chromebook (the Sky scrolls inside its frame, every Star reachable by touch and by keyboard, All places with VoiceOver). Then `docs/PLAN.md` "Where things stand" and archive the change.

## What was built

- `js/sky.js` (pure): `CONSTELLATIONS` (17, grouped from `TRICKS` by `sutra`, in Belt order), `SKY_LAYOUT` (hand-placed anchors on the 27-sector wheel, two Star shapes), `PATH`, `upcoming()` and `suggested()`, `SKY_DEFAULT = false`, `skyOn()`, `startBeltOf()` (reads `player.placedBelt`, which nothing sets yet), `LANDMARKS` and `TOWER_SLOT`, `labelBox()`, `boltSpot()`, `migrateSky()`.
- `js/sky-view.js`: `skyView()` (the map) and `placesHTML()` (All places).
- `js/store.js`: `starStates()`, `keptBelts()`, `keepBelt()` (`S.belts`), `upgrade(fn)`, and `importData()` emits `import`.
- `js/gamify.js`: Belts by Stars (`beltProgress()` gives `lit`, `done`, `earned`), kept Belts written on each `star` event, `migrate()` from `init()`, on `player` and on `import`; new belt badge texts.
- `js/app.js`: `home()` shows the Sky when `skyOn`; routes `#/places` and `#/tiles`; the Me page switch; Back to the Sky; Belt copy (Dojo lede and counts, Challenger Dojo card "Next Star", Pro Dojo tile, Me Belts stat).
- `js/metrics.js`: `STAR_EVENTS`, `starEvent()`, routes `places` and `tiles`, view `sky`. `js/star.js` calls `starEvent()`.
- `math.css`: "The Sky" section at the end of the file (tokens only, both schemes, motion blocks for reduced motion, `html.motion-paused`, `body.calm` and `.sky.still`).
- `GLOSSARY.md`: "All places".

## Decisions made while building

- **The tile home has its own route, `#/tiles`** (counted as `math/view/tiles`). All places has to link to it, and `#/` is the Sky while the switch is on.
- **`star/lit` is sent whenever a round reaches 40 Sparks**, as the engine's `lit` event does, so replaying a lit Star and reaching 40 again counts again. **`star/skipped` is sent only when the skipped mark is made**: skipping a lit Star leaves it lit and sends nothing. Each Comeback and each Dare taken or won sends one.
- **No event for the switch itself.** The analytics spec lists the new events; the `sky` route view already measures who uses the Sky.
- **Back to the Sky always**, for a Player with the Sky on, even when the Star was opened from its Trick page (the spec says "a Star's Back button SHALL return to the Sky"). Sky off keeps the star-round targets.
- **The migration clears a skipped mark on a Star it lights** (lighting clears the mark), makes no skipped marks, and leaves `S.sky` untouched when it lights nothing. It runs for every Player in every Mode, Explorer included, once (`S.skyMigrated`).
- **Bolt's spot is computed, not fixed**: `boltSpot()` picks the nearest spot round the Star that covers no other Star and no name (tested for all 63).
- **Stars are SVG links; Landmarks are HTML links laid over the map**, so they get normal focus rings and visible text labels. Constellation names in the SVG are hidden from assistive technology: each Star's name already names its Trick, and All places lists the Sutras.
- **The router no longer moves focus to the heading when the new view has already focused something inside itself** (the Sky focusing the Star just played). Every other view is unchanged.
- Copy: the Pro Dojo tile reads "N of 7 belts · M of 63 Stars lit"; the green and black belt badges read "Earn the green belt: light all 9 of its Stars." (and black).
- `e2e/tests/fixtures.ts` has a new `seedPlayer` option (extra Player record fields, such as `{ sky: true }`). The Parent step switch locators in `a11y.spec.ts` and `consent.spec.ts` are scoped to `#worldBoards`, since the Me page now has a second switch.
- `privacy.spec.ts` leaves the app's own static GETs out of the "no request mentions sky" scan: `js/sky.js` and `js/sky-view.js` are named after the Sky and carry nothing.

## Privacy

Nothing new is sent to World boards. The new counts are anonymous GoatCounter events (fixed words and Trick ids), already covered by the parent note's usage sentence. `parentNote()` and `cloud/README.md` need no change. The Player record's `sky` flag stays on the device (privacy.spec.ts checks it is in no request).

## Tests (last run)

- Node: 259 passed, 0 failed. `python3 build.py --out <scratch>`: OK (36 modules pinned, 39 own and 13 shared files precached). `openspec validate sky-home --strict`: valid.
- Playwright against the local checkout (port 8150), chromium, webkit and mobile, `--grep-invert '@live|offline'`: 559 passed, 182 skipped, 0 failed (4.2 min).
- `offline.spec.ts --project=chromium` against a built `_site` (port 8151): 5 passed, 1 skipped.
- The rebase onto `d7e9ba0` changed only OpenSpec docs and CI workflows (no file under `js/`, `e2e/`, `test/`, `math.css`, `index.html` or `sw.js`; the build stamps are identical), so the Playwright runs above were not repeated; the node tests, build and validation were.

## Resume

```
cd /Users/sbmadhav/Documents/codebase/wt-sky-home
git fetch && git rebase origin/main
node --test 'test/**/*.test.{js,mjs}'
node e2e/local-server.mjs 8150 &
cd e2e && BASE_URL=http://localhost:8150 npx playwright test --grep-invert '@live|offline'
```
