# Tasks

## 1. Experiences inside the app

- [x] 1.1 `js/play/` and `css/play/`: the twelve experiences, `catalog.js` (section, route, Modes), `kit.js` adapted (Mode, `vm.sound`, Calm, per Player storage, fixed-word `track`, Back to the section). Verify: `test/play/shell.test.mjs` (catalog, routes inside sections, Explorer shelves, route views, no em dashes, tokens, lifecycle) and one `test/play/<id>.test.mjs` per experience.
- [x] 1.2 `js/app.js`: play route after the section routes, `playView()` with styles loaded on demand, section shelves, Sparks from play (`vmplay`, 150 a day). Verify: Playwright `e2e/tests/play.spec.ts` opens all twelve pages (heading, Back, title, no console errors, no sideways scroll) and checks the shelves for Challenger and Explorer.
- [x] 1.3 `build.py`: stamp and precache `css/play/*.css` (`#vm-css`). Verify: `e2e/tests/offline.spec.ts` opens `#/arena/party` and `#/games/tala` offline.

## 2. Party Mode replaces the Duel

- [x] 2.1 Remove `duelView()` and the Duel engine; `#/duel` redirects; Home tiles, Sky place and badge updated. Verify: `test/arena.test.mjs` and `test/sky.test.mjs` updated; Playwright `play.spec.ts` "#/duel opens Party Mode" and "the badge for Party Mode is listed on Me"; `routes.spec.ts` and `a11y.spec.ts` updated.

## 3. Analytics

- [x] 3.1 `js/metrics.js` play route template. Verify: `test/metrics.test.mjs` samples `#/arena/ghosts/r/abc` -> `play/ghosts`.

## 4. Review fixes (PR #47 review)

- [x] 4.1 Spec deltas for what the Duel's removal changes elsewhere: `badges` (Duelist became Party host), `arena` (no Pro Duel), `view-lifecycle` (Party setup instead of the Duel rematch). Verify: `e2e/tests/cov/badges-4.spec.ts`, `cov/arena-1`, `cov/arena-3` updated; `cov/duel-*` removed with the Duel.
- [x] 4.2 Camera and microphone turn off on a hidden tab, a route change and errors; a Lens share link carries only plate characters; a removed Player's `vm.play.<id>.*` is forgotten. Verify: `e2e/tests/play-lens.spec.ts`, `e2e/tests/play-sound.spec.ts`, `test/play/lens.test.mjs`, `test/store.test.mjs`.
- [x] 4.3 Sparks from play are paid for a first finish or discovery, not for replays or button presses (Spellbook, Locks, Pattern Wall, Apprentice, Daily Number, Tala Lab, Mandala Studio, Scroll preview). Verify: the experience unit tests and `e2e/tests/play-*.spec.ts`.

- [x] 4.4 Owner decisions (2026-10-17): Pattern Wall, Teach the Apprentice and Estimation Bets are Challenger and Pro only, and no experience opens outside its Modes by link; Calm removes the clocks in Party Mode and the Locks quick level; the Math Lens reader is served from the app's own origin. Verify: `test/play/shell.test.mjs`, `e2e/tests/play.spec.ts` (Explorer shelves and direct links), `play-arena.spec.ts` and `play-dojo-scroll.spec.ts` (Calm), `csp.spec.ts` and `play-lens.spec.ts` against a built `_site`.
- [x] 4.5 Only actions that pay Sparks count as a practice day. Verify: `e2e/tests/play.spec.ts`.

## 5. After release

- [x] 5.1 Listen to Tala Lab and Mandala Studio on a phone and a laptop; try Math Lens on real plates and receipts; then archive this change. (Implementation merged in #47 on 2026-10-18; CI and CodeRabbit green; archived in PR #69. The listening and field checks are 5.2.)
- [ ] 5.2 Owner follow-up after archiving: listen to Tala Lab and Mandala Studio on a phone and a laptop; try Math Lens on real plates and receipts.
