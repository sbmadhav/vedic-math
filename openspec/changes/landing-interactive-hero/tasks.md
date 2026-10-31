# Tasks

The owner shared the 2026-10-29 UX audit and delegated the calls in each area, which counts as approval to implement (proposal.md). Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8177 _site`, `BASE_URL=http://localhost:8177`).

## 1. The sutra way, step by step (`site/index.html`, `theme/site.css`)

- [x] 1.1 The sutra way card: the Trick's plain-English name with the Sanskrit name under it, the board with `data-s`, the steps with `data-s`, the nav row (step line, Back, Next), hidden under `@media (scripting: none)`. Verify: `e2e/tests/landing.spec.ts` "the sutras and the method", `e2e/tests/cov/landing-pages-8.spec.ts`.
- [x] 1.2 The inline module: `data-step`, `aria-current="step"`, `aria-disabled` on Back at Step 1, Start again, the polite step line with the step's words, `math/landing/demo/done` once, listeners through `on()` from `js/life.js`. Verify: `e2e/tests/cov/landing-pages-9.spec.ts` (Step by step, Back and Start again, Keyboard and screen reader, Counted once, JavaScript off).
- [x] 1.3 Motion: a fade only after a press, none under reduced motion, Pause motion and Calm. Verify: `e2e/tests/cov/landing-pages-9.spec.ts` (No motion by itself); `e2e/tests/landing.spec.ts` motion tests unchanged.
- [x] 1.4 The Sutra cards lead with the Trick's name, the Sanskrit name under it. Verify: `e2e/tests/landing.spec.ts`, `e2e/tests/cov/landing-pages-9.spec.ts` (Plain-English name first).

## 2. Inside the game

- [x] 2.1 The section after the Modes: Bolt (idle, token colours) and Math Lens (camera icon), one line each, pictures `aria-hidden`. Verify: `e2e/tests/cov/landing-pages-9.spec.ts` (Inside the game), `e2e/tests/cov/landing-pages-7.spec.ts` (Page order), `e2e/tests/a11y.spec.ts` (the hero is still the one image; no Bolt in the hero).

## 3. Checks

- [x] 3.1 `openspec validate landing-interactive-hero --strict`; `pnpm typecheck`, `pnpm lint`, `pnpm test`; `python3 build.py --out <scratch> --voice off` (first-load budget unchanged: nothing new in `/js/`).
- [x] 3.2 The touched specs and `a11y.spec.ts` on chromium, webkit and mobile with `--retries=0`.
- [x] 3.3 Screenshots at 375 and 1280 px in Daybreak and Deep Space, with and without JavaScript, checked by eye (kept out of the repo).
- [x] 3.4 After release: archive `learnvedicmath`, `landing-modes-and-return` and `sutras-first` first, then this change.
  - Done 2026-10-31 (`archive-sweep`): archived in that order; the coverage specs are `e2e/tests/cov/landing-pages-8` and `-9`.
