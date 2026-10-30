# Design

## Decisions (owner-delegated, 2026-10-30)

### D1. Build now, as static pages, outside the game

Owner-delegated, 2026-10-30. The alternative was to wait for `react-typescript` phase 4 (task 5.3), which prerenders the Sutra pages. That is behind phase 2, which waits for Workers Paid (owner task 0.8), then phases 3 and 4: months of PRs. The Trick pages are not game views: like the landing page and the grown-up pages they are the same for every visitor, need no Player, Mode or storage, and stay static files after the migration. They live at the site root (`/tricks/`), outside the game's path (`/play/` today, `/learn/` after phase 2), so the migration never moves them. When task 5.3 prerenders the Sutra pages, each Sutra page links to its Tricks' pages and each Trick page's Sutra link points at the prerendered Sutra page instead of `/play/#/sutras/<id>` (task 5.2 here, to do with 5.3).

### D2. Which 15 Tricks

Owner-delegated, 2026-10-30. The 21 Tricks in `js/vedic.js`, less the six about equations, recurring decimals and divisibility tests (`transpose`, `zero-sum`, `add-sub`, `ratio-zero`, `recip`, `osculator`), which people rarely search by those names and whose inputs are four coefficients rather than "two numbers". The 15, with their slugs (lowercase words of what the Trick does, never the Sanskrit, so the URL says what a searcher typed):

| Trick id | Slug | Title (from `js/vedic.js`) |
| --- | --- | --- |
| `sq5` | `square-numbers-ending-in-5` | Square numbers ending in 5 |
| `near-base` | `multiply-numbers-near-100` | Multiply numbers near 10, 100 or 1000 |
| `crosswise` | `multiply-any-two-numbers-in-one-line` | Multiply any two numbers in one line |
| `from9` | `subtract-from-100-or-1000` | Subtract from 100, 1000, 10000 |
| `by9s` | `multiply-by-9-99-or-999` | Multiply by 9, 99 or 999 |
| `ends10` | `multiply-when-last-digits-add-to-10` | Same start, last digits add to 10 |
| `square-near` | `square-numbers-near-100` | Square numbers near a base |
| `by11` | `multiply-by-11` | Multiply by 11 |
| `div9` | `divide-by-9` | Divide by 9 with running sums |
| `check9` | `check-answers-with-digit-sums` | Check answers with digit sums |
| `times5` | `multiply-by-5-25-50-or-125` | Multiply by 5, 25, 50 and 125 |
| `sub-base` | `multiply-with-a-working-base` | Multiply with a working base like 50 |
| `duplex` | `square-any-two-digit-number` | Square any two-digit number |
| `sqroot` | `square-roots-in-your-head` | Square roots by looking |
| `cuberoot` | `cube-roots-in-your-head` | Cube roots in two seconds |

A slug never changes once published; a renamed Trick keeps its slug, and a removed one gets a `_redirects` line.

### D3. Generated from the Trick catalog, committed

Owner-delegated, 2026-10-30. `tools/trick-pages/generate.ts` imports `js/vedic.js` and renders each page from the Trick's `title`, `sutra`, `meaning`, `when`, `idea` and `steps()` for the page's fixed worked example (in `tools/trick-pages/pages.ts`, one per Trick, e.g. 65 for `sq5`, 97 × 94 for `near-base`), into `site/tricks/<slug>/index.html` with the header from `theme/header.html`. The output is committed and `test/trick-pages.test.mjs` fails when it is stale, as `js/voice-index.js` is handled. So the build needs no new step for the pages, a reviewer sees the exact HTML, and every existing page check (the header, stamps, CSP hashes, `[square brackets]`, hosts, sitemap) applies to them unchanged.

### D4. The calculator is the game's animator, as a small TypeScript module

Owner-delegated, 2026-10-30. `tools/trick-pages/calculator.ts` (new code is TypeScript) imports `TRICKS` from `/js/vedic.js` and `on` from `/js/life.js`, reads the page's `data-trick`, and draws the Trick's `inputs`, runs `valid()` and steps through `steps()` with Back, Next and Show all, the way `mountAnimator` does in the game. `build.py` publishes every runtime module in `tools/trick-pages/` (all but `generate.ts`) at `/tricks/<name>.js` with its types taken out by Node's type stripper, as `tools/build-sw.mjs` does for `/sw.js`, so `calculator.ts` becomes `/tricks/calculator.js`. They import each other by those published URLs (`/tricks/step-board.js`) and the game's modules by `/js/...`, never by a `.ts` path, so what the browser fetches is exactly what was published; a module-load test opens each page and fails on any 404 or `pageerror`. Cache stamps: these pages have no import map today (the landing page imports `/js/life.js` unstamped), so a nested import would be fetched without `?v=`. The build gives each Trick page and the warm-up a page-local import map, written the way `play/index.html`'s is, that pins `/js/vedic.js`, `/js/lib.js`, `/js/life.js` and each `/tricks/<name>.js` to its `?v=<hash>` URL, and the page's inline-script hash covers it in `_headers`. The source pages carry no map (the stamps rule). Type checking: `tools/trick-pages/` gets its own `tsconfig.json` extending `tsconfig.base.json` with the DOM libraries and a declaration file for the `/js/vedic.js` and `/js/life.js` imports (paths mapped to `js/`), run by the `tools` package's `typecheck` script, so `pnpm typecheck` covers the browser modules (task 2.1). It is not under `/js/`, so it is not in the game's import map, precache or first-load budget. Its listeners go through `on()` with a page-lifetime signal. The step text comes from `js/vedic.js`, numbers only, so it is set as the game sets it.

### D5. Search metadata

Owner-delegated, 2026-10-30. Per page: `<title>` "<Trick title>: the speed trick, step by step · Learn Vedic Math"; a meta description from `pages.ts` (under 160 characters, one sentence, no em dash); `<link rel="canonical" href="https://learnvedicmath.com/tricks/<slug>/">`; Open Graph title, description, URL and the site's existing share image; JSON-LD `LearningResource` (name, description, `teaches`, `educationalLevel` from the Trick's `grade`, `isAccessibleForFree: true`, `inLanguage: en`, `learningResourceType: "interactive resource"`) and `BreadcrumbList` (Home, Speed tricks, the Trick). No `HowTo` or `FAQPage`: search engines no longer show those for most sites, and a FAQ would be padding. JSON-LD is `type="application/ld+json"`, which the build does not hash (it does not run).

### D6. Honest framing and words

Owner-delegated, 2026-10-30. Each page names the Sutra as "From the sutra <Sanskrit name>, '<meaning>', in Bharati Krishna Tirtha's 1965 book <i>Vedic Mathematics</i>", which the honest-framing spec requires wherever the source is mentioned; no page says the Tricks are from the Vedas or calls them Vedic sutras. Words from GLOSSARY: Trick, Sutra, Deep dive; the call to action is "Practice this trick", not "Master this trick in 60 seconds" (the feedback's line), because nothing measures 60 seconds and Practice is the glossary's word.

### D7. Weight: a budget per page

Owner-delegated, 2026-10-30. A Trick page's first load (the page, its CSS, the calculator, `/js/vedic.js`, `/js/life.js`, the design system's files and the fonts it uses, each once) SHALL be at most 80 KB Brotli; `/js/vedic.js` is about 37 KB raw, so most of it is the shared site files the landing page also loads. `tools/budget.ts` gains a `--page <path>` measure, and `build.py` fails a Trick page above `trickPage.max` in `docs/perf/baseline.json` (the first measured figure is recorded there with a margin, and noted in `firstLoad.changes` style). The game's first load is unchanged and the existing gate proves it. If 80 KB turns out too tight once measured, the implementer records the measured figure and the reason, not a bigger round number.

### D8. Analytics

Owner-delegated, 2026-10-30. Two events of fixed words: `math/tricks/calc/<trick>` the first time Show steps draws steps on a page load (New numbers alone does not count), and `math/tricks/practice/<trick>` on Practice this trick. `<trick>` is a Trick id from the catalog. Never the typed numbers.

## What the feedback had wrong or already done

- "The Sutras live behind hash routes (/play/#/sutras/...)": true, and so do the Tricks (`/play/#/skill/v-<trick>`). The pages are per Trick (D2), and Sutra pages come with `react-typescript` 5.3.
- "Watch the Sutra animate the shortcut for them": the game's animator already does this for typed numbers; the pages reuse it (D4) rather than build a new one.
- "Master this trick in 60 seconds": not claimed (D6).
