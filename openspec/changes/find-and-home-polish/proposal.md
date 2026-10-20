# Proposal

> **Awaiting owner approval.** This change is proposed and implemented together in one pull request so the owner can review the plan and the code at once. Nothing here is live until the owner approves and merges it.

## Why

A live first-visit audit on 2026-10-20 (https://sbmadhav.com/vedic-math/, 390 by 844, fresh visitor, no saved state) found friction left after `first-visit-clarity` (numbers in `design.md`):

- **Find needs every word to match.** "multiply big numbers" lists 2 videos and misses the Trick "Multiply any two numbers in one line"; "how does it work" lists nothing; "what is vedic math" lists one guide section; "for kids" lists Khan Academy Kids videos and not Explorer Mode, the part of the app made for 4 to 7 year olds; "games" lists no game.
- **Home pushes its one primary action to the fold on a phone.** After Try a trick, "Play this Star" starts at y 817 of an 844 px screen: the header takes 3 rows (147 px), the Player strip 181 px, a two-link "New here?" note two lines, and a Keep going card that offers the same Trick as the Star door below it. The background drawing shows through the "New here?" box, its captions crossing the words.
- **A "Badge earned" toast sits on the Star's number pad.** After the first right answer it sits at y 772 to 824, against a pad that ends at 773, and two stacked toasts cover the bottom row of keys.

## What Changes

- **Find ranks by share of words matched.** Question and size words (how, does, is, what, for, big, work and others) are dropped; an entry is listed when every remaining word matches it, or at least half do with one of them in its title, synonyms or kind words; more words matched ranks higher, within a kind and between kinds.
- **Find answers questions first.** Known questions and phrases ("how does it work", "help", "what is vedic math", "for kids", "my child", "for adults") list their answers first under "Best match": the Guide and Getting around, the Sutras and their guide section, Explorer Mode or Pro Mode and the Play modes section.
- **Find knows the Modes and more plain words.** Explorer, Challenger and Pro join the index as "Play modes" entries (opening Me, where a Mode is picked); kind words ("games", "tricks", "videos") list that kind; "multiply", "multiplication", "times", "divide" and similar plain words are added to the Tricks they describe.
- **Home fits a phone.** On screens up to 600 px the Player strip is compact (one row, numbers on one short line), the header rows are packed tighter, the "New here?" note is one control, "Quick tour", and has a solid background, and the background drawing is fainter. Challenger Home leaves out Keep going when it offers the Trick of the Star its first door offers.
- **Toasts keep the primary action clear.** While a round's number pad or answer choices are on screen, toasts show at the top; elsewhere they move to the top when a primary button is in the bottom band they would cover.

Out of scope:

- The `hook-first-star` change being built in parallel: Try a trick's teaching and the Star door's Star and belt wording on Home are untouched here.
- A two-row header at 390 px. It does not fit without dropping a required control or shrinking the menu below a readable size (see design, "Header"); this change packs the three rows tighter instead.
- The guide's and the tour's own words (they are recorded studio voice lines); no spoken line changes, so no re-record is needed.
- Any server, index file or query logging: Find stays in the page, and the typed text never leaves the device.

Modes and Players affected: every Player who uses Find (all Modes). Challenger and Pro Players on phones see the compact strip and the tighter header; new Challenger Players no longer see a Keep going card that repeats the Star door; every Player sees the one-control "New here?" note while it shows, and toasts that keep clear of the pad in Star and Arena rounds. Explorer Home keeps its tiles and its Keep going card.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `find`: the index holds the Play modes; plain and kind words; ranking by share of words matched; Best match for questions.
- `first-visit`: Home on a phone (compact strip, primary action in the first screen), Keep going does not repeat the first door.
- `guide`: the "New here?" note is one Quick tour control.
- `site-header`: tighter rows under 600 px.
- `page-layout`: toasts keep the primary action clear.

## Impact

- `js/find.js` (pure): `STOP`, `INTENTS`, `KIND_WORDS`, `MODE_LINES`, `intentsOf()`, `share()`, `listed()`, the `top` and `mode` kinds, new synonyms; `rank()` by share.
- `js/app.js`: `keepGoingSkill()`, `newHereHTML()`, Find's hint line and the Best match group's class.
- `js/fx.js`: `toastSide()`, `PADS`, `PRIMARY`, placement of the toast box.
- `math.css`: the compact Player strip, the header spacing under 600 px, the solid "New here?" box, the fainter background on phones, the top toast position, the Best match border.
- Tests: `test/find.test.mjs`, new `test/toast.test.mjs`; Playwright `e2e/tests/find.spec.ts`, `first-visit.spec.ts`, `guide.spec.ts`, `header.spec.ts`, `arena.spec.ts` (the toast pin); coverage specs `e2e/tests/cov/find-2.spec.ts`, `first-visit-2.spec.ts`, `guide-5.spec.ts`, `site-header-4.spec.ts`, `page-layout-3.spec.ts`.
- Nothing new is sent or kept: no new analytics event (Find still sends only `math/find/go`), no storage key. `parentNote()` and `cloud/README.md` do not change.
- No spoken line changes: no studio voice re-record.
