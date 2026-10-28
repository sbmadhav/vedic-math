# Proposal

Status: plan only, not yet approved for implementation. The owner decisions it cites (M5, M6, P5 of 2026-10-17) answer design questions and set its budgets; they do not approve this change, and merging this plan is not that approval.

Re-planned 2026-10-21 (`react-typescript` task 12.1) for the stack the owner chose on 2026-10-19 and 2026-10-20 (ADR 0012, `react-typescript` decisions N1 to N8): React 19 and TypeScript, React Router v7 in framework mode, server-rendered in a Cloudflare Worker, with `/learn/` path routes and the Sutra pages, the Guide and the first-visit Mode picker prerendered (Q20). The first plan's per-file esbuild minify, import map, `?v=` stamps, `js/views/` split, hash routes and its "no bundler, no framework, no path routing" rule are gone: the framework build does the first four, ADR 0012 supersedes the rule, and `react-typescript` moves the game to paths. What stays is the goal and the owner's budgets (M5), now a MODIFIED `performance-budget` on top of `react-typescript`'s "never slower than the baseline" gates, every size measured in Brotli (Q21). It is built third of the follow-on changes, after `placement` and `age-bands` (`react-typescript` design D3), so it assumes `react-typescript` is archived and every view is a React route module.

## Why

Vedic Math is played mostly on family phones and school tablets, many of them mid-range Android devices on mobile data. The baseline `react-typescript` measured on the live site (`docs/perf/baseline.md`, 2026-10-21, Lighthouse mobile preset on a GitHub runner) is far from the owner's target: a first visit to the game paints its first content at 1,923 ms and its largest content at 5,420 ms, the Arena, Games and a Deep dive at about 2.0 to 2.3 s and 5.5 to 5.7 s, and a first visit downloads 758,499 bytes of Brotli before the first tap, because the service worker's install precaches every module, every Play experience, every font and the Watch data. `react-typescript` only promises not to make that worse. Its framework build minifies, hashes and splits the code per route, and its server render and prerendered pages answer a cold deep link with real HTML, but nothing in it prefetches the next screen, keeps the worker's install small, subsets the fonts, pauses work the Player cannot see or holds pages to absolute budgets.

The owner's decisions M5, M6 and P5 (2026-10-17) set the goal: measure Core Web Vitals on a mid Android phone first, then make the site fast and keep it fast, with a CI budget that fails on regressions: first contentful paint under 1.5 s on a mid phone over 4G, and under 150 KB of compressed JS before play.

## What Changes

- **Measure on a real phone too.** `docs/perf/baseline.md` (from `react-typescript`) gains the landing and grown-up pages, WebPageTest real-device runs, a mid Android phone recorded by hand, and the field p75 Core Web Vitals from Cloudflare Web Analytics, measured again on `/learn/` once `react-typescript` is archived and before the first code task here.
- **Absolute budgets on top of "no regression" (M5).** The build fails when the JS a first visit to `/learn/` requests before the first tap is over 150 KB Brotli, its CSS over 40 KB, one route's own chunks over 80 KB, or a landing or grown-up page's JS over 15 KB. Every pull request preview fails at a median first contentful paint of 1.5 s or more, largest contentful paint of 2.5 s or more, layout shift over 0.1, total blocking time over 200 ms, or, on a server-rendered page, time to first byte of 800 ms or more. `react-typescript`'s gates stay: first load, timings and interactions never worse than the baseline, now ratcheted down each time this change lowers a number. Growth over 5 KB is reported on the pull request.
- **Compression and caching.** Cloudflare serves every text file with Brotli; hashed files under `/learn/assets/` are cached for a year as immutable (their name changes when their bytes do).
- **Lean first load.** The entry, the root route and the first route carry only what that screen needs: the skill data, the Arena, the games, the Sutra deep dives, Watch, the Guide and every Play experience load with their own route, never with Home or the Mode picker. React Router already splits by route module and lists the entry's and matched route's chunks as `modulepreload`; this change adds the checks that keep it so and moves shared code that does not belong in the entry out of it.
- **Prefetch the likely next step.** Game links prefetch a route's code on hover, focus or touch (React Router's `prefetch="intent"`), and the most likely next screen is prefetched once the browser is idle, never under Save-Data or 2G. Between documents (the landing and grown-up pages, `/learn/`), Speculation Rules prefetch links on hover or touch, and the landing page prerenders `/learn/` once start-up waits for activation, so nothing is written, counted or played before the page is shown.
- **Server rendering that streams.** Server-rendered game pages stream: the document head, the stylesheets and the `modulepreload` links leave the Worker before the render ends; crawlers get the whole page. The first-visit Mode picker is already prerendered by `react-typescript` (Q20); this change holds it to the budgets and keeps a returning Player's Home from shifting the layout.
- **Fonts.** The build subsets the self-hosted fonts to the characters the site uses (Latin, the IAST letters of Sutra names, math signs), a test fails when copy uses a character outside the subset, and only the two fonts above the fold are preloaded.
- **Pause what is not seen.** The 2D Sky's animations and parallax stop while the Sky is off screen or the tab is hidden. The Moving background starts only after the first paint and idle time, and holds still while a round is in play. (The 3D Sky's own pausing is `react-typescript`'s `scenes-3d`.)
- **Offline (P5).** The worker precaches the offline shell, the entry and the core routes (Home, the Sky, Learn, Dojo, Star, Arena, Games, Me). Play experiences, Watch, the Sutra deep dives and the Guide are saved when first opened, and stay saved across a deploy that does not change them. This replaces "precache every experience" and is what brings the first-load total down most.
- **Navigation preload** in the worker, so a page load does not wait for the worker to start before going to the network.

## Out of scope

- The framework, the bundler, path routes, server rendering and the prerendered pages themselves: `react-typescript`. This change only tunes and measures them.
- 3D (the Sky scene, its budget and its pausing): `react-typescript` `scenes-3d`; later scenes and the Moving background as a scene: `gpu-effects`. If `gpu-effects` turns the Moving background into a 3D scene first, its "hold still during a round" rule moves there.
- Static content pages for Tricks and Skills (SEO); a separate change.
- Image work beyond what exists (Watch thumbnails are handled by the move).
- Server loaders, edge caching of server-rendered HTML (it is `no-store` by `react-typescript` D15), Cloudflare Early Hints (see design, "Considered").
- Changing what any view shows or how any round plays.

## Modes and Players affected

Every Mode (Explorer, Challenger, Pro) and every Player. Nothing a Player sees changes except: a quiet loading line if the next screen's code is slow to arrive (shown only after 300 ms, while the current screen stays), a Retry message if it fails, and, offline, a note on Play experience cards that were never opened ("Needs a connection the first time"). The Moving background starts a moment later and holds still during rounds. Nothing new is sent or stored; `parentNote()` and `cloud/README.md` do not change.

## Capabilities

### New Capabilities

- `app-loading`: compressed and immutable delivery, a lean first load per route, intent and idle prefetch, Speculation Rules, prerender-safe start-up, streamed server rendering, the first screen within budget, fonts, and pausing work that is not seen.

### Modified Capabilities

- `performance-budget` (added by `react-typescript`): the owner's absolute budgets (M5) on top of the no-regression gates, a ratchet that lowers the ceiling as numbers improve, more pages and a real device in the baseline, and growth reports.
- `offline-app` (added by `learnvedicmath`, modified by `react-typescript`): the precache covers the core of the game; other route code is saved when first opened and kept across deploys; navigation preload.
- `play-experiences` (added by PR #47): an experience opens offline once it has been opened online, and is never downloaded before.
- `analytics`: ADDED "A prerendered page counts nothing until it is shown".

## Order and dependencies

Built after `react-typescript` is archived (its task 12.6), then `placement` and `age-bands` (`react-typescript` D3), so `performance-budget`, `offline-app`, `app-routing`, `app-build` and `hosting` are in their post-migration form and every view is a React route module. Until `react-typescript` is archived, `openspec validate --strict` reports "Archive would refuse" notices for the MODIFIED deltas on `performance-budget` and `offline-app`. That is expected; task 0.2 rechecks it.

## Impact

- Build: `tools/budget.ts` (absolute budgets, route lines, landing page lines, the ratchet, growth report), `tools/perf-compare.ts` and `tools/lighthouserc.json` (absolute timing assertions, `/`, `/parents/`, time to first byte), `tools/vite-plugin-precache.ts` (a route-aware walk of the core routes only, and `ALL`, the build's full list of hashed client URLs, so the worker keeps unchanged files across a deploy), new `tools/subset-fonts.py` with `tools/requirements.txt`, `build.py` (Speculation Rules blocks and their CSP hashes, subset fonts, `Cache-Control` for `/learn/assets/*` in `_headers`).
- App: `app/src/root.tsx` (font preloads, the speculation rules block with the nonce or hash), `app/src/entry.server.tsx` (stream for browsers, wait for `allReady` for crawlers), `app/src/components/AppLink.tsx` (intent prefetch with the Save-Data rule), new `app/src/hooks/useIdle.ts`, `useInView.ts` and `useIdlePrefetch.ts`, the start-up effect gated on activation, the route error boundary's Retry, the Sky and Moving background views, the analytics module.
- Worker: `app/src/sw/sw.ts` (core precache, save on first open, carry across versions, `cached?` messages, navigation preload).
- Tests: Vitest for the budget tool, the hooks and the fonts check; Playwright `e2e/tests/loading.spec.ts`, `prerender.spec.ts`, `offline.spec.ts`, `sky.spec.ts`, `analytics.spec.ts`; the `perf` jobs of `preview.yml` and `e2e.yml`.
- Docs: `docs/perf/baseline.md` and `baseline.json`, `AGENTS.md` (budgets, how to read the perf comment, how a budget may change), `GLOSSARY.md` (Performance budget: it already names the M5 limits; it gains the no-regression ceiling and the ratchet).
