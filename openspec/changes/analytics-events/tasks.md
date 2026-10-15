# Tasks

## 1. Metrics module

- [ ] 1.1 Add `js/metrics.js` with `view(hash)`, `answered(area, ok)`, `roundStart(area)`, `roundEnd(area, league)`, `firstWinCheck()`, `returnCheck()` and `shareClick(surface)`, all calling `window.siteTrack` through a safe wrapper with the `math/` prefix. Verify: node test `test/metrics.test.mjs` with a fake `window.siteTrack` and `localStorage`: route collapsing for every route in the table, the five `first_win` buckets, `return_d1` and `return_d7` firing once each, and `round2_start` only on the second round of an area.
- [ ] 1.2 Add an identifier scan to the same test: every event path matches `^math/[a-z0-9_/:-]+$` built only from fixed words, route templates, catalog ids, Leagues and buckets; no call passes a Nickname, Player id, Score or seed (scan `js/` for `metrics.` and `track(` call sites with interpolated values outside the allow-list). Verify: the test fails when a deliberate `track('x/' + player.name)` is added and passes without it.

## 2. Wiring

- [ ] 2.1 `render()` (`js/app.js:69-84`) calls `metrics.view(location.hash)`; boot calls `metrics.returnCheck()`. Verify: Playwright spec `e2e/tests/analytics.spec.ts` routes `/assets/analytics.js` to a stub that records `siteTrack` calls in `window.__events`; navigating home, `#/arena`, `#/game/times-sprint/12` records `math/view/home`, `math/view/arena`, `math/view/game/times-sprint/level`.
- [ ] 2.2 `practice()` and `kataView()` call `metrics.answered(area, ok)` on each finished question, and `metrics.firstWinCheck()` on a right one. Verify: Playwright: two Practice answers record two `q_answered` events and one `first_win/<bucket>`; a reload and another right answer records no second `first_win`.
- [ ] 2.3 Arena, game, tower and Duel rounds call `roundStart` and `roundEnd` from their single start and `onEnd` paths (after `view-cleanup-contract`). Verify: Playwright with `page.clock`: two Arena Practice rounds record `round2_start/arena`, `round_end/arena/challenger/r1` and `.../r2`; stopping a game round records no `round_end`.
- [ ] 2.4 Check that no analytics request leaves the browser in tests. Verify: the analytics spec asserts no request to `goatcounter.com` or `gc.zgo.at` (the stub replaces `analytics.js`). The DNT and GPC opt-out lives in `assets/analytics.js` in the `sbmadhav.github.io` repo and is unchanged; confirm by reading `assets/analytics.js:14-16` and a manual check in a GPC-enabled browser (Brave or Firefox with GPC on) that the Network panel shows no GoatCounter request.

## 3. Parent note and docs

- [ ] 3.1 Add one sentence to `parentNote()` in `js/app.js` (worded per Mode through `fx.t()`) saying usage is counted anonymously, without cookies or IDs, separately from World boards. Verify: `e2e/tests/privacy.spec.ts` checks the sentence in all three Modes.
- [ ] 3.2 Add one line to the Privacy section of `cloud/README.md` (`cloud/README.md:82`) noting that GoatCounter usage counts hold no IDs and are not part of Boards. Verify: reviewer reads it with `parentNote()`.
- [ ] 3.3 Record the Gate A baselines: after a week live, note route views, `round2_start` / `round_end` and `first_win` buckets in `docs/PLAN.md` Measurement, with the known undercount. Verify: `docs/PLAN.md` diff in the follow-up PR.

## 4. Release check

- [ ] 4.1 Node and e2e suites pass against `_site`, then live. Verify: CI green; GoatCounter dashboard shows `math/view/*` events within a day of deploy.
