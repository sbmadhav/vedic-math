# Tasks

Approved for building once merged (proposal.md). Built on 2026-10-31 before `trick-pages` landed (design D9: this change creates the shared modules in the shape D7 names, and `trick-pages` adopts them). Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`).

## 1. Data and modules

- [x] 1.1 `tools/trick-pages/warm-up-problems.ts`: the table of design D3, plus a worked example per Trick for the first screen (distinct from the three problems) and the question and answer words (`problemText`, `answerText`). Verify: `test/warm-up.test.mjs` runs every example and problem through its Trick's `valid()` and `answer()`, checks each Trick's three problems grow (`rises()`: more digits, or the same digits and a larger number) and that the ids are exactly the 15 in `pages.ts`. Done 2026-10-31: 6 tests pass (`pnpm exec vitest run --project legacy test/warm-up.test.mjs`).
- [x] 1.2 Split the step board out of the `trick-pages` calculator into `tools/trick-pages/step-board.ts`, used by both, published at `/tricks/step-board.js` with `pages.ts` and `warm-up-problems.ts` beside it (design D7), imported by those URLs. Done 2026-10-31 as design D9 says: `step-board.ts` is written here for the calculator to adopt (`trick-pages` had not landed); `build.py` publishes every runtime module of `tools/trick-pages/` at `/tricks/<name>.js` with its types taken out, checks their imports (`/js/` and `/tricks/` only, never a `.ts` path) and writes the warm-up page's page-local import map pinning its graph. Verify: `test/build.test.mjs` (two new tests: the published modules, the map and its hashes, no precache; the three failing imports); the `trick-pages` cov specs do not exist yet; the module-load check is `teacher-warm-up-1.spec.ts` (no failed request, no page error on `/teachers/warm-up/`).
- [x] 1.3 The Trick of the day (local day number modulo 15), Pick a trick, `?trick=<id>` with fallback: `tools/trick-pages/warm-up-pick.ts` (design D9: its own module so `pages.ts` stays data). Verify: unit test for the rotation over 30 dates (`test/warm-up.test.mjs`); `e2e/tests/cov/teacher-warm-up-2.spec.ts` (Two days with a fixed clock, A bookmarked Trick, Problems rise) passes on chromium against the local build.

## 2. The page

- [x] 2.1 `site/teachers/warm-up/index.html` with the site header, the five screens, Reveal and Show the steps, the polite progress line, the no sign-in sentence and privacy link (design D6), the 1965 book credit. Verify: `e2e/tests/cov/teacher-warm-up-1.spec.ts` (A whole warm-up, Reveal, then the steps, From the teachers page) passes; `python3 build.py` accepts the page (header, hashes, hosts; 12 pages).
- [x] 2.2 `tools/trick-pages/warm-up.ts`, published at `/tricks/warm-up.js` with the types taken out; keys Right, Space, Page Down, Left, Page Up, R (as runs of beats, design D8); Full screen; every listener through `on()` from `/js/life.js` with the signal of one page-lifetime `AbortController`. Verify: `e2e/tests/cov/teacher-warm-up-3.spec.ts` (A presenter clicker, Nothing moves by itself, Full screen button hidden when `document.fullscreenEnabled` is false) passes; `test/copy.test.mjs` scans the modules for a bare listener, timer or storage call.
- [x] 2.3 `theme/warm-up.css`: the projector sizes (design D5), tokens only, Daybreak and Deep Space. Verify: `teacher-warm-up-3.spec.ts` (Big enough for the back row at 1280 × 720, both schemes: the longest problem's font is at least 144 px and fits the width); `a11y.spec.ts` gains the page in both schemes (Today's trick stepped, a problem revealed with a step) and in the grown-up pages list, passing; screenshots at 1280 × 720 and 1920 × 1080 in both schemes checked by eye on 2026-10-31.
- [x] 2.4 Nothing stored, no Google host. Verify: `e2e/tests/cov/teacher-warm-up-4.spec.ts` (Nothing stored, Honest words) passes; `test/copy.test.mjs` scans the page and `/teachers/` (the sentence, the privacy link, no claim about reviews or COPPA, the 1965 book, no em dash).

## 3. The teachers page and analytics

- [x] 3.1 `site/teachers/index.html`: "Open the projector warm-up" as the box's main button, Open the Arena beside it (`theme/site.css` keeps the second button's ink), the box's words updated (no claim about privacy reviews). Verify: `teacher-warm-up-1.spec.ts` (From the teachers page, no Mode picker); `e2e/tests/landing.spec.ts` grown-up page checks (the box, the Arena button still opening the Arena, the warm-up without JavaScript) pass.
- [x] 3.2 Events `math/teachers/warmup/start/<trick>` and `.../done/<trick>`. Verify: `e2e/tests/cov/analytics-15-warm-up.spec.ts` passes (twice through Multiply by 11 without reloading: each once).
- [x] 3.3 Budget: the warm-up page within the per-page budget of the Trick pages; the game's first load unchanged. Verify: the build's budget output (`--voice off`: 846,845 bytes, within the baseline, nothing of the warm-up on the game's first load or in the precache); the warm-up page measured by hand at 87,872 bytes Brotli over 19 files (design D9, with the reason it is above `trick-pages` D7's first 80 KB figure: the fonts and the design system are three quarters of it); the per-page gate itself is `trick-pages` task 4.2.
- [x] 3.4 `GLOSSARY.md`: **Warm-up** (the projector page at `/teachers/warm-up/`: one Trick and three class problems; not a round, no Score).

## 4. Owner

- [ ] 4.1 **[OWNER]** Try the warm-up on a real projector or smart board with a clicker, from the back of a room, in both color schemes. Say what is too small or too dim.
- [ ] 4.2 **[OWNER]** Teacher outreach (teacher Facebook groups, TeacherTok) only after learnvedicmath tasks 13.1 (lawyer review, which names school outreach) and 13.3 (COPPA operator details), unless you decide otherwise: `docs/launch.md`.
- [ ] 4.3 **[OWNER]** Merge order: the Practice at home link names `/tricks/<slug>/`, which `trick-pages` publishes; merge that change first, or accept a 404 behind the link until it lands (design D9).

## 5. Checks

- [x] 5.1 `openspec validate teacher-warm-up --strict` (62 items pass with `--all`), `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py`; the touched specs plus `a11y.spec.ts` on chromium, webkit and mobile with `--retries=0`. Done 2026-10-31 (the PR says how each ran).
- [ ] 5.2 After release: archive this change with its coverage specs.
