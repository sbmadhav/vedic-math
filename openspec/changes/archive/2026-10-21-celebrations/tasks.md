# Tasks

Owner asked for this on 2026-10-20 (heroes, mascot, confetti for true wins, small animations); it is implemented in the pull request that proposes it, for the owner's review on the preview. Playwright specs run on chromium, webkit and mobile against the local server (`python3 build.py --dev && node e2e/local-server.mjs <port>`, `BASE_URL=http://localhost:<port>`).

## 1. One place for celebrations (`js/celebrate.js`)

- [x] 1.1 `confetti(n)` (big, one at a time, `life.loop`, stops when motion is turned off), and the small `sparkle`, `pop`, `bounce`, `twinkle`, `wiggle`, `tick`, `cheer`, `rollUp`, `rollSparks`; all no-ops under no motion. `js/fx.js` and `js/play/kit.js` re-export them; the old 2D confetti in both and the Star's particle canvas are gone. Verify: `test/celebrate.test.mjs` (no-ops under reduced motion, Pause motion and Calm; transform and opacity only; no bare timers; no hex colours).
- [x] 1.2 Sparkle, roll and squish CSS in `math.css` with token colours. Verify: `test/celebrate.test.mjs`; screenshots.

## 2. Sort every confetti call site (design.md table)

- [x] 2.1 Mode pick: pop, sparkles, family cheer, then Home after `later(go, 560, signal)`; at once under no motion. Verify: `e2e/tests/celebrations.spec.ts` (motion allowed, reduced motion, Pause motion, Calm); `test/celebrate.test.mjs`.
- [x] 2.2 Practice, kata, Arena, Star, Spellbook, Pattern Wall, Art room, Tala Lab and Daily Number everyday moments use the small set; Star lit, badge and first Sutra card get the big confetti. Verify: `test/celebrate.test.mjs` lists every big confetti call with its win; `e2e/tests/celebrations.spec.ts` (Star right answer sparkles, Star lit confetti, none under no motion); `e2e/tests/star.spec.ts` and the Calm specs check no sparkle or confetti layer appears under no motion.
- [x] 2.3 Result screens count their "+N Sparks" up, read whole by screen readers. Verify: e2e result screens unchanged under reduced motion (`star.spec.ts`, `games.spec.ts`, `arena.spec.ts`).

## 3. The heroes

- [x] 3.1 Landing (`site/index.html`, `theme/site.css`): headline, one line, Start learning bigger with the glow and the arrow; the family nods in step and hops on hover or focus; the lede moves under "Three ways to learn". Verify: `e2e/tests/hero.spec.ts`, `e2e/tests/landing.spec.ts`, `test/brand.test.mjs`.
- [x] 3.2 App home (`js/app.js` modePicker, `js/family.js`, `math.css`): headline, one line, Try a trick with the glow, the Nikhilam Family beside it, no Bolt. Verify: `e2e/tests/hero.spec.ts`, `e2e/tests/first-visit.spec.ts`, `e2e/tests/modes.spec.ts`, `test/brand.test.mjs`.
- [x] 3.3 Specs: `learnvedicmath` landing-pages "The landing page" edited in place; `first-visit` delta here. Verify: `openspec validate --all --strict`.
- [x] 3.4 Screenshots of both heroes, Daybreak and Deep Space, at 375 and 1280 px in `docs/hero/`.

## 4. After release

- [x] 4.1 `openspec archive celebrations -y` after `try-trick-teaches` is archived (both modify "Try a trick before any choice"; this delta carries that change's text). Done 2026-10-21 (PR #121): released in PR #109, live on learnvedicmath.com since the deploy of `1401890` (the commit `docs/perf/baseline.md` measured on the live site); archived after `try-trick-teaches` in the same PR. The hero rule became its own first-visit requirement, "The app's hero says little", so no requirement runs past the 500 characters `--strict` allows; coverage specs `e2e/tests/cov/celebrations-1.spec.ts` and `e2e/tests/cov/first-visit-4.spec.ts` have one test per new scenario; `openspec validate --all --strict` passes.
