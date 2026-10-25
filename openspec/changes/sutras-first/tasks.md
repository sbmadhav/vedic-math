# Tasks

The owner asked for this on 2026-10-21 ("It is important to make the sutras and the new method the focus of the app") and for no confirmations, which counts as approval to implement. It ships in three stacked pull requests: `sutras-first` (tags and links), `sutras-first-2` (progress per Sutra and the menu), `sutras-first-3` (Home and the landing page). Unit tests run with `pnpm test`; Playwright runs against the local server (`python3 build.py && node e2e/local-server.mjs 8360 _site`, `BASE_URL=http://localhost:8360`).

## 1. The Sutra map and the tag (PR 1)

- [x] 1.1 `js/sutras.js`: an Explorer meaning (`kid`) for each of the 29 Sutras and sub-sutras. Verify: `test/sutra-tag.test.mjs` (every card has one, short, no em dash).
- [x] 1.2 `js/sutra-tag.js`: `RELATION` for the 21 Tricks (design, "The Sutra map"), the Mode wording, the Pro notes, `tagFor(trick)`, `tagHTML(id, opts)` in three sizes, the Arena helpers. Verify: `test/sutra-tag.test.mjs`: every Trick mapped once, listed in its card's Tricks, the five honest relations, names and meanings from the cards, link names, no em dash.
- [x] 1.3 `js/mental.js`: each Pro question names the Sutra that answers it (`sutra`), from its own numbers; `js/arena.js` carries it on items and returns the answered list. Verify: `test/mental.test.mjs` (near-base, ten-pairs, squares by kind, none for percent and divide; the daily set unchanged), `test/arena.test.mjs`.

## 2. Tags where methods are taught (PR 1)

- [x] 2.1 Trick page: the `full` tag replaces the Sutra block, keeping Say it and the Respelling. Verify: `e2e/tests/sutras-first.spec.ts`.
- [x] 2.2 Dojo cells, the Katas list and each Kata (heading and result). Verify: `e2e/tests/sutras-first.spec.ts`, `e2e/tests/dojo.spec.ts`.
- [x] 2.3 Star round: the header tag (text), the end screen (a link), the replay names the Sutra; Try a trick's card (`js/try.js`, after `try-trick-in-modes` merged in) carries the `full` tag as a link with its own meaning line. Verify: `e2e/tests/sutras-first.spec.ts`, `e2e/tests/cov/sutra-tags-3.spec.ts`, `test/sutra-tag.test.mjs`, `test/lifecycle-scan.test.mjs`.
- [x] 2.4 Arena result: "Sutras in this round" for daily and Practice rounds. Verify: `e2e/tests/sutras-first.spec.ts`.
- [x] 2.5 Watch cards and the player; the Answer checker's page and card. Verify: `e2e/tests/sutras-first.spec.ts`, `e2e/tests/watch.spec.ts`.
- [x] 2.6 CSS with tokens only, wrapping at 320 px. Verify: axe and no sideways scroll at 320 px in Daybreak and Deep Space (`e2e/tests/sutras-first.spec.ts`).

## 3. Links to the Deep dive (PR 1)

- [x] 3.1 Closing a Deep dive opened from another page of the app goes back to it. Verify: `e2e/tests/sutras-first.spec.ts`; `e2e/tests/sutra-modal.spec.ts` and `routes.spec.ts` unchanged.
- [x] 3.2 `#/sutras/<id>` opens without a Mode. Verify: `e2e/tests/sutras-first.spec.ts`.
- [x] 3.3 `math/sutra_tag/<surface>` on following a tag. Verify: `e2e/tests/sutras-first.spec.ts` (the event, no Sutra id, nothing else).
- [x] 3.4 Coverage specs: `e2e/tests/cov/sutra-tags-1.spec.ts` to `-6`, `sutra-deep-dive-3.spec.ts`, `analytics-14.spec.ts` (12 is `install-app`; `try-trick-in-modes` has 13); `sutra-pronunciation-1.spec.ts` and `say.spec.ts` read the Trick page's tag (the modified "Trick page with a bracketed Sutra" scenario).

## 4. Progress per Sutra (PR 2)

- [x] 4.1 `js/sutra-progress.js`: pure progress per card and its line by Mode. Verify: `test/sutra-progress.test.mjs` (counts, no writes, the no-trick line, Explorer without Stars).
- [x] 4.2 Sutras page: progress line and meter on each card face, Explorer meanings and lede, the card grids before the history cards. Verify: `e2e/tests/sutras-progress.spec.ts`.
- [x] 4.3 Deep dive "Try it yourself": each Trick's Stars lit or practiced. Verify: `e2e/tests/sutras-first.spec.ts`.
- [x] 4.4 Coverage specs: `e2e/tests/cov/sutra-progress-1.spec.ts`, `-2.spec.ts`.

## 5. Sutras first in the menu (PR 2)

- [x] 5.1 `play/index.html`: Sutras after Home, shown in Explorer; `js/find.js` `sectionLines()` in the same order with an Explorer line. Verify: `e2e/tests/header.spec.ts`, `test/find.test.mjs`.
- [x] 5.2 `js/gamify.js`: Sutra scholar in every Mode; the Explorer Dojo's Sutras button. Verify: `test/gamify.test.mjs`, `e2e/tests/dojo.spec.ts`, the badges and star-round cov specs that change with them.
- [x] 5.3 `learnvedicmath`'s header requirement lists the new nav order. Verify: `openspec validate learnvedicmath --strict`.
- [x] 5.4 Coverage specs: `e2e/tests/cov/site-header-5.spec.ts`; the updated `badges-6-explorer` and `star-round-16-explorer`.

## 6. Home leads with the Sutras (PR 3)

- [x] 6.1 Challenger and Pro: the Sutra door first, the Arena and the Skill map doors, "Your sutras", then the Player strip; new headings. Verify: `e2e/tests/sutras-first.spec.ts` ("Home"), `first-visit.spec.ts` and `cov/first-visit-1.spec.ts` updated where the doors changed; the heading strings in `modes`, `landing`, `celebrations`, `load`, `routes`, `sky`, `try-trick`, `cov/first-visit-3`, `cov/landing-pages-2/3/5`, `cov/quests-2`, `cov/sky-1`.
- [x] 6.2 Explorer: "A sutra to say" above the tiles. Verify: `e2e/tests/sutras-first.spec.ts` (one Sutra a day under a faked clock, Say it, the Deep dive, the home tag event), the Explorer test in `cov/first-visit-1.spec.ts` (the changed "Explorer" scenario lives there, not in `first-visit-2`).
- [x] 6.3 Home fits a phone: Play this Star on screen at 390 by 844; no sideways scroll at 320 px. Verify: `cov/first-visit-2.spec.ts` (Home fits a phone), `sutras-first.spec.ts` (Challenger and Pro at 390 by 844; 320 px in both schemes with axe on the Sutra cards).
- [x] 6.4 Coverage specs: `e2e/tests/cov/sutra-progress-3.spec.ts`, `first-visit-5.spec.ts` (`-4` is taken by `try-trick-in-modes`).

## 7. The landing page leads with the Sutras (PR 3)

- [x] 7.1 `site/index.html`, `theme/site.css`: the hero headline, "One short rule, one line of work" with both ways and three Sutra cards linking to their Deep dives, the honest origin line. Verify: `e2e/tests/landing.spec.ts` ("the sutras and the method", JavaScript off, welcome back), `hero.spec.ts`, `test/copy.test.mjs` (no Vedic-source claim; the 1965 credit).
- [x] 7.2 Coverage specs: `e2e/tests/cov/landing-pages-8.spec.ts`; `landing-pages-6`, `-7` and `hosting-1` updated for the new hero and order.

## 8. Docs and after release

- [x] 8.0 The first-load budget: `docs/perf/baseline.json` grows by the new modules; each pull request re-measures after its last edit. Verify: `python3 build.py --voice off` passes.
  PR 1: +4,881 bytes Brotli, `js/sutra-tag.js` and the tags in `js/app.js`, `js/star.js`, `math.css`; 767,625 bytes once `try-trick-in-modes` (#128, with main's #130) is merged in, with the tag on its Try a trick card.
  PR 2: +1,634 bytes, `js/sutra-progress.js`, the card meters and the Guide's menu line; 769,259 bytes.
  PR 3: +1,063 bytes, the Sutra door, "Your sutras" and Explorer's card in `js/app.js` (+908) and `math.css` (+147), with the stamped `sw.js` and page; 770,322 bytes, measured on the build with parts 1 and 2 at their reviewed tips.

- [x] 8.1 `GLOSSARY.md`: Sutra tag, Sutra way, Sutra progress; Sutra and Home entries. Verify: `openspec validate sutras-first --strict`.
- [ ] 8.2 After release: archive this change after `learnvedicmath` and `landing-modes-and-return` (their `landing-pages` and header requirements come first).
