# Tasks

Playwright specs run against a local build (`python3 build.py && node e2e/local-server.mjs 8151 _site`, `BASE_URL=http://localhost:8151`).

## 1. Landing page (`site/index.html`, `theme/site.css`)

- [x] 1.1 Mode cards as links to `/play/?mode=<id>` with a visible call to action, named by it, with hover, focus and press states, still under reduced motion, Pause motion and Calm. Heading "Pick how you learn" and the new lede. Verify: `e2e/tests/landing.spec.ts` "Mode cards"; `e2e/tests/cov/landing-pages-1.spec.ts`, `landing-pages-2.spec.ts`.
- [x] 1.2 Page order: hero, Modes, "What you learn" beside "Where the tricks come from", "For grown-ups", footer. Verify: `e2e/tests/cov/landing-pages-7.spec.ts`.
- [x] 1.3 Welcome back: the inline script after the Modes band (reads `vm.players`, writes nothing). Verify: `landing.spec.ts` "welcome back"; `e2e/tests/cov/landing-pages-4.spec.ts` to `landing-pages-6.spec.ts`, `hosting-1.spec.ts`; `e2e/tests/hero.spec.ts` (welcome back hero keeps the hero rules).

## 2. Game (`js/app.js`)

- [x] 2.1 `?mode=<id>` at boot (`modeFromLink`): `fx.setMode`, `gm.startDay`, `metrics.modeLink` (`math/landing/mode/<id>`), then `history.replaceState` without `mode`. Verify: `e2e/tests/cov/landing-pages-3.spec.ts`, `landing.spec.ts` "Mode cards on a first visit"; `node --test test/metrics.test.mjs` ("modeLink").

## 3. Words, docs and checks

- [x] 3.1 `GLOSSARY.md`: Mode card, Mode link, Welcome back. No spoken line changes (no studio voice re-record). `openspec validate landing-modes-and-return --strict`.
- [x] 3.2 Screenshots of both versions at 375 and 1280 px in Daybreak and Deep Space, checked by eye (kept out of the repo).
- [ ] 3.3 After release: archive `learnvedicmath` first, then this change.
