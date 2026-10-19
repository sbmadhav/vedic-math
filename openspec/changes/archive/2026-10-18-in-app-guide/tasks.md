# Tasks

Prerequisites: `game-shell-and-calm` is merged (Calm, text size, `fx.noMotion()`); `sky-home` is merged (the Sky, All places, `#/tiles`). Independent of `hook-first-star`.

## 1. Guide data

- [x] 1.1 `js/guide.js`: correct every section against the code (design decision 9); add Stars, the Sky, and Calm and text size; `modes` per section and `sectionsFor(mode, n)`; counts only from `n`. Verify: new `test/guide.test.mjs`: every route regex in `js/app.js` is matched by some section's `covers`; every Try it `href` (each Mode's) matches a route and names a real skill, trick, game, sutra, grade, chapter or challenge; section ids are unique; every section has what, how (at least two steps), tip and an `art` that `js/guide-art.js` draws; Explorer gets no `stars` or `sky` section; `say()` falls back to Challenger; `test/copy.test.mjs` passes (no XP, no em dashes, no "Vedic sutras").
- [x] 1.2 Tour data: `TOUR_STEPS` with per-target options, `resolveStep()`, `tourDue()`, `tourState()` and `setTourState()` (`vm.tour`, try/catch). Verify: `test/guide.test.mjs`: at most six steps, each with an option for the Explorer, tile and Sky homes where they differ; `resolveStep` picks the first present option and drops a step with none; `tourDue` is true only on Home with a mode, no state and a fresh Player; state round-trips through a stub `localStorage` and survives a throwing one.

## 2. The guide page

- [x] 2.1 `js/guide-art.js`: one small SVG per `art` key on `gd-art-*` classes; `math.css` colors them with tokens in both schemes. Verify: `test/guide.test.mjs`: no raw hex or `rgb(` in `js/guide-art.js`, every SVG has `aria-hidden="true"`.
- [x] 2.2 `guideView()` in `js/app.js`, routes `#/guide` and `#/guide/<section>`, open without a mode, section focus, Take the tour, the parent note in the privacy section. Verify: new Playwright `e2e/tests/guide.spec.ts`: a Challenger sees every group and section with what, how, tip and art; an Explorer sees no Stars or Sky section and Explorer wording; `#/guide/arena` focuses the Arena heading; with no mode `#/guide` shows the guide; a Try it link (Katas) opens `#/katas/from9`; zero console errors.
- [x] 2.3 Entry points: menu bar Guide link (`index.html`), footer link, the "New here?" line on Home, the mode picker link. Verify: `guide.spec.ts`: the Guide link is visible in each Mode and is `aria-current="true"` on the guide; the footer link opens the guide; a Player with no earlier day sees the Home note, a Player who played yesterday does not.

## 3. The tour

- [x] 3.1 `js/tour.js` `startTour()`: modal dialog, spotlight ring and card, Back, Next or Done, Skip tour, Escape, focus on each step's title, placement within a 16px gutter, re-placed on resize and scroll, no motion under `fx.noMotion()`, everything on a child of the view signal. Verify: `test/lifecycle-scan.test.mjs` covers `js/tour.js`; `math.css` motion twins pass `test/shell.test.mjs`.
- [x] 3.2 Home starts it when due and on replay; `vm.tour` set when it opens; outcome written on finish or skip. Verify: `guide.spec.ts` (fixture option `tourSeen: false`): a first mode pick shows the tour with "1 of N"; Next through to Done closes it and `vm.tour` is `done`; a reload shows no tour; Escape on step 2 closes it, focus returns to the page and `vm.tour` is `skipped`; a Player with Sparks gets no tour; Take the tour in the guide opens Home with the tour; on the mobile project the Guide step's target and the whole card are inside the viewport; with `vm.calm = '1'` `document.getAnimations()` is empty while it is open.
- [x] 3.3 Accessibility. Verify: `e2e/tests/a11y.spec.ts` adds `#/guide` to its routes (both schemes) and checks Home with the tour open.

## 4. Analytics, docs and privacy

- [x] 4.1 `js/metrics.js`: route views `guide` and `guide/section`, `tourEvent()`. Verify: `test/metrics.test.mjs`: the route paths and the three tour events; the call-site scan passes; `guide.spec.ts` checks the tour start and skip events through a recorded `siteTrack`.
- [x] 4.2 `GLOSSARY.md`: **Guide** and **Tour**. Verify: reviewer reads the diff.
- [x] 4.3 Nothing new is sent to World boards; `vm.tour` stays on the device. Verify: `guide.spec.ts` asserts no Firestore write after the tour; record in the PR that `parentNote()` and `cloud/README.md` need no change.

## 5. Release check

- [x] 5.1 Build, node tests and the touched Playwright specs pass against the local server; a manual pass in Chromium at 390px and desktop, light and dark, all three Modes, with no console errors. After deploy the live E2E run is green; then archive the change. (Done: merged in #37 on 2026-10-17 after the local passes noted in that PR; the daily E2E run of 2026-10-17 10:57 UTC was green. Archived in this PR.)
