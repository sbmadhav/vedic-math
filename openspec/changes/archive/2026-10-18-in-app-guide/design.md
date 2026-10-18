# Design

## Context

- Routes are a list of `[regex, view]` pairs in `js/app.js`; each view gets `{ signal }` from the router (`view-lifecycle`). The mode picker replaces every route except `#/watch` and `#/sutras` while the Player has no mode.
- The menu bar (`index.html`, `.mq-nav`) lists Home, Learn, Dojo, Arena, Games, Sutras and Watch; Dojo and Sutras are hidden in Explorer (`.hide-explorer`). It scrolls sideways under 700px. The music button (`#vmMBtn`, `js/ambient.js`) and the Player chip (`#mqChip`, the avatar and the bar to the next Title) sit at its right end.
- Home is the tile home of the Mode (Explorer tiles; Challenger Dojo card and Daily quests; Pro board and Daily quests) or, for a Challenger or Pro Player who turned it on, the Sky (`skyHome()`). Both start with `.me-strip`.
- Device preferences are `localStorage` keys `vm.<name>` (`vm.sound`, `vm.calm`, `vm.text`), read and written inside try/catch.
- `js/guide.js` (draft) holds groups, sections and tour steps as data with `w(explorer, challenger, pro)` wording, and `say(v, mode)`.

## Goals / Non-Goals

**Goals:**
- One place that explains every feature that exists, in the words of the Player's Mode.
- Every claim in the guide is true of the code, and tests catch the parts that can drift (routes, links, counts).
- A short tour that points at the real screen, can always be skipped, and never comes back uninvited.

**Non-Goals:**
- Changing features; per-Player tour state; screenshots.

## Decisions

**1. Data in `js/guide.js`, drawing in `js/app.js`, pictures in `js/guide-art.js`, the tour in `js/tour.js`.** The data module stays free of DOM so node tests can import it. `guideView()` lives in `app.js` because it reuses `crumbs()`, `icon()` and `parentNote()`. The illustrations are SVG strings on CSS classes (`gd-art-*`) whose fills and strokes are tokens in `math.css`, so they follow Daybreak and Deep Space with no raw colors.

**2. Sections cover routes.** Each section lists sample routes in `covers`. `test/guide.test.mjs` reads the route regexes from `js/app.js` and fails when a route is matched by no section's `covers`, so a new route needs a guide section (or an entry in an existing one). Try it links must match a route and name a real catalog id (skill, trick, game, sutra, grade, tower chapter, challenge), so a link never falls back to Home.

**3. Wording per Mode.** `say(v, mode)` resolves a string or `w(...)`; no mode reads as Challenger. A section may list `modes`; `sectionsFor(mode, n)` leaves out the others (Stars and the Sky for Explorer, since `starsHTML()` and `skyOn()` exclude Explorer). Counts (skills, tricks, Katas, games, Levels, challenges, sutras, badges) come from the catalogs at render time through `n`, never typed into copy.

**4. Routes.** `#/guide` and `#/guide/<section id>`. With a section, the page scrolls to it and focuses its heading (the router already leaves focus alone when the view put it inside itself). An unknown section id shows the top of the page. The guide is added to the mode picker's exceptions so a grown-up can read it before a mode is chosen; the page then says to pick a mode first and links to it.

**5. Where it is reached.**
- A Guide link in the menu bar after Watch, for every Mode (`data-match="^#/guide"` so it shows as current).
- "How to use this app" in the footer, next to Reset play mode.
- On Home (tile home and Sky), a one-line "New here?" note linking to the guide and the tour, while `store.playedBefore()` is false.
- On the mode picker, "Not sure where to start? See how it works" linking to the guide.

**6. Tour state is one device preference, `vm.tour`** (`'shown'` while open, then `'done'` or `'skipped'`; absent means never shown). It is set to `'shown'` as soon as the tour opens, so a tour cut short by leaving Home is never shown again; finishing or skipping overwrites it with the outcome. `tourDue({ mode, state, hash, fresh })` is true only on Home (`#/` or empty), with a mode, with no state, for a Player with no Sparks yet (`fresh`), so Players who were already playing before this ships are not interrupted; they find the tour in the guide. Rejected: per Player (`store.markSeen`). A family's second Player would get the same tour about the same screen again; and the tour describes the device's screen, not a Player's progress.

**7. The tour is a modal `<dialog>`.** `startTour(steps, { signal, mode, onEnd })` opens one `<dialog class="vm-tour">` with `showModal()`: focus stays inside, the rest of the page is inert, and the dialog's `cancel` (Escape) skips. Inside it, a spotlight ring is placed over the target's rectangle (its large outer shadow dims the rest), and a card holds the step count ("2 of 5"), the title, the text, Back, Next (Done on the last step) and Skip tour. Each step: the target is scrolled into view (`block: 'center', inline: 'nearest'`, which also scrolls the menu bar sideways on a phone), the ring and card are placed, and focus moves to the card's heading so screen readers read it (`aria-labelledby` and `aria-describedby` on the dialog). The card sits below the target when it fits, else above, else at the bottom; it is clamped to a 16px gutter and scrolls inside itself, so it works at 390px and at 200% zoom. Resize and scroll re-place it. Every listener uses `life.on` with a child of the view signal, and leaving Home closes it.
- Steps are resolved when the tour starts: each step has options `{ sel, title, body }` and the first whose element is rendered and has a size wins (`resolveStep`); a step with none is dropped, so the step count is always right. Rejected: a non-modal popover. It leaves the page clickable behind the coach mark, and focus order between the page and the card gets confusing for keyboard users.
- Motion: the ring and card glide between steps only when `fx.noMotion()` is false; `math.css` repeats the no-transition rule for reduced motion, `html.motion-paused` and `body.calm` (the existing twin test).

**8. Analytics.** `metrics.js` gains route views `guide` and `guide/section` (the section id is not sent), and `tourEvent(kind)` for `start`, `finish` and `skip` (`math/tour/<kind>`). No other event; the Try it links are counted by the route views of the places they open.

**9. Copy corrections in the draft** (each checked against the code):
- XP becomes Sparks and Titles (ADR 0003): first-try answers earn 10 plus a streak bonus of up to 5, others 5; quests 25 Sparks; Sutra cards 5 Sparks once; a trick watched to its last step 5 Sparks once. Videos earn no Sparks.
- The nav chip shows the avatar and the bar to the next Title (no level number).
- Belts are earned by lighting all 9 Stars of a belt's three Tricks, not by mastering the Tricks.
- Katas are done or not done (60% right), with a par time; no stars. Game Levels and tower challenges earn bronze, silver or gold Medals.
- Watch filters are Mode, Skill area, Tricks, Length and Videos or Shorts (Links for Pro); every video plays in the page; sites open in a new tab for Pro only.
- The Arena has three round types (Daily challenge, Practice round, Practice with no clock) and three boards (Today, This week, Most Sparks this week).
- World boards need the Age answer, and the Parent step for under-13s; the guide says so without numbers that could drift.
- Reading aloud: the claim that nothing heard is sent anywhere is dropped (browser voices may be online voices).

## Risks / Trade-offs

- [The guide drifts as features change] → the route coverage and link tests fail on new routes and broken links; counts come from catalogs; the copy tests (no XP, no em dashes, sutra framing) scan `js/guide.js` like any module.
- [A tour on first visit annoys] → at most six steps, Skip on every step and Escape, never shown twice on a device, only for a Player with no Sparks.
- [Existing end-to-end tests open Home for a fresh Player and would meet the tour] → the fixture marks the tour seen by default (`tourSeen` option); the guide spec turns it off.

## Migration Plan

No stored data changes. `vm.tour` is new and absent on every device; returning Players with Sparks never get the tour automatically. Rollback: revert; `vm.tour` is ignored.

## Files touched

- New: `js/guide-art.js`, `js/tour.js`, `test/guide.test.mjs`, `e2e/tests/guide.spec.ts`
- `js/guide.js`, `js/app.js`, `js/metrics.js`, `index.html`, `math.css`, `test/lifecycle-scan.test.mjs`, `test/metrics.test.mjs`, `e2e/tests/fixtures.ts`, `e2e/tests/a11y.spec.ts`, `GLOSSARY.md` (Guide, Tour)
