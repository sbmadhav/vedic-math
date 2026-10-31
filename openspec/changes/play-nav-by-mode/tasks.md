# Tasks

Playwright specs run against a local build (`python3 build.py --voice off && node e2e/local-server.mjs <port> _site`, `BASE_URL=http://localhost:<port>`).

## 0. Before building

- [x] 0.1 **[OWNER]** Approve. The owner's 2026-10-29 message ("analyze this feedback and act on it", "Make executive decisions") is the approval; the calls are in `design.md`.

## 1. The menu (`js/nav.js`, `play/index.html`, `js/app.js`, `js/find.js`, `math.css`)

- [x] 1.1 `js/nav.js`: the tabs per Mode, the routes each zone holds, `navHTML()`, `NAV_LINES`. `play/index.html` holds `navHTML('big')`. Verify: `test/nav.test.mjs`.
- [x] 1.2 `syncNav()` draws the Mode's set, marks the current zone and sets the tooltips from `sectionLines()`; it runs on every route and Player change. Verify: `e2e/tests/nav-by-mode.spec.ts` "zones".
- [x] 1.3 Explorer's picture tabs say their names after the view draws, with Read aloud on. Verify: `nav-by-mode.spec.ts` "Explorer tabs".
- [x] 1.4 The Arcade (`#/arcade`, `arcadeView`) and Learn's Sutras card (`learnSutras`); `sectionLines()` gains the Arcade, in zone order; `math/view/arcade`. Verify: `nav-by-mode.spec.ts` "Arcade", "Learn"; `test/find.test.mjs`, `test/metrics.test.mjs`, `test/guide.test.mjs` (the guide covers `#/arcade`).
- [x] 1.5 Find trigger with its shortcut; Ctrl K and Cmd K; the round guard for `/` and the shortcut; Find's help card. Verify: `nav-by-mode.spec.ts` "Find".
- [x] 1.6 Explorer Home's More places. Verify: `nav-by-mode.spec.ts` "More places".

## 2. First visit (`js/app.js` `modePicker`)

- [x] 2.1 The three Mode cards are the picker's only buttons, each ending in "Start as <Mode>"; one guide link. Verify: `e2e/tests/first-visit.spec.ts`, `e2e/tests/cov/first-visit-4.spec.ts`, `try-trick.spec.ts`.

## 3. Calm and sound (`js/ambient.js`, `js/shell.js`, `js/fx.js`)

- [x] 3.1 `mountSound()`: the header's Calm and sound control (Calm, Pause motion, the music, the Moving background) and the play shell's (Pause motion, the music); every switch in sync. Verify: `nav-by-mode.spec.ts` "Calm and sound"; `header.spec.ts`; `calm.spec.ts`.

## 4. Lessons end in practice (`js/app.js`)

- [x] 4.1 Practice it now on every Skill and Trick page; Try it yourself starts the Trick's first unlit Star (Explorer: its page); Back to the sutra. Verify: `nav-by-mode.spec.ts` "lesson practice".

## 5. Words, tests and checks

- [x] 5.1 `js/guide.js`: the guide's and the tour's lines about the menu, Find and the music; the tour's last step points at Find (Explorer: How to play). `GLOSSARY.md`: Zone, Arcade, Find trigger, Calm and sound, More places; Find and Try a trick updated.
- [x] 5.2 Every e2e spec that expected the nine-item menu, the Guide link, the picker's Try a trick or the Music word changes with the reason in the pull request; coverage specs for the new scenarios.
- [ ] 5.3 **[OWNER]** Re-record and publish: the Explorer tab lines "Play", "Learn", "Me" (then remove the todo in `test/voice-coverage.test.mjs` "every Explorer menu tab line has studio audio"), and the changed explanation lines: guide sections `around`, `find`, `me`, `dojo`, `sutras` and `music`; tour steps `nav`, `music` and `guide` (`tools/voice/lines.mjs` lists them).
- [x] 5.4 After release: archive `learnvedicmath` and `sutras-first` first, then this change (removing "Sutras come first in the menu"), with the coverage specs for the scenarios it makes live.
  - Done 2026-10-31 (`archive-sweep`): archived in that order. The `site-header` delta removes "Sutras come first in the menu" and modifies "The header is the Learn Vedic Math header" (the Mode's menu and the Calm and sound control in place of the fixed nav list and the Music pill), and the `first-visit` delta keeps Explorer Home's "A sutra to say" card beside More places. Coverage: `e2e/tests/cov/site-header-5` to `-7`, `first-visit-4`, `calm-4`, `find-3`, `lesson-practice-1`, `guide-2`, `guide-4`, `analytics-11`. 5.3 (the re-record) stays with the owner.
