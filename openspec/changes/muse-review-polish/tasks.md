# Tasks

Prerequisites: the owner approves this change; PR #127 (shared/src in TypeScript) has landed, since it edits `js/store.js` and `js/app.js`.

## 1. Wait indicator (D1)

- [ ] 1.1 `hold(el, ms, { skippable, signal })` in `js/fx.js`: the bar after 1.2 s, one polite announcement, Next (and Enter) when `skippable` and `ms >= 2000`, text instead of motion under reduced motion, Pause motion or Calm. Verify: new `e2e/tests/feedback-wait.spec.ts` with `page.clock`: a wrong Practice answer shows `.fx-hold` after 1.2 s and Next after 2 s; Enter on Next shows the next question at once; a right answer shows no bar; an Arena daily round shows the bar and no Next.
- [ ] 1.2 Use `hold()` in Practice, Star worked methods (`js/star.js`), Katas, the tower and Discovery Locks (`js/play/exp/locks.js`). Verify: the spec above covers a Star miss and a Locks miss; `test/lifecycle-scan.test.mjs` passes.

## 2. Quests (D2, D3)

- [ ] 2.1 The refresh line under the quest card and in the Guide's quest section, per Mode. Verify: `e2e/tests/cov` spec for the new scenario; `test/voice-coverage.test.mjs` after the re-record.
- [ ] 2.2 `checkQuests()` on the store's `player` event. Verify: Playwright: play a tower challenge as a Challenger whose quests lack the Arena quest, switch to Explorer on a date whose Explorer quests include it, and the "Quest complete" toast shows on Me; then answering a question shows no quest toast; the existing `quests-2` specs still pass.

## 3. Sparks history and messages (D4)

- [ ] 3.1 `sparksLog` in `js/store.js` (cap 50, newest first, grouped answers), carried by backup and restore. Verify: `test/store.test.mjs`: 60 awards keep 50; restore from a backup code brings the log back; `e2e/tests/backup-restore.spec.ts` still passes.
- [ ] 3.2 "Recent Sparks" on the Me page. Verify: Playwright: after a kata and a watched trick the list shows "Kata +N" and "Watched a speed trick +5" with times.
- [ ] 3.3 Toasts for the silent awards and the daily play cap message. Verify: Playwright: the last step of a trick toasts "+5 Sparks"; with `playSparks:<day>` seeded at 145, finishing a lock toasts "+5 Sparks" and the cap line, once.

## 4. Tour (D5)

- [ ] 4.1 `homeTour()` stands down on a press. Verify: Playwright: a new Challenger presses Play this Star within 100 ms of Home drawing: the Star opens, no tour dialog appears, `vm.tour` is unset, and the next Home visit opens the tour.

## 5. Narrow screens (D6)

- [ ] 5.1 24 px targets and the deep dive footer. Verify: Playwright at 360x740: every `.crumbs a`, `.px-back`, `#tourAgain` has a hit area at least 24 px tall; the deep dive's Previous and Next show the full sutra name; `wcag.spec.ts` and `a11y.spec.ts` pass.

## 6. Voice and docs

- [ ] 6.1 Re-record and publish the new spoken lines (owner, `tools/voice/`).
- [ ] 6.2 `GLOSSARY.md`: "Sparks history". `openspec validate --all --strict`.
