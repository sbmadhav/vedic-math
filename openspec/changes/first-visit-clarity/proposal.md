# Proposal

## Why

Early user feedback, relayed by the owner on 2026-10-18: "the site might feel a bit overwhelming for someone opening it out of curiosity" and "it's a bit hard to find what you are looking for".

The audit in `design.md` (Playwright against this checkout, 390 px and 1280 px, Daybreak and Deep Space, no saved state) measures both. A curious visitor lands on a three-way choice about their age under a 39-word sentence that names seven things (sutras, a 1965 book, a skill map, counting to calculus, games, daily quests, an Arena with leaderboards); on a phone only two of the three cards are above the fold and there is nothing to try without choosing. Picking a card opens Home with 11 to 14 actions in the view, 11 to 13 more in the header, and a six-step modal tour (77 to 125 words) on top. The first Challenger Home uses Dojo, Star, Sparks, Sutra, Arena, Party, Title and quests with no explanation on the page. It takes 3 to 4 taps to reach a first question, one of them "Skip tour". Nothing in the app is searchable: 513 named things (114 Skills, 21 Tricks, 29 Sutras, 14 games, 12 play experiences, 285 videos, 24 guide sections, 14 grades) are reached only by browsing pages that run to 110, 155 and 220 actions and 6,000 to 71,000 px on a phone, and three of the eight one-word menu names (Dojo, Arena, Sutras) are jargon with no description anywhere but the guide.

## What Changes

- **Try a trick, before any choice.** The landing (the mode picker) gets one primary action above the Mode cards: "Try a trick". It opens the first Star of Bolt's path (today "Subtract from 100, 1000, 10000", Star 1: four questions, two minutes, a miss teaches the trick) with the Mode set to Challenger as a guess. The guess is marked on the Player, shown on Home ("Mode: Challenger, our guess") and cleared by any explicit Mode pick (the picker's cards or Me). The lede shrinks to one plain sentence; the Mode cards stay as the explicit choice under "Or pick who is playing". Back from that Star goes Home, not to the Dojo.
- **Three things first on Home.** Challenger and Pro Home show three doors (Challenger: the next Star, the Arena, the Skill map; Pro: the Arena, the Dojo, the Skill map), each with a one-line plain description that introduces its term (Star, belt, Dojo, Arena, Skill) on first use, then the daily quests, then "More ways to play" folded under a disclosure (Party Mode, Games, Sutra cards, Watch). The Pro leaderboard card moves below the doors. The quests card says what Sparks are. Explorer Home keeps its picture tiles (see design).
- **Find.** A new page `#/find`, in the menu bar after Guide and reachable with the `/` key, with a search box over every named thing: sections, grades, Skills, Tricks, Sutras, games, play experiences, videos and guide sections, by name and by plain words ("squares", "take away", "leaderboard", "settings", "nickname", "videos"). Results are grouped by kind with a one-line description each, filtered to what the Player's Mode can open, and open the real page (videos open the player in place). With nothing typed it shows the browse list: every section with one plain line. It opens without a Mode, like Watch, the Sutras and the guide.
- **One plain line per section.** The eight sections get a one-line description in one place (`js/find.js`), shown in Find's browse list and as the tooltip of each menu link.
- **Analytics.** Two fixed events: `math/try/start` and `math/find/go`. The typed text never leaves the device.

Out of scope:

- Changing the Mode names, the age ranges or the Explorer picture home (collapsing pictures behind a disclosure for 4 to 7 year olds was rejected, see design).
- The first-visit tour's steps and rules (`guide` spec): unchanged. A visitor who tried a trick has Sparks, so the tour does not fire for them; the "New here?" line still offers it.
- The Placement offer and the Hook (`placement`), the grade question (`age-bands`) and the move to learnvedicmath.com (`learnvedicmath`): this change is written to sit under them (design, "Fit with open changes").
- The Dojo, Sutras and Watch pages themselves (110, 155 and 220 actions): Find is the way in; folding their lists is a later change.
- Any server, index file or third-party search: the index is built in the page from the catalogs already loaded.

Modes and Players affected: every new visitor sees the new landing and Find. Challenger and Pro Players see the new Home order (nothing removed). Explorer Players see Find in the menu and the quests line; their Home tiles are unchanged. Returning Players keep their Mode, progress and the Keep going card, which stays first on Home.

## Capabilities

### New Capabilities

- `first-visit`: Try a trick on the landing, the Mode guess and how it is shown and cleared, the three doors and the More disclosure on Home, jargon introduced on first use.
- `find`: the Find page, what the index holds, ranking, Mode filtering, the browse list, the keyboard shortcut, and what never leaves the device.

### Modified Capabilities

- `site-header`: Find joins the menu bar after Guide; each menu link carries its one-line description; Find opens before a Mode is picked.
- `analytics`: `math/try/start` and `math/find/go` are counted; the Find text is added to what an event never carries.

## Impact

- New `js/find.js` (pure, node-tested): section lines, the index builder, synonyms, normalizing and ranking.
- `js/app.js`: the picker's Try a trick and short lede; `home()` doors and More for Challenger and Pro; the `#/find` route and view; the `/` key; the Star's Back from Home; menu tooltips; the picker rule for `#/find`.
- `js/store.js`: `modeGuess` on the Player record (cleared by `fx.setMode` when picked by hand).
- `js/fx.js`: `setMode(m, { guess })`.
- `js/metrics.js`: `tryStart()`, `findGo()`.
- `js/guide.js`: a Find section (the guide covers every route) and Find in "Getting around".
- `index.html`: the Find menu link. `math.css`: the doors, the More disclosure, the Find page.
- Tests: new `test/find.test.mjs`; `test/metrics.test.mjs` (route sample, call sites), `test/lifecycle-scan.test.mjs` (the `/` key listener is page-lifetime); new `e2e/tests/first-visit.spec.ts` and `e2e/tests/find.spec.ts`; `e2e/tests/header.spec.ts`, `modes.spec.ts`, `sky.spec.ts`, `guide.spec.ts` where the Home order or the menu changed; `e2e/tests/cov/first-visit-*.spec.ts`, `find-*.spec.ts`, `site-header-*.spec.ts`, `analytics-*.spec.ts` for the new scenarios.
- Docs: `GLOSSARY.md` (Door, Find, Mode guess, Try a trick), `docs/agent/e2e.md` unchanged. Nothing new is sent or kept, so `parentNote()` and `cloud/README.md` do not change.
