# Tasks

Approved by the owner's request of 2026-10-21 ("add ability to install the app as a pwa. Have an installation wizard and proactively nudge users to install when in the home page", with "build everything, no questions"). Decisions in `design.md`.

## 1. The manifest and the page

- [x] 1.1 `manifest.webmanifest` as in D1: any and maskable icons at 192 and 512, `lang`, `dir`, `launch_handler`, narrow and wide screenshots, the Arena, Practice and Sutras shortcuts. Verify: `test/install.test.mjs` (fields, the Daybreak `--bg` token, screenshot sizes read from the PNG headers, shortcuts in scope); `e2e/tests/load.spec.ts` (served icons and screenshots, shortcuts, `launch_handler`; Chromium's `Page.getInstallabilityErrors` empty and `Page.getAppManifest` errors empty).
- [x] 1.2 `icons/maskable-192.png` from `tools/brand/render.mjs` (the other icons render byte-identical). Verify: `test/brand.test.mjs` sizes; `test/build.test.mjs` precaches it with its hash.
- [x] 1.3 `screenshots/home-narrow.png`, `star-narrow.png`, `home-wide.png` from `e2e/screenshots.mjs` against a local build. Verify: `test/install.test.mjs` sizes; `test/build.test.mjs` never precaches `/screenshots/`.
- [x] 1.4 `play/index.html`: the iPhone and iPad meta tags; `theme-color` before the pre-paint script, which sets the Deep Space `--bg` when that scheme is in effect. Verify: `load.spec.ts`; `cov/install-app-3.spec.ts` "The bar follows the scheme"; `test/install.test.mjs` (both colors are the vendored tokens).

## 2. The Installed app

- [x] 2.1 `isInstalled()` and `appHere()` (D5); links outside `/play/` get `target="_blank"` in the Installed app; the brand goes to `#/` (D3). Verify: `test/install.test.mjs`; `install.spec.ts` "the Installed app" (display mode and `navigator.standalone`, the For grown-ups link opens a new page, the Guide link stays) and "in the browser"; `cov/install-app-4.spec.ts`.

## 3. The Install guide

- [x] 3.1 `platformOf()` for every kind in D8. Verify: `test/install.test.mjs` with 20 user agents, including iPadOS asking for desktop pages.
- [x] 3.2 The dialog (D8): why in the Mode's words, Install now with the browser's prompt, the steps with pictures, the iOS storage note, Copy the link in a web view, the picker, the status line; focus, Escape and return. Verify: `install.spec.ts` "the Install guide" (every kind's steps, one tap, the picker, focus kept inside, 320 px in both schemes); `a11y.spec.ts` "install" (both schemes); `cov/install-app-5.spec.ts`, `cov/install-app-6.spec.ts`, `cov/install-app-7.spec.ts`, `cov/install-app-8.spec.ts`.
- [x] 3.3 Entry points: the Me page card, the footer's Install the app, the Guide's Offline section action (`guide.js`, `test/guide.test.mjs` allows `install`). Verify: `install.spec.ts` "opens from the Me page, the footer and the Guide".

## 4. The Install nudge

- [x] 4.1 `nudgeDue()`, `pressLater()`, `markInstalled()`, `markNotInstalled()` (D4 to D6). Verify: `test/install.test.mjs` (every condition; three "Not now"s over three weeks; a new prompt after an install).
- [x] 4.2 One slot on the tile home and on the Sky; Install (one tap) or Show me how; Not now with focus to Home's heading; Explorer and Pro words; still under Calm and Pause motion. Verify: `install.spec.ts` "the Install nudge", "the nudge on iPhone and iPad Safari", "Calm and Pause motion"; `cov/install-app-9.spec.ts`, `cov/install-app-10.spec.ts`, `cov/install-app-11.spec.ts`, `cov/install-app-12.spec.ts`.
- [x] 4.3 The Prompt slot (`js/prompt-slot.js`, D7); the tour claims it on Home. Verify: `test/install.test.mjs`; `install.spec.ts` "one prompt at a time"; `cov/install-app-13.spec.ts` (a toast, another prompt, the tour).
- [x] 4.4 Lifecycle: every listener and timer through `life.js`. Verify: `test/lifecycle-scan.test.mjs` "installing the app".

## 5. Counts and offline

- [x] 5.1 `metrics.install()` (D10). Verify: `test/metrics.test.mjs` (fixed words, the entry points, the call-site scan); `install.spec.ts` with the analytics stub; `cov/analytics-12.spec.ts`.
- [x] 5.2 Offline from the home screen (D11). Verify: `offline.spec.ts` "the installed app's start_url and shortcuts open offline after one visit" (chromium, mobile); `cov/install-app-14.spec.ts`.
- [x] 5.3 First-load baseline (D12): `docs/perf/baseline.json` records the growth and why.

## 6. Docs

- [x] 6.1 `GLOSSARY.md`: Installed app, Install guide, Install nudge, Prompt slot. `docs/agent/offline.md`: the manifest line, the screenshots, the Installed app's links.

## 7. Owner checks (after deploy)

- [ ] 7.1 **[OWNER]** iPhone (Safari): on a second day of play, Home shows the nudge; Show me how, then Share, Add to Home Screen, Add; the app opens full screen at Home with the Nikhilam Family icon and the name Vedic Math; turn on airplane mode and open it again; For grown-ups opens Safari. Also try the guide from Instagram's or Gmail's browser.
- [ ] 7.2 **[OWNER]** Android (Chrome): on a second day, the nudge's Install shows Chrome's install sheet with the screenshots; the app opens at Home; long-press the icon for the Arena, Practice and Sutras shortcuts; offline open; Not now hides the nudge for a week.
- [ ] 7.3 **[OWNER]** Remove any old "Madhav" (root sbmadhav.com) or sbmadhav.com Vedic Math app from home screens and docks, and install Learn Vedic Math from `https://learnvedicmath.com/play/`.
- [ ] 7.4 **[OWNER]** A Chromebook or a computer with Chrome or Edge: the address bar install icon and the guide's Install now; Mac Safari: File, Add to Dock.

## 8. Archive

- [x] 8.1 After release and the owner checks: archive (`install-app` becomes a spec; `analytics` gains "Install counts"); the cov specs are already in `e2e/tests/cov/`.
  - Done 2026-10-31 (`archive-sweep`): archived with the release live; `e2e/tests/cov/install-app-1` to `-14` and `analytics-12`. The owner checks 7.1 to 7.4 stay open.
