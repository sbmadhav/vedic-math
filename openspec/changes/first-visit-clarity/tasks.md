# Tasks

The audit script and its numbers are in `design.md`. Each task names its verification; the Playwright specs run on chromium, webkit and mobile against the local server (`node e2e/local-server.mjs 8124`, `BASE_URL=http://localhost:8124`).

## 1. Find (`js/find.js`, pure)

- [x] 1.1 `sectionLines(mode)`: the sections the Mode's menu has, each `{ href, label, plain }`, with no typed counts. Verify: `test/find.test.mjs`: Explorer has no Dojo or Sutras line; every line's href is a route in `js/app.js`; no digits in the lines.
- [x] 1.2 `buildIndex({ mode, counts, videos })`: sections, grades, Skills, Tricks, Sutras and sub-sutras, games, play experiences, guide sections, videos; kid titles in Explorer; Mode gating from the catalogs' own rules. Verify: `test/find.test.mjs`: every catalog entry is present once for Pro; Explorer has no Dojo or Sutras experience and no Challenger-only game; every href is routed and real (reuse `test/guide.test.mjs`'s `real()` idea).
- [x] 1.3 `normalize`, `tokenize`, `SYNONYMS`, `rank(index, query)`: diacritics stripped, stop words dropped, every token must match, title over synonym over description, prefix at 70 percent, kind order, 8 per kind. Verify: `test/find.test.mjs`: "urdhva" finds Ūrdhva-Tiryagbhyām; "take away" puts `from9` in the top three; "settings" puts Me first; "arena" puts the Arena section first; "zzzz" gives no results; every synonym key names an entry that exists.

## 2. The Find page (`js/app.js`, `index.html`, `math.css`)

- [x] 2.1 Route `#/find` and `findView(ctx)`: box focused on open, hint line, results grouped with a polite count, browse list when empty or on no match, video results as `[data-watch]` buttons, videos added when `W.loadVideos()` resolves, listeners through `js/life.js` on the view's signal. Verify: new `e2e/tests/find.spec.ts`: the scenarios of the `find` spec (menu, slash key, before a Mode, Skill, Sutra, video, take away, settings, Explorer gating, title first, browse list, no match, Enter, Down, Escape); `test/lifecycle-scan.test.mjs` passes.
- [x] 2.2 The menu pill (`index.html`, after Guide, `data-match="^#/find"`), the picker rule (`#/find` opens without a Mode), the `/` key (page-lifetime listener, allow-listed in `test/lifecycle-scan.test.mjs`), the landing's Find link, menu tooltips from `sectionLines()` at startup and on each Mode change. Verify: `e2e/tests/header.spec.ts` (Find after Guide, tooltips, still one row at 1280, wraps at 320 with no sideways scroll); `e2e/tests/cov/site-header-*.spec.ts` for the three changed scenarios.
- [x] 2.3 Guide: a Find section in `js/guide.js` covering `#/find`, Find named in "Getting around". Verify: `test/guide.test.mjs` (every route covered); `e2e/tests/guide.spec.ts` lists the new section.
- [x] 2.4 Analytics: `metrics.findGo()` on a followed result; `'#/find': 'find'` in `test/metrics.test.mjs` SAMPLES. Verify: `e2e/tests/cov/analytics-*.spec.ts` "A Find result" (exactly one `math/find/go`, no request carries the text); `test/metrics.test.mjs` call-site scan.
- [x] 2.5 Accessibility: axe on `#/find` with results in both schemes. Verify: `e2e/tests/find.spec.ts` axe test; `e2e/tests/cov/find-*.spec.ts` "Accessible".

## 3. Try a trick (`js/app.js`, `js/fx.js`, `js/store.js`)

- [x] 3.1 `fx.setMode(m, { guess })` writes `modeGuess` (true for a guess, removed otherwise); `store.modeGuessed()`. Verify: `test/store.test.mjs` (`store.setPlayerMode` sets and clears the flag). The backup code carries progress, not the Player record, so the flag stays on the device.
- [x] 3.2 The landing: one-sentence lede, "Try a trick" primary with its line, "Or pick who is playing" over the cards, the Find link; Try sets the guess, starts the day, sends `math/try/start` and opens `SKY.suggested(...)`'s Star. Verify: new `e2e/tests/first-visit.spec.ts`: two taps to a question; the cards still open their Home with no guess; Try a trick above the fold at 390 px; lede at most 25 words; `e2e/tests/cov/analytics-*.spec.ts` "Try a trick".
- [x] 3.3 Home's mode line names the guess; picking on Me or the cards clears it; `starView` Back goes Home when `render.from` is `#/`. Verify: `first-visit.spec.ts`: the guess line after the trial, cleared by Me; Back home from the trial Star; `e2e/tests/star.spec.ts` still sees `#/dojo` on a direct open; `e2e/tests/cov/first-visit-*.spec.ts` for each scenario.

## 4. Home doors and More (`js/app.js`, `math.css`)

- [x] 4.1 Challenger and Pro `home()`: doors (Star card, Arena, Skill map) with their plain lines, quests with the Sparks line, `details.mq-more.home-more` "More ways to play" with the remaining tiles, remembered open or closed on this device (`vm.homeMore`), Pro's leaderboard card after the doors; Explorer unchanged. Verify: `first-visit.spec.ts`: first three actions on a 390 px Challenger Home; Pro doors before the board; closed by default and remembered; every former tile present; the Sparks line; Explorer's eight tiles; `e2e/tests/sky.spec.ts` and `e2e/tests/play.spec.ts` updated where they look for tiles; `e2e/tests/cov/first-visit-*.spec.ts`.
- [x] 4.2 Tokens only, both schemes, no sideways scroll at 320 px on Home and Find. Verify: `first-visit.spec.ts` and `find.spec.ts` at 320 px; `e2e/tests/wcag.spec.ts` and `a11y.spec.ts` unchanged and green.

## 5. Words and docs

- [x] 5.1 `GLOSSARY.md`: Door, Find, Mode guess, Try a trick. `openspec validate first-visit-clarity --strict` passes. Verify: `test/copy.test.mjs` (no em dash, honest framing) passes on every new string.
- [x] 5.2 Re-run the audit script on this change and put the after numbers in the pull request: actions above the fold on the landing and Home, words on the landing, taps to the first question, search fields.
