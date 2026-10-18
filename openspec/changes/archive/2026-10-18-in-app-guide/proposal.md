# Proposal

## Why

The app has grown to more than a dozen places (the skill map, the Dojo with Stars, Katas and belts, Sutra cards, the Arena and its Challenge tower, Duel, Games, the Watch shelf, the Sky, the Me page) and as many settings (play mode, Calm, text size, read-aloud, music, the moving background, World boards, players and backups). Nothing in the app explains them. A new Player lands on Home after picking a mode and has to find everything by trial; a grown-up has no single page that says what each part does, and the privacy note is only found under a Board or on Me. Several features are only reachable from one place (the Sky switch, All places, Calm on Me, the music panel), so they are easy to miss.

The `tutorial` branch has a first draft of the guide's data (`js/guide.js`), written before Sparks replaced XP and before the Sky, Stars, Medals and Calm shipped. Much of its copy is out of date (XP, level numbers, kata and level stars, "master all three tricks" for belts, video XP) and `test/copy.test.mjs` fails on it.

## What Changes

- **A guide page, `#/guide`**: one section per feature area, in five groups, each with "What it is", "How to use it", a tip, a Try it link to the real place, wording for each Mode (Explorer, Challenger, Pro) and a small illustration drawn in HTML and SVG with design tokens. Sections a Mode cannot use (Stars and the Sky are not in Explorer) are left out for that Mode. `#/guide/<section>` opens the page at one section. The privacy section shows the same parent note as the Boards.
- **Reaching it**: a Guide link in the menu bar for every Mode, a "How to use this app" link in the footer, a "New here?" line on Home for a Player who has not played on an earlier day, and a link on the mode picker. The guide opens without a mode too (like Watch and Sutras), with Challenger wording.
- **A first-visit tour**: on Home, right after the first mode pick on a device, up to six coach marks point at real UI (you, what to play, the menu, music, your Me page, the Guide link). Skippable at every step, Escape closes it, shown once per device, replayable from the guide. Steps whose target is not on screen are left out.
- **Analytics**: the guide counts as a route view (`math/view/guide`, `math/view/guide/section`); the tour sends `math/tour/start`, `math/tour/finish` or `math/tour/skip`. Fixed words only.
- The draft copy in `js/guide.js` is corrected against the code (Sparks, Titles, Medals, Stars, belts by Stars, Calm, the Watch filters that exist), and gains sections for Stars, the Sky, and Calm and text size.

Out of scope:

- Changing any feature the guide describes. Bugs found while checking the copy are listed in the PR, not fixed here.
- The Hook (`hook-first-star`): the tour is not the Hook and does not touch the first Star. When the Hook ships, its section is added to the guide.
- Screenshots, videos or external images in the guide.
- A per-Player tour: the tour is about the screen, so it is shown once per device (like Calm and sound).
- Translations.

Affected: every Player in every Mode (the menu bar gains a link; Home shows the tour once per device and a "New here?" line on a first day). Grown-ups get one page that explains the app and its privacy.

## Capabilities

### New Capabilities

- `guide`: the guide page, its sections and Try it links, wording per Mode, how it is reached, and the first-visit tour.

### Modified Capabilities

- `analytics`: ADDED "Guide and tour counts".

## Impact

- `js/guide.js` (data and pure logic): corrected sections, `modes` per section, `sectionsFor(mode, n)`, `TOUR_STEPS` with per-target options, `resolveStep()`, `tourDue()`, `tourState()` and `setTourState()` on `vm.tour`.
- New `js/guide-art.js` (the illustrations) and `js/tour.js` (draws the tour on the view signal).
- `js/app.js`: `guideView()`, routes `#/guide` and `#/guide/<section>`, the guide opens without a mode, Home starts the tour and shows the "New here?" line, the mode picker link, replay.
- `js/metrics.js`: route views for the guide, `tourEvent()`.
- `index.html`: the Guide link in the menu bar, the footer link.
- `math.css`: guide page, illustrations and tour styles (tokens only, both schemes, motion twins).
- Tests: new `test/guide.test.mjs`; `test/lifecycle-scan.test.mjs` covers `js/tour.js`; `test/metrics.test.mjs`; Playwright new `e2e/tests/guide.spec.ts`, `e2e/tests/fixtures.ts` (tour marked seen unless a test asks), `e2e/tests/a11y.spec.ts` (the guide route).
- Nothing new leaves the device: `vm.tour` is a device preference, and the events are fixed words. `parentNote()` and `cloud/README.md` need no change.
