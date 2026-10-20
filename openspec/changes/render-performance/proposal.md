# Proposal

Status: plan only, not yet approved for implementation. The owner decisions it cites answer design questions; they do not approve this change, and merging this plan is not that approval.

Superseded in part (owner, 2026-10-19): the game moves to React and TypeScript first (`react-typescript`, ADR 0012), which supersedes this plan's "no bundler, no framework, no path routing" and its esbuild, import-map and `js/views/` approach. This change is re-planned for Vite and React before it is built (`react-typescript` task 11.1), third of the follow-on changes, and its size budgets measure Brotli. This text is not revised for that yet.

## Why

Vedic Math is played mostly on family phones and school tablets, many of them mid-range Android devices on mobile data. Today the game's first load is one static module graph from `js/app.js`: 34 modules, 7 import levels deep, served unminified (about 700 KB raw; 483 KB minified and 140 KB Brotli when measured with esbuild on 2026-10-17). Each import level costs a round trip before the next is found, so a throttled cold load reaches DOMContentLoaded at about 2.2 s even on a desktop CPU (`_handoff/architecture-microfrontends-prerender.md`, measured 2026-10-16). A full-screen moving background is drawn on the main thread at up to 30 frames a second, and the Sky's twinkle animations keep repainting while it is scrolled away. PR #47 adds twelve Play experiences (about 685 KB of JS and 180 KB of CSS) and precaches all of them for every visitor, whether or not they ever open one.

The owner's decisions M5, M6 and P5 (2026-10-17) set the goal: measure Core Web Vitals on a mid Android phone first, then make the site fast and keep it fast, with a CI budget that fails on regressions: first contentful paint under 1.5 s on a mid phone over 4G, and under 150 KB of compressed JS before play. This is the first of three changes built after the learnvedicmath.com move (M6: render-performance, then duel-online, then gpu-effects).

## What Changes

- **Measure first.** A baseline report (`docs/perf/baseline.md`) from lab runs (Lighthouse mobile preset: Moto G Power class device, simulated slow 4G, 4x CPU) on the landing page, `/play/` cold and warm, and a real mid Android phone; field Core Web Vitals come from Cloudflare Web Analytics, which the move already adds.
- **Budgets that fail CI.** The build measures the compressed size of everything a first visit loads before play and fails above 150 KB of JS. On every pull request preview, Lighthouse CI fails on first contentful paint at or above 1.5 s, largest contentful paint at or above 2.5 s, layout shift above 0.1 or total blocking time above 200 ms.
- **Minify and compress.** The build minifies every module and stylesheet one file at a time with esbuild, with no bundling, so the import map, the per-module `?v=` stamps and the worker's hash checks stay as they are. Cloudflare serves Brotli.
- **Per-route code splitting.** `js/app.js` becomes the router and shell only. Each section (Learn, Dojo, Arena, Games, Sutras, Watch, Guide, Me, Star, the Sky) loads its own module on first visit. The Play experiences already load on demand. The build preloads the entry graph (`modulepreload`) so it is fetched in one round instead of seven.
- **Prefetch the likely next step.** In the game, a section's code is fetched when the Player points at, focuses or touches its link, and the most likely next section is fetched at idle. Between pages (landing, grown-up pages, `/play/`), Speculation Rules prefetch links on hover or touch. `/play/` is prerendered from the landing page once its start-up waits for activation, so nothing is written, counted or played before the page is shown.
- **A static first screen.** `/play/` ships the first-visit Mode picker as plain HTML, so the first paint does not wait for modules.
- **Fonts.** The build subsets the self-hosted fonts to the characters the site uses (Latin, the IAST letters of Sutra names, math signs), and a test fails when copy uses a character outside the subset. Only the two fonts above the fold are preloaded.
- **Pause what is not seen.** The Sky's animations and parallax stop while the Sky is off screen or the tab is hidden. The moving background starts only after the first paint and idle time, and holds still while a round is in play.
- **Offline (P5).** The worker precaches the shell, the entry graph and the core sections (Home, Learn, Stars, Arena, Games, Me). Play experiences, Watch data, Sutra deep dives and the Guide are saved when first opened, with the same hash check as the precache. This replaces PR #47's "precache every experience".
- **Navigation preload** in the worker, so a page load does not wait for the worker to start before going to the network.

## Out of scope

- WebGL and moving drawing work off the main thread: the `gpu-effects` change.
- A bundler, a framework or path routing (hash routes stay; `_handoff/architecture-microfrontends-prerender.md` "Do not"). (Superseded by `react-typescript` and ADR 0012, owner 2026-10-19.)
- Static content pages for Sutras, Tricks and Skills (SEO); a separate change.
- Content-hashed file names and year-long `Cache-Control: immutable` (see design, "Considered").
- Image work beyond what exists (Watch thumbnails are handled by the move).
- Changing what any view shows or how any round plays.

## Modes and Players affected

Every Mode (Explorer, Challenger, Pro) and every Player. Nothing a Player sees changes except: a short loading state if a section's code is slow to arrive (shown only after 300 ms), a Retry message if it fails, and, offline, a note on Play experience cards that were never opened ("Needs a connection the first time"). The moving background starts a moment later and holds still during rounds. Nothing new is sent or stored; `parentNote()` and `cloud/README.md` do not change.

## Capabilities

### New Capabilities

- `performance-budget`: what is measured, on which device and network, the budgets, and how CI fails on a regression.
- `app-loading`: minified delivery, per-route code splitting, preloading and prefetching, Speculation Rules, prerender-safe start-up, the static first screen, fonts, and pausing work that is not seen.

### Modified Capabilities

- `offline-app` (added by the `learnvedicmath` change): the precache covers the core of the game; other code is saved, hash checked, when first opened; navigation preload.
- `play-experiences` (added by PR #47): an experience opens offline once it has been opened online.
- `analytics`: ADDED "A prerendered page counts nothing until it is shown".

## Order and dependencies

Built after the learnvedicmath.com move is archived (owner decision M6), so `offline-app`, `third-party-requests`, `hosting` and `analytics` are in their post-move form, and after PR #47 is archived (`play-experiences` exists). Until then `openspec validate --strict` reports an "Archive would refuse" notice for the two MODIFIED deltas on `offline-app` and `play-experiences`. That is expected; task 0.2 rechecks it.

## Impact

- Build: `build.py` (minify step, route chunk table, `modulepreload`, byte budget, font subsetting, lazy hash table for the worker, Speculation Rules block and its CSP hash), new `tools/package.json` (esbuild and Lighthouse CI pinned, repo-only), new `tools/subset-fonts.py`.
- App: `js/app.js` split into `js/views/*.js`; `js/life.js` gains `idle()`; `js/ambient.js` (start after idle, still during rounds); `js/sky-view.js` and `math.css` (pause off screen); new `js/prefetch.js`; `js/analytics.js` (queue until activation); `play/index.html` (static first screen, speculation rules on the landing pages).
- Worker: `sw.js` (precache list, lazy cache with hashes, navigation preload).
- Tests: `test/build.test.mjs`, new `test/budget.test.mjs`, `test/lifecycle-scan.test.mjs` (covers `js/views/`), new `test/fonts.test.mjs`; Playwright `e2e/tests/loading.spec.ts`, `offline.spec.ts`, `prerender.spec.ts`; new `.github/workflows/perf.yml` (or a job in the move's `preview.yml`).
- Docs: `docs/perf/baseline.md`, `CLAUDE.md` (budgets, the views folder, the minify step), `GLOSSARY.md` (Performance budget).
