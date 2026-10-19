# Proposal

Status: plan only, not yet approved for implementation (task 0.0). The owner decisions it cites answer design questions; they do not approve this change.

## Why

The game is about 40 hand-written ES modules (about 9,800 lines in `js/`, 10,800 with data) with no framework and no bundler. Views draw themselves by assigning template strings to `innerHTML`: `js/app.js` alone does it 69 times, `js/games.js` 22, `js/arena.js` 15, `js/star.js` 10. Every one of those is a place where a value that is not escaped by hand (`esc()`) becomes markup, so cross-site scripting is a class of bug the code invites rather than one it rules out. `js/app.js` is 1,497 lines holding the router, every view and every dialog, and each new feature (Play, verses, the Sky, Star Quest) has added to it. Lifecycle safety depends on every author remembering `js/life.js`, enforced after the fact by a regex scan (`test/lifecycle-scan.test.mjs`) with an allow-list of exceptions.

The owner wants three things (decision 1): **safety** (no `innerHTML` XSS class), **maintainability**, and **speed of building features**. The plans that follow the move (`placement`, `age-bands`, `duel-online`, `render-performance`, `gpu-effects`) would each add more template-string views, more hand-written listeners and, in `gpu-effects`, a hand-written WebGL engine. The owner decided (2026-10-17, decisions 1 to 13, all approved) to move the game to React 19 and TypeScript first, step by step, and to build those plans in React afterwards.

Player speed is not the goal of this change; it stays the job of `render-performance`, re-planned for React. This change must not make the game slower: first load and interaction time are measured in CI against today's site and may not regress (decision 1).

## What Changes

- **Stack (decision 4).** React 19 with the React Compiler, Vite, TypeScript `strict`, React Router v7 in SPA mode, and prerendering of public routes.
- **Step by step (decision 2).** No big-bang rewrite. The router mounts either a Legacy view (today's template-string view, run through an adapter with its `{ signal }`) or a React view per route. Each pull request moves a few views and the Playwright suite stays green after every one. Order: TypeScript for the logic; the app shell (header, router, dialogs); then views from simplest to most interactive, with games, Arena, Party Mode and Play last.
- **Logic stays framework-free (decision 6).** Game, math and storage logic become plain TypeScript modules with no behavior change. React reads them through one small `useStore(selector)` hook on `useSyncExternalStore`. No Redux or Zustand.
- **Path URLs in the game (decision 5, pending owner as Q18).** The move ships hash routes under `/play/` as planned. This change then switches `/play/` to path routes (`/play/arena`, `/play/sutras/ekadhikena`) with an SPA fallback for `/play/*` only. A tiny pre-paint shim turns every `#/...` into its path, forever, so every old link and bookmark keeps working. Public Sutra pages are prerendered for search.
- **Styling (decision 7).** Plain CSS with design-system tokens; `math.css` is split into one CSS file per component. No Tailwind, no CSS-in-JS. Both color schemes. The design system is v2.1, consumed as the move vendors it.
- **Lifecycle (decision 8).** `js/life.js` retires when the last Legacy view goes. React views clean up through `useEffect` and a `useAbortSignal()` hook. The lifecycle scan becomes an ESLint rule that bans bare `addEventListener`, `setTimeout` and `requestAnimationFrame` in components.
- **Service worker (decision 9).** Stays hand-written, as `sw.ts`, with today's caching rules as the move leaves them. Its precache list comes from Vite's manifest. No Workbox.
- **Testing (decision 10).** Playwright stays the behavior contract and keeps asserting the same behavior (selectors may change). Vitest replaces `node --test`. React Testing Library only for tricky components.
- **One repo, three workspaces (decision 11).** pnpm workspaces: `app/` (React), `workers/` (the Cloudflare Workers, later the Duel Durable Objects) and `shared/` (question generators, scoring and message types, used by both).
- **Feature work keeps going (decisions 3 and 12).** Feature pull requests pause only for the views being moved; each migration pull request names the views it locks. Content work (videos, voice, verses) continues throughout. Star Quest's mobile layout is redone when its view moves.
- **3D with Three.js (decision 13).** React Three Fiber and drei, bundled from our own origin (no CDN, inside the CSP, no `eval`). 3D loads late and only where used; the Sky first shows the 2D Sky, then fades into 3D. A CI budget keeps the 3D chunk under 200 KB gzip and first load from growing. Calm, Pause motion and reduced motion get a still frame; no WebGL or under 30 frames a second gets the 2D canvas or SVG; a hidden tab pauses. This replaces the raw-WebGL plan in `gpu-effects`, which is revised.

## Out of scope

- New features, new copy or new game rules. A moved view looks and behaves as before, except Star Quest's mobile layout (decision 3) and the URL form (Q18).
- Player speed work beyond "no regression": minifying targets, prefetching, Speculation Rules, the static first screen and font subsetting stay in `render-performance`, re-planned for React.
- Online Duels, placement and age bands: built after this change, in React, from their own changes.
- The 3D scenes after the Sky (Sutra deep-dive illustrations, game effects, Mandala art): the revised `gpu-effects`.
- The landing and grown-up pages (`site/`): they stay the static pages the move builds. Only `/play/` becomes a React app.
- Server-side rendering at request time. Prerendering happens at build time only; the site stays static assets.
- Redux, Zustand, Tailwind, CSS-in-JS, Workbox, Next.js or Remix-style servers.
- Changing what is stored on the device. Storage keys and formats stay exactly as they are, so no Player needs a migration.
- Changing what is sent: Boards, analytics events and their names, Firebase usage. `parentNote()` and `cloud/README.md` do not change.

## Modes and Players affected

Every Mode (Explorer, Challenger, Pro) and every Player, but nothing a Player does changes:
- Every Player sees path URLs in `/play/` once the shell moves (Q18). Bookmarks, shared links, home-screen apps and Hand-off links with `#/...` keep opening the same screen.
- Players on phones get a redone Star Quest layout when the Star round moves.
- Players with a WebGL device and motion allowed see the Sky fade into 3D in the last phase. Players with Calm, Pause motion or reduced motion see a still frame. Players without WebGL, or on a device too slow for 30 frames a second, keep today's 2D Sky.
- Nothing new is sent or kept. `parentNote()` and `cloud/README.md` stay as they are.

## Capabilities

### New Capabilities

- `app-routing`: path routes under `/play/`, one router mounting a Legacy view or a React view per route, the hash shim for old links, the SPA fallback for `/play/*` only, prerendered public Sutra pages, focus and scroll on route change.
- `app-build`: the pnpm workspaces, Vite and TypeScript `strict`, hashed build output, lint rules for lifecycle and markup safety, Vitest, and what CI and the pre-commit hook check.
- `scenes-3d`: where 3D may be used, how it loads, the fallbacks (still frame, 2D, paused), its byte budget and its tests.
- `performance-budget`: the baseline from today's site and the CI gates that stop first load and interaction time from regressing during the migration. `render-performance`, re-planned, later tightens it.

### Modified Capabilities

- `hosting` (added by `learnvedicmath`): the game's paths, the SPA fallback for `/play/*`, and how old links reach the same screen.
- `offline-app` (added by `learnvedicmath`): the precache list comes from Vite's manifest; hashed asset files are cache first; offline page loads under `/play/*` get the app shell.
- `deploy-pipeline` (added by `learnvedicmath`): the post-deploy wait checks the built entry instead of `/js/app.js`, and the budget gates run.
- `analytics`: route views are counted for path routes, with the same event names.
- `view-lifecycle`: cleanup holds across Legacy and React views, and is enforced by lint.
- `page-layout`: Star Quest fits a phone.

ADRs written with this change: `docs/adr/0012-react-and-typescript-for-the-game.md` and `docs/adr/0013-three-js-for-3d-decoration.md`. They follow `duel-online` (0009, 0010) and `gpu-effects` (0011) on PR #54.

## Order

1. The `learnvedicmath` move ships unchanged (decision 3), including its phase B start.
2. This change.
3. Then, in React: `placement`, `age-bands`, `duel-online`, `render-performance` and `gpu-effects` (each re-planned with `/opsx:update` before it is built; task group 11).

Until `learnvedicmath` is archived, `openspec validate --strict` reports "Archive would refuse" notices for the MODIFIED deltas on `hosting`, `offline-app` and `deploy-pipeline`. That is expected.

## Impact

- New: `pnpm-workspace.yaml`, root `package.json`, `app/` (`vite.config.ts`, `react-router.config.ts`, `tsconfig.json`, `index.html`, `src/`), `shared/` (`src/questions.ts`, `src/names.ts`, `src/scoring.ts`, `src/messages.ts`), `workers/` (the move's `worker/csp.js` moves here as TypeScript), `eslint.config.js` with local rules in `tools/eslint-rules/`, `vitest.workspace.ts`.
- Moved and converted: every logic module in `js/` to `.ts` under `app/src/logic/` or `shared/src/` (phase 1); every view in `js/app.js`, `js/games.js`, `js/arena.js`, `js/star.js`, `js/sky-view.js`, `js/guide.js`, `js/tour.js`, `js/shell.js` and PR #47's `js/play/` to components under `app/src/views/` (phases 3 and 4); `math.css` and PR #47's `css/play/*.css` to per-component CSS files; `sw.js` to `app/src/sw/sw.ts`.
- Retired at the end: `js/life.js`, the Legacy view adapter, `test/lifecycle-scan.test.mjs`, the import-map and `?v=` stamping in `build.py`.
- Build: `build.py` stops stamping modules and runs Vite, then keeps the move's post-build steps (`_headers`, CSP hashes, `_redirects`, `THIRD_PARTIES`, limits, the moved target). `_config.yml` `exclude` and CI's repo-only check list the new workspaces' sources.
- Tests: `test/*.test.mjs` become Vitest files next to the code; `e2e/` keeps every spec, gains `old-routes.spec.ts`, `scenes-3d.spec.ts`, `perf.spec.ts`, and its helpers (`open()` in `e2e/tests/fixtures.ts`) learn path routes.
- CI: `ci.yml` (pnpm, typecheck, lint, Vitest, Vite build, budgets), the move's `preview.yml` (Lighthouse and interaction timing on the preview), `e2e.yml` (deploy wait), `.githooks/pre-commit`.
- Docs: `CLAUDE.md` (stack, rules, commands), `README.md`, `CONTRIBUTING.md`, `GLOSSARY.md` (Legacy view, Locked view, 3D scene), `openspec/config.yaml` (no longer "no framework, no bundler"), `docs/adr/0012`, `docs/adr/0013`, `docs/perf/baseline.md`, and revisions of `render-performance`, `gpu-effects`, `duel-online`, `placement` and `age-bands`.
