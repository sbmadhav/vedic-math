# Proposal

## Why

The owner asked on 2026-10-21: "add ability to install the app as a pwa. Have an installation wizard and proactively nudge users to install when in the home page." The same message said to build everything and move fast with no questions or confirmations, so that request is the approval to implement this change; the decisions it leaves open are made from the repo's plans and recorded in `design.md`.

Today the game is installable but nothing tells a Player so. The manifest (learnvedicmath change, D7) has the basics; there is no screenshot, shortcut, maskable 192 icon or iOS meta tag, the only hint is one line in the Guide's Offline section, Chrome's own mini bar is the only prompt on Android, and Safari on iPhone and iPad never prompts at all. Inside the Installed app, the brand and the footer links (For grown-ups, Privacy) leave the app's scope and open inside it. An earlier design audit (`_handoff/RESUME.md`, 2026-10-16) also found a generic "Install" label, Explore links opening inside the installed app, the same icons as the main site, and installs from before 14 October being the root "Madhav" app; the move to learnvedicmath.com fixed the last three (no Explore menu, the Nikhilam Family icons, the game's own manifest with `id` `/play/`), and this change fixes the rest.

## What Changes

- **A complete manifest** for the richer install dialogs on Chrome, Edge, Android, ChromeOS and Samsung Internet: any-purpose and maskable icons at 192 and 512 (a new `maskable-192.png` from `tools/brand/render.mjs`), narrow and wide screenshots (`screenshots/`, made by `e2e/screenshots.mjs`), shortcuts to the Arena, Practice and the Sutras, `lang`, `dir` and a `launch_handler` that reuses an open window. The page gains the iPhone and iPad meta tags (title "Vedic Math", full screen) and a `theme-color` that follows the scheme from the first paint.
- **The Install guide**: a dialog with why to install in the Mode's words and the steps for the browser it is in, one tap through the browser's own prompt where there is one, honest about desktop Firefox, a picker for any other device, opened from the Me page, the footer of every game page, the Guide's Offline section and the nudge.
- **The Install nudge on Home**: a small card in one slot on Home (tile home and Sky), on a Player's second day of play, where the browser can install in one tap or on Safari on iPhone and iPad; "Not now" hides it for 7 days, three times at most. Explorer's nudge speaks to the grown-up.
- **One prompt at a time**: a shared Prompt slot (`js/prompt-slot.js`) that the nudge and the tour claim, and that the Family helpers' visitors can adopt.
- **Inside the Installed app**: no install offers; links outside `/play/` open in the browser; the brand goes to the game's Home.
- **Counts**: `math/install/*` events in the analytics spec, fixed words only.
- The device's install state (`vm.install`) stays in this browser.

Out of scope:

- Changes in other repositories: none are needed (the shared chrome is vendored here).
- A service worker change: the worker already answers every navigation under `/play/` with the saved shell offline, and the precache already takes every module and manifest icon.
- iOS splash images (`apple-touch-startup-image`): iOS shows the manifest's background color, and a set of images per device size would add about 40 files for a second of launch.
- Spoken lines: the guide and the nudge are text and pictures only, so no Studio voice re-record is needed.
- The owner's own reinstall of the old root "Madhav" app (an owner task, below).

Affected: every Player in a browser that can install (the nudge on their second day; the guide everywhere); Players already using the Installed app (links now open in the browser; the brand goes to Home).

## Capabilities

### New Capabilities

- `install-app`: the manifest and page tags for installing, the Install guide, the Install nudge and its schedule, one prompt at a time, the Installed app's links, and opening offline.

### Modified Capabilities

- `analytics`: one ADDED requirement, "Install counts".

## Impact

- New: `js/install.js`, `js/install-rules.js`, `js/prompt-slot.js`, `icons/maskable-192.png`, `screenshots/*.png`, `e2e/screenshots.mjs`, `test/install.test.mjs`, `e2e/tests/install.spec.ts`, `e2e/tests/install-helpers.ts`, `e2e/tests/cov/install-app-*.spec.ts`, `e2e/tests/cov/analytics-12.spec.ts`.
- Changed: `manifest.webmanifest`, `play/index.html` (meta tags, the pre-paint `theme-color`, the footer link), `js/app.js` (one slot on each Home, the Me card, the Guide action, the tour claims the Prompt slot, boot), `js/guide.js` (the Offline section's action), `js/metrics.js`, `math.css`, `tools/brand/render.mjs`, `docs/perf/baseline.json` (first load grows by about 15 KB Brotli, on purpose), `GLOSSARY.md`, `docs/agent/offline.md`, tests that read the manifest, the precache list or the Guide's actions.
- Owner: reinstall the app on any device that still has the old root "Madhav" app or the sbmadhav.com Vedic Math app; try the install on an iPhone and an Android phone (tasks 7.x).
