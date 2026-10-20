# Design

## Context

- **After the move** (`learnvedicmath`, shipped first): the game is `/play/` on learnvedicmath.com, Cloudflare Workers static assets with `not_found_handling: "404-page"`, hash routes (`/play/#/arena`), the landing and grown-up pages as static HTML from `site/`, `_headers` with a per-page CSP built from inline script hashes, a vendored design system at `/ds/2.1.0/`, the theme at `/theme/`, the Firebase SDK at `/vendor/firebase/<v>/`, `js/analytics.js`, and `sw.js` at `/sw.js` with scope `/play/`, caches `lvm-<VERSION>` plus `lvm-voice`, every precache entry hashed.
- **The code today** (main, 2026-10-17): 41 modules in `js/` and `js/skills/`, about 10,800 lines with data. `js/app.js` (1,497 lines) holds the route table (25 hash patterns), `mount()`/`teardown()`, every view function, the Sutra, video player and Age dialogs, the World boards section and `parentNote()`. Views write template strings into `#view` with `innerHTML` (69 times in `js/app.js`, 22 in `js/games.js`, 15 in `js/arena.js`, 10 in `js/star.js`). Content modules build HTML strings too: `js/vedic.js` (Trick steps), `js/skills/high.js` and `upper.js` (questions with `<sup>`), `js/viz.js` (SVG pictures), `js/sutra-details.js`, `js/slokas.js`.
- **Lifecycle:** `js/life.js` (`on`, `later`, `every`, `loop`, `child`, `onAbort`) ties every listener and timer to the view's `AbortSignal`. `test/lifecycle-scan.test.mjs` fails on bare calls in named files, with an allow-list of page-lifetime listeners. PR #47 adds `js/play/life.js` for the Play experiences.
- **Build:** `build.py` writes an import map pinning every module to `?v=<hash>`, stamps `math.css`, writes the worker's `VERSION` and `PRECACHE`, computes the CSP, and checks the source carries no stamps. The move adds `_headers`, `_redirects`, `THIRD_PARTIES`, the landing pages and the moved target.
- **Tests:** 33 node test files in `test/` (`node --test`), 30 Playwright specs plus 93 coverage specs in `e2e/tests/cov/`, chromium, webkit and mobile projects, service workers blocked except in `offline.spec.ts`.
- **Plans after the move** (PR #54 and main): `render-performance` (esbuild per-file minify, `js/views/*.js` split, hash routes kept, "no bundler, no framework, no path routing"), `duel-online` (`worker/` in TypeScript, shared `.js` modules with `// @ts-check`, ADRs 0009 and 0010), `gpu-effects` (a hand-written WebGL 2 engine in an OffscreenCanvas worker, 20 KB budget, "no three.js", ADR 0011), `placement` and `age-bands` (new views and copy).
- `openspec/config.yaml` and the move's design both still say "no framework, no bundler". This change replaces that rule.

## Goals

- No `innerHTML` XSS class in the game: React renders text as text, and the only way to put markup on screen is one reviewed component.
- Code that is easier to change: typed logic, small components, one router, cleanup the framework enforces.
- Faster feature work for the plans that follow.
- Every step ships alone, the Playwright suite stays green after each, and feature work pauses only for the views being moved.
- No regression in first load or interaction time compared with today's site, measured in CI.
- Every old link keeps opening the same screen.

## Non-goals

- Making the game faster (that is `render-performance`); new features; changing stored data or what is sent; moving the landing pages to React; request-time server rendering.

## Decisions

D1 to D13 are the owner's decisions (2026-10-17, all approved; D5 approved 2026-10-19 as the answer to Q18). The owner's answers to Q18 to Q26 (2026-10-19) are folded in below and listed under Open questions. B1 to B9 after them are builder choices that follow from them; review can change those without going back to the owner.

### D1. Goal and budget

**Decision.** The goal is safety (no `innerHTML` XSS class), maintainability and speed of building features. Player speed stays its own spec (`render-performance`, re-planned for React). Budget: no regression in first load or interaction time compared with today, measured in CI (performance-budget spec).

**Rationale.** The XSS class is structural: 120 or so `innerHTML` writes, each relying on someone remembering `esc()`. A component model removes the class instead of policing it, and makes the move's stricter Report-Only CSP (`require-trusted-types-for 'script'`) enforceable later. Speed is real but separable; mixing it in would make every migration PR a perf PR, and `render-performance` already has a careful plan that only needs re-basing.

**How "no regression" is measured.** Before phase 1, `docs/perf/baseline.md` records today's numbers on the live post-move site (task 0.4): Lighthouse mobile preset (simulated slow 4G, 4x CPU, 5 runs, median) on `/play/` first visit and repeat visit, `/play/#/arena`, `/play/#/games` and `/play/#/sutras/ekadhikena`; the Brotli bytes of everything a first visit to `/play/` requests before the first tap, including every file the service worker's install downloads; and interaction timings from a Playwright script (open the Arena, answer one Arena question, open a Sutra's Deep dive, light a Star) measured with the Event Timing API under 4x CPU throttling in chromium. Every migration PR's preview must stay within the tolerances in the performance-budget spec.

**Alternatives rejected.**
- Make speed a goal of this change: doubles the scope of every PR and duplicates `render-performance`.
- No budget: a framework migration can quietly add 100 KB; the owner wants it measured.
- Absolute budgets (FCP under 1.5 s) now: those are `render-performance`'s targets; this change only promises not to go backwards.

### D2. Step by step, not a big-bang rewrite

**Decision.** The router mounts a Legacy view or a React view per route. Each PR moves a few views, and the Playwright suite stays green after every PR. Order: TypeScript for the logic; the app shell (header, router, dialogs); views from simplest to most interactive, with games, Arena, Party Mode and Play last.

**Rationale.** The game is live, used by children, and has open feature work. A strangler migration keeps it shippable every day, makes each PR reviewable, and lets the Playwright suite prove behavior did not change one view at a time. Logic first means views are rewritten against typed, tested modules; shell second means every later PR only adds a route component; the most interactive views go last, when the patterns (rounds, timers, keypads, focus) are settled.

**How a Legacy view runs inside React.** `app/src/shell/LegacyRoute.tsx` renders one `<div>` and, in an effect, sets the legacy module's view root to it, creates an `AbortController`, calls the legacy view function with `{ signal }` exactly as `mount()` does today, and aborts it (calling `destroy()` first if the view returned one) when the route changes or the component unmounts. Legacy code keeps `js/life.js` and its own `innerHTML` until it moves. `location.hash = '#/x'` writes in legacy code keep working through the hash shim (D5), which turns them into router navigations.

**Alternatives rejected.**
- Big-bang rewrite on a branch: months of drift against content and feature PRs, and one enormous unreviewable merge.
- Micro-frontends or React islands inside legacy views: two routers, two lifecycles and harder tests, for no gain once the shell is React.
- Views first, logic later: views would be written against untyped modules and rewritten again.

### D3. Sequencing

**Decision.**
1. The learnvedicmath.com move ships unchanged.
2. Next, this migration.
3. Last, in this order (owner, 2026-10-19): `placement`, `age-bands`, `render-performance`, `duel-online`, `gpu-effects`, each built in React and re-planned first (task group 11).

**When to start (owner, 2026-10-19).** Implementation starts the day the `learnvedicmath` move is live, not before.

Content work (videos, voice, verses) continues throughout. Star Quest's mobile layout is redone when its view moves (the owner reports it looks bad on mobile).

**Rationale.** The move is planned, approved and changes every path; doing both at once would double the risk on launch. Building the five later changes in React avoids writing a lot of template-string code that this change would then rewrite (`placement`'s climb, `age-bands`' copy, `duel-online`'s views, `render-performance`'s `js/views/` split, `gpu-effects`' engine). Content is data, not views, so it does not collide with the migration, apart from files that move (B6).

**Alternatives rejected.**
- Migrate before the move: the move's paths, build and worker would then have to be planned again on top of Vite.
- Build `render-performance` first, then migrate: its per-file minify, `js/views/` split and import-map model are all replaced by Vite; most of it would be thrown away.
- Freeze content during the migration: content is the product; it keeps flowing.

### D4. Stack

**Decision.** React 19 with the React Compiler, Vite, TypeScript `strict`, React Router v7 in SPA mode (`ssr: false`), and prerendering of public routes at build time.

**Rationale.** React 19 is the most widely known component model, with the largest pool of examples and reviewers; the React Compiler removes most hand-written memoization, which matters for timers and rounds that re-render often. Vite is the standard React build tool, emits hashed files and a manifest (which D9 needs), and has no `eval` in production output. TypeScript `strict` catches the kind of shape mistakes the logic modules have today (optional fields, mixed number and string ids). React Router v7 in SPA mode gives nested routes, `basename: '/play/'` and build-time `prerender` without a server, which fits static assets on Cloudflare.

**Alternatives rejected.**
- Preact, Solid, Svelte or Lit: smaller runtimes, but fewer people know them, React Three Fiber (D13) is React only, and the owner chose React.
- Next.js or React Router with a server: needs request-time rendering or a Node host; the site is static assets by design (ADR 0004).
- TanStack Router: good types, but React Router v7's SPA-mode prerender is what we need for public pages, and its route model matches today's table.
- Plain JS with JSDoc (`checkJs`), as ADR 0010 chose for the browser: workable for shared modules, but not for a component codebase; ADR 0012 supersedes that part of ADR 0010.

### D5. URLs: path routes in `/play/` (approved 2026-10-19, Q18)

**Conflict.** The move keeps hash routes under `/play/` (`/play/#/arena`) with `not_found_handling: "404-page"`, plus a static prerendered landing page and grown-up pages. The owner's answer to Q5 asked for path URLs.

**Decision (owner, 2026-10-19, Q18).**
- The move ships hash routes as planned. Nothing in `learnvedicmath` changes.
- This change switches `/play/` to path routes (`/play/arena`, `/play/sutras/ekadhikena`, `/play/game/times-sprint/12`) in phase 2, with an SPA fallback for `/play/*` only. Every other path keeps the move's 404 page.
- A tiny pre-paint shim turns every `#/...` into its path, forever: an inline script in the `/play/` shell (allowed by its hash in the CSP) runs before anything paints: if `location.hash` starts with `#/`, it calls `history.replaceState` to `/play/<rest>` and keeps the query. It also runs on `hashchange`, so legacy code that sets `location.hash` and old in-page links keep working. Old `/vedic-math/#/...` links arrive through the move's redirects (`/vedic-math/* /play/ 301`, the landing page's `#/` forward) and end in the same shim. Hashes that do not start with `#/` (such as a skip link's `#view`) are left alone.
- A Playwright test (`e2e/tests/old-routes.spec.ts`) opens every old route form and checks the screen and the final URL.
- Public pages are prerendered (Q20): `/play/sutras/` and one page per Sutra and sub-sutra (`/play/sutras/<id>/index.html`), with real titles, descriptions, canonical links and the Deep dive's text in the HTML; the Guide (`/play/guide/` and each section, `/play/guide/<section>/`); and `/play/` itself with the first-visit Mode picker (the static first screen `render-performance` D7 asked for). A returning Player's start-up replaces the prerendered Mode picker with Home; the pre-paint script marks a returning Player before paint so the picker is not flashed (as `render-performance` D7 planned, re-planned for React in task 11.1).

**SPA fallback for `/play/*` only: the Worker script answers misses.** Workers static assets apply `not_found_handling` to the whole site, so the move's `not_found_handling: "404-page"` becomes `"none"` (the default) and the Worker script the move already has handles every request that matches no asset. Existing files (hashed `/play/assets/*`, the prerendered pages, the landing and grown-up pages) are served directly by static assets and never run the script. For a miss, the script (`workers/src/fallback.ts`) answers a path under `/play/` with `/play/__spa-fallback.html` and status 200, and any other path with `/404.html` and status 404, both read from `env.ASSETS`. The fallback file is the one React Router writes: since `/play/` itself is prerendered (the first-visit Mode picker, Q20), React Router writes `/play/index.html` as the prerendered root and the SPA fallback as `__spa-fallback.html`; the build fails if it is missing from `_site/play/`. That costs one Worker request per miss (a deep link that is not prerendered, a typo) and none for files that exist. `not_found_handling` must stay unset or `"none"`: with any other value, navigation requests that miss skip the Worker script (`assets_navigation_prefers_asset_serving`, the default from compatibility date 2025-04-01). There is no `_redirects` rewrite for the fallback: Cloudflare's `_redirects` does support 200 proxying, but its rules apply whether or not an asset matches, so `/play/* /play/__spa-fallback.html 200` would also answer every hashed chunk and prerendered page with the fallback HTML. `_redirects` keeps only the move's 301s (`/vedic-math/* /play/ 301`).

**Rationale.** Path URLs are what the owner asked for, they let Sutra pages be prerendered and indexed (a hash is never sent to the server, so `/play/#/sutras/x` cannot have its own HTML), and they read better when shared. Doing it after the move keeps the move's plan intact; the shim makes the change invisible to old links.

**Alternatives rejected.**
- Keep hash routes for good: no prerendered Sutra pages, and against the owner's Q5 answer.
- Switch to paths inside the move: re-opens an approved plan and its tests during launch.
- SPA fallback for the whole site (`not_found_handling: "single-page-application"`): typos on the landing site would answer 200 with the game, and the move's 404 page would go.
- Redirect hashes on the server: a hash never reaches the server.
- A `_redirects` rewrite (`/play/* /play/__spa-fallback.html 200`): Cloudflare supports 200 proxying in `_redirects`, but its rules run whether or not an asset matches, so it would answer the game's own files with HTML.

### D6. Logic stays framework-free TypeScript

**Decision.** Game, math and storage logic stays framework-free TypeScript modules. Phase 1 converts the logic in `js/*.js` to `.ts` with no behavior change. React reads it through a small `useStore(selector)` hook on `useSyncExternalStore`. No Redux or Zustand.

**Rationale.** The logic is already mostly pure (`skills/*`, `vedic.js`, `check.js`, `answers.js`, `adapt.js`, `levels.js`, `mental.js`, `lib.js`, `sky.js`, `gamify.js`) and well tested; it does not need a framework, and keeping it framework-free lets the Duel server (`workers/`) and Vitest use it directly. `store.js` already owns localStorage; adding `subscribe()` and a version counter is all React needs. `useSyncExternalStore` is React's own primitive for an external store and is safe with concurrent rendering.

**Shape.** `app/src/logic/store.ts` gains `subscribe(listener): () => void` and bumps a version on every write (and on the `storage` event from another tab). `app/src/hooks/useStore.ts`: `useStore(selector, isEqual = Object.is)` caches the last selector result per store version so a selector that builds an object does not re-render forever. Settings that live in `fx.js` today (Mode, Calm, sound, theme, motion) get the same treatment through `app/src/logic/settings.ts`.

**Alternatives rejected.**
- Redux Toolkit or Zustand: a second state model next to localStorage, more code to learn, nothing the store cannot do.
- React Context for state: re-renders whole subtrees on every write; fine for the router and theme, not for Sparks ticking during a round.
- Rewrite the logic as hooks: ties tested pure code to React and breaks sharing with the Worker.

### D7. Styling

**Decision.** Plain CSS with design-system tokens. `math.css` is split into one CSS file per component. No Tailwind, no CSS-in-JS. Both color schemes (Daybreak and Deep Space, system default with a saved override). The design system is v2.1, consumed as the move vendors it (`/ds/2.1.0/tokens.css`, `components.css`, the `learnvedicmath` theme).

**Rationale.** The house rules (tokens only, never raw hex, `var(--on-accent)` on accent fills) already work in plain CSS; a component file next to each component (`Arena.tsx` and `Arena.css`, imported by it) keeps styles findable and lets Vite load a route's CSS with its chunk. CSS-in-JS would need `style-src 'unsafe-inline'` or nonces, against the move's stricter CSP; Tailwind would replace the design system's vocabulary.

**Rules.** Component CSS uses only design-system tokens and the theme's names; a stylelint rule (`color-no-hex`, `declaration-property-value-disallowed-list` for raw colors) fails on hex or `rgb()` in `app/src/**/*.css`. The vendored design system stays a `<link>` in the shell (not bundled), so its pinned files and hashes stay as the move set them. Prerendered markup carries no `style` attributes (they would need `'unsafe-inline'` under the stricter policy); dynamic values go through CSS custom properties set by `element.style.setProperty` in an effect, which CSP allows.

**Alternatives rejected.** Tailwind (a second design vocabulary), CSS Modules with generated names (harder to target from Playwright and to override from the theme; plain BEM-style class names as today), CSS-in-JS (CSP), one big `math.css` kept as is (no per-route loading, no ownership).

### D8. Lifecycle

**Decision.** `js/life.js` retires, replaced by `useEffect` cleanup and a `useAbortSignal()` hook. Legacy views keep `js/life.js` until they are moved. `test/lifecycle-scan.test.mjs` becomes an ESLint rule banning bare `addEventListener`, `setTimeout` and `requestAnimationFrame` in components.

**Rationale.** In React, cleanup belongs to the effect that started the work, and the framework calls it on unmount, route change and Strict Mode re-runs. A signal is still useful for rounds and fetches: `useAbortSignal()` returns a signal aborted on unmount, and `child(signal)`-style nesting for rounds and questions moves to `app/src/hooks/useRound.ts`. A lint rule sees every file, with real syntax, instead of a regex over a list of files.

**Shape.**
- `app/src/hooks/useAbortSignal.ts`: `useAbortSignal(deps?)` returns an `AbortSignal` aborted when the component unmounts or `deps` change.
- `app/src/hooks/useTimer.ts`, `useInterval.ts`, `useFrame.ts` (a `requestAnimationFrame` loop that stops when it returns false), `useEvent.ts` (window or document listeners): each takes or creates a signal and is the only sanctioned way to start one.
- `tools/eslint-rules/no-bare-lifecycle.js`: in `app/src/views/**` and `app/src/components/**`, a call to `addEventListener`, `setTimeout`, `setInterval` or `requestAnimationFrame` fails unless it is inside `app/src/hooks/`. Page-lifetime listeners (the router, the worker registration) live in `app/src/shell/` with a reviewed allow-list, as today's scan has.
- `test/lifecycle-scan.test.mjs` keeps scanning whatever Legacy views remain and is deleted with the last one (task 9.2).

**Alternatives rejected.** Keep `life.js` inside React (duplicates effect cleanup and confuses who owns a timer); no lint rule (the current spec requires the check); a runtime leak detector only (catches leaks after they ship).

### D9. Service worker

**Decision.** The worker stays hand-written, as `sw.ts`, with today's caching rules as modified by the move. Its precache list comes from Vite's manifest. No Workbox.

**Rationale.** The worker's rules are specific and tested: network first for pages with a 3.5 s fallback, cache first for hashed files, `lvm-voice` kept across deploys, the `'dev'` and `KILL` branches, install failing on a hash mismatch. Workbox would replace a short, readable file with configuration and a runtime, and its precache manifest format differs from ours. Vite's `.vite/manifest.json` lists every emitted file with its hashed name, so the list is exact.

**Shape.** `app/src/sw/sw.ts` is built by a second Vite build (`vite.sw.config.ts`, `build.lib`, one ES module, no chunks) to `_site/sw.js`. A small Vite plugin (`tools/vite-plugin-precache.ts`) reads the app build's manifest after it is written and injects `VERSION` (a hash of the precache list and the worker source) and `PRECACHE` (`[url, sha256 prefix]` for the shell, the SPA fallback, every chunk and CSS file of the entry and the core routes, the vendored design system, theme, fonts, icons and the manifest; never a 3D file, D13) between the existing `build.py: precache` markers. In the source those stay `'dev'` and empty. Hashed files (`/play/assets/*-<hash>.*`) are cache first, which replaces the `?v=` rule.

**Alternatives rejected.** Workbox (`vite-plugin-pwa`) (more moving parts, different update semantics, large config); keeping `sw.js` as plain JS (it should be typed like everything else); no worker (offline play is a spec).

### D10. Testing

**Decision.** Playwright stays the behavior contract, unchanged in what it asserts (selectors may change). Vitest replaces `node --test`. React Testing Library only for tricky components.

**Rationale.** The Playwright suite and its 93 coverage specs are the proof that a moved view behaves the same; it must not be weakened to make a migration pass. Vitest runs TypeScript directly, shares Vite's config and is fast; the existing node tests port almost line for line (`node:test` and `assert` map to `describe`, `it`, `expect`, or `assert` through Vitest's `chai` compatibility). Component tests are expensive to keep up; most behavior is better checked end to end.

**Rules.** A migration PR may change a selector, a URL form (Q18) or a wait, never an expectation about what a Player sees or what is stored or sent; its description lists every changed spec line. React Testing Library is for components with logic that is hard to reach end to end (the keypad's input rules, the Markup component, the 3D fallback chooser).

**Alternatives rejected.** Jest (slower with TypeScript and ESM, separate config); rewriting e2e tests per view (loses the contract); component tests for everything (cost without signal).

### D11. Repo layout

**Decision.** One repo with pnpm workspaces: `app/` (React), `workers/` (Cloudflare Workers and the Duel Durable Object) and `shared/` (question generators, scoring and message types, used by both).

**Rationale.** One repo keeps the game, server and their shared types in one commit and one CI run; workspaces give each its own `package.json` and `tsconfig.json` without copying code. `shared/` is exactly what ADR 0009 says must be one source for the app and the Duel server.

**Shape.**
```text
pnpm-workspace.yaml        packages: app, workers, shared, e2e, tools
app/                       Vite + React Router; index.html is the /play/ shell
  src/shell/               Root, Header, Nav, LegacyRoute, dialogs, hash shim source
  src/views/<area>/        one folder per area: guide, watch, sutras, me, learn, dojo, tower, home, sky, star, games, arena, duel, play
  src/components/          shared pieces: Markup, Bolt, Keypad, ResultCard, Crumbs, Board
  src/logic/               store, settings, fx sound and motion, metrics, cloud, gamify, sky, levels, adapt, check, answers, viz
  src/hooks/               useStore, useAbortSignal, useTimer, useFrame, useEvent, useRound
  src/scenes-3d/           React Three Fiber scenes (phase 6)
  src/sw/sw.ts
shared/src/                questions (makeSet, seeded random), skills, vedic, mental, lib, names, scoring, messages
workers/                   the move's worker/csp.js as src/csp.ts; later duel-online's src/duel/
site/, vendor/, theme/, fonts/, icons/, thumbs/   unchanged from the move, copied by build.py
e2e/, cloud/               unchanged places
```
`js/` shrinks as modules move and is gone at the end. `duel-online` planned `worker/` (singular) and shared `.js` files in `js/`; its revision moves them to `workers/` and `shared/src/*.ts` (task 11.3).

**Alternatives rejected.** Separate repos (shared code by package publishing, drift); a single package (the Worker and the app need different TypeScript targets and libs); npm or Yarn workspaces (pnpm's strict `node_modules` catches undeclared dependencies, and it is fast in CI).

### D12. Feature work during the migration

**Decision.** Feature PRs pause only for the views being moved. Each migration PR names the views it locks.

**Rationale.** A view is either legacy or React at any time; a feature PR against a view mid-move would be written twice. Locking only what is moving keeps everything else open.

**How.** A migration PR's description starts with `Locks:` and the list of views (by route and file). The lock table in this design (Migration plan) and the GLOSSARY term **Locked view** say which views are locked; the PR is merged quickly (target: within 3 working days of opening) to keep locks short. A feature PR that touches a Locked view waits, or is rebased onto the React version after the migration PR merges. Content PRs (`js/videos.js`, `js/slokas.js`, voice files, verses) are never locked; B6 says how they follow moved files.

**Alternatives rejected.** Freeze all features for the migration (months of no product work); no locks (double work and painful merges).

### D13. Three.js for 3D

**Decision.**
- React Three Fiber plus drei, bundled from our own origin (no CDN, inside the CSP, no `eval`), with tree-shaken `three` imports.
- 3D loads late, only on routes that use it and after the page is usable. The home Sky first shows the 2D Sky, then fades into 3D.
- CI size budget: the whole 3D dependency graph (three, React Three Fiber, drei and the scenes) stays under 170 KB Brotli in total (about 200 KB gzip; owner, 2026-10-19, Q21), summed over the unique files the build emits for it, and first load does not grow. Every size budget in this change measures Brotli.
- 3D files are never in the service worker's install precache. They are hashed files, so the worker caches them on first use and serves them cache first after that. A first visit never downloads 3D, and the first-load measure (which counts the worker's install downloads, performance-budget spec) proves it. Offline, a Sky whose 3D files were never loaded shows the 2D Sky.
- Fallbacks: Calm, Pause motion or reduced motion get a still frame; no WebGL, or a scene that stays under 30 frames a second for 3 seconds (Q25), gets the 2D canvas or SVG; a hidden tab pauses rendering. Playwright covers each.
- 3D renders on the main thread (Q22), never during a round, and pauses when the tab is hidden.
- Three.js replaces the raw-WebGL plan in `gpu-effects`.
- Order: the Sky (the first 3D scene, shipped inside this change, Q23), then Sutra deep-dive illustrations, then game effects and Mandala.

**Rationale.** A hand-written engine (the `gpu-effects` plan) is small but is code nobody else knows, and real 3D (depth, camera, lighting) is far more work by hand. React Three Fiber makes a scene a component with the same lifecycle as the rest of the app (it unmounts and disposes with the route), and drei has the pieces the Sky needs (points, instancing, `AdaptiveDpr`, `PerformanceMonitor`). Bundling it ourselves keeps the CSP as it is (`script-src 'self'`) and lets the worker cache the files on first use. Loading it late, behind the 2D Sky, means a Player never waits for 3D.

**Pause motion.** The accessibility spec treats Pause motion like reduced motion, so the still frame applies to Calm, Pause motion and reduced motion alike (confirmed by the owner, 2026-10-19).

**How `gpu-effects` must be revised** (task 11.4): drop `js/gfx/` (`gfx.js`, `gl.js`, the hand-written shaders and the two-renderer scene format) for `app/src/scenes-3d/`; replace the 20 KB decoration budget with this change's 170 KB Brotli 3D budget (performance-budget spec) and "never in first load"; replace ADR 0011's "no library" and its OffscreenCanvas worker with ADR 0013 (ADR 0011's other rule stays: 3D is decoration only, never interface); render on the main thread, paused when the tab is hidden (Q22, decided 2026-10-19); move its Sky backdrop requirement here (the Sky ships in this change's phase 6) and keep Sutra deep-dive illustrations, celebrations, the Moving background and Mandala glow in `gpu-effects`; keep its tests (still frame, context loss, hidden tab, token colors, no flashes) as scenes-3d scenarios.

**Alternatives rejected.** The hand-written WebGL 2 engine (more code to own, no 3D); PixiJS (2D only); Babylon.js (larger, not React-first); loading three from a CDN (new CSP origin, third-party request on a children's site, not cached by our worker); 3D in the first load (the budget forbids it); 3D in the worker's install precache (every first visit would download it, which the first-load measure counts).

### B1. Markup from content stays behind one component

Generators and content modules return HTML strings (`<sup>` in questions, `<b>` in Trick steps, SVG from `js/viz.js`). Converting them to typed node trees is a large content change, so phase 1 keeps them as strings, and React renders them only through `app/src/components/Markup.tsx`: it parses the string with `DOMParser` (inert, no scripts run), walks it against an allow-list (the same list `duel-online` planned for `safe-html.js`: `b`, `i`, `sup`, `sub`, `span`, `br`, `small`, `em`, `strong`, and the SVG elements `svg`, `g`, `circle`, `rect`, `line`, `path`, `text`, `tspan`, `polygon`, `polyline` with geometry, `viewBox`, `class` and `aria-*` attributes only), and builds React elements. Nothing is assigned to `innerHTML` and `dangerouslySetInnerHTML` is banned by lint everywhere else (`react/no-danger` as an error, no exceptions outside `Markup`, which builds elements and does not need it). The allow-list is in `shared/src/markup.ts`, so the online Duel client uses the same one. A typed content format can wait (Q19, decided 2026-10-19).

### B2. Build: Vite builds the game, `build.py` keeps the site steps

`build.py` stays the single command CI runs (`python3 build.py --out _site`). It runs `pnpm --filter app build` (Vite to `_site/play/`, base `/play/`) and the worker build, then does what the move added: renders `site/`, copies `vendor/`, `theme/`, `fonts/`, `icons/`, `thumbs/`, writes `_headers` (CSP hashes now read from the built HTML, including React Router's inline hydration script on prerendered pages), `_redirects`, `robots.txt`, `sitemap.xml` (gains the prerendered Sutra pages), and runs its checks. The import map, `?v=` stamping and the "source carries stamps" check go: Vite's hashed file names replace them (`/play/assets/<name>-<hash>.js`). The build's import check becomes ESLint's `no-restricted-imports` plus a post-build check that no emitted file references a host outside `THIRD_PARTIES`. `build.py --dev` runs `vite build --mode development`; local work uses `pnpm --filter app dev` (Vite dev server with a proxy for the move's `wrangler dev`).

### B3. Legacy views stay as plain JS until they move

Legacy views are not converted to TypeScript; they move straight to React components. During phases 1 to 4, `app/` sets `allowJs` for `js/` so legacy files import the new `.ts` logic through Vite. The lifecycle scan keeps covering them.

### B4. Analytics route names stay the same

`metrics.routePath()` reads the router's matched route id and params instead of `location.hash`, and produces the same event names (`math/view/arena`, `math/view/game/<id>/level`, `math/view/star/<trick>/star`, `math/view/pick-mode`, `math/view/sky`), so dashboards continue across the switch.

### B5. TypeScript settings

All workspaces use `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (ADR 0010's flags), `verbatimModuleSyntax`, `moduleResolution: "bundler"`. `shared/` has no DOM lib, so nothing in it can touch the page.

### B6. Content files that move

Data modules with active content branches (`js/videos.js`, `js/slokas.js`, `js/sutra-details.js`) and generated files (`js/say-clips.js`, `js/voice-index.js`, written by tools) are converted last in phase 1, in a PR announced on the content branches first. Generated files become `.ts` written by their tools (the tools change in the same PR). A content PR open at that moment is rebased with a rename only.

### B7. Prerendered pages hydrate without side effects

Prerendered Sutra pages hydrate into the full app. Start-up that writes storage, counts a visit, starts sound or registers the worker runs after hydration in an effect, once, the same as today's start-up order, so a crawler's render writes nothing (it has no storage anyway) and a Player's first paint is the prerendered page.

### B8. Header

The game's header becomes `app/src/shell/Header.tsx`, written to produce the same markup as the move's `theme/header.html` partial (the landing pages keep the partial). `e2e/tests/header.spec.ts` checks both match (same items, order and sticky behavior), so they cannot drift.

### B9. Strict Mode and the Compiler

The app runs under `<StrictMode>` in development, so effects that do not clean up show up as double timers in tests. The React Compiler runs through `babel-plugin-react-compiler` in Vite; `eslint-plugin-react-hooks` (with the compiler rules) is an error in CI.

## Risks and mitigations

- **Bytes in first load.** React and React DOM add about 60 KB gzip. Today's `/play/` loads every module of the static graph unminified (about 700 KB raw; the same graph minified and bundled is about 140 KB Brotli, measured for `render-performance`), so Vite's minification and per-route chunks should more than pay for it. Mitigation: the byte gate runs from the first PR and counts the worker's install downloads too (performance-budget spec); phase 1 PR 1 measures it before any view moves.
- **Interaction time in rounds.** A re-render on every keypad tap or clock tick could cost more than today's direct DOM writes. Mitigation: the React Compiler, clocks drawn with `useFrame` into a ref (no state per frame), the interaction timing gate, and Arena, games and Play moving last when the patterns are known.
- **Two systems during the migration.** Legacy and React views share the store and settings. Mitigation: the store's `subscribe()` notifies both; the LegacyRoute adapter is the only bridge; legacy code never imports React.
- **Hash shim misses a form.** Mitigation: `old-routes.spec.ts` lists every form (D5) and runs on every PR and daily against production.
- **The SPA fallback runs in the Worker script.** A wrong `not_found_handling` value would make navigation misses skip the script. Mitigation: the build fails unless `wrangler.jsonc` leaves `not_found_handling` unset or `"none"`; task 3.4 checks a deep link, a typo outside `/play/` and an existing hashed file on `wrangler dev` and the preview.
- **CSP and prerendering.** React Router inlines a hydration script in prerendered HTML. Mitigation: `build.py` hashes every inline script in every built page (it already does this for the import map); `csp.spec.ts` runs on prerendered pages.
- **Three.js size.** React Three Fiber's default catalogue imports all of `three`; full `three` is about 170 KB gzip, so R3F plus drei could pass the 170 KB Brotli budget. Mitigation: task 10.1 is a measured spike with a go or no-go before any scene work; `extend()` with only the classes used; import drei pieces by path. If it cannot fit, the owner decides (raise the budget or drop drei).
- **drei helpers that fetch from CDNs** (`Environment` presets, default fonts for `Text`). Mitigation: ESLint `no-restricted-imports` for those helpers; the CSP blocks them anyway; `third-party.spec.ts` covers 3D routes.
- **Merge pain with feature and content branches.** Mitigation: D12 locks, short-lived migration PRs, B6 for content files, and phase 1 PRs that rename and convert in separate commits so `git` follows renames.
- **The Playwright suite drifting to fit the code.** Mitigation: D10's rule that a migration PR changes selectors and URL forms only, listed in the PR description and checked in review.
- **Learning curve.** Mitigation: `CLAUDE.md` gains the component, hook and CSS rules; the first moved views (Guide, Watch) are the examples later PRs copy.

## Migration plan

Phases, with rough PR counts. Every PR ships alone, keeps the Playwright suite green on its preview (chromium, webkit, mobile) and the performance gates within budget, and can be reverted alone.

| Phase | What | PRs | Locks |
|---|---|---|---|
| 0 | Before building: the move archived, baseline measured, ADRs and docs | 1 (docs) | none |
| 1 | Tooling and TypeScript logic: workspaces, Vite builds today's app unchanged, Vitest, `sw.ts`; then `shared/` and `app/src/logic/` in TypeScript | 3 | none (logic only; views untouched) |
| 2 | The app shell: React root, React Router with LegacyRoute for every route, path routes, hash shim, SPA fallback; then header, nav, chip, Mode picker, the video player, Age and Player dialogs, ESLint lifecycle rule | 2 | header, nav, dialogs (`js/app.js` router, `chip()`, `modePicker`, `playerDlg`, `ageDlg`) |
| 3 | Views, simplest first: Guide and Tour; Watch; Sutras with Deep dive and verses (prerendered); Me; Learn, grade, All places, tiles; Skill lesson and Practice; Mix and Run; Dojo and Katas; Tower and challenges; Home and the Sky; the Star round (Star Quest mobile layout) | about 11 | each PR its own views |
| 4 | The most interactive: games (2 PRs), Arena and Boards, Party Mode (`#/duel` now redirects to it; the same-screen Duel is retired), Play experiences (2 or 3 PRs) | about 6 | each PR its own views |
| 5 | Retire legacy: delete `js/life.js`, LegacyRoute, the lifecycle scan, `math.css` remnants, `js/` | 1 | none |
| 6 | 3D: measured spike, then the Sky scene with its fallbacks | 2 | Home and the Sky |
| 7 | Re-plan the follow-on changes for React, in the order `placement`, `age-bands`, `render-performance`, `duel-online`, `gpu-effects` (docs only; can start after phase 2) | 1 or 2 | none |

About 27 to 30 PRs in all: 2 to 3 for TypeScript logic, 2 for the shell, about 17 for views (Play and Party Mode last), and the rest for setup, retirement, 3D and plans.

Rollback: any PR is a revert. A route that moved to React can go back to its Legacy view by pointing its route entry at `LegacyRoute` again until phase 5 deletes the legacy code. The hash shim is never removed.

## Open questions

All answered by the owner on 2026-10-19 ("yes to all"); none is pending. Each answer is folded into the decisions above, the spec deltas and the tasks.

- **Q18 (answered 2026-10-19).** Path URLs in `/play/` with the hash shim forever, as in D5: the move ships hash routes under `/play/`, and this change switches `/play/` to path routes in phase 2. The hash shim is never removed.
- **Q19 (answered 2026-10-19).** Content HTML strings render only through the one allow-list `Markup` component (B1), and `dangerouslySetInnerHTML` is banned everywhere else. A typed content format can wait for a later change.
- **Q20 (answered 2026-10-19).** Prerendered: the Sutra pages (`/play/sutras/` and each Sutra and sub-sutra), the Guide (`/play/guide/` and each section) and the first-visit Mode picker at `/play/`. The SPA fallback file is therefore `__spa-fallback.html` (D5).
- **Q21 (answered 2026-10-19).** Every size budget measures Brotli. The 3D chunk budget is 170 KB Brotli (about 200 KB gzip).
- **Q22 (answered 2026-10-19).** 3D renders on the main thread and pauses when the tab is hidden. This supersedes ADR 0011's OffscreenCanvas worker (ADR 0013).
- **Q23 (answered 2026-10-19).** The Sky's 3D scene ships inside this change (phase 6) as the first 3D scene.
- **Q24 (answered 2026-10-19).** The owner signs off Star Quest's new mobile layout from phone screenshots on its PR (task 7.2).
- **Q25 (answered 2026-10-19).** The 2D fallback triggers when a scene stays under 30 frames a second for 3 seconds, at any time while it is drawing. Once on 2D, the page stays on 2D until reload. Pause motion gets the still frame, like Calm and reduced motion.
- **Q26 (answered 2026-10-19).** `duel-online` is kept. The owner asked for true online multiplayer Duels between any two Players or two friends and approved `duel-online`; the 2026-10 retirement of the same-screen Duel (now Party Mode) does not change that. `duel-online` is re-planned on `workers/`, `shared/` and TypeScript (task 11.3) and built fourth of the follow-on changes (D3).

Other owner answers of 2026-10-19, not numbered here:
- **When to start.** Implementation starts the day the `learnvedicmath` move is live, not before (D3, task 0.0).
- **Superseded rules.** React and TypeScript supersede "no framework, no bundler, no TypeScript in the browser" in the `learnvedicmath` design, `openspec/config.yaml`, ADR 0010 and `render-performance`; ADR 0012 supersedes those parts. `render-performance` is re-planned for Vite and React before it is built (task 11.1).
- **Three.js.** Three.js supersedes `gpu-effects`' "no three.js, 20 KB, OffscreenCanvas worker"; ADR 0013 supersedes ADR 0011 in those parts.
- **Follow-on order.** `placement`, `age-bands`, `render-performance`, `duel-online`, `gpu-effects` (D3).
