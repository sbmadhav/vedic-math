# Design

## Context

- After the move (change `learnvedicmath`), the game is `/play/` on learnvedicmath.com, served by Cloudflare Workers static assets. Modules live under `/js/`, the landing and grown-up pages are prerendered static HTML, `_headers` carries the CSP, and the worker (`/sw.js`, scope `/play/`) precaches every file with a hash. Cloudflare Web Analytics (cookieless) already reports Core Web Vitals for page loads.
- Today (measured 2026-10-16 and 2026-10-17 on the current site):
  - The static graph of `js/app.js` is 34 modules, 7 import levels deep. Unminified it is about 700 KB raw. Minified as one bundle with esbuild 0.28 it is 483 KB, and 140 KB with Brotli at quality 11. `js/videos.js` (96 KB minified) is already loaded on demand.
  - The largest modules (minified bytes in the bundle) are `app.js` 100 KB, `sutra-details.js` 45 KB, `vedic.js` 28 KB, `games.js` 28 KB, `guide.js` 27 KB, the four skill files 82 KB together, `voice.js` 21 KB, `star.js` 17 KB, `ambient.js` 16 KB and `arena.js` 13 KB.
  - Throttled cold load of the current `/vedic-math/` (4x CPU, 1.6 Mbps, headless Chromium): first contentful paint 896 ms, DOMContentLoaded 2,208 ms. Warm (worker): 92 ms and 111 ms. The latency setting did not raise TTFB in that run, so real mobile round trips make the 7-level waterfall worse than measured.
  - `js/ambient.js` draws a full-screen 2D canvas at up to 30 frames a second on the main thread, whenever the Moving background is on.
  - The Sky (`js/sky-view.js`) animates the opacity of two full-size SVG pattern layers forever (`skyTwinkle`), plus a pulse on the suggested Star, even when scrolled away.
  - PR #47 precaches every Play experience module and stylesheet (about 685 KB JS and 180 KB CSS unminified) for every visitor.
- The site is a no-framework, no-bundler app (`openspec/config.yaml`). Every listener, timer and frame loop goes through `js/life.js`.

## Goals

- First contentful paint under 1.5 s and under 150 KB of compressed JS before play, on a mid Android phone over 4G (owner M5), checked by CI on every pull request.
- Measure before changing anything, and keep the numbers in the repo.
- Keep the import map, the `?v=` stamps, the worker's hash checks, hash routing and the lifecycle rules.
- No change to what any view shows or how any round plays.

## Non-goals

- WebGL, OffscreenCanvas workers (the `gpu-effects` change).
- A bundler or framework; path routes; SEO content pages. (Superseded by `react-typescript` and ADR 0012, owner 2026-10-19.)

## Decisions

### D1. Measure first

Before any code change (tasks 1.x), record a baseline in `docs/perf/baseline.md`:

| Run | Tool | Settings | Pages |
|---|---|---|---|
| Lab, simulated | Lighthouse 12 mobile preset (Lighthouse CI) | Moto G Power class screen, simulated slow 4G (150 ms RTT, 1.6 Mbps down, 750 Kbps up), 4x CPU slowdown, 5 runs, median | `/`, `/parents/`, `/play/` (first visit), `/play/#/arena`, `/play/#/games` |
| Lab, real device | WebPageTest real device "Moto G (gen 4)" or "Moto G Power" (free plan) | 4G profile, 3 runs, first and repeat view | `/`, `/play/` |
| Real device by hand | Chrome remote debugging on any mid Android the owner has (Snapdragon 6xx class or similar, 4 GB RAM) | Performance panel, 4G or throttled Wi-Fi | `/play/`: first visit, opening the Arena, a Star round, the Sky scrolled |
| Field | Cloudflare Web Analytics | p75 FCP, LCP, INP, CLS, by device type | all pages (page loads only; hash route changes are not page loads) |

The lab numbers decide the budgets; the field numbers are reviewed monthly and never gate CI (they lag and need traffic). "Mid phone over 4G" is the Lighthouse mobile preset, which is slower than typical 4G and so a conservative proxy.

### D2. Budgets and the CI gate

Two gates, because byte counts are exact and timings are noisy:

1. **Byte budget, in `build.py`, on every build (`ci.yml`, the pre-commit hook).** The build computes the Brotli size (quality 4, close to what Cloudflare's edge uses, so the number is conservative) of everything a first visit to `/play/` loads before play: the entry module graph plus the Home route's graph, the stylesheet and the inline scripts. "Before play" means before the Player's first tap; modules that load at idle (D5) count too, because on a slow phone idle may never come before the first tap. It fails when:
   - JS before play exceeds **150 KB** (target after this change: under 100 KB, leaving room for later features);
   - CSS before play exceeds **40 KB**;
   - JS on any landing or grown-up page exceeds **15 KB**;
   - any one route's own graph exceeds **80 KB** (keeps a fat section from hiding behind lazy loading).
   It prints the table every build and writes `_budget/budget.json` at the repo root, outside the output folder (a `_` path, so never published, and listed in `.gitignore`); `ci.yml`'s repo-only check of `_site/` also lists `budget.json`. The perf job compares it with `main` and comments on the pull request when growth is over 5 KB.
2. **Timing budget, Lighthouse CI on the pull request preview** (the move's `preview.yml` gains a `perf` job; `@lhci/cli` pinned in `tools/package.json`). Mobile preset, 5 runs, median, pages as in D1. It fails when FCP is 1.5 s or more, LCP is 2.5 s or more, CLS is over 0.1, or total blocking time is over 200 ms (the lab proxy for INP). Assertions live in `tools/lighthouserc.json`. Fork pull requests have no preview and are skipped. On `main`, the same job runs against production after the deploy and opens an issue on failure instead of failing the deploy.

A budget only changes in a pull request that says why in its description and updates the table in `docs/perf/baseline.md`.

### D3. Minify and compress, one file at a time

- `build.py` gets a minify step: for every published `.js` it runs esbuild's transform API (`esbuild --minify --format=esm --target=es2020 --legal-comments=none`), one file in, one file out. No bundling, no renaming of exports, no change to import specifiers, so the module graph, `build.py`'s import check and the import map work as today. CSS (`math.css`, `css/**`, the theme and the vendored design system) goes through esbuild's CSS minifier the same way. HTML is left as is, apart from removing comments outside `<pre>`.
- The `?v=` hash and the worker's precache hash are computed on the minified bytes (what is served).
- esbuild runs from `tools/node_modules` (pinned in `tools/package.json`, `npm ci` in CI and in the pre-commit hook's build). `python3 build.py --dev` skips minifying so local debugging reads the source.
- No source maps are published (they would double the files and show comments meant for maintainers); `--sourcemap` writes them into a repo-only folder for local debugging.
- Compression: Cloudflare compresses text responses with Brotli at the edge for clients that accept it. Task 3.4 verifies with `curl -sI -H 'Accept-Encoding: br'` that `/js/*.js`, `/math.css` and `/play/` come back `content-encoding: br` (unverified for Workers static assets; if the zone needs a Compression Rule, the owner adds one). Serving precompressed `.br` files from the build is not relied on (not documented for Workers static assets).
- `test/build.test.mjs` checks that a minified module still imports exactly the specifiers of its source (parsed with es-module-lexer), so minifying can never break the import check.

### D4. Per-route code splitting

`js/app.js` keeps the router, the header, the shell, the Mode picker, store and fx setup, and the route table. Each route's view moves to its own module and is imported on first visit:

| Route | Module | Pulls in |
|---|---|---|
| `#/` Home and tiles | `js/views/home.js` | `gamify.js`, `bolt.js` |
| Sky (Home for Sky Players), `#/places` | `js/views/sky.js` | `sky.js`, `sky-view.js` |
| `#/learn`, `#/grade`, `#/skill`, `#/mix` | `js/views/learn.js` | `skills/index.js` and the grade files, `viz.js`, `check.js`, `answers.js` |
| `#/dojo`, `#/tricks`, `#/kata` | `js/views/dojo.js` | `vedic.js`, `check.js` |
| `#/star/...` | `js/views/star.js` | `star.js`, `watch.js` |
| `#/arena`, `#/tower` | `js/views/arena.js` | `arena.js`, `levels.js`, `adapt.js`, `mental.js`, `cloud.js` (Firebase itself stays lazy inside it) |
| `#/games` | `js/views/games.js` | `games.js`, `levels.js`, `adapt.js` |
| `#/sutras`, `#/sutras/<id>` | `js/views/sutras.js` | `sutras.js`, `sutra-details.js`, `scenes.js` |
| `#/watch` | `js/views/watch.js` | `watch.js` (then `videos.js`, lazy as today) |
| `#/guide` | `js/views/guide.js` | `guide.js`, `guide-art.js`, `tour.js` |
| `#/me` | `js/views/me.js` | `store.js` helpers, `cloud.js` for World board settings |
| Play experiences | `js/play/exp/<id>.js` | unchanged (PR #47) |

- The route table holds `[pattern, () => import('./views/<name>.js'), exportName]`. `render()` awaits the import under the view's signal; if the signal aborts before the module arrives (the Player moved on), the result is dropped. After 300 ms without the module it shows a quiet loading line in the view (no spinner for fast loads, no layout jump: the view keeps its minimum height, page-layout "Stable layout while loading"). If the import fails it shows "This part did not load." with Retry, and Retry imports again (a failed dynamic import is not cached by browsers, so a retry really refetches).
- Dynamic imports resolve through the import map, so they keep their `?v=` stamps. `build.py`'s import check learns `import('./views/x.js')` with a literal string (it already parses static imports; a non-literal `import()` outside `js/play/` fails the build, so every chunk is known).
- Shared helpers used by several views (`crumbs`, `icon`, `tile`, the result card) move from `app.js` into `js/views/kit.js`.
- The skill data (`js/skills/*.js`, 82 KB minified) loads with Learn, Stars and the Arena, not with Home. `skillsFor()` and `byId` stay in `skills/index.js`; Home's tiles read only the counts it needs from a small `js/skills/meta.js` the build checks against the full data (a test fails if they drift).
- `lifecycle-scan.test.mjs` covers `js/views/`.

### D5. Preload and prefetch

- **Entry graph:** `build.py` writes `<link rel="modulepreload" href="/js/<m>.js?v=<hash>">` for every module in the static graph of `js/app.js` plus `js/views/home.js` (the first route for most visits), right after the import map. That flattens the 7-level waterfall to one round. Only these: preloading lazy chunks would undo the split.
- **Intent prefetch in the game:** new `js/prefetch.js`. On `pointerenter`, `focusin` or `touchstart` on a nav tab, a Home tile, a Sky Landmark or a shelf card, it calls `import()` for that route's module (once per module per page). Listeners are tied to the view's signal with `life.on`. Nothing is prefetched when `navigator.connection.saveData` is true or `effectiveType` is `slow-2g` or `2g`.
- **Idle prefetch:** after the first route has rendered and the browser is idle (`life.idle()`, a new helper on `requestIdleCallback` with a `setTimeout` fallback, tied to a signal), the most likely next module is imported: from Home, the Star Bolt suggests (`js/views/star.js`) or the Arena; from a Star result, the Sky. At most one idle prefetch per route, and none under Save-Data.
- **Between pages (Speculation Rules):** the landing and grown-up pages carry one rules block (built by `build.py` so its hash goes into the page's CSP):
  - `prefetch`, eagerness `moderate`, for same-origin links matching `/*`, excluding links with a query, `[download]`, `[target=_blank]` and `.no-prefetch`;
  - `prerender`, eagerness `moderate`, for `/play/` only, once D6 is in place (task 6.3 adds it after the prerender tests pass).
  - The game page carries a `prefetch` rule (eagerness `conservative`) for links to the grown-up pages.
  - Hash links are never listed (a hash route is not a document). Chrome and Edge act on the rules; Safari and Firefox ignore what they do not support, so this is a progressive enhancement.

### D6. Prerender-safe start-up

`/play/` may be prerendered from the landing page only if nothing happens before the Player sees it. `js/app.js` wraps start-up in `whenShown(fn)`: if `document.prerendering` is true, it waits for `prerenderingchange`; otherwise it runs at once. Inside it: `gm.init()` and `gm.startDay()` (they write the quest day), `metrics.returnCheck()` (writes `vm.firstSeen`, sends return events), the first route-view event, `initAmbient()` (music and the moving background), the worker registration and the Tour. Rendering the first view's markup may happen before activation, since it only reads storage.

`js/analytics.js` (added by the move) queues every event while `document.prerendering` is true, and loads GoatCounter and the Cloudflare beacon only after activation. That is the one place that makes counting prerender-safe for every page.

### D7. A static first screen

`play/index.html` ships, inside `<main id="view">`, the markup of the first-visit Mode picker (title, the three Mode cards, the Guide link), written by `build.py` from the same template the app uses (`js/views/modes.js` exports the HTML builder; the build runs it in Node). A returning Player's first render replaces it; to avoid a flash, the inline pre-paint script (the one that applies the theme) adds `class="returning"` to `<html>` when `vm.players` exists, and `math.css` hides the static picker under `.returning` and reserves the view's height. First-time visitors and crawlers get real content at first paint.

### D8. Fonts

- `tools/subset-fonts.py` (fontTools `pyftsubset`, pinned in `tools/requirements.txt`, repo-only) writes the published `woff2` files from the vendored originals, keeping Basic Latin, Latin-1 Supplement, Latin Extended-A, the IAST letters in Latin Extended Additional (ā ī ū ṛ ṝ ḷ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ and their capitals), general punctuation, the math signs the app prints (− × ÷ √ ² ³ ½ ¼ ¾ ≈ ≠ ≤ ≥ π and the fraction slash) and the arrows. Layout features kept: `kern`, `liga`, `tnum` (for scores).
- `test/fonts.test.mjs` collects every character in `js/`, `site/` and `play/index.html` strings and fails on one outside the subset (Devanagari is not in these fonts at all and falls back to the system font, which the Sutra pages already expect; the test ignores the Devanagari block).
- Preload only Nunito Sans (body) and Fredoka 700 (headings); Space Grotesk and JetBrains Mono load when first used, which browsers already do for declared but unused faces. `font-display: swap` stays.
- Expected saving: the five files are 108 KB today; subsetting typically halves Latin-only variable fonts (to measure, task 7.2).

### D9. Pause what is not seen

- **Sky:** `skyView()` adds an `IntersectionObserver` (through a new `life.observe()` helper, disconnected on abort) on `#sky`. Off screen or with the tab hidden, the Sky gets `sky--paused`, and `math.css` sets `animation-play-state: paused` on everything under it; the pointer and scroll parallax handlers return early. The two twinkling layers get `will-change: opacity` so the twinkle is composited instead of repainting the SVG.
- **Moving background (`js/ambient.js`):** it starts only after the first view has rendered and the browser is idle (or after the first tap, whichever is first), never during the first paint. It holds still (one still frame, no frame loop) while the game shell (`js/shell.js`, every timed or untimed round) is open, so a round's input never competes with it, and resumes after. Its device-pixel ratio is capped at 1.5, and at 1 when `navigator.deviceMemory` is 4 or less. It already stops when the tab is hidden.
- Both keep their existing rules for reduced motion, Pause motion and Calm.

### D10. Offline: core precache, the rest saved on first open (owner P5)

- **Precached at install** (hash checked as today): `/play/`, `math.css`, the theme, design system, fonts, icons, manifest, the entry graph, and the core route graphs: Home, Sky, Learn, Dojo, Star, Arena, Games, Me. That keeps the move's "Offline play" promise (Practice, Stars, games and Device boards offline after one visit).
- **Saved on first open:** Play experience modules and stylesheets, `js/views/watch.js` and `js/videos.js`, `js/views/sutras.js` with `sutra-details.js` and `scenes.js`, `js/views/guide.js`, the Natural voice files (already runtime cached by better-voice). `build.py` writes a second list into the worker, `LAZY` (`[url, hash]`), between the same markers. When a page requests a `LAZY` URL, the worker fetches it, checks the hash, stores it in the current cache and serves it; a mismatch is served but not stored (a half-propagated deploy fixes itself on the next open). `?v=` URLs stay cache first.
- **Carried across versions:** in `activate`, lazy entries in the previous cache whose URL (and so hash) is unchanged are copied into the new cache before the old one is dropped, so a deploy does not make opened experiences unavailable offline. Changed ones are fetched again on the next open.
- **Offline cards:** when `navigator.onLine` is false, a shelf card whose module is not in the cache (asked through a small `postMessage` to the worker, `{ type: 'cached?', urls }`) shows "Needs a connection the first time" and is still a link (opening it shows the D4 Retry message).
- Precache size drops by the Play experiences, Watch data, Sutra deep dives and the Guide (to measure: task 8.5).

### D11. Navigation preload

The worker enables navigation preload in `activate` (`self.registration.navigationPreload.enable()`) and its network-first page handler uses `event.preloadResponse` when present, so a page load no longer waits for the worker to start before going to the network. The 3.5 s fallback to the saved shell stays.

## Considered

- **A bundler (esbuild bundle, Rollup):** one request per route chunk instead of several, but it changes the import map model, the worker's per-module hashes and the "no bundler" rule, and HTTP/2 or HTTP/3 with `modulepreload` already removes most of the cost of many small files. Rejected for now; reconsider only if D2 cannot be met.
- **Content-hashed file names with `Cache-Control: immutable`:** best for repeat visits without the worker, but the worker already serves `?v=` files cache first, and renaming every file touches the build, the import check, the e2e fixtures and the CSP. Not now.
- **Precompressed `.br` files from the build:** smaller than edge Brotli, but not documented for Workers static assets. Only if task 3.4 shows the edge does not compress.
- **Prerender `/play/` without gating start-up:** writes quest days and sends events for pages never shown. Rejected (architecture note 3(a)).

## Risks and trade-offs

- **Lighthouse on GitHub runners is noisy.** Simulated throttling (Lantern) and the median of 5 keep it stable enough; the byte gate is exact and catches most regressions first. A flaky timing failure can be re-run; if it flakes twice in a month, widen to 7 runs before touching a budget.
- **Code splitting adds a small wait on first visit to each section** on slow networks. Intent and idle prefetch hide most of it, and the core sections are precached after the first visit.
- **Lazy-saved code is not offline until opened once.** That is the P5 trade-off the owner accepted; the offline card note says so.
- **Font subsetting can drop a character a later change adds.** The fonts test fails the build first.
- **Splitting `app.js` is a large diff** that touches every view. Each route moves in its own commit with its e2e specs green.

## Migration plan

Tasks run in order: measure (1), gates (2), minify (3), split (4), prefetch and prerender (5, 6), first screen (7), fonts, pause, offline (8 to 10). Every step ships alone and keeps the suite green. Rollback of any step is a revert; the worker's VERSION changes with every build, so clients pick up a revert like any deploy.

## Open questions (defaults used in this change)

1. Moving background on low-memory devices: default, it holds still during rounds and starts after idle, but stays on by default everywhere. Alternative: off by default when `deviceMemory` is 4 or less or Save-Data is on (the switch still turns it on).
2. Gate: default, Lighthouse CI on previews fails the pull request; field data is reviewed monthly and never gates.
3. Real device: default, WebPageTest's free real Moto G plus any Android phone the owner already has; no purchase.
