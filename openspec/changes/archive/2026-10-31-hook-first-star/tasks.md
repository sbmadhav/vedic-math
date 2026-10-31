# Tasks

> **Superseded by `placement` (owner Q14, 2026-10-17).** The Hook now opens the first Star that Placement points to. Its requirements live in `openspec/changes/placement/specs/hook/spec.md` and its tasks in `placement`'s tasks.md section 4. Do not apply or archive this change; `placement` task 7.2 deletes this folder. Archived 2026-10-31 as superseded (`archive-sweep`), without syncing its `hook` delta into `openspec/specs/` (`--skip-specs`: nothing of it is live); the Hook's requirements live in `openspec/changes/placement/specs/hook/spec.md`.

Prerequisites: `star-round` is merged (replay renderer, `runStar`, `fx.noMotion()`, `fx.announce()`); `sky-home` is merged (the suggested first Star).

## 1. Dares and the honest race

- [ ] 1.1 `js/hook.js`: `HOOK_DARES` for `from9`, `by11`, `times5`, `sq5`, `by9s`, `ends10`, `near-base`, `square-near`, `crosswise`, `duplex`, `sub-base`, and `calcKeys(trick, vals)`. Verify: new `test/hook.test.mjs`: every dare is valid for its Trick (`t.valid(vals)` is null), needs at least 6 keys ending in `=`, and evaluating the keys as a calculator would gives `problemFor()`'s answer; the 10 other Tricks have no dare; `calcKeys('sq5', [85])` is `['8','5','×','8','5','=']`.
- [ ] 1.2 `isNewPlayer()` and `S.hookSeen` in `js/store.js`. Verify: `test/hook.test.mjs`: true for a blank Player; false after one answer, any Sparks, one lit or skipped Star, or `hookSeen`.

## 2. The Hook

- [ ] 2.1 `runHook(root, { trick, signal, onDone })`: dare screen, calculator at one key per 450 ms through `life.every`, outcome with Bolt's pose, reveal through the `star-round` replay renderer at `min(2.5 s, 20 s / steps)`, Skip on the dare and on the reveal, `hookSeen` set when the dare appears. Verify: `test/lifecycle-scan.test.mjs` covers `js/hook.js`; new Playwright `e2e/tests/hook.spec.ts` with `page.clock`:
  - a new Challenger Player opening `#/star/from9/1` sees the dare; after `fastForward(4050)` (9 keys) the calculator shows 643 and Bolt says the calculator won;
  - typing 643 at 2 s wins ("You beat the calculator");
  - the reveal ends by 20 s and the round's first question follows; the round's 4 questions are in Kata order (read from a `data-kata` attribute on the question);
  - Skip on the dare starts the round, and reopening a Star shows no Hook;
  - a Player seeded with one answered question gets no Hook;
  - an Explorer Player gets no Hook;
  - a new Player opening `#/star/zero-sum/1` gets no Hook, and then `#/star/from9/1` gets none either.
- [ ] 2.2 `runStar(..., { hook })` plays the Hook first and deals that round easiest first; `starView()` sets `hook`. Verify: `test/star.test.mjs`: `starRound({ easiestFirst: true })` returns its 4 questions sorted by Kata number.

## 3. Calm, motion and announcements

- [ ] 3.1 Calm: no race, the calculator's time as text; reduced or paused motion: key-by-key text, no movement; announcements for the dare, the outcome and reveal steps only. Verify: `hook.spec.ts`: with `localStorage['vm.calm'] = '1'` the dare shows "2.7 seconds" for an `sq5` first Star and no calculator key appears after `fastForward(5000)`; with `reducedMotion: 'reduce'` `document.getAnimations()` stays empty during the race; the live region's text history (captured with a `MutationObserver` in the test) holds the dare and the outcome and none of the calculator's keys.
- [ ] 3.2 Accessibility. Verify: `e2e/tests/a11y.spec.ts` checks the dare screen and the reveal for a new Player (both schemes) with no serious or critical violations.

## 4. Docs

- [ ] 4.1 Update ADR 0001's last consequence (Placement, not the Hook, moves the Age answer up front) and the Phase 1 table in `docs/PLAN.md` (Hook folded into the first Star; Mistake Museum dropped, decision 26). Verify: reviewer reads the diff; `test/copy.test.mjs` passes.
- [ ] 4.2 Nothing is sent. Verify: `hook.spec.ts` asserts no Firestore request and no analytics event other than the Star's route view and `q_answered/star` during a Hook; record in the PR that `parentNote()` and `cloud/README.md` need no change.

## 5. Release check

- [ ] 5.1 Node, build and Playwright suites pass locally; after deploy the live E2E run is green. Before release, run the plan's Hook test (3 to 5 kids aged 9 to 14, parent present) on the local build and note time to the first "whoa".
