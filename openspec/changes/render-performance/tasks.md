# Tasks

Build order (owner M6): this change first after the learnvedicmath.com move, then `duel-online`, then `gpu-effects`. Tasks marked **[OWNER]** need the owner. "Verify:" says how a task is checked. Every code task keeps `node --test 'test/**/*.test.{js,mjs}'`, the build and the Playwright suite green, and updates the matching e2e spec in the same commit (CLAUDE.md).

## 0. Before building

- [ ] 0.1 Confirm the `learnvedicmath` change and PR #47 (`play-experiences`) are merged and archived, and rebase this change onto `main`. Update paths in `design.md` for anything they renamed.
- [ ] 0.2 Verify: `openspec validate render-performance --strict` reports no "Archive would refuse" notice (the `offline-app` and `play-experiences` MODIFIED deltas now have their base specs). If the base requirement text changed, copy the new text into the deltas before editing.
- [ ] 0.3 **[OWNER]** Answer the open questions in `design.md` (moving background on low-memory devices, which check gates, real device). Fold a different answer in with `/opsx:update`.

## 1. Measure first (D1)

- [ ] 1.1 `tools/package.json` (repo-only, in `_config.yml` `exclude:`) pinning `@lhci/cli` and esbuild; `tools/lighthouserc.json` with the mobile preset, 5 runs, the D1 pages, and no assertions yet. Verify: `cd tools && npx lhci collect --url=https://learnvedicmath.com/play/` produces reports.
- [ ] 1.2 Run the lab baseline against production and write `docs/perf/baseline.md` (date, tool versions, median FCP, LCP, CLS, TBT, Speed Index, transfer size and request count per page; first and repeat view for `/play/`).
- [ ] 1.3 WebPageTest real-device runs (Moto G class, 4G profile, first and repeat view) for `/` and `/play/`; add them to the report with links.
- [ ] 1.4 **[OWNER]** On any mid Android phone you have: open `chrome://inspect` from a computer, record `/play/` first visit, opening the Arena, a Star round and the Sky scrolled (steps in the report). Add the numbers or give the recordings to the builder.
- [ ] 1.5 Record the field p75 Core Web Vitals from Cloudflare Web Analytics for the first full week after launch.

## 2. Gates (D2)

- [ ] 2.1 `build.py`: compute the Brotli (quality 4) size of JS and CSS before play (entry graph, Home graph, inline scripts), of each route graph and of each landing page's JS; print the table; write `_budget/budget.json` outside the output folder (add `_budget/` to `.gitignore`, and `budget.json` to `ci.yml`'s repo-only check of `_site/`); fail over the budgets. Verify: `test/budget.test.mjs` builds a fixture with an oversized module and expects the failure message; a normal build prints the table and leaves no `budget.json` in the output folder.
- [ ] 2.2 `tools/lighthouserc.json` assertions (FCP < 1500 ms, LCP < 2500 ms, CLS <= 0.1, TBT <= 200 ms, median of 5). Verify: a deliberately slowed preview (a 2 s blocking script in a throwaway branch) fails the check.
- [ ] 2.3 Perf job in the move's `preview.yml`: after the preview is up, run Lighthouse CI on it, compare `budget.json` with the one from `main`, and comment on the pull request (sizes, growth over 5 KB, the five timings). On `main`, run against production after the deploy and open an issue on failure. Pin every action by SHA. Verify: a pull request shows the comment; the job is a required check.
- [ ] 2.4 Update `CLAUDE.md` (budgets, how to read the comment, how a budget may change) and `GLOSSARY.md` (Performance budget).

## 3. Minify and compress (D3)

- [ ] 3.1 `build.py` minify step through `tools/node_modules/.bin/esbuild` (transform per file, JS and CSS); hashes on minified bytes; `--dev` skips it; `--sourcemap` writes maps to a repo-only folder. Verify: `test/build.test.mjs` checks a minified module is smaller than its source and still has its import map entry.
- [ ] 3.2 Import-specifier check with es-module-lexer (pinned in `tools/`): every minified module imports exactly its source's specifiers. Verify: a fixture whose minified output loses an import fails the build.
- [ ] 3.3 Pre-commit hook and `ci.yml`: `npm ci --prefix tools` before the build. Verify: a clean clone builds with the hook.
- [ ] 3.4 Check edge compression: `curl -sI -H 'Accept-Encoding: br' https://learnvedicmath.com/js/app.js?v=<hash>` and the same for `/math.css` and `/play/`. **[OWNER]** If not `br`, add a Cloudflare Compression Rule (steps from the builder). Add the curl check to the daily `e2e.yml`. Verify: the daily job passes.
- [ ] 3.5 Re-run task 1.2 and add a "after minify" row to the report.

## 4. Per-route code splitting (D4)

- [ ] 4.1 `js/views/kit.js`: move `crumbs`, `icon`, `tile`, the result card and other shared view helpers out of `app.js`. Verify: unit tests for the helpers; full e2e green.
- [ ] 4.2 Route table with lazy loaders; `render()` awaits the import under the view's signal, drops a late result, shows the loading line after 300 ms and Retry on failure. Verify: `e2e/tests/loading.spec.ts`: a routed request delayed by 1 s shows the line and the view keeps its height; a failed request shows Retry and Retry recovers; leaving during the load leaves the new view alone.
- [ ] 4.3 Move each view in its own commit: Home, Sky, Learn, Dojo, Star, Arena, Games, Sutras, Watch, Guide, Me (D4 table). Verify per commit: that section's e2e specs and `routes.spec.ts` pass; `lifecycle-scan.test.mjs` covers `js/views/`.
- [ ] 4.4 `js/skills/meta.js` with the counts Home needs, and a node test that checks it against the full skill data. Verify: Home's first load requests no `js/skills/` grade file (`loading.spec.ts`).
- [ ] 4.5 `build.py`: accept literal `import('./views/x.js')`; fail on a non-literal `import()` outside `js/play/`; know every route graph for the budget. Verify: build tests for both cases.
- [ ] 4.6 Verify: `loading.spec.ts` "First visit to Home" (no Arena, games, Sutra details, Guide or experience modules requested); byte budget table shows JS before play under 100 KB.

## 5. Preload and prefetch (D5)

- [ ] 5.1 `build.py` writes `modulepreload` links for the entry and Home graphs. Verify: build test counts the links and finds none for the Arena or games modules.
- [ ] 5.2 `js/life.js`: `idle(fn, signal)` and `observe(el, fn, signal)` (IntersectionObserver), with unit tests in `test/life.test.mjs`; the lifecycle scan accepts them.
- [ ] 5.3 `js/prefetch.js`: intent prefetch on nav tabs, Home tiles, Sky Landmarks and shelf cards; idle prefetch of the likely next section; nothing under Save-Data or 2G. Verify: `loading.spec.ts`: hovering the Arena tab requests the Arena module; with `saveData` emulated nothing is requested; leaving the page removes the listeners (no request after a route change).
- [ ] 5.4 Speculation Rules block on the landing and grown-up pages (prefetch, moderate) and on `/play/` (prefetch, conservative, grown-up pages only), built by `build.py` with its hash in the page CSP. Verify: `e2e/tests/prerender.spec.ts` (chromium) parses the rules, finds no hash or query URL in them, and the CSP report endpoint receives no violation.

## 6. Prerender-safe start-up (D6)

- [ ] 6.1 `whenShown()` in `js/app.js` around `gm.init`, `gm.startDay`, `metrics.returnCheck`, the first route view, `initAmbient`, the worker registration and the Tour. Verify: unit test with a fake `document.prerendering`; e2e "Prerendered but never opened" (chromium): no analytics request and no new storage keys.
- [ ] 6.2 `js/analytics.js`: queue while prerendering, load the scripts after activation. Verify: `analytics.spec.ts` gains both analytics scenarios from the spec delta.
- [ ] 6.3 Add the `prerender` rule for `/play/` on the landing page. Verify: `prerender.spec.ts` "Prerendered and opened" (chromium, headed if headless does not activate prerenders; note it in the spec): `performance.getEntriesByType('navigation')[0].activationStart > 0` and one Home route view.

## 7. Static first screen and fonts (D7, D8)

- [ ] 7.1 `js/views/modes.js` exports the Mode picker builder; `build.py` runs it in Node and writes the markup into `play/index.html`'s `<main>`; the pre-paint script marks returning Players; `math.css` hides the static picker for them and reserves the height. Verify: e2e "First visit with JavaScript slow" (modules delayed 2 s, the picker is visible at first paint) and "Returning Player" (a screenshot sequence never shows the picker); CLS stays at 0 in Lighthouse.
- [ ] 7.2 `tools/subset-fonts.py` and `tools/requirements.txt` (fontTools pinned); the build publishes subset fonts; preload only Nunito Sans and Fredoka 700. Record old and new font bytes in the report. Verify: `test/fonts.test.mjs` passes on the current copy and fails on a fixture string with a missing character; the Sutra pages show IAST names in Fredoka and Nunito Sans (screenshot check in `sutra-modal.spec.ts`).

## 8. Pause what is not seen, offline (D9, D10, D11)

- [ ] 8.1 Sky: `life.observe` on `#sky`, `sky--paused` off screen or hidden, `will-change: opacity` on the twinkle layers, parallax handlers return early while paused. Verify: `sky.spec.ts`: after scrolling the Sky out of view, `getAnimations()` on its layers report `paused`; back in view, `running`.
- [ ] 8.2 Moving background: start after first render plus idle or first tap; hold still while the game shell is open; DPR caps. Verify: `e2e`: with the background on, no frame is drawn during an Arena round (a frame counter exposed in test builds only, through a `data-frames` attribute updated every second); unit test for the DPR cap.
- [ ] 8.3 `build.py` writes `LAZY` into the worker (today's unhashed `[url, None]` shared entries are gone by then: the `learnvedicmath` change vendors the design system, fonts, icons and analytics and hashes every precache entry; if any remain, hash them here); `sw.js` stores lazy files only on a hash match, copies unchanged lazy entries into the new cache on `activate`, answers `cached?` messages. Verify: `test/build.test.mjs` (no `js/play/exp/` in PRECACHE, every PRECACHE and LAZY entry has a 10-character hash); `offline.spec.ts` (chromium, the real worker on `_site`): an experience opened online opens offline; after a rebuild that does not change it, it still opens offline; a never-opened one shows "Needs a connection the first time".
- [ ] 8.4 Navigation preload in `sw.js`. Verify: `offline.spec.ts` checks `navigationPreload.getState()` is enabled after activation and the shell still loads offline.
- [ ] 8.5 Record the precache size before and after in the report.

## 9. Close out

- [ ] 9.1 Re-run the full baseline (1.2, 1.3) and add an "after" section to `docs/perf/baseline.md` with the change in each number.
- [ ] 9.2 Update `CLAUDE.md` (views folder, the minify step, `tools/`, budgets, lazy cache) and `_config.yml` `exclude:` (`tools/`, `docs/perf/` is already under `docs/`).
- [ ] 9.3 `openspec validate render-performance --strict`; after release and one week of field data with no regression, archive with `/opsx:archive`.
