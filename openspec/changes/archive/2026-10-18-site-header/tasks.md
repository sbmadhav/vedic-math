# Tasks

## 1. Header

- [x] 1.1 `index.html`: one bar in the home page's order (brand, `nav.mq-nav`, Explore, `#themeBtn`, `#mqMusic`, `#mqChip`); the home page's sun and moon button with token colors; the inline script switches schemes like the home page, saves `theme`, keeps `meta[name=theme-color]` on `--bg` and records `vedic-math/theme/<scheme>`. Verify: `e2e/tests/header.spec.ts` "color scheme button" tests (switch, sun or moon, reload, matching the system clears the choice, a `theme` saved elsewhere on the site applies).
- [x] 1.2 `math.css`: the home page's bar, pill links with a filled current link, the round scheme button, the second nav row below 1180px, phone sizes under 600 and 420px, reduced motion, Pause motion and Calm twins. Verify: `node --test 'test/**/*.test.{js,mjs}'` (motion twin check); `header.spec.ts` "one sticky row" at 1280px and "no sideways scroll" at 320, 375 and 768px in both schemes.
- [x] 1.3 `js/ambient.js`: the music button as the home page's pill ("Music", equalizer), same ids and panel. Verify: `header.spec.ts` "the music button opens the music panel".
- [x] 1.4 `js/guide.js`: the nav tour step points at `.mq-nav`. Verify: `e2e/tests/guide.spec.ts`, `test/guide.test.mjs`.

## 2. Tests

- [x] 2.1 `e2e/tests/header.spec.ts` (new): same parts, order and measured look as the live home page header (chromium); Explore opens the menu; the color scheme button works and persists; the nav highlights the current route; no sideways scroll and every tab on screen at 320, 375 and 768px in both schemes. Verify: `cd e2e && BASE_URL=http://localhost:8126 npx playwright test tests/header.spec.ts --project=chromium --project=webkit --project=mobile` against `node e2e/local-server.mjs 8126`.
- [x] 2.2 `e2e/tests/load.spec.ts` and `e2e/tests/csp.spec.ts` use `#themeBtn` instead of the `.md-modes` picker. Verify: `load.spec.ts` on chromium and webkit; `csp.spec.ts` against the built site (`python3 build.py --out /tmp/sh-site`, `node e2e/local-server.mjs 8127 /tmp/sh-site`).
- [x] 2.3 `e2e/tests/a11y.spec.ts`: axe on the header alone at 1280 and 320px, both schemes, with the music panel closed and open. Verify: `npx playwright test tests/a11y.spec.ts --project=chromium`.
- [x] 2.4 The rest of the suite still passes. Verify: `E2E_SKIP_COV=1 BASE_URL=http://localhost:8126 npx playwright test --project=chromium --project=webkit`.

## 3. Release

- [x] 3.1 Owner review of the before and after screenshots in the PR, and of the shared-file notes (design system picker vs round button, `md-wrap` width). (The owner merged #42 with its screenshots on 2026-10-17; the header spec was updated for the v2.1 home header in #57.)
- [x] 3.2 After the deploy, the daily E2E run passes against https://sbmadhav.com/vedic-math/. Then archive this change. (Done: the live E2E run after the merge (2be3176, 2026-10-17 23:52 UTC) was green. Archived in this PR.)

## Follow-up (owner, 2026-10-17)

- [x] Hide the Vedic Math tabs until the Player picks a Mode (before that every route shows the mode picker, so tabs did nothing when clicked). `math.css`: `.mode-none .mq-nav { display: none; }`. Verify: `e2e/tests/header.spec.ts` "tabs wait for a Mode" (no tabs before the pick; Learn works after) and `e2e/tests/load.spec.ts` first visit (tabs present but hidden).
