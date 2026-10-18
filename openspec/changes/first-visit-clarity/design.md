# Design

## Context

Two pieces of early feedback: the site feels overwhelming to someone opening it out of curiosity, and it is hard to find what you are looking for. Before designing, the first visit was measured, not guessed: a Playwright script opened this checkout (local server, the rest of the site proxied from sbmadhav.com) in a fresh context with no saved state, at 390 by 844 (phone) and 1280 by 800 (desktop), in Daybreak and Deep Space, and counted for each screen the actions a visitor can take (links, buttons, inputs, summaries that are visible), above the fold and in total, the words above the fold, the primary buttons, search fields, and the jargon in the text. Deep Space gave the same numbers as Daybreak on every screen (same markup), so the tables show Daybreak.

## The audit

Phone, 390 by 844. "Header" is the sticky bar (brand, menu links, Explore, color scheme, Music, Player chip). "View" is the page under it.

| Screen | Header actions | View actions above fold / total | Words above fold | One primary action? | Search |
| --- | --- | --- | --- | --- | --- |
| Landing (mode picker) | 5 | 2 / 4 (Pro card and "See how it works" below the fold) | 67 | No: a three-way choice | No |
| Home, Explorer | 11 | 7 / 13 (3 of the first 7 are Change, guide, tour) | 54 | No: eight equal tiles | No |
| Home, Challenger | 13 | 5 / 11 | 69 | Play this Star | No |
| Home, Pro | 13 | 7 / 14 | 99 | Play today's round, under World / This device and a privacy link | No |
| Tour (fires on the first Home) | | 6 steps | 77 (Explorer), 125 (Challenger, Pro) | | |
| Learn | 13 | 5 / 16 | 73 | No | No |
| Dojo | 13 | 2 / 110 (44 in Explorer) | 114 | No | No |
| Arena | 13 | 5 / 17 | 89 | Start, below the fold | No |
| Games | 13 | 4 / 23 | 111 | No | No |
| Sutras | 13 | 3 / 155 (215 in Pro) | 99 | No | No |
| Watch | 13 | 12 / 220 (89 in Explorer) | 74 | No | No |
| Me | 13 | 9 / 45 | 162 | No | No |
| Guide | 13 | 14 / 58 | 83 | Take the tour | No |
| All places | 13 | 9 / 91 | 121 | No | No |

Page height on the phone: Dojo 6,466 px, Sutras 24,133 px, Watch 70,930 px (Challenger), Guide 21,962 px, Me 6,296 px, All places 5,627 px.

Desktop, 1280 by 800: landing 4 of 4 actions above the fold, 113 words; Home Challenger 10 of 11 actions, 133 words; Home Pro 12 of 14 actions, 271 words; Guide 32 actions above the fold.

Taps from the landing to the first question, following the most prominent action (phone): Challenger 3 (Mode card, Skip tour, Play this Star); Explorer 4 (Mode card, Skip tour, Balloon pop, Play ranked); Pro 4 (Mode card, Skip tour, Play today's round, Start). Through the menu: Dojo 4, Learn 5 (Learn, a grade, a Skill).

Jargon on the first Challenger Home, with no explanation on the page: Dojo (3 times), Star (4), Sparks (2), Sutra (2), Arena (2), Party, Skill, Title, quests. They are first explained in the tour (six modal steps, dismissed with one tap) and in the guide (58 actions, 22,000 px).

Named things, with no search anywhere (0 search fields on 72 screens): 114 Skills, 21 Tricks, 29 Sutras, 14 games, 12 play experiences, 285 videos, 24 guide sections, 14 grades: 513. Menu names: Home, Learn, Dojo, Arena, Games, Sutras, Watch, Guide; Dojo, Arena and Sutras are jargon, and no menu item has a description anywhere but the guide.

What the numbers say: the overwhelm is not the amount of content but the first three screens (a choice with no way to try, a Home that is a menu of menus, a modal tour on top) and the words used on them; the finding problem is the absence of any index over 513 things spread across pages that are 6,000 to 71,000 px tall.

After the change, measured with the same script (phone, Daybreak, no saved state): the landing has 3 actions above the fold (Try a trick and two Mode cards), 54 words above the fold (was 67) and a 14-word lede (was 39); a first question is 1 tap away (Try a trick opens the Star's number pad; the second tap answers), against 3 to 4; Find is the 1 search field (was 0), reachable from the 9-item menu (was 8); Home for Challenger keeps 5 actions above the fold with one primary and 89 words (was 69), now with Star, belt and Dojo explained.

## Goals / Non-Goals

**Goals:**
- A curious visitor answers a first question in 2 taps from the landing with no choice to make, and sees one obvious thing to do on every screen before Home.
- Home shows three things first, in plain words that introduce their terms, with everything else one tap away.
- Anything with a name can be found by name or by a plain word from the menu bar of every page, without anything leaving the device.
- Nothing removed: every tile, shelf, page and route stays reachable.
- Under about 600 changed lines in the app, with every behavior covered by node and Playwright tests.

**Non-Goals:**
- Reworking the Dojo, Sutras or Watch pages (they stay long; Find is the way in).
- Changing the tour, the Mode names, age ranges, the Explorer picture home or any play experience.
- Pre-empting `placement`, `age-bands` or `learnvedicmath`.

## Decisions

**1. Try a trick on the landing, with a guessed Mode.** One primary button above the Mode cards, "Try a trick", with the line "About two minutes. No sign-up." It sets the Mode to Challenger with `modeGuess: true` on the Player record, starts the day (`gm.startDay()`, as a Mode card does) and opens the first Star of Bolt's suggested path (`SKY.suggested(...)`, today `#/star/from9/1`), the same Star Home's "Play this Star" offers, so nothing new has to be taught or tested. Challenger is the guess because it is the plan's primary audience (9 to 14 and their parent), its wording works for an adult, and its first Star needs no reading help. The guess shows on Home as "Mode: Challenger, our guess. Change"; `fx.setMode(m)` with no guess flag clears it, so the picker's cards and Me clear it. Back from a Star opened from Home or the landing goes Home (`render.from === '#/'`), never to the Dojo's 110 actions. The lede becomes one sentence; the cards sit under "Or pick who is playing". Taps to the first question: 2 (Try a trick, then the first answer key).
- Rejected: deferring the Mode (no Mode until after the trial). Every view reads `fx.mode()` for wording, Ratings per League, the Player chip and the menu; a Star with no Mode means a Challenger fallback at twenty call sites or a fourth pseudo-Mode. A guessed, changeable Mode gives the visitor the same experience with one flag.
- Rejected: a dedicated `#/try` round with its own copy and scoring. A second round engine to test and keep honest, when the Star round already teaches on a miss and awards Sparks.

**2. Three doors on Home, the rest folded.** Challenger and Pro Home: the Keep going card (returning Players) stays first; then `.home-doors` with three cards (Challenger: the next Star, that is the existing Dojo card with belt, next Star, Play this Star and Open the Dojo; the Arena; the Skill map. Pro: the Arena with Play today's round; the Dojo with belts and Stars lit; the Skill map); each carries one plain line that introduces its term ("A Star is a two-minute round of four questions on one speed trick; light it to earn your belt in the Dojo", "Sixty seconds, the same questions for everyone in your league, a leaderboard at the end", "Skills by grade from counting to calculus, each with a hint and a worked answer"); then the quests card, whose last line now starts "Sparks are the points you earn for right answers"; then `<details class="mq-more">` "More ways to play" with the remaining tiles (Party Mode, Games, Sutra cards or deep dives, Watch); Pro's leaderboard card follows the doors. The disclosure is the pattern the Learn page already uses ("All other levels"). Measured after the change on a 390 px phone: the actions above the fold stay at 5 (Change, the New here? links, Play this Star, Open the Dojo) with one primary, the visible actions in the view go from 11 to 12 (four tiles fold away, the disclosure and the Skill map door are added), and the words above the fold rise from 69 to 89, because the Star door now says what a Star, a belt and the Dojo are. The gain is order and meaning, not fewer words: one primary first, three doors, the rest one tap away.
- Rejected: folding Explorer's tiles too. Explorer's Home is pictures with two-word labels (45 words above the fold); a 4 to 7 year old does not open disclosures, and the audit's complaint came from a curious grown-up, who the Try path now routes to Challenger. Explorer gets the quests line and Find only.
- Rejected: hiding the tour behind "Take the tour" only. The `guide` spec keeps the once-per-device tour; after Try a trick the Player has Sparks, so it never fires on them anyway.

**3. Find is a page in the menu bar, not a header dialog.** Route `#/find`, a menu pill after Guide, opened also by the `/` key outside inputs. The header keeps the home page's parts in the home page's order (`site-header` spec; `header.spec.ts` compares the two headers), the router gives the page focus handling, `aria-current`, Back and a route view for free, and the page has room for the browse list. It opens without a Mode (the picker rule, like Watch, the Sutras and the guide), with Challenger wording and gating until one is picked; the landing links to it.
- Rejected: a dialog opened from a header button. It adds a part the home page's header does not have, needs its own focus trap and Escape handling, and has no address.
- Rejected: Find inside the Explore menu. Explore is the site-wide map of sbmadhav.com from another repo; the index is this app's.

**4. The index is built in the page from the catalogs.** `js/find.js` (pure, no DOM) exports `sectionLines(mode, counts)`, `buildIndex({ mode, counts, videos })`, `normalize`, `tokenize` and `rank(index, query)`. Entries: the eight sections and Find itself, grades (`#/grade/<id>`), Skills (`#/skill/<id>`, kid titles in Explorer), Tricks (`#/skill/v-<id>`, with the belt and the Sutra), Sutras and sub-sutras (`#/sutras/<id>`, name, meaning, plain line, Devanagari), games (`#/game/<id>`), play experiences (their route), guide sections (`#/guide/<id>`) and videos (opened in place through the existing `[data-watch]` handler; `videos.js` stays lazy, so the view adds them when `W.loadVideos()` resolves). Mode gating reuses the catalogs' own rules: `sectionsFor(mode)`, `playOpen`, `GAMES[].modes`, `VIDEOS[].modes`; the Dojo and Sutras section lines are left out in Explorer (its menu hides them), while Tricks and Sutra cards stay listed with their Explorer titles, as the Explorer guide explains both and their pages open for it. `SYNONYMS` is one small table of plain words per entry id (about 40 lines: "squares" and "ending in 5" for `sq5`, "take away" and "minus" for `from9`, "leaderboard", "scores" and "race" for the Arena, "settings", "nickname", "color" and "reset" for Me, "videos" for Watch, "help" for the guide). Ranking: each query token must match (exact word, or a prefix of at least two letters) somewhere in the entry; a title word scores 10, a synonym 8, a description word 3; prefix matches score 70 percent; ties break by kind order (section, trick, skill, sutra, game, play, guide, grade, video) then shorter title; at most 8 per kind. Diacritics are stripped on both sides (`Ūrdhva` matches "urdhva"), so the Sanskrit names are findable in plain letters.
- Rejected: a prebuilt index file. One more file to stamp and precache, for 513 entries the page already holds.
- Rejected: fuzzy matching (edit distance). Hard to explain, slow to type against, and the synonym table covers the misspellings that matter ("sutra" / "sutras", "colour").

**5. One line per section, in one place.** `sectionLines()` in `js/find.js` is the single source: Find's browse list shows it, and `app.js` sets it as the `title` of each menu link at startup and on each Mode change. The lines carry no counts, so they never go stale.

**6. Analytics.** `math/try/start` when Try a trick is pressed; `math/find/go` when a result is followed (any kind, so the path says nothing about what was looked for). The query text, the result's name and the count of results are never sent; the `analytics` spec's "never carries" list gains the Find text.

## Fit with open changes

- `placement`: "Mode pick, then the Placement offer, then home" becomes "Mode settled (picked or guessed), then the offer on the first Home". For a visitor who tried a trick the offer comes after the trial, which is the order the Hook test in `docs/PLAN.md` wants (a magic moment before questions).
- `age-bands`: its grade question comes before the Mode picker with a Skip; Try a trick stays one tap after it. Nothing here reads a Grade answer.
- `learnvedicmath`: the landing page gets "Start playing" into `/play/`, whose first screen is this picker; `#/find` and the doors are hash routes inside the app and move with it. The menu tooltip strings live in `js/find.js`, not in `index.html`, so the new shell picks them up.

## Risks / Trade-offs

- A guessed Mode puts a 6-year-old who taps Try a trick into Challenger wording. Mitigation: the cards stay on the landing, the guess is named on Home with Change beside it, and Explorer's picture home is one tap away in Me. The `age-bands` grade question will later suggest the right card.
- One more menu pill on a 320 px phone. The nav already wraps under 1180 px (`site-header` spec); the `/` key and the landing link are the other ways in.
- The index holds 285 video titles; typing "the" matches many. Mitigation: the `the`, `a`, `and`, `of` tokens are dropped, and videos rank last with 8 per kind.

- A visitor who presses Try a trick and leaves the Star before answering has no Sparks yet, so the first-visit tour (unchanged `guide` spec) still opens on their first Home. One right answer (Sparks above 0) is enough to skip it.

## Migration

None. `modeGuess` is a new optional Player field; absent means not guessed. No stored data changes shape.
