# Tasks

Approved for building once merged (proposal.md). Build after `trick-pages`, or in the same PR (design D7). Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`).

## 1. Data and modules

- [ ] 1.1 `tools/trick-pages/warm-up-problems.ts`: the table of design D3. Verify: `test/warm-up.test.mjs` runs every problem through its Trick's `valid()` and `answer()`, checks each Trick's three problems grow, and that every Trick id is one of the 15 in `pages.ts`.
- [ ] 1.2 Split the step board out of the `trick-pages` calculator into `tools/trick-pages/step-board.ts`, used by both, published at `/tricks/step-board.js` with `pages.ts` and `warm-up-problems.ts` beside it (design D7), imported by those URLs. Verify: the `trick-pages` cov specs still pass unchanged; the module-load check (every page, no 404, no `pageerror`) covers `/teachers/warm-up/`.
- [ ] 1.3 The Trick of the day (local day number modulo 15), Pick a trick, `?trick=<id>` with fallback. Verify: unit test for the rotation over 30 dates; new `e2e/tests/cov/teacher-warm-up-2.spec.ts` (Two days with a fixed clock, A bookmarked Trick, Problems rise).

## 2. The page

- [ ] 2.1 `site/teachers/warm-up/index.html` with the site header, the five screens, Reveal and Show the steps, the polite progress line, the no sign-in sentence and privacy link (design D6), the 1965 book credit. Verify: new `e2e/tests/cov/teacher-warm-up-1.spec.ts` (A whole warm-up, Reveal, then the steps).
- [ ] 2.2 `tools/trick-pages/warm-up.ts`, published at `/tricks/warm-up.js` with the types taken out; keys Right, Space, Page Down, Left, Page Up, R; Full screen; listeners through `on()` from `/js/life.js`. Verify: new `e2e/tests/cov/teacher-warm-up-3.spec.ts` (A presenter clicker, Nothing moves by itself, Full screen button hidden when `document.fullscreenEnabled` is false).
- [ ] 2.3 `theme/warm-up.css`: the projector sizes (design D5), tokens only, Daybreak and Deep Space. Verify: `teacher-warm-up-3.spec.ts` (Big enough for the back row at 1280 × 720); `a11y.spec.ts` gains the page in both schemes; screenshots at 1280 × 720 and 1920 × 1080 checked by eye.
- [ ] 2.4 Nothing stored, no Google host. Verify: new `e2e/tests/cov/teacher-warm-up-4.spec.ts` (Nothing stored, Honest words); `test/copy.test.mjs` scans the page and `/teachers/`.

## 3. The teachers page and analytics

- [ ] 3.1 `site/teachers/index.html`: "Open the projector warm-up" as the box's main button, Open the Arena beside it, the box's words updated (no claim about privacy reviews). Verify: `teacher-warm-up-1.spec.ts` (From the teachers page, no Mode picker); `e2e/tests/landing.spec.ts` grown-up page checks.
- [ ] 3.2 Events `math/teachers/warmup/start/<trick>` and `.../done/<trick>`. Verify: new `e2e/tests/cov/analytics-15-warm-up.spec.ts`.
- [ ] 3.3 Budget: the warm-up page within the per-page budget of the Trick pages; the game's first load unchanged. Verify: the build's budget output.
- [ ] 3.4 `GLOSSARY.md`: **Warm-up** (the projector page at `/teachers/warm-up/`: one Trick and three class problems; not a round, no Score).

## 4. Owner

- [ ] 4.1 **[OWNER]** Try the warm-up on a real projector or smart board with a clicker, from the back of a room, in both color schemes. Say what is too small or too dim.
- [ ] 4.2 **[OWNER]** Teacher outreach (teacher Facebook groups, TeacherTok) only after learnvedicmath tasks 13.1 (lawyer review, which names school outreach) and 13.3 (COPPA operator details), unless you decide otherwise: `docs/launch.md`.

## 5. Checks

- [ ] 5.1 `openspec validate teacher-warm-up --strict`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py`; the touched specs plus `a11y.spec.ts` on chromium, webkit and mobile with `--retries=0`.
- [ ] 5.2 After release: archive this change with its coverage specs.
