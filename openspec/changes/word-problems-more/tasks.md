# Tasks

Tasks marked **[OWNER]** can only be done by the owner. "Verify:" says how a task is checked. Playwright specs run on chromium, webkit and mobile against the local server (`python3 build.py && node e2e/local-server.mjs <port> _site`, `BASE_URL=http://localhost:<port>`).

## 0. Before building

- [x] 0.1 **[OWNER]** The calls. Delegated 2026-10-29 ("Make executive decisions"): design D1 to D7.

## 1. The plan

- [x] 1.1 This change: proposal, design, spec deltas (`word-problems`, `arena`), tasks. Verify: `openspec validate word-problems-more --strict`.
- [x] 1.2 `word-problems` design: its "Open questions for the owner" point here. Verify: `openspec validate word-problems --strict`.

## 2. Only Word problems in Practice

- [x] 2.1 `js/story-plan.js`: the choice's words by Mode. `practice()` takes `only`: every question `storyFor()` on the Skill picked, from the first question. `mixView()`: the Mixed and Only Word problems choice (once the stories have loaded, on levels with a story), and `#/mix/<level>/words`, counted as `math/view/mix/<level>/words` (`js/metrics.js`) and covered by the Guide's Skill map section (D1, D2, D7). Verify: `test/stories.test.mjs`, `test/metrics.test.mjs`, `test/guide.test.mjs`; `e2e/tests/word-problems-more.spec.ts`; `e2e/tests/cov/word-problems-12.spec.ts` (one test per scenario); the route in `e2e/tests/a11y.spec.ts`.

## 3. The Arena Word problems round

- [x] 3.1 `js/stories.js` `roundStory(mode, r)`: a Word problem of a Mode's style, whole-number answer, for any round (D4). Verify: `test/stories.test.mjs`.
- [x] 3.2 `runArena()` takes `deal` and `count`; `arenaView()` offers "Word problems" ("Story time"), always untimed, 10 questions, no post, no device best, the Arena Rating left as it was (D3, D4, D5). Styles in `math.css` (tokens only, both color schemes), and the shell's picture box, which drew Explorer Arena pictures 0 px wide. Verify: `e2e/tests/cov/arena-7.spec.ts` (one test per scenario), `e2e/tests/word-problems-more.spec.ts`, the shell in `e2e/tests/a11y.spec.ts`; `e2e/tests/arena.spec.ts` and the arena coverage specs unchanged.

## 4. Release

- [x] 4.1 Voice: no new spoken line (D6); `test/voice-coverage.test.mjs` unchanged. Verify: `pnpm test`.
- [x] 4.2 First-load budget: `docs/perf/baseline.json` `firstLoad` and `firstLoad.changes`, and `docs/perf/baseline.md`, record the growth and why. Verify: `python3 build.py --out <dir> --voice off` passes the budget.
- [ ] 4.3 **[OWNER]** Phone check on the preview: Only Word problems on a level's Endless practice in each Mode, and a Word problems round in the Arena; note what to change here.
- [ ] 4.4 After release, and after `word-problems` is archived (this change modifies its spec): archive this change with its coverage specs (`openspec archive word-problems-more -y`).
