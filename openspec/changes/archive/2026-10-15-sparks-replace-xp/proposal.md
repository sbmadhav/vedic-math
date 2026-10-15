# Proposal

## Why

Star Quest needs one currency that lights Stars and rewards Comebacks. Keeping XP and adding Sparks would give Players two progress numbers next to Score, which `docs/PLAN.md` rules out ("Extra reward systems"). The owner decided (ADR 0003, `docs/star-quest.md` decisions 20 to 24, `docs/videos.md` decision 19) that Sparks replace XP everywhere, that the numbered player level becomes a Title, and that "stars" stop meaning anything but a Star on the Sky. Verified against the code on `origin/main` (7b7e248):

- **XP is one number in one place.** `store.addXP()` (`js/store.js:57`) adds to `S.xp` and this ISO week's `S.weekXp`, and emits `'xp'`. Every activity calls it: Practice answers (`record()`, `js/store.js:113`), quests (+25, `js/gamify.js:105`), Katas, tower challenges, the Arena, Duels, games, Endless runs, sutra cards (+5), tricks watched (+5) and videos (+5, `js/app.js:913`). So a rename is enough: every activity that earned XP earns the same number of Sparks.
- **The weekly XP Board** is `xp-week-YYYY-Www-<league>` (`cloud.postWeekXP`, `js/cloud.js:172`), capped at `MAX_WEEK_XP = 60000` and accepted by `validBoard()` in `cloud/firestore.rules`.
- **The numbered level** is `levelOf(xp)` (`js/gamify.js:12`), shown as "Lv n" in the nav chip (`js/app.js:114`), "Level n · Title" on home and Me, a "Level n!" toast, and the `level5` and `level10` badges. Titles already exist (`TITLES`, one per two levels).
- **"Stars" mean three things today**: Kata stars (`kataStars`, `js/levels.js:52`), tower challenge stars (`challengeStars`, `js/levels.js:117`) and game Level stars (`levelStars`, `js/games.js:403`), all in `S.stars` with keys `k:`, `a:` and `g:`. Star Quest makes "Star" a step on the Sky (GLOSSARY.md), so these must go or be renamed first.

## What Changes

- **Sparks replace XP** in every piece of copy, badge, quest, toast, result line and the weekly Board label. "XP" no longer appears anywhere a Player can see it. Every activity earns the same number of Sparks it earned in XP, except videos (below) and Katas (whose formula loses its stars, see Medals).
- **Stored totals carry over 1:1.** Each Player's `xp` becomes `sparks` and `weekXp` becomes `weekSparks` on first load (and when a backup code from before the change is restored). Nothing is reset.
- **The weekly Sparks Board keeps its Firestore id** `xp-week-YYYY-Www-<league>` and its 60000 cap, with new labels. No rules change and no rules deploy; this week's entries carry on.
- **Titles replace the numbered level.** A Player's Title (Number Rookie to Vedic Legend) comes straight from their total Sparks, at the same thresholds as today, so nobody's Title changes. No level number is shown anywhere. The nav chip shows the Title's progress bar; a toast says "New Title" when it changes.
- **Badges:** "Level 5" becomes "Sum Sprinter" (1000 Sparks, unchanged) and "Level 10" becomes "Fraction Fighter" (earned on reaching that Title at 3600 Sparks). Badge ids stay, so earned badges stay earned.
- **Watching videos earns nothing.** The +5 per new video goes. The Video learner badge (a minute in the player) stays.
- **Medals:** game Levels and tower challenges earn a bronze, silver or gold Medal instead of 0 to 3 stars; existing results map 1:1 (1 star is bronze, 2 silver, 3 gold).
- **Katas have no rating of their own.** A Kata is done or not done (done at 60% right, the old 1-star line); the Dojo shows "done" counts, not stars. Kata Sparks become 5 per right answer plus 10 when the Kata is done.
- GLOSSARY.md (World board entry), `openspec/config.yaml` context, `cloud/README.md`, the rules' comments and `parentNote()` say Sparks.

Out of scope:

- Star rounds, the Sky, Belts by Stars (`star-round`, `sky-home`). This change only clears the word "star" for them.
- Changing what any activity is worth, the weekly cap, the Board's id or the rules' logic.
- Opening locked Katas, tower challenges or game Levels: their unlock rules keep working on "done" and Medals.
- The Sutra card and trick-watched +5 Sparks (they stay; only the video +5 goes, per `docs/videos.md` decision 19).

Affected: every Player in every Mode (Explorer, Challenger, Pro): the word on screen, the chip, the Title, Medals and the Dojo. Grown-ups reading the parent note. Players on World boards see their weekly entry continue under the new label.

## Capabilities

### New Capabilities

- `sparks`: what Sparks are, what earns them, how stored XP carries over, the weekly Sparks Board, and Titles.
- `medals`: Medals for game Levels and tower challenges, and Katas without a rating.

### Modified Capabilities

- `quests`: completing a quest adds 25 Sparks.
- `badges`: the two Title badges (renamed) and badge ids kept.
- `parent-note`: names the weekly Sparks total and explains Sparks and Practice.
- `posting-consent`: "Score or weekly Sparks total" wording in two requirements.
- `board-identity`: Sparks wording in two requirements and their scenarios.
- `answer-checking`: a refused input earns no Sparks.

## Impact

- `js/store.js`: `blank()` fields, migration in `load()` and `importData()`, `addSparks()` / `sparks()` / `weekSparks()` / `weekSparksOf()` replacing the XP functions, the `'sparks'` event, `medal()` / `setMedal()` / `medalsWhere()` and `kataDone()` / `setKataDone()` / `katasDoneWhere()` replacing `stars()` / `setStars()` / `starsWhere()` / `doneWhere()`.
- `js/gamify.js`: `TITLES` with Spark thresholds, `titleInfo()`, the badge list, the quest toast, the Title toast.
- `js/cloud.js`: `postWeekSparks()`, `MAX_WEEK_SPARKS`; board id unchanged.
- `js/app.js`: every "XP" string, `chip()`, `heroStats()`, `meView()`, `queueXpPost()` renamed, Kata, challenge and game result screens (`resultHTML`, `levelMap`, `starHTML`), the Dojo and tower counts, `openPlayer()` (no +5).
- `js/levels.js`: `kataDoneFor()` (replaces `kataStars`), `challengeMedal()` (replaces `challengeStars`); `js/games.js`: `levelMedal()` (replaces `levelStars`).
- `js/metrics.js`: `playedBefore()` reads `sparks` as well as old `xp`.
- `math.css`: Medal styles; `.fx-xp`, `.mq-xpbar` and `.pr-xp` renamed to `.fx-sparks`, `.mq-sparkbar`, `.pr-sparks`.
- `cloud/firestore.rules` and `cloud/README.md`: comments and text only. `cloud/test/rules.test.js` unchanged and still passing.
- GLOSSARY.md, `openspec/config.yaml`, `README.md` where they say XP.
- Tests: `test/store.test.mjs`, `test/gamify.test.mjs`, `test/katas.test.mjs`, `test/games.test.mjs`, `test/cloud.test.mjs`, `test/copy.test.mjs` (new "no XP" scan); Playwright `e2e/tests/progress.spec.ts`, `privacy.spec.ts`, `dojo.spec.ts`, `games.spec.ts`, `routes.spec.ts`.
- What is sent does not change (the same weekly total to the same Board id); `parentNote()` and `cloud/README.md` change wording only.
- **Order:** first of the six Star Quest changes. `star-round`, `sky-home` and `watch-shelf` assume `addSparks()`, Titles and the free word "star".
