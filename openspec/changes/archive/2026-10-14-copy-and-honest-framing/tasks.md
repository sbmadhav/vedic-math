# Tasks

Design note: no `design.md`; each item is a local copy, CSS or helper fix.

## 1. Game prompts (bug 11)

- [x] 1.1 In `math.css`, raise `.g-q` (`math.css:216`), `.g-q-sm` (`:481`) and `.g-say` (`:200`) to `.g-shell .g-q`, `.g-shell .g-q-sm`, `.g-shell .g-say`, with `color: var(--ink)`, so they beat `.md-card p`. Verify: Playwright spec in `e2e/tests/games.spec.ts` reads `getComputedStyle` for the Balloon pop prompt (`js/games.js:120`) and the Make ten and Multiple rain lines (`js/games.js:153`, `:333`): font size at least 24 px for `.g-q` and above 15 px for `.g-say`, color equal to the `--ink` token value, in light and dark schemes.

## 2. Copy fixes (bug 12)

- [x] 2.1 Greeting in `heroStats()` (`js/app.js:120`): "Welcome back," only when the Player has a day in `days` before today, else "Welcome," for Challenger and Pro ("Hello," for Explorer stays). Verify: Playwright spec in `e2e/tests/modes.spec.ts`: a fresh Challenger sees no "Welcome back"; after seeding yesterday's date in the Player's `days` it appears.
- [x] 2.2 Add `ordinal(n)` to `js/lib.js` and use it at `js/skills/middle.js:130`. Verify: node test for 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 101st, 111th; a sweep over 200 seeded draws of that skill finds no `\dth` after 1, 2 or 3 except 11th to 13th.
- [x] 2.3 Add `hundredGrid(n)` to `js/viz.js` (10 by 10, n shaded, labeled for screen readers) and use it for hundredths at `js/skills/middle.js:164`. Verify: node test that `hundredGrid(25)` has 25 shaded cells and `hundredGrid(4)` has 4; Playwright screenshot of `#/skill/4-decimals` with a seeded hundredths question in light and dark schemes.
- [x] 2.4 Make `videosFor()` (`js/app.js:239-245`) match whole words (word-boundary regex on the skill words and on resource tags and titles). Verify: node test (extract the matcher to a pure function) that "Discounts, tax and percent change" gets no Numberblocks link and "Count to 10" still does; Playwright check on `#/skill/7-pctchange`.

## 3. Honest framing

- [x] 3.1 Footer (`index.html:58`): "Speed tricks use sutras from Bharati Krishna Tirtha's 1965 book; lessons, problems and visuals are original." Replace "the Vedic sutras" at `js/app.js:102`, `:363` with "the sutras in Bharati Krishna Tirtha's 1965 book" or "the 16 sutras", and the titles at `js/app.js:510`, `:584` with "The sutras". Verify: `e2e/tests/privacy.spec.ts` footer test (`e2e/tests/privacy.spec.ts:48`) extended to assert the 1965 book wording; titles checked in `e2e/tests/routes.spec.ts`.
- [x] 3.2 Add a node copy scan `test/copy.test.mjs` over `index.html`, `manifest.webmanifest` and string literals in `js/**/*.js` that fails on "Vedic sutras", "traditional Vedic mathematics", "from the Vedas" (allow-list the history sentence that says the sutras are not in the Vedas) and on any em dash. Verify: fails on today's code, passes after 3.1.

## 4. Layout shift

- [x] 4.1 Add `#view { min-height: 100svh; }` next to `math.css:518`. Verify: Playwright spec in `e2e/tests/load.spec.ts` on the mobile project records `layout-shift` entries with a `PerformanceObserver` added by `page.addInitScript`, loads home on a fresh context, and asserts the sum without recent input is below 0.1; record the before and after numbers in the PR.

## 5. Release check

- [x] 5.1 Node and e2e suites pass against `_site`, then live. Verify: CI and post-deploy E2E green; Lighthouse mobile on the live home page shows CLS under 0.1.
