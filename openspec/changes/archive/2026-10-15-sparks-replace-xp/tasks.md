# Tasks

Prerequisites: none. This is the first Star Quest change; land it before `star-round`, `sky-home` and `watch-shelf`.

## 1. Store

- [x] 1.1 Add `migrate(S)` to `js/store.js` and call it from `load()`, `importData()` and `weekSparksOf()`: copy `xp` to `sparks` and `weekXp` to `weekSparks` when `sparks` is missing; build `medals` from `a:` and `g:` entries of `stars` and `katasDone` from `k:` entries above 0 when `medals` is missing; set `v: 3`; leave `stars` untouched; mirror `xp` and `weekXp` on save (with a dated TODO). Update `blank()`. Verify: `test/store.test.mjs` new cases: a v2 record with `xp: 2340, weekXp: { <this week>: 410 }` loads as 2340 Sparks and 410 this week; running `load()` twice changes nothing; a backup code made from a v2 record restores with its XP as Sparks; `stars` `{ 'k:sq5:1': 2, 'k:sq5:2': 0, 'g:rain:5': 3, 'a:7': 1 }` becomes `katasDone { 'k:sq5:1': 1 }` and `medals { 'g:rain:5': 3, 'a:7': 1 }`.
- [x] 1.2 Replace `addXP`, `xp`, `weekXP`, `weekXPOf` with `addSparks`, `sparks`, `weekSparks`, `weekSparksOf` and the `'sparks'` event; replace `stars`, `setStars`, `starsWhere`, `doneWhere` with `medal`, `setMedal`, `medalsWhere`, `kataDone`, `setKataDone`, `katasDoneWhere`. `record()` calls `addSparks(gain, 'answer')` with the same gain. Verify: `test/store.test.mjs` (Sparks event payload, best Medal kept, Kata done stays done), and `grep -rn "addXP\|weekXP\|starsWhere" js/` finds nothing (asserted in `test/copy.test.mjs`).

## 2. Titles, badges and quests

- [x] 2.1 In `js/gamify.js` replace `levelOf`, `xpFor`, `levelInfo` and `titleOf` with the Sparks `TITLES` table and `titleInfo(sparks)`; the `'sparks'` listener shows "New Title: <title>" only when the Title changes. Verify: `test/gamify.test.mjs`: for every total from 0 to 25000 in steps of 10, `titleInfo(n).title` equals the old `titleOf(levelOf(n))` (copy the two old one-liners into the test as the reference); a 3590 to 3602 change emits one New Title; Vedic Legend has a full bar and no next.
- [x] 2.2 Rename the `level5` and `level10` badges to "Sum Sprinter" (1000) and "Fraction Fighter" (3600), same ids, descriptions name the Title. Verify: `test/gamify.test.mjs`: a Player holding `level10` from before keeps it; 3600 Sparks awards `level10`; no badge `how` text contains "level" followed by a digit or "XP".
- [x] 2.3 Quest toast says "+25 Sparks" and `checkQuests()` calls `addSparks(25, 'quest')`. Verify: update `test/gamify.test.mjs` "completing a quest adds 25 XP once" to Sparks.

## 3. Medals and Katas

- [x] 3.1 `js/games.js`: `levelMedal()` replaces `levelStars()`; `js/levels.js`: `challengeMedal()` replaces `challengeStars()`, `kataDoneFor(right, total)` replaces `kataStars()`. Verify: `test/games.test.mjs` "level stars" becomes "level Medals" with the same cases; `test/katas.test.mjs` "kata stars" becomes "kata done at 60% right"; the tower test keeps its targets.
- [x] 3.2 `js/app.js`: `medalHTML()` replaces `starHTML()`; `levelMap()` takes `resultOf(n)`; Kata, tower and game Level result screens, lobbies and summary counts use Medals or "done"; unlock checks use `kataDone` and `medal > 0`; Kata Sparks are `5 × right + 10` when done; Medal CSS in `math.css` with tokens only. Verify: Playwright `e2e/tests/dojo.spec.ts` "kata 1 ... finishes with stars" becomes "... finishes as done, with Sparks and no stars" (asserts no `★` in `#kata`, "+N Sparks"); `e2e/tests/games.spec.ts` new test: a seeded `g:times-sprint:3 = 3` shows a gold Medal with `aria-label` "Level 3, gold Medal" on `#/game/times-sprint` and Level 4 is open; `e2e/tests/routes.spec.ts` tower and chapter pages render with no `★`.

## 4. Sparks in the app and on the Board

- [x] 4.1 `js/cloud.js`: `postWeekSparks()`, `MAX_WEEK_SPARKS = 60000`, `weekSparksBoard()` building `xp-week-<week>-<league>` with a comment on why the id keeps `xp`; `boardScore()` unchanged. Verify: `test/cloud.test.mjs` "weekly XP boards: any integer from 10 to 60000" and "weekly XP posts under the identity of the Player passed in" renamed to Sparks, same assertions on the `xp-week-` id; "the caps match cloud/firestore.rules" still passes.
- [x] 4.2 `js/app.js`: every "XP" string becomes Sparks (Practice praise, Endless run, Kata, challenge, Arena, game, Duel results; quests card; `heroStats()`; `meView()`; the Arena lobby heading "Most Sparks this week"; `worldBoardsHTML()`), `chip()` shows the Title bar with `aria-label="<Nickname>, <Title>"`, `queueXpPost()` becomes `queueSparksPost()` on the `'sparks'` event; CSS classes renamed in `math.css`. Verify: new `test/copy.test.mjs` case "no XP shown to Players": scans `index.html` and string literals in `js/*.js` for `\bXP\b` (allowing only `xp-week` ids and the migration code); Playwright `e2e/tests/progress.spec.ts` "XP, collected sutra cards ... survive a reload" becomes Sparks and also checks the chip's accessible name has a Title and no "Lv".
- [x] 4.3 Remove the +5 for a new video in `openPlayer()`. Verify: Playwright `e2e/tests/progress.spec.ts` "Video learner" test also asserts the saved `sparks` is unchanged after opening a new video.
- [x] 4.4 `js/metrics.js` `playedBefore()` treats `sparks > 0` or old `xp > 0` as played. Verify: `test/metrics.test.mjs` "a device that played before these flags existed is not counted as new" gains a v3 record case.
- [x] 4.5 Privacy: the weekly post still sends the same fields to the same id. Verify: Playwright `e2e/tests/privacy.spec.ts` "XP earned anywhere sends this week's XP total ..." and the two-Player and under-13 cases renamed to Sparks, still asserting the `xp-week-` path, the fields `name, avatar, score, ts, exp` and the once-a-minute rule.

## 5. Parent note, docs and rules comments

- [x] 5.1 `parentNote()` in `js/app.js`: "the player's Sparks total for this week" and "Sparks come from all play, Practice included" (no XP), worded per Mode. `cloud/README.md`: Data model, Privacy and Boards sections say weekly Sparks and explain the kept `xp-week-` id. Verify: Playwright `e2e/tests/privacy.spec.ts` "the note names every kind of score that is sent" expects "Sparks" and no "XP".
- [x] 5.2 `cloud/firestore.rules`: comments only ("Weekly Sparks (board id keeps its xp- prefix)"). Verify: `cd cloud/test && npm test` against the emulator passes unchanged; record in the PR that no rules deploy is needed.
- [x] 5.3 GLOSSARY.md World board entry ("posting a Score or weekly Sparks total"); `openspec/config.yaml` context (Sparks instead of XP); `README.md`. Verify: `grep -rn "\bXP\b" GLOSSARY.md openspec/config.yaml README.md` finds only the Sparks entry's _Avoid_ line.

## 6. Release check

- [x] 6.1 `node --test 'test/**/*.test.{js,mjs}'`, the build, and `cd e2e && npx playwright test` against a local server pass; after deploy, the live E2E run is green and a Player with old progress (seeded in a manual check) shows the same Title, Sparks equal to the old XP, and Medals.
