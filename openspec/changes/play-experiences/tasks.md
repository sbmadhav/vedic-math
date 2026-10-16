# Tasks

## 1. Experiences inside the app

- [x] 1.1 `js/play/` and `css/play/`: the twelve experiences, `catalog.js` (section, route, Modes), `kit.js` adapted (Mode, `vm.sound`, Calm, per Player storage, fixed-word `track`, Back to the section). Verify: `test/play/shell.test.mjs` (catalog, routes inside sections, Explorer shelves, route views, no em dashes, tokens, lifecycle) and one `test/play/<id>.test.mjs` per experience.
- [x] 1.2 `js/app.js`: play route after the section routes, `playView()` with styles loaded on demand, section shelves, Sparks from play (`vmplay`, 150 a day). Verify: Playwright `e2e/tests/play.spec.ts` opens all twelve pages (heading, Back, title, no console errors, no sideways scroll) and checks the shelves for Challenger and Explorer.
- [x] 1.3 `build.py`: stamp and precache `css/play/*.css` (`#vm-css`). Verify: `e2e/tests/offline.spec.ts` opens `#/arena/party` and `#/games/tala` offline.

## 2. Party Mode replaces the Duel

- [x] 2.1 Remove `duelView()` and the Duel engine; `#/duel` redirects; Home tiles, Sky place and badge updated. Verify: `test/arena.test.mjs` and `test/sky.test.mjs` updated; Playwright `play.spec.ts` "#/duel opens Party Mode" and "the badge for Party Mode is listed on Me"; `routes.spec.ts` and `a11y.spec.ts` updated.

## 3. Analytics

- [x] 3.1 `js/metrics.js` play route template. Verify: `test/metrics.test.mjs` samples `#/arena/ghosts/r/abc` -> `play/ghosts`.

## 4. After release

- [ ] 4.1 Listen to Tala Lab and Mandala Studio on a phone and a laptop; try Math Lens on real plates and receipts; then archive this change.
