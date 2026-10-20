# Tasks

Tasks marked **[OWNER]** can only be done by the owner. Every other task is for a builder. "Verify:" says how a task is checked. Every PR from phase 1 on keeps the Playwright suite green on its preview (chromium, webkit, mobile) and the performance gates within budget (performance-budget spec), and every migration PR's description starts with `Locks:` and the views it locks (design D12). A migration PR may change selectors, waits and URL forms in `e2e/`, never what a test expects a Player to see or what is stored or sent (design D10); the description lists every changed spec line.

## 0. Before building

- [x] 0.0 **[OWNER]** Approve this change for implementation. Merging this plan records it; it is not that approval, and no task below starts before it. Owner, 2026-10-19: implementation starts the day the `learnvedicmath` move is live, not before. Approved by the owner 2026-10-19 ("use openspec to implement", "yes to all"); work starts once the move is live.
- [ ] 0.1 The `learnvedicmath` change is shipped and archived (decision 3), so `hosting`, `offline-app`, `deploy-pipeline` and `site-header` are in `openspec/specs/`. Verify: `openspec list` no longer shows `learnvedicmath`; `openspec validate react-typescript --strict` shows no "Archive would refuse" notice for those three.
- [x] 0.2 **[OWNER]** Answer Q18 (path URLs with the hash shim, design D5) and Q19 to Q26. Answered 2026-10-19 ("yes to all"); the answers are folded into the proposal, design (Open questions), spec deltas, these tasks and ADRs 0012 and 0013.
- [x] 0.3 ADRs `docs/adr/0012-react-and-typescript-for-the-game.md` and `0013-three-js-for-3d-decoration.md` marked accepted when 0.0 is approved; ADR 0010's "TypeScript in the browser app too" option and ADR 0011's "no library", 20 KB budget and OffscreenCanvas worker marked superseded by them (the supersession notes were added 2026-10-19 with the owner's answers). Verify: the ADR files link each other.
- [ ] 0.4 Baseline: `docs/perf/baseline.md` with the numbers of the live post-move site (design D1): Lighthouse mobile preset on `/play/` first and repeat visit, `/play/#/arena`, `/play/#/games`, `/play/#/sutras/ekadhikena`; compressed JS and CSS before the first tap; interaction timings for opening the Arena, answering an Arena question, opening a Deep dive and lighting a Star, from new `e2e/perf/interactions.ts` (chromium, 4x CPU through CDP, Event Timing API, 5 runs, median). Verify: the report has dates and the commit it measured; running the script twice gives medians within the spec's tolerances of each other.
- [ ] 0.5 `openspec/config.yaml` context: React 19, Vite, TypeScript, pnpm workspaces instead of "Plain vanilla ES modules, no framework, no bundler". `CLAUDE.md`: a "Migration in progress" section (Legacy and React views side by side, locks, the rules below), to be rewritten in 9.4.

## Phase 1: tooling and TypeScript logic (3 PRs, no locks)

## 1. Workspaces and Vite (PR 1: the same app, built by Vite)

- [ ] 1.1 `pnpm-workspace.yaml`, root `package.json` (scripts `typecheck`, `lint`, `test`, `build`), `app/`, `shared/`, `workers/`, `e2e/`, `tools/` packages; pnpm pinned with `packageManager`; `.npmrc` with `strict-peer-dependencies`. The move's `worker/csp.js` becomes `workers/src/csp.ts` with its tests, and `wrangler.jsonc` points at it. Verify: `pnpm install --frozen-lockfile` in CI; the CSP report endpoint tests pass under Vitest with `@cloudflare/vitest-pool-workers`.
- [ ] 1.2 `app/vite.config.ts` with `base: '/play/'`, the move's `play/index.html` as `app/index.html`, and `js/app.js` as its entry, unchanged: Vite bundles today's modules into hashed chunks in `_site/play/assets/`. The vendored design system, theme and fonts stay `<link>`s. Verify: the full Playwright suite passes on the preview unchanged; `test/build.test.mjs` (ported in 1.5) finds hashed chunks and no import map.
- [ ] 1.3 `build.py`: drop the import map, `?v=` stamping and the "source carries stamps" check for modules; run `pnpm --filter app build` and the worker build; read CSP hashes from the built HTML; keep `_headers`, `_redirects`, `THIRD_PARTIES`, limits and the moved target. `_config.yml` `exclude` and CI's repo-only check list `app/src`, `shared/`, `workers/`, `tools/`, `node_modules/`, the lockfile and config files. Verify: build tests (one failing case each for an unknown third-party host and a CSP-violating inline script); `_site` holds no `.ts` or `.tsx` file.
- [ ] 1.4 `sw.js` becomes `app/src/sw/sw.ts` with the same rules (design D9), built by `app/vite.sw.config.ts` to `_site/sw.js`; `tools/vite-plugin-precache.ts` fills `VERSION` and `PRECACHE` from `.vite/manifest.json`; hashed `/play/assets/` files are cache first. Verify: Vitest for the worker's request routing (navigation, hashed file, voice, other origin, POST) with a fake `caches`; `e2e/tests/offline.spec.ts` against `wrangler dev` on `_site` (chromium and mobile); a build test that every manifest entry chunk is in `PRECACHE` with a hash.
- [ ] 1.5 Vitest replaces `node --test`: `vitest.workspace.ts`; `test/*.test.mjs` move next to their modules as `*.test.ts` when the module converts, and run from `test/` until then; `test/support/` helpers ported. `.githooks/pre-commit` runs `pnpm typecheck && pnpm lint && pnpm test` and the build into a throwaway directory. Verify: CI runs the same number of tests as before plus new ones; a failing test stops the hook.
- [ ] 1.6 Budget gates (performance-budget spec): `tools/budget.ts` measures Brotli of JS and CSS before the first tap from the Vite manifest (entry plus the first route's chunks) and fails above the baseline (every size budget measures Brotli, Q21); the move's `preview.yml` gains a `perf` job running Lighthouse CI (`tools/lighthouserc.json`) and `e2e/perf/interactions.ts` against the preview, failing beyond the tolerances; on `main` it runs against production and opens an issue instead. Verify: a test branch that adds 20 KB to the entry fails the byte gate; the perf job comments the table on the PR.
- [ ] 1.7 ESLint (`eslint.config.js`, typescript-eslint strict, `eslint-plugin-react`, `eslint-plugin-react-hooks` with the compiler rules, `react/no-danger` as an error, `no-restricted-properties` for `innerHTML`, `outerHTML`, `insertAdjacentHTML` in `app/src`) and stylelint (no hex or `rgb()` colors in `app/src/**/*.css`). Legacy `js/` files are linted only for the import rule. Verify: a fixture file per rule in `tools/eslint-rules/fixtures/` fails as expected.

## 2. TypeScript logic (PR 2: shared, PR 3: app logic)

- [ ] 2.1 `shared/src/`: `lib.ts`, `skills/*.ts` and `skills/index.ts`, `vedic.ts`, `mental.ts`, `questions.ts` (`mulberry32`, `withSeed`, `makeSet` and the League pools moved out of `js/arena.js`, `levelFor` out of `js/adapt.js`), `names.ts` (Nickname word lists out of `js/store.js`), `scoring.ts` (Score and Sparks arithmetic now in `js/gamify.js`, `js/levels.js` and `js/arena.js`), `markup.ts` (the allow-list, design B1), `messages.ts` (types for the Board entries `js/cloud.js` sends). No behavior change; `js/*.js` re-export from them so Legacy views keep working. Verify: the ported Vitest suites for skills, vedic, mental, arena, levels and gamify pass unchanged in what they assert; `tsc -p shared` with no DOM lib; a test that `cloud/firestore.rules` lists the same Nickname words as `names.ts`.
- [ ] 2.2 `app/src/logic/`: `store.ts` (with `subscribe()` and a version counter, `storage` events from other tabs), `settings.ts` (Mode, Calm, sound, theme, Pause motion, Moving background, from `js/fx.js`), `fx.ts` (sound, `t()` wording per Mode, `noMotion()`), `check.ts`, `answers.ts`, `adapt.ts`, `levels.ts`, `gamify.ts`, `sky.ts`, `metrics.ts`, `cloud.ts`, `cloud-config.ts`, `say.ts`, `voice.ts`, `watch.ts`, `guide.ts` content, `analytics.ts`. Storage keys and formats unchanged. Verify: ported Vitest suites (store, store-sparks, cloud, metrics, check, answers, adapt, sky, say, voice, watch, guide, motion) pass; a new test writes with the old `js/store.js` format and reads it with `store.ts` for every key in the Hand-off allow-list (`js/handoff-schema.js`).
- [ ] 2.3 Content and generated files last (design B6), announced on open content branches first: `videos.ts`, `slokas.ts`, `sutra-details.ts`, `sutras.ts`; `say-clips.ts` and `voice-index.ts` written by `tools/sutra-voice/make-sutra-clips.mjs` and the voice tools. Verify: `say.test`, `videos.test`, `slokas.test`, `sanskrit.test`, `sutra-examples.test` pass; running each tool twice gives no diff.
- [ ] 2.4 `app/src/hooks/useStore.ts` (`useStore(selector, isEqual)`, cached per store version) and `useSettings.ts`. Verify: React Testing Library test that a selector returning a new object does not loop, that a write from legacy code re-renders a subscribed component once, and that an unrelated write does not.

## Phase 2: the app shell (2 PRs)

## 3. Router and paths (PR 4)

Locks: the router in `js/app.js` (`routes`, `render`, `mount`, `teardown`) and every view's entry (no view's body).

- [ ] 3.1 React root (`app/src/main.tsx`, `<StrictMode>`), React Router v7 in SPA mode (`app/react-router.config.ts`: `ssr: false`, `basename: '/play/'`), the React Compiler in Vite. `app/src/routes.ts` lists every route of today's table (25 patterns, aliases included) as paths, each mounting `LegacyRoute` with its view function. Verify: `e2e/tests/routes.spec.ts` passes with path URLs; `e2e/tests/fixtures.ts` `open()` accepts both forms.
- [ ] 3.2 `app/src/shell/LegacyRoute.tsx` (design D2): sets the legacy view root, gives `{ signal }`, calls `destroy()` then aborts on route change or unmount; focus and scroll as today. Verify: `e2e/tests/shell.spec.ts`, the view-lifecycle cov specs and a new spec "leave a Legacy Arena countdown for a React view" (React side: a test route in development only).
- [ ] 3.3 Hash shim (app-routing spec): `app/src/shell/hash-shim.ts` built as an inline pre-paint script in `app/index.html` (its hash added to the `/play/` CSP by `build.py`), plus a `hashchange` listener in the shell; the landing page's pre-paint script (`site/index.html`) and `/import/` send `#/x` straight to `/play/x`. Verify: new `e2e/tests/old-routes.spec.ts` covers `/play/#/x` for every route, `/play/#/`, `/play/#`, `/play/?source=pwa#/arena`, `/#/arena`, `/vedic-math/#/arena` (301 then path), `/import/` with a route, a Legacy `location.hash` write, a skip link `#view`, and Back after each; no flash of Home (screenshot before first paint is blank or the target).
- [ ] 3.4 SPA fallback for `/play/*` only (hosting spec, design D5): the `_redirects` rewrite is `/play/* /play/__spa-fallback.html 200` (the SPA fallback React Router writes, since `/play/` is prerendered, Q20), and the build fails if the target is missing from `_site/play/`; if Workers static assets refuse it, `not_found_handling: "none"` and the Worker script answers misses (`workers/src/fallback.ts`). Verify: `e2e/tests/headers.spec.ts` on `wrangler dev` and the preview: `/play/game/times-sprint/12` is 200 with the shell, `/plya/` is 404, `/play/nowhere` is 200 and shows Home; Workers metrics show no script run for an existing file.
- [ ] 3.5 `metrics.routePath()` reads the matched route (design B4). Verify: `analytics.spec.ts` and the analytics cov specs pass with path URLs and the same event names; one event for an old hash link.
- [ ] 3.6 `sw.ts`: offline navigations under `/play/*` get the app shell (offline-app spec). Verify: `offline.spec.ts` opens `/play/games` and `/play/#/games` offline.

## 4. Shell pieces (PR 5)

Locks: header, nav, the menu chip, the Mode picker, the video player dialog, the Age dialog, the Player dialog.

- [ ] 4.1 `app/src/shell/Header.tsx`, `Nav.tsx`, `Chip.tsx` matching the move's header partial (design B8); the theme button and Pause motion switch; `aria-current` on the nav. Verify: `header.spec.ts` compares the game header with the landing page's; `wcag.spec.ts`, `a11y.spec.ts` unchanged.
- [ ] 4.2 Dialogs: `VideoPlayer.tsx` (the YouTube facade, focus return, the one-minute badge through `useTimer`), `AgeDialog.tsx`, `PlayerDialog.tsx`, on `<dialog>` with the same ids and labels. Verify: `watch.spec.ts`, `consent.spec.ts`, `privacy.spec.ts`, `backup-restore.spec.ts`.
- [ ] 4.3 `ModePicker.tsx` (first visit), prerendered at `/play/` (Q20; app-routing spec), with the pre-paint script marking a returning Player so the picker is never painted for them. Verify: `modes.spec.ts`, the first-visit cov specs, in all three Modes; `prerender.spec.ts` (from 5.3) gains `/play/` with JavaScript off and a returning Player who never sees the picker.
- [ ] 4.4 Lifecycle hooks (`useAbortSignal`, `useTimer`, `useInterval`, `useFrame`, `useEvent`, `useRound`) and the ESLint rule `tools/eslint-rules/no-bare-lifecycle.js` (view-lifecycle spec), with the shell's page-lifetime allow-list. Verify: Vitest for each hook (stops on unmount, on abort, on deps change); rule fixtures; `test/lifecycle-scan.test.mjs` still passes for Legacy views.
- [ ] 4.5 `app/src/components/Markup.tsx` on `shared/src/markup.ts` (design B1). Verify: React Testing Library cases from the app-build spec (`<img onerror>`, `<script>`, `javascript:` URLs, `style` attributes, SVG `foreignObject` all dropped; `<sup>`, `<b>`, `viz.js` SVG kept); a test that renders every Skill's first question and every Trick's steps through it and compares the text with today's.
- [ ] 4.6 `CLAUDE.md` rules for components, hooks, CSS files and Markup, with the Guide view (5.1) named as the example to copy.

## Phase 3: views, simplest first (about 11 PRs)

Each task is one PR unless noted, moves its views to `app/src/views/<area>/` with one CSS file per component (taken out of `math.css`), points their routes at the React view, and deletes the legacy code it replaces.

## 5. Content views

- [ ] 5.1 Guide and Tour (`#/guide`, `#/guide/<section>`; `js/guide.js`, `js/guide-art.js`, `js/tour.js`), with `/play/guide/` and each section prerendered (Q20; app-routing spec) and listed in `sitemap.xml`. Locks: Guide, Tour. Verify: `guide.spec.ts`, the in-app-guide cov specs, Tour coach marks over Home in each Mode; `prerender.spec.ts` (from 5.3) covers the Guide pages.
- [ ] 5.2 Watch (`#/watch`; `watchView`, the shelf, chips). Locks: Watch. Verify: `watch.spec.ts`, `videos.live.spec.ts` (reads only), the watch-shelf cov specs; no YouTube request before a tap.
- [ ] 5.3 Sutras and Deep dive with verses, Say it and Sutra ambience (`#/sutras`, `#/sutras/<id>`; `sutrasView`, `openSutra`, `sutraDlg`, `js/scenes.js`, `js/say.js`, `js/sutra-ambience.js`, the verse player), and prerendering of `/play/sutras/` and every Sutra page (app-routing spec). Locks: Sutras, Deep dive, verses. Verify: `sutra-modal.spec.ts`, `verses.spec.ts`, `say.spec.ts`, `ambience.spec.ts`, `read-aloud.spec.ts`; new `e2e/tests/prerender.spec.ts` (JavaScript off shows the text; canonical link; sitemap lists each; `csp.spec.ts` on a prerendered page; no storage write before start-up).
- [ ] 5.4 Me (`#/me`, `#/progress`; Player list, World boards section, backup and restore, settings, `parentNote()` unchanged). Locks: Me. Verify: `progress.spec.ts`, `backup-restore.spec.ts`, `privacy.spec.ts`, the parent-note and posting-consent cov specs; `test/copy.test` still checks `parentNote()` word for word.

## 6. Learning views

- [ ] 6.1 Learn, grade, All places and tiles (`#/learn`, `#/grade/<g>`, `#/places`, `#/tiles`). Locks: those four. Verify: `routes.spec.ts`, `load.spec.ts`, `sky.spec.ts` (All places part).
- [ ] 6.2 Skill lesson and Practice (`#/skill/<id>`: "Watch me do one", the practice box, keypad, hints, symbol keys). Locks: Skill. Verify: `practice.spec.ts`, the answer-checking, answer-display and view-lifecycle cov specs (one tap, one action), `wcag.spec.ts` focus after an answer.
- [ ] 6.3 Mix and Run (`#/mix/<g>`, `#/run/<g>`). Locks: Mix, Run. Verify: `practice.spec.ts` run cases; lives and best run kept.
- [ ] 6.4 Dojo, Katas and the Kata round (`#/dojo`, `#/tricks`, `#/katas/<id>`, `#/kata/<id>/<n>`, the Trick animator). Locks: those. Verify: `dojo.spec.ts`, the medals and badges cov specs.
- [ ] 6.5 Tower, chapters and challenges (`#/tower`, `#/tower/<n>`, `#/challenge/<id>`). Locks: those. Verify: the medals cov specs, a challenge round with and without Calm.

## 7. Home, the Sky and Stars

- [ ] 7.1 Home and the Sky (`#/`; `home`, `heroStats`, `js/sky-view.js`, parallax through `useEvent`, focus back on a Star). Locks: Home, Sky. Verify: `sky.spec.ts`, the sky-home cov specs, Back from a Star focuses it.
- [ ] 7.2 The Star round (`#/star/<trick>/<n>`; `js/star.js`, Dares, Comebacks, Skip, the burst) with **Star Quest's mobile layout redone** (page-layout spec). **[OWNER]** signs off the layout from phone screenshots (360 by 740 and 320 wide, both schemes, three Modes) on the PR before merge (Q24, answered 2026-10-19). Locks: Star. Verify: `star.spec.ts`, the star-round cov specs; new `e2e/tests/star-mobile.spec.ts` on the mobile project and a 320 by 640 viewport (no horizontal scroll, choices visible without scrolling, tap targets 44 px); `a11y.spec.ts` on the Star round.

## Phase 4: the most interactive views (about 6 PRs)

## 8. Games, Arena, Duel, Play

- [ ] 8.1 Games list and game rounds, part 1 (`#/games`, `#/game/<id>`, `#/game/<id>/<lvl>`; the game shell in `js/shell.js`, the dial, HUD, Ranked round and Endless) with half the games in `js/games.js`. Locks: Games and those games. Verify: `games.spec.ts`, `shell.spec.ts`, the game-shell-and-calm and view-lifecycle cov specs; interaction gate for an answer.
- [ ] 8.2 Game rounds, part 2: the other games; `js/games.js` and `js/shell.js` deleted. Locks: those games. Verify: as 8.1.
- [ ] 8.3 Arena with Boards (`#/arena`; daily, Practice and untimed rounds, countdown, keypad, the World and Device board tabs, weekly Sparks post, `js/arena.js` view code). Locks: Arena, Boards. Verify: `arena.spec.ts`, `leaderboard.live.spec.ts` (reads only, chromium), the arena, ratings, board-identity and posting-consent cov specs; `fixtures.ts` `cloudLog` shows the same writes as before; the "Answer an Arena question" interaction within tolerance.
- [ ] 8.4 Party Mode and the `#/duel` redirect (the Duel was retired: `#/duel` opens `#/arena/party`, openspec `play-experiences`; there is no `duel` spec any more). Locks: Party Mode. Verify: the Party Mode and old-route cov specs that are live then, and `#/duel` still lands on Party Mode.
- [ ] 8.5 Play experiences (PR #47's `js/play/`, `css/play/`), in 2 or 3 PRs by experience, with `js/play/life.js` and `js/play/kit.js` replaced by the app's hooks and components. Locks: the experiences in each PR. Verify: PR #47's Playwright specs for each experience; offline open of an experience opened once online.

## Phase 5: retire legacy (1 PR)

## 9. Clean up

- [ ] 9.1 Delete `LegacyRoute`, the Legacy route entries and `allowJs`; `js/` is empty and removed. Verify: `rg -l "innerHTML|insertAdjacentHTML|dangerouslySetInnerHTML" app shared` finds nothing; lint passes with no allow-list beyond the shell.
- [ ] 9.2 Delete `js/life.js` and `test/lifecycle-scan.test.mjs` (the ESLint rule covers everything). Verify: the view-lifecycle cov specs pass.
- [ ] 9.3 `math.css` is gone: every rule lives in a component's CSS file or `app/src/shell/base.css`. Verify: a build test that no CSS file has a selector no component uses (PurgeCSS report, reviewed); both color schemes in `wcag.spec.ts`.
- [ ] 9.4 `CLAUDE.md`, `README.md`, `CONTRIBUTING.md` rewritten for the new stack (commands, layout, rules, `pnpm --filter app dev`); `GLOSSARY.md` marks Legacy view and Locked view as historical. Verify: copy check (no em dashes) on the docs.
- [ ] 9.5 The move's Report-Only stricter policy (`require-trusted-types-for 'script'`): review its reports for `/play/` for 2 weeks after 9.1; propose enforcing it in a new change. Verify: noted here with the report counts.

## Phase 6: 3D (2 PRs)

## 10. Three.js and the Sky

- [ ] 10.1 Spike, measured (design D13 risk): React Three Fiber, drei pieces by path, `extend()` with only the classes the Sky needs, built as its own chunk. Go or no-go recorded here with the Brotli size; over 170 KB Brotli goes to the owner. Verify: `tools/budget.ts` prints the 3D chunk; a build test fails when any 3D module is reachable from an entry's static imports.
- [ ] 10.2 `app/src/scenes-3d/`: `Scene3D.tsx` (lazy `import()` after the route renders and `requestIdleCallback` through a hook; the chooser: `still` under Calm, Pause motion or reduced motion; `2d` without WebGL or when the scene stays under 30 frames a second for 3 seconds (Q25); `paused` when hidden or off screen; `3d` otherwise; reported as `data-scene` on the host for tests), colors from tokens, disposal on unmount; ESLint bans drei helpers that fetch from CDNs. Verify: Vitest for the chooser table, including a 1-second dip that keeps 3D and a 3-second one that switches to 2D; `third-party.spec.ts` on the Sky. Rendering stays on the main thread (Q22).
- [ ] 10.3 The Sky scene: the 2D Sky first, then a fade into 3D behind the SVG Stars and Landmarks (scenes-3d spec). Locks: Home, Sky. Verify: new `e2e/tests/scenes-3d.spec.ts` (chromium): `3d` with motion; `still` under Calm, Pause motion and `reducedMotion: 'reduce'`, switching live; `2d` with WebGL made unavailable by an init script and with frames slowed below 30 for 3 seconds by an init-script hook (named option, no `eval`, CSP-safe); `paused` after a `visibilitychange` to hidden; no layout shift during the fade; canvas `aria-hidden`; webkit and mobile record the path they get and render without errors; the 3D budget and "first load does not grow" gates pass.

## Phase 7: re-plan the follow-on changes (docs, can start after phase 2)

Order (owner, 2026-10-19): `placement`, `age-bands`, `render-performance`, `duel-online`, `gpu-effects`. Each is re-planned before it is built.

## 11. Plans

- [ ] 11.1 `render-performance` with `/opsx:update`: drop esbuild per-file minify, the import map, `?v=` stamps and `js/views/` (Vite does these); keep its budgets as a MODIFIED `performance-budget` on top of this change's; re-plan prefetch, Speculation Rules, the static first screen (`/play/` is prerendered with the Mode picker by this change, Q20), fonts and pausing for React Router; its budgets measure Brotli. Remove its "no bundler, no framework, no path routing" rule (superseded by ADR 0012). Verify: `openspec validate render-performance --strict`.
- [ ] 11.2 `placement` and `age-bands`: their views and copy as React components; logic in `app/src/logic/` or `shared/`. Verify: `openspec validate` for each.
- [ ] 11.3 `duel-online` (kept by the owner, Q26; the retirement of the same-screen Duel does not change that): `worker/` becomes `workers/`, shared modules are `shared/src/*.ts` (not `.js` with `@ts-check`), `js/duel/safe-html.js` becomes `Markup` with the shared allow-list, the views are React; ADR 0010 consequences updated. Verify: `openspec validate duel-online --strict`.
- [ ] 11.4 `ADR 0011` and `gpu-effects` follow ADR 0013 (design D13 "How gpu-effects must be revised"): `js/gfx/` replaced by `app/src/scenes-3d/`, the Sky backdrop removed (shipped in 10.3), Sutra deep-dive illustrations, then celebrations, the Moving background and Mandala glow as React Three Fiber scenes, the 20 KB budget replaced by the 170 KB Brotli 3D budget, the OffscreenCanvas worker replaced by main-thread rendering that pauses when the tab is hidden (Q22, decided 2026-10-19). Verify: `openspec validate gpu-effects --strict`.
- [ ] 11.5 Archive this change (`/opsx:archive`) after phase 6 ships, so `openspec/specs/` describes the live game. Verify: `openspec list` no longer shows it.
