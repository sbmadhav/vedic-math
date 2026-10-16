# Tasks

Prerequisites: `sparks-replace-xp` (`katasDone`) and `star-round` (`S.sky`, `runStar`, `fx.noMotion()`, `bolt.js`) are merged.

## 1. The Sky's data and rules

- [x] 1.1 `js/sky.js`: `CONSTELLATIONS` (grouped from `TRICKS`), `SKY_LAYOUT` (17 anchors on the 27-sector wheel, Star offsets), `PATH`, `suggested(state, startBelt)`, `SKY_DEFAULT`, `skyOn(p)`. Verify: new `test/sky.test.mjs`: 17 Constellations and 63 Stars; Ekādhikena Pūrvena holds `sq5` and `recip`; `PATH` starts with `from9:1, from9:2, from9:3, by11:1` and ends with `zero-sum:3`; `suggested()` skips lit and skipped Stars, honours `startBelt: 'orange'`, wraps around, returns the first skipped Star when nothing is open, and `null` when all are lit; `skyOn()` is false for Explorer whatever `sky` says, and for Challenger and Pro follows `sky ?? SKY_DEFAULT`; every layout point is inside the viewBox and no two Stars overlap (distance at least 28 units).
- [x] 1.2 Belts by Stars in `js/gamify.js` (`beltProgress()`, `currentBelt()`, belt badge texts) with `S.belts` kept Belts in `js/store.js`. Verify: `test/gamify.test.mjs`: 9 lit white belt Stars earn the White belt and the badge; a kept yellow Belt with 4 lit Stars stays earned; a Belt earned by Stars is written to `S.belts`; no badge `how` says "Master the 3".
- [x] 1.3 `migrateSky(S)` run from `gamify.init()`, after a Player switch and after `importData()`. Verify: `test/sky.test.mjs`: Katas 1 to 9 done lights Star 1 only; 8 of Katas 18 to 34 does not light Star 2; 8 of Katas 35 to 50 lights Star 3; Belts earned under the mastery rule are kept; a second run changes nothing; no skipped marks are made; migration emits no Star Quest event (spy on `metrics.starEvent`).

## 2. The Sky view

- [ ] 2.1 `js/sky-view.js` `skyView()`: SVG Sky with Constellation lines and names, nakshatra wheel, three parallax layers (listeners on the view signal), Star links in path order with state classes and accessible names, Bolt at the suggested Star, dotted path to the next two, Landmarks, an "All places" button. All motion off under `fx.noMotion()` and the CSS blocks for reduced motion, `html.motion-paused` and `body.calm`. Verify: `test/lifecycle-scan.test.mjs` covers `js/sky-view.js`; new Playwright `e2e/tests/sky.spec.ts`:
  - a Challenger with the Sky on sees 17 Constellations and 63 Star links; a seeded skipped Star has the dashed class, a skip badge and "skipped" in its accessible name;
  - Bolt sits at `from9` Star 1 for a new Player, and at the first open Star after seeded progress;
  - Tab order from the first Star follows `PATH`;
  - the race track Landmark opens `#/arena`;
  - with `html.motion-paused` set before load, `document.getAnimations()` is empty on the Sky after 2 s and every Star is visible;
  - at a 390 px wide viewport, the page body does not scroll horizontally and the Sky container does.
- [ ] 2.2 `placesView()` and route `#/places`. Verify: `sky.spec.ts`: All places lists 17 Constellation headings and 63 Star links with states in words, the five Landmarks, Dojo, Sutra cards, Challenge tower, Me and the tile home; activating a Star link opens its round; `e2e/tests/a11y.spec.ts` adds `#/places` and the Sky (both schemes) with no serious or critical violations.

## 3. Home, switch and Back

- [ ] 3.1 `home()` renders the Sky when `skyOn(player)`; the Me page "Try the new Sky" switch for Challenger and Pro, stored with `store.updatePlayer({ sky })`. Verify: `e2e/tests/modes.spec.ts` new tests: Explorer's Me page has no switch and home is unchanged; turning the switch on as Pro shows the Sky at `#/`; a second Player on the device still gets the tile home; turning it off restores the tile home.
- [ ] 3.2 `starView()` back target is the Sky when `skyOn`, with focus on the Star just played. Verify: `sky.spec.ts`: light Star 1 of `from9` from the Sky, press "Back to the Sky", the Star shows lit and is focused; after `page.clock.fastForward(60_000)` on the end screen the URL has not changed.
- [ ] 3.3 Copy for the new Belt rule: `dojoView()` lede, the Challenger home Dojo card ("Next Star"), the Pro Dojo tile, the Me page Belts stat. Verify: `e2e/tests/routes.spec.ts` route-content test expects "Light all 9 Stars" on the Dojo; `test/copy.test.mjs` passes (no em dashes, no Vedas claims).

## 4. Counts

- [ ] 4.1 `js/metrics.js`: `STAR_EVENTS`, `starEvent(kind, trick)`, route `#/places` as `places`, view `sky` when home shows the Sky; `runStar()` calls `starEvent` on lit, skipped, comeback, dare taken and dare won. Verify: `test/metrics.test.mjs`: each kind with a known Trick sends `math/star/<kind>/<trick>`; an unknown Trick or kind sends nothing; the "no identifiers" and call-site scans cover `js/star.js` and `js/sky-view.js`; Playwright `e2e/tests/analytics.spec.ts` new test: with the Sky on, `#/` sends `math/view/sky`; a round with a miss, a Comeback, a Dare taken and lost, and a lit Star sends `star/comeback`, `star/dare_taken` and `star/lit` once each and no `star/dare_won`.

## 5. Offline and privacy

- [ ] 5.1 Offline. Verify: `e2e/tests/offline.spec.ts` "every route renders offline after one visit" includes `#/places` and the Sky home (new modules are precached by `build.py` as part of `js/`).
- [ ] 5.2 Nothing new is sent to World boards. Verify: `e2e/tests/privacy.spec.ts` new test: turning the Sky on and lighting a Star writes nothing but the weekly `xp-week-` total for an adult Player, and the Player record's `sky` flag is in no request; record in the PR that `parentNote()` and `cloud/README.md` need no change.

## 6. Release check

- [ ] 6.1 Node, build and Playwright suites pass locally; after deploy the live E2E run is green. Manual check on a phone and a Chromebook: the Sky scrolls inside its frame, every Star is reachable by touch and by keyboard, and All places works with VoiceOver.
