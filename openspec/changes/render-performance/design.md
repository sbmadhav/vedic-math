# Design

Re-planned 2026-10-21 for React Router v7 framework mode with server rendering on Cloudflare Workers (`react-typescript` task 12.1, ADR 0012). The first plan (2026-10-17) was written for a no-framework, no-bundler game with hash routes; its D3 (esbuild per-file minify with the import map and `?v=` stamps), D4 (`js/views/*.js` split) and D5's hand-written `modulepreload` list are replaced by the framework build, and its "no bundler, no framework, no path routing" rule is superseded by ADR 0012 (owner, 2026-10-19 and 2026-10-20). Its goals, its budgets (owner M5), its measurements (D1) and its offline decision (P5) are kept.

## Context

- **When this is built** (`react-typescript` design D3): after `react-typescript` is archived (every view a React route module, `js/` and `js/life.js` gone, the 3D Sky shipped), then `placement` and `age-bands`. So the game is `/learn/` on learnvedicmath.com:
  - React Router v7 framework mode (`app/`, `ssr: true`, `basename: '/learn/'`, `routeDiscovery: { mode: "initial" }`, no server loaders), built by Vite with the Cloudflare plugin; one Worker (`workers/src/index.ts`) renders game paths that have no file, with a nonce per request and `Cache-Control: no-store` (`react-typescript` D5, D14, D15).
  - Prerendered static files for `/learn/` (the first-visit Mode picker, with a pre-paint script that marks a returning Player so the picker is never painted for them), `/learn/sutras/` and every Sutra, and the Guide (Q20). The landing and grown-up pages (`site/`) stay the move's static HTML with `js/analytics.js`.
  - Hashed client files under `/learn/assets/*-<hash>.*`; the worker (`app/src/sw/sw.ts`, scope `/learn/`) precaches the offline shell (`/learn/__shell.html`) and every chunk of the entry and of "the routes needed for offline play" from the client manifest (`tools/vite-plugin-precache.ts`), serves hashed files cache first and stores a hashed file the first time a route loads it (3D files only that way).
  - Lifecycle through hooks (`useAbortSignal`, `useTimer`, `useInterval`, `useFrame`, `useEvent` in `app/src/hooks/`) checked by the ESLint lifecycle rule (`view-lifecycle`).
  - The gates of `react-typescript` (`performance-budget`): `tools/budget.ts` reads the client manifest and fails when the Brotli bytes (quality 11) a first visit to `/learn/` requests before the first tap, including every file the worker's install downloads, are above `docs/perf/baseline.json`; the `perf` job in `preview.yml` (and in `e2e.yml` on production after a deploy) runs Lighthouse (`tools/lighthouserc.json` through `e2e/perf/lighthouse.mts`) and `e2e/perf/interactions.ts`, and `tools/perf-compare.ts` fails beyond the tolerances (100 ms on paints, 25 ms on blocking time, 20 ms on interactions); the Worker bundle has its own size check; the 3D graph its 170 KB Brotli budget.
- **The numbers today** (`docs/perf/baseline.md`, live `/play/` at commit `1401890`, 2026-10-21, Lighthouse 13.5.0 mobile preset on a GitHub runner, median of 5):
  - First visit to `/play/`: FCP 1,923 ms, LCP 5,420 ms, TBT 46 ms, CLS 0.001, TTFB 479 ms. Repeat visit (worker): FCP 831 ms, LCP 1,260 ms. Arena, Games and a Deep dive as a returning Player: FCP 1,952 to 2,258 ms, LCP 5,544 to 5,667 ms, TBT 57 to 159 ms.
  - First load 758,499 bytes Brotli in 125 files (the budget since PR #115), because the worker's `PRECACHE` holds every module, every Play experience, `js/videos.js`, every font and the icons. The largest files: `js/app.js` 41.7 KB, the three fonts that are not the heading font 30.3, 21.8 and 21.3 KB, `math.css` 20.6 KB, `icon-512.png` 20.4 KB, `js/videos.js` 20.0 KB.
  - The same graph minified and bundled was 140 KB Brotli (esbuild, measured for this change's first plan, 2026-10-17); React, React DOM and React Router's client add about 70 KB gzip (`react-typescript` Risks). Whether the React game's JS before play is under 150 KB Brotli is not known until `react-typescript` ships, which is why task 0.4 measures again.
  - Lighthouse medians on a runner can move up to 450 ms between runs (baseline report, "How much it varies").
  - The Moving background (`js/ambient.js` today, a React view after the migration) draws a full-screen 2D canvas at up to 30 frames a second on the main thread. The 2D Sky animates two full-size SVG pattern layers forever (`skyTwinkle`), plus a pulse on the suggested Star, even when scrolled away; the 3D Sky pauses in a hidden tab (`scenes-3d`) but the 2D one does not pause off screen.
- Every name in this design (`app/src/...`, `tools/...`, route ids) is as `react-typescript` plans it; task 0.1 corrects any it renamed while it was built.

## Goals

- First contentful paint under 1.5 s and under 150 KB of Brotli JS before play, on a mid Android phone over 4G (owner M5), checked by CI on every pull request, on top of `react-typescript`'s rule that nothing gets slower than the baseline.
- Measure before changing anything, on a real phone as well as in the lab, and keep the numbers in the repo.
- Keep the server render, the prerendered pages, the offline shell, the worker's hash checks, the CSP nonces and hashes, and the lifecycle rules exactly as `react-typescript` leaves them.
- No change to what any view shows or how any round plays.

## Non-goals

- The framework, routing and rendering choices (ADR 0012, `react-typescript`); 3D and its budget (`scenes-3d`, `gpu-effects`); SEO content pages for Tricks and Skills; server loaders or edge-cached HTML.

## Decisions

### D1. Measure first

Before any code change (task group 1), extend `docs/perf/baseline.md`. `react-typescript` already keeps the Lighthouse lab runs and the interaction timings; this change re-measures them at `/learn/` after `react-typescript` is archived (the "start" section) and adds:

| Run | Tool | Settings | Pages |
|---|---|---|---|
| Lab, simulated | Lighthouse mobile preset (`e2e/perf/lighthouse.mts`, `tools/lighthouserc.json`) | Moto G Power class screen, simulated slow 4G (150 ms RTT, 1.6 Mbps down, 750 Kbps up), 4x CPU slowdown, 5 runs, median | `react-typescript`'s pages at their `/learn/` paths (first and repeat visit of `/learn/`, the Arena, Games, a Deep dive), plus `/` and `/parents/` |
| Lab, real device | WebPageTest real device "Moto G (gen 4)" or "Moto G Power" (free plan) | 4G profile, 3 runs, first and repeat view | `/`, `/learn/`, `/learn/arena` (server-rendered) |
| Real device by hand | Chrome remote debugging on any mid Android the owner has (Snapdragon 6xx class or similar, 4 GB RAM) | Performance panel, 4G or throttled Wi-Fi | `/learn/` first visit, opening the Arena, a Star round, the Sky scrolled |
| Field | Cloudflare Web Analytics | p75 FCP, LCP, INP, CLS, by device type | all pages (document loads only; client-side route changes are not page loads) |

The lab numbers decide the gates; the field numbers are reviewed monthly and never gate CI (they lag and need traffic). "Mid phone over 4G" is the Lighthouse mobile preset, which is slower than typical 4G and so a conservative proxy.

### D2. Budgets: the owner's absolute limits on top of "no regression"

`react-typescript`'s gates answer "did this pull request make it worse?"; the owner's M5 budgets answer "is it fast enough?". Both run, and a pull request must pass both. Every size is Brotli at quality 11 on the published bytes, as `tools/budget.ts` measures today (Q21), so the number does not depend on the edge's settings.

1. **Bytes, in `tools/budget.ts`, on every build** (`build.py`, `ci.yml`, the pre-commit hook). The first-load set is `react-typescript`'s (the document, what it links, the entry, the root route and the first route with their static imports, fonts and icons it loads, `sw.js` and every `PRECACHE` file, each unique file once). Within it, **before play** means what the page itself requests before the first tap, without the worker's install downloads: the document's JS and CSS, everything the `modulepreload` links name, and what is prefetched at idle (D5), because on a slow phone idle may come before the first tap. It is measured for the two documents a first visit can get: the prerendered `/learn/` (Mode picker) and a returning Player's Home at `/learn/`. The build fails when:
   - JS before play is over **150 KB** (target after this change: under 100 KB, leaving room for later features);
   - CSS before play is over **40 KB**;
   - JS on any landing or grown-up page (`site/`) is over **15 KB**;
   - any one route's own chunks (those not already in the entry or the root route) are over **80 KB** (keeps a fat section from hiding behind code splitting). The 3D graph keeps its own 170 KB budget and is not a route line;
   - the first-load total is over the ceiling in `docs/perf/baseline.json` (`react-typescript`'s rule, unchanged).
   It prints every line on every build and writes its measurements to a repo-only `_budget/budget.json` (outside the output folder, in `.gitignore`), which the perf job compares with `main`'s and reports on the pull request when JS or CSS before play grows by more than 5 KB, even within budget, naming the file that grew.
2. **The ratchet.** When a pull request of this change lowers the first-load total, a paint, a blocking time or an interaction median, it records the new number in `docs/perf/baseline.json` (with the why in `firstLoad.changes`, as `react-typescript` does) in the same pull request, so the "no regression" ceiling follows the improvements down and a later change cannot spend them silently. The ceiling is never raised except by a pull request that says why (`react-typescript`'s rule).
3. **Timings, on every pull request preview** (`preview.yml` `perf` job). The same Lighthouse runs as `react-typescript`, on its pages plus `/` and `/parents/`. Besides `react-typescript`'s tolerances against the baseline, it fails when a median first contentful paint is **1.5 s or more**, largest contentful paint **2.5 s or more**, layout shift is **over 0.1**, total blocking time is **over 200 ms** (the lab proxy for INP), or a server-rendered page's time to first byte is **800 ms or more** (web.dev's "good" threshold, on the same simulated 4G). The absolute assertions live in `tools/lighthouserc.json` next to the pages, and `tools/perf-compare.ts` applies them. On `main`, the run against production after a deploy opens an issue instead of failing the deploy. Fork pull requests have no preview and are skipped.
4. **When the absolute timing gates start.** The baseline misses them (first visit FCP 1,923 ms, LCP 5,420 ms), so failing every pull request from day one would block all other work. Each absolute timing assertion is written in `tools/lighthouserc.json` from task 2.2 but is **reported, not failing**, on a page until the pull request whose measurements first meet it on that page; that pull request turns it to failing for that page, in the same commit, and from then on it fails like the others. The byte budgets fail from task 2.1, except a byte line the start measurement (task 1.2) already misses, which follows the same rule. Task 9.2 checks that every assertion is failing by the end of this change; one that cannot be met goes back to the owner (open question 4).

A budget only changes in a pull request that says why in its description and updates `docs/perf/baseline.md`.

Runner noise (up to 450 ms on paints between runs) is larger than the 100 ms tolerance; `react-typescript`'s perf job already measures once more before failing. The absolute limits are far enough from the target numbers (D10's "after" goal is FCP around 1.0 s) that noise alone should not flip them; if one flakes twice in a month, widen to 7 runs before touching a budget.

### D3. Compression and caching

- The framework build already minifies JS and CSS (Vite's defaults) and hashes every client file name; nothing here re-minifies.
- Cloudflare compresses text responses with Brotli at the edge for clients that accept it. Task 3.1 verifies with `curl -sI -H 'Accept-Encoding: br'` that a `/learn/assets/*.js` file, a `.css` file, the prerendered `/learn/` and a server-rendered `/learn/arena` come back `content-encoding: br` (a streamed Worker response is compressed by the edge as well; this is the check). If not, the owner adds a Compression Rule. Precompressed `.br` files are not relied on (not documented for Workers static assets).
- `_headers` gives `/learn/assets/*` `Cache-Control: public, max-age=31536000, immutable`: a hashed name changes whenever its bytes do, so a repeat visit without the worker (a cleared worker, a browser with workers off) never revalidates them. The prerendered pages, the shell and `/sw.js` keep short or revalidated caching as `react-typescript` sets it, and server-rendered HTML stays `no-store` (D15 there).

### D4. A lean first load

React Router framework mode already makes each route module its own chunk, loads it when the route is matched, and lists the entry's and the matched route's chunks as `modulepreload` in the document (the `<Links>` and `<Scripts>` of `app/src/root.tsx`), so the first plan's hand-written route table, its `js/views/` split and its preload list are not needed. What can still put too much in the first load:

- **Shared modules pulled into the entry.** Rollup moves a module imported by the root route and by several routes into a shared chunk the entry depends on. The skill data (`shared/src/skills/*`, 82 KB minified today) is used by Learn, Star, the Arena and placement; Home needs only counts. A small `shared/src/skills/meta.ts` holds what Home and the root route need, and a Vitest test checks it against the full data. Other large shared modules found by task 4.1 get the same treatment, or move behind a dynamic `import()` where only an action needs them (the Firebase client, the voice worker, the video catalogue already are).
- **Routes that must not be in the first load.** A first visit to the Mode picker and a returning Player's Home SHALL request no chunk that only the Arena, the games, the Sutra deep dives, Watch, the Guide or a Play experience use. `tools/budget.ts` reads it from the client manifest (each route's own chunks), and `e2e/tests/loading.spec.ts` checks it in the browser.
- **Waiting for a route's code.** On a client-side navigation React Router loads the next route's module before it commits the navigation, so the current screen stays on screen meanwhile. After 300 ms without the module, the root layout shows a quiet loading line (from `useNavigation()`'s `loading` state, through the timer hook), keeping the layout still (page-layout "Stable layout while loading"). If the module fails to load, the route's error boundary shows "This part did not load." with Retry, and Retry navigates to the same path again (a failed dynamic import is not cached by browsers, so it refetches). Starting another navigation drops the pending one, so a late module never draws over the screen the Player went to. React Router's own response to a failed route module import after a deploy is a document reload; task 4.2 checks that the Retry path works online and that offline it never loops (the shell is served, and the boundary shows "Needs a connection the first time" for a module the worker does not have).
- **3D** stays out of the first load by `scenes-3d` and its own budget; nothing here changes that.

### D5. Prefetch

- **Intent prefetch in the game.** Every in-game link goes through one `AppLink` component (`app/src/components/AppLink.tsx`, a thin wrapper of React Router's `Link` and `NavLink`) with `prefetch="intent"`: React Router adds `<link rel="prefetch">` (and `modulepreload` for its imports) for the target route's modules when the link is hovered, focused or touched, and removes them when the link unmounts, so a prefetch never outlives its screen. Routes have no loaders, so nothing but code is fetched. `AppLink` sets `prefetch="none"` when `navigator.connection.saveData` is true or `effectiveType` is `slow-2g` or `2g` (read once on the client; the server renders `none`, which hydrates the same because prefetch adds no markup on the server). An ESLint `no-restricted-imports` rule makes `AppLink` the only way to import `Link` and `NavLink` in `app/src/views/` and `app/src/components/`.
- **Idle prefetch.** `useIdlePrefetch(path)` (`app/src/hooks/`) renders React Router's `<PrefetchPageLinks page={path} />` once the first route has rendered and the browser is idle (`useIdle`, a new lifecycle hook on `requestIdleCallback` with a timer fallback, cancelled on unmount), at most one per screen, never under Save-Data or 2G. The likely next screen: from Home, the Star the Bolt suggests (`/learn/star/...`) or the Arena; from a Star result, the Sky; from the Mode picker, Home. Idle prefetches count toward JS before play (D2).
- **Between documents (Speculation Rules).** One rules block, written by `build.py` for the static pages (its hash goes into their CSP in `_headers`) and by `app/src/root.tsx` for the game's documents (with the request's nonce when server-rendered, its hash when prerendered, `react-typescript` D15):
  - on the landing and grown-up pages: `prefetch`, eagerness `moderate`, for same-origin document links matching `/*`, excluding links with a query, `[download]`, `[target=_blank]` and `.no-prefetch`; and `prerender`, eagerness `moderate`, for `/learn/` only, once D6 is in place (task 6.3 adds it after the prerender tests pass);
  - in the game's documents: `prefetch`, eagerness `conservative`, for links to the grown-up pages only. Game paths are not listed: once the app runs, moving between screens is a client-side navigation, not a document load.
  - No rule lists a URL with a hash (`#/...` links are the shim's) or a query. Chrome and Edge act on the rules; Safari and Firefox ignore them, so this is a progressive enhancement. Server-rendered pages are not listed either: a `no-store` response is not reused from a speculative fetch, so it would only cost a Worker run.

### D6. Prerender-safe start-up

`react-typescript` B7 already runs start-up (storage writes, the visit count, sound, the worker registration) once after hydration in an effect. A Speculation Rules prerender of `/learn/` hydrates while hidden, so that effect would run before the Player sees the page. Start-up goes through `whenShown(fn)` (`app/src/shell/start-up.ts`): if `document.prerendering` is true it waits for `prerenderingchange`, otherwise it runs at once. Inside it: the quest day and `gm.init()`/`gm.startDay()`, `metrics.returnCheck()` (writes `vm.firstSeen`, sends return events), the first route-view event, the Moving background and music, the worker registration and the Tour. Rendering and hydrating may happen before activation, since they only read storage (and the pre-paint script's returning-Player class).

The analytics module (`js/analytics.js` on the static pages and the game's analytics module) queues every event while `document.prerendering` is true and loads GoatCounter and the Cloudflare beacon only after activation. That is the one place that makes counting prerender-safe for every page.

### D7. Streamed server rendering and the first screen

- **Streaming.** `app/src/entry.server.tsx` uses `renderToReadableStream` (`react-typescript` D11). For a browser it returns the stream as soon as the shell is ready, without awaiting `allReady`, so the `<head>` (stylesheets, the font preloads, the `modulepreload` links, the pre-paint scripts) leaves the Worker before the rest of the render; for a crawler (`isbot`) it awaits `allReady` so the HTML is complete. The routes have no loaders and `ClientOnly` parts render their fallback on the server, so there is little to stream after the shell; the gain is that the head is never held back by the body. The perf job prints the Worker's CPU time per render (`react-typescript`) and the time to first byte, which D2 budgets at under 800 ms.
- **No server caching of HTML.** Server-rendered HTML is `no-store` because its nonce belongs to one response (`react-typescript` D15). The routes that are the same for every visitor are already prerendered; this change does not cache server HTML at the edge.
- **The first screen.** `react-typescript` prerenders `/learn/` with the first-visit Mode picker and hides it for a returning Player before paint (app-routing "The prerendered Mode picker is for first visits"). This change does not rebuild that; it holds it to the budgets: the Mode picker's document must paint (FCP) within D2's limits with its JS delayed by 2 s (its HTML and CSS paint alone), and a returning Player's Home must not shift the layout when it replaces the hidden picker (the view's height is reserved while the returning class is set; CLS under 0.1 and within the baseline).

### D8. Fonts

- `tools/subset-fonts.py` (fontTools `pyftsubset`, pinned in `tools/requirements.txt`, repo-only) writes the published `woff2` files from the vendored originals, keeping Basic Latin, Latin-1 Supplement, Latin Extended-A, the IAST letters in Latin Extended Additional (ā ī ū ṛ ṝ ḷ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ and their capitals), general punctuation, the math signs the app prints (− × ÷ √ ² ³ ½ ¼ ¾ ≈ ≠ ≤ ≥ π and the fraction slash) and the arrows. Layout features kept: `kern`, `liga`, `tnum` (for scores). `build.py` runs it when it copies `fonts/`, so the published file keeps its name and the precache hash is taken on the subset bytes.
- A Vitest test (`tools/test/fonts.test.ts`) collects every character in the string literals and JSX text of `app/src/`, `shared/src/`, `site/` and the prerendered HTML, and fails on one outside the subset, naming it and the file. Devanagari is not in these fonts at all and falls back to the system font, which the Sutra pages already expect; the test ignores the Devanagari block.
- The root layout's `links()` preloads only Nunito Sans (body) and Fredoka 700 (headings); Space Grotesk and JetBrains Mono load when first used, which browsers already do for declared but unused faces, and they leave the worker's precache (they are saved when first used, D10). `font-display: swap` stays.
- Expected saving: the three largest fonts are 73 KB Brotli of the first load today; subsetting typically halves Latin-only variable fonts (to measure, task 7.1).

### D9. Pause what is not seen

- **The 2D Sky.** The Sky view uses a new `useInView(ref)` hook (`app/src/hooks/`, an `IntersectionObserver` disconnected on unmount, under the lifecycle lint rule) together with `document.visibilityState`. Off screen or with the tab hidden, the Sky's root gets `sky--paused`, its CSS sets `animation-play-state: paused` on everything under it, and the pointer and scroll parallax handlers return early. The two twinkling layers get `will-change: opacity` so the twinkle is composited instead of repainting the SVG. The 3D Sky pauses by `scenes-3d` "Paused when not seen"; when it is drawing, the 2D layers under it are paused too.
- **The Moving background.** It starts only after the first view has rendered and the browser is idle (`useIdle`) or after the first tap, whichever is first, never during the first paint. It holds still (one still frame, no frame loop) while a round is open (the round hook `useRound` marks it; every timed or untimed round goes through it), so a round's input never competes with it, and resumes after. Its device-pixel ratio is capped at 1.5, and at 1 when `navigator.deviceMemory` is 4 or less. It already stops when the tab is hidden. If `gpu-effects` makes it a 3D scene first, these rules move to that scene.
- Both keep their existing rules for reduced motion, Pause motion and Calm.

### D10. Offline: the core precached, the rest saved on first open (owner P5)

- **Precached at install** (hash checked as today, from the client manifest): the offline shell, the vendored design system, the theme, the body and heading fonts, the icons, the manifest, the entry and root route chunks, and the chunks and CSS of the core routes: Home, the Sky (2D), Learn (with grade, Skill and Mix), Dojo, Star, Arena (with Tower) and Games (the game rounds, not the Play experiences), and Me. That keeps `offline-app` "Offline play" (Practice, Stars, games and Device boards offline after one visit). `tools/vite-plugin-precache.ts` gets the core list as route ids from one table in `app/src/routes.ts` (`offline: 'core'`), so a new route is not precached unless it says so.
- **Saved on first open:** every other route's chunks and CSS (each Play experience, Watch and the video catalogue, the Sutra deep dives, the Guide), the other two fonts, and 3D files (already so in `react-typescript`). Hashed files are cache first and the worker stores one when a page first requests it (`react-typescript` D9). Because the name carries a hash of the bytes (Vite's content hash), a stored file can only be the right one; the worker stores a response only when it is a 200 with the expected content type (never the 404 page). The first plan's second `LAZY` list of URLs and hashes is not needed.
- **Carried across versions:** in `activate`, hashed files in the previous `lvm-<VERSION>` cache whose URL is in the new build's manifest (so unchanged) are copied into the new cache before the old one is dropped, so a deploy does not make opened experiences unavailable offline. Changed ones get new names and are fetched on the next open. `tools/vite-plugin-precache.ts` writes the build's full list of hashed client URLs (`ALL`) into the worker for this check, between the same markers; the source keeps it empty.
- **Offline cards:** when `navigator.onLine` is false, a Games shelf card whose route chunk is not in the cache (asked through a small `postMessage` to the worker, `{ type: 'cached?', urls }`, the URLs from React Router's route manifest) shows "Needs a connection the first time" and is still a link (opening it shows D4's Retry message).
- The first-load total drops by the Play experiences, Watch data, the Sutra deep dives, the Guide and two fonts (to measure: task 8.5); the ratchet (D2) records it.

### D11. Navigation preload

The worker enables navigation preload in `activate` (`self.registration.navigationPreload.enable()`) and its network-first page handler uses `event.preloadResponse` when present, so a page load no longer waits for the worker to start before going to the network. The 3.5 s fallback to the offline shell, and the rule that a server-rendered page is never stored as the shell, stay.

## Considered

- **Keep the first plan's per-file esbuild minify, import map and `?v=` stamps.** Replaced: the framework build minifies, hashes and splits; keeping both would be two module systems (`react-typescript` D3).
- **A hand-written route table with `import()` per route** (the first plan's D4). React Router framework mode does this per route module, with `modulepreload` for the matched route; writing our own would fight the router.
- **Cloudflare Early Hints (103) for server-rendered pages.** Cloudflare sends them from `Link` headers it has seen on cached responses; server HTML is `no-store`, and the `modulepreload` links already leave in the first streamed bytes (D7). Not now; reconsider if time to first byte stays high.
- **Edge-caching server-rendered HTML.** Its nonce belongs to one response (`react-typescript` D15); the pages that are the same for everyone are prerendered instead.
- **A `LAZY` list with hashes** (the first plan's D10). Content-hashed names already guarantee the bytes; a list would duplicate the manifest.
- **Precompressed `.br` files from the build:** not documented for Workers static assets. Only if task 3.1 shows the edge does not compress.
- **Prerender `/learn/` without gating start-up:** writes quest days and sends events for pages never shown. Rejected.

## Risks and trade-offs

- **The absolute budgets may not be reachable with React.** React, React DOM and React Router add about 70 KB gzip to JS before play. Mitigation: task 1.2 measures the start; D4 keeps the first load lean; if JS before play cannot get under 150 KB, the owner decides (open question 4) before any budget changes.
- **Lighthouse on GitHub runners is noisy** (up to 450 ms). Simulated throttling and the median of 5, with `react-typescript`'s second measurement before failing; the byte gate is exact and catches most regressions first.
- **Reported-only assertions could stay reported forever.** Task 9.2 does not pass until every assertion fails pull requests.
- **A route's code adds a short wait on its first visit** on slow networks. Intent and idle prefetch hide most of it, the core routes are precached after the first visit, and the current screen stays meanwhile.
- **Saved-on-first-open code is not offline until opened once.** That is the P5 trade-off the owner accepted; the offline card note says so.
- **Font subsetting can drop a character a later change adds.** The fonts test fails first.
- **React Router's reload on a failed route import** could loop offline. Task 4.2 checks it; the error boundary handles the offline case.

## Migration plan

Tasks run in order: before building (0), measure (1), gates (2), compression and caching (3), lean first load (4), prefetch and prerender (5, 6), fonts and the first screen (7), pause and offline (8), close out (9). Every step ships alone and keeps the suite and the gates green. Rollback of any step is a revert; the worker's `VERSION` changes with every build, so clients pick up a revert like any deploy. The ratchet means a revert of an improvement also reverts its `baseline.json` line.

## Open questions (defaults used in this change)

1. Moving background on low-memory devices: default, it holds still during rounds and starts after idle, but stays on by default everywhere. Alternative: off by default when `deviceMemory` is 4 or less or Save-Data is on (the switch still turns it on).
2. Gate: default, Lighthouse on previews fails the pull request (once an assertion is met, D2 item 4); field data is reviewed monthly and never gates.
3. Real device: default, WebPageTest's free real Moto G plus any Android phone the owner already has; no purchase.
4. If an M5 limit cannot be met on the React stack after task group 8 (most likely JS before play): default, the owner is asked with the measured numbers and the options (less in the entry and the root route, a smaller core precache, a different limit); no limit is raised without that answer.
5. Time to first byte limit for server-rendered pages: default 800 ms on the mobile preset (web.dev's "good"), a builder choice the owner did not set; the owner may change it in review.
