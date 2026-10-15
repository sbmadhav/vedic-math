# Design

## Context

- Progress is one JSON record per Player in `localStorage` (`mathquest.v1.<playerId>`), loaded by `store.load()` as `{ ...blank(), ...saved }` (`js/store.js:52`). `blank()` has `v: 2`, `xp`, `weekXp` (only the current ISO week is kept) and `stars` (keys `k:<trick>:<n>`, `a:<id>`, `g:<game>:<n>`, values 0 to 3).
- XP flows through `addXP(n, why)` (`js/store.js:57`) and the `'xp'` store event, heard by `gamify.init()` (level toasts, badges), `chip()` (`js/app.js:116`) and `queueXpPost()` (`js/app.js:708`).
- `queueXpPost()` posts `store.weekXPOf(id)` through `cloud.postWeekXP(league, xp, p)` to `xp-week-<week>-<league>` (`js/cloud.js:172`), at most once a minute, after `cloud.canPost()`.
- `levelOf(xp)` and `xpFor(lv)` (`js/gamify.js:12-13`) give 50·n·(n−1) XP per level; `titleOf(lv)` maps two levels to one of 11 `TITLES`.
- Unlocks: a Kata opens when the one before has stars (`kataView`, `js/app.js:434`); a tower challenge when the one before has stars (`challengeView`, `:509`); a game Level when it is under the Rating level or the one before has stars (`gameView`, `:805`). `levelMap()` (`:406`) draws all three with `starHTML()`.
- `metrics.playedBefore()` (`js/metrics.js`) reads `d.xp > 0` to recognise old devices.

## Goals / Non-Goals

**Goals:**
- One word, Sparks, with no loss of any Player's total, Title, Badge, open Level or weekly Board entry.
- Free the word "star" for Star Quest.

**Non-Goals:**
- Re-balancing what activities are worth.
- Removing the old `stars` field from saved progress (kept, unread, so a rollback loses nothing).

## Decisions

**1. Keep the Firestore Board id `xp-week-*`; change only labels.**
The Board id is never shown to a Player. Keeping it means: no change to `validBoard()`, `kind()` or `maxScore()` in `cloud/firestore.rules`, no rules deploy, no change to `cloud/test/rules.test.js`, and this week's entries continue, which is what "carried over 1:1" requires (ADR 0003: "the weekly Board and its cap are migrated rather than reset").
- Rejected: a new `sparks-week-*` id. It needs a rules change and deploy (with emulator tests), splits the week of the release across two Boards (every Player's weekly standing resets mid-week), and a cached old client would keep posting to the old id for a day. It gains nothing a Player can see.
- Code names follow the domain: `cloud.postWeekSparks()`, `MAX_WEEK_SPARKS`, `cloud.weekSparksBoard(week, league)` returning the `xp-week-` id, with a comment saying why the id keeps `xp`.

**2. Store migration in `load()`, idempotent, schema `v: 3`.**
`load()` merges the saved record, then `migrate(S)`:
- `if ('xp' in S && !('sparks' in S)) { S.sparks = S.xp; }`, the same for `weekXp` to `weekSparks`. For one release `save()` also writes `S.xp = S.sparks` and `S.weekXp = S.weekSparks` (rollback mirror, see Risks); nothing reads them.
- `if (S.stars && !S.medals)`: `S.medals` gets every `a:` and `g:` entry with its value (1 bronze, 2 silver, 3 gold); `S.katasDone` gets every `k:` key whose value is above 0, with the value `1`. `S.stars` is left as it was and never read again (rollback safety; a later cleanup can drop it).
- `S.v = 3`; save once.
`importData()` runs the same `migrate()`, so old backup codes keep their XP. `exportData()` writes the new fields. `blank()` gains `sparks: 0, weekSparks: {}, medals: {}, katasDone: {}` and loses `xp`, `weekXp`, `stars`.
- Rejected: migrating lazily in each getter. Every getter would need to know the old shape forever.

**3. Store API.**
- `addSparks(n, why)`, `sparks()`, `weekSparks()`, `weekSparksOf(id)` (reads another Player's record with the same migration applied to the copy it reads), emitting `'sparks'` with `{ before, after, n, why }`.
- `medal(key)` (0 to 3), `setMedal(key, n)` (keeps the best, emits `'medal'`), `medalsWhere(prefix)` (counts of bronze, silver and gold).
- `kataDone(trick, n)`, `setKataDone(trick, n)` (emits `'kata'`), `katasDoneWhere(prefix)`.
- The old names (`addXP`, `xp`, `weekXP`, `weekXPOf`, `stars`, `setStars`, `starsWhere`, `doneWhere`) are removed, not aliased, so any missed caller fails loudly in the tests.

**4. Titles from Sparks.**
`TITLES` becomes `[[0, 'Number Rookie'], [300, 'Digit Dasher'], [1000, 'Sum Sprinter'], [2100, 'Times Tamer'], [3600, 'Fraction Fighter'], [5500, 'Sutra Scout'], [7800, 'Mental Ninja'], [10500, 'Equation Ace'], [13600, 'Pattern Sage'], [17100, 'Calculus Comet'], [21000, 'Vedic Legend']]`. These are `xpFor(2i + 1)`, exactly where `titleOf(levelOf(xp))` changed before, so nobody's Title moves (test against the old functions). `titleInfo(sparks)` returns `{ title, next, into, need, pct }` (`next` null at Vedic Legend, bar full). `levelOf`, `xpFor`, `levelInfo` and `titleOf` are removed.
- The `'sparks'` listener in `gamify.init()` shows "New Title: <title>" (sound and confetti as for a level today) only when `titleInfo(before).title !== titleInfo(after).title`.

**5. Title badges.**
`level5` keeps its id, becomes "Sum Sprinter", "Reach the Sum Sprinter Title (1000 Sparks)", test `sparks >= 1000` (unchanged threshold). `level10` keeps its id, becomes "Fraction Fighter", "Reach the Fraction Fighter Title (3600 Sparks)", test `sparks >= 3600`.
- The old Level 10 was 4500 XP, inside Fraction Fighter (which starts at old level 9). Naming the badge after a Title and awarding it later than the Title would contradict its own name, so the threshold moves to the Title's start. Players between 3600 and 4499 Sparks earn it on their next Sparks event; nobody loses it (`badges` spec: earned badges are kept).

**6. Medals.**
- `levelMedal(goal, score)` (`js/games.js`, replaces `levelStars`) and `challengeMedal(ch, r)` (`js/levels.js`, replaces `challengeStars`) return 0 to 3 by the same rules.
- `medalHTML(n)` replaces `starHTML(n)` in `js/app.js`: a small disc with class `medal medal--bronze|silver|gold|none` and `role="img"` `aria-label="Gold Medal"` (or "No Medal yet"); colours come from new tokens-only CSS (`--sun` for gold, `--ink-muted` mix for silver, `--coral` mix for bronze), never raw hex.
- `levelMap()` takes `resultOf(n)` returning `{ done, medal }` instead of reading stars; Katas pass `{ done: kataDone(...) }` with no Medal. Unlock rules read `done` (Katas) or `medal > 0` (tower, games), which is exactly the old `stars > 0`.
- `resultHTML()` headline uses the Medal ("Gold Medal!", "Silver Medal", "Bronze Medal", "Not quite. Try again!"); for Katas, "Kata done!" or "Not quite. Try again!".
- Goal lines in the game Level lobby ("&#9733; 120 · &#9733;&#9733; 240") become "Bronze 120 · Silver 240 · Gold 360".
- Tower and game summary counts: "12 cleared · 5 gold" instead of "N ★".

**7. Kata Sparks.** `5 × right + (done ? 10 : 0)`, done at `right / total >= 0.6` (`kataDoneFor(right, total)` in `js/levels.js`). An 8-problem Kata done cleanly pays 50 (the old maximum was 46); a 5-problem one pays 35 (old maximum 40). On the same scale, with no rating to chase.

**8. Copy.** Every "XP" in `js/app.js` and `js/gamify.js` becomes "Sparks" (worded per Mode with `fx.t()` where it already was). Class names `.fx-xp`, `.mq-xpbar`, `.mq-xpbar--big`, `.pr-xp` become `.fx-sparks`, `.mq-sparkbar`, `.mq-sparkbar--big`, `.pr-sparks` (`math.css`). The Arena lobby heading becomes "Most Sparks this week". The nav chip shows the bar only (`aria-label="<Nickname>, <Title>"`, no "Lv"). Home and Me show "<Title> · <n> Sparks" and "<n> Sparks to <next Title>".

**9. Video +5 removed.** Delete the `markSeen('vid:' + url)` and `addXP(5, 'video')` line in `openPlayer()` (`js/app.js:913`). The `watchedMinute` counter and badge are untouched.

## Risks / Trade-offs

- [A Player opens the new version, then an old cached tab writes progress] → The old tab writes `xp` and `stars` back into the same record. `migrate()` only copies `xp` when `sparks` is missing, so the newer total wins and the old tab's few points are lost. Acceptable: the service worker serves page loads network first, so stale tabs are rare and short-lived.
- [Rollback] → The old code reads `xp` (now deleted) and would show 0 XP. Mitigation: `migrate()` keeps `S.xp` mirrored (`S.xp = S.sparks` on every save) for one release, documented in a `TODO(remove after 2026-11-15)` comment, so a revert keeps totals. `stars` is never deleted.
- [Weekly Board shows a Player's entry under a Sparks heading while their old client posts "XP"] → Same number, same id; the label is client-side only.
- [Fraction Fighter badge arrives for some Players with no new action] → It is earned on their next Sparks event; that is the intended behavior of the lower threshold.

## Migration Plan

1. Ship the client. No rules deploy (`cloud/firestore.rules` changes in comments only; deploy them with the next real rules change).
2. Each Player's record migrates on first load; backup codes migrate on restore.
3. Rollback: revert the client. Totals survive through the `xp` mirror; Medals and Katas read `stars`, which was never touched.

## Files touched

- `js/store.js`, `js/gamify.js`, `js/cloud.js`, `js/app.js`, `js/levels.js`, `js/games.js`, `js/metrics.js`, `math.css`
- `cloud/firestore.rules` (comments), `cloud/README.md`
- `GLOSSARY.md` (World board), `openspec/config.yaml` (context: Sparks instead of XP), `README.md`
- Tests: `test/store.test.mjs`, `test/gamify.test.mjs`, `test/katas.test.mjs`, `test/games.test.mjs`, `test/cloud.test.mjs`, `test/copy.test.mjs`, `test/metrics.test.mjs`; `e2e/tests/progress.spec.ts`, `privacy.spec.ts`, `dojo.spec.ts`, `games.spec.ts`, `routes.spec.ts`, `a11y.spec.ts` (comment), `e2e/tests/fixtures.ts` (a `seedProgress` option)
