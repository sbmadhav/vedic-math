# Tasks

Approved for building once merged (proposal.md). Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`).

## 1. Generator and pages

- [ ] 1.1 `tools/trick-pages/pages.ts`: the 15 rows of design D2 (Trick id, slug, worked example numbers, meta description under 160 characters). Verify: `test/trick-pages.test.mjs` checks every id exists in `TRICKS`, every slug is unique and lowercase words, every example passes the Trick's `valid()` and `answer()` equals the expected result recorded in its row for that Trick's operation (a product, a difference, a quotient, a digit-sum check or a root), and no description has an em dash.
- [ ] 1.2 `tools/trick-pages/generate.ts` (run by `pnpm gen:tricks`): renders `site/tricks/index.html` and `site/tricks/<slug>/index.html` with the header from `theme/header.html`, the Sutra line and 1965 book credit (design D6), the worked example from `steps()`, Practice this trick, the metadata and JSON-LD (design D5). Verify: the test regenerates into a scratch folder and fails when the committed pages differ; `python3 build.py` accepts the pages (header, brackets, hosts).
- [ ] 1.3 `theme/tricks.css`: the page, the calculator and the step highlight classes the steps use (`hl`, `hl-coral` and the rest), tokens only, Daybreak and Deep Space, 320 px wide without overflow. Verify: `a11y.spec.ts` gains `/tricks/` and two Trick pages in both schemes; screenshots at 375 and 1280 px checked by eye.

## 2. Calculator

- [ ] 2.1 `tools/trick-pages/calculator.ts`: inputs, `valid()` messages, Show steps, New numbers, Back, Next, Show all, the polite step line, no motion by itself, the fade only after a press and never under reduced motion, Pause motion or Calm; listeners through `on()` from `/js/life.js`. Verify: new `e2e/tests/cov/trick-pages-2.spec.ts` (Typed numbers, A number the Trick does not take, Keyboard and screen reader) on `sq5`, `near-base` and `duplex`.
- [ ] 2.2 `build.py` publishes `/tricks/calculator.js` from it with the types taken out (as `tools/build-sw.mjs` does), with every other runtime module of `tools/trick-pages/` at `/tricks/<name>.js` (design D4), stamped `?v=` like every page script, and never in the precache list. The build writes a page-local import map into each Trick page and the warm-up (design D4) pinning every module in the graph to `?v=<hash>`. Verify: `test/build.test.mjs` (published, not precached, no import of a `.ts` path, the entry script and every nested import resolve to a stamped URL, and the source pages carry no map); a module-load check in `e2e/tests/trick-pages.spec.ts` on every page fails on any 404 response or `pageerror`; `e2e/tests/cov/trick-pages-5.spec.ts` (The game's first load).

## 3. Findable

- [ ] 3.1 Sitemap and canonical: confirm the build's page list adds the 16 URLs to `sitemap.xml` and `_headers` (26 rules of 100). Verify: new `e2e/tests/cov/trick-pages-3.spec.ts` (Canonical and sitemap, Structured data, parsed with `JSON.parse`).
- [ ] 3.2 The landing page footer gains "Speed tricks" linking to `/tricks/`. Verify: `e2e/tests/landing.spec.ts` footer links.

## 4. Words, budget, analytics

- [ ] 4.1 Copy: `test/copy.test.mjs` scans `site/tricks/**` (1965 book on each Trick page, no banned phrase, no em dash). Verify: new `e2e/tests/cov/trick-pages-4.spec.ts` (Copy scan) and the unit test.
- [ ] 4.2 Budget: `tools/budget.ts --page /tricks/<slug>/`, `trickPage.max` in `docs/perf/baseline.json` from the first measured figure (design D7), and the build fails above it. Verify: a build test with a 20 KB addition to the calculator fails.
- [ ] 4.3 Events `math/tricks/calc/<trick>` and `math/tricks/practice/<trick>` (design D8). Verify: new `e2e/tests/cov/analytics-15-trick-pages.spec.ts`; `e2e/tests/cov/trick-pages-5.spec.ts` (Nothing stored, no Google host).
- [ ] 4.4 `e2e/tests/trick-pages.spec.ts`: every page opens, has one h1, its Practice link and no console error; JavaScript off shows the worked example (`trick-pages-1.spec.ts`, JavaScript off).
- [ ] 4.5 `GLOSSARY.md`: **Trick page** (a static page at `/tricks/<slug>/` for one Trick, with its calculator; not a game view).

## 5. Owner and follow-ups

- [ ] 5.1 **[OWNER]** After the pages are live, submit `https://learnvedicmath.com/sitemap.xml` in Google Search Console (and Bing Webmaster Tools if wanted): owner setup section 16, learnvedicmath task 1.11. Then, after four weeks, look at which Trick pages get impressions.
- [ ] 5.2 With `react-typescript` task 5.3: link each prerendered Sutra page to its Trick pages and point each Trick page's Sutra link at the prerendered Sutra page (design D1).
- [ ] 5.3 `openspec validate trick-pages --strict`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py`; the touched specs plus `a11y.spec.ts` on chromium, webkit and mobile with `--retries=0`.
- [ ] 5.4 After release: archive this change with its coverage specs.
