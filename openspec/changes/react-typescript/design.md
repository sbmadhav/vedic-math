# Design

## Context

- **The move is live** (`learnvedicmath` Phase A, 2026-10-20): the game is `/play/` on learnvedicmath.com, Cloudflare Workers static assets with `not_found_handling: "404-page"` and one small Worker script (`worker/csp.js`) that runs only for `/_csp`, hash routes (`/play/#/arena`), the landing and grown-up pages as static HTML from `site/`, `_headers` with a per-page CSP built from inline script hashes, a vendored design system at `/ds/2.1.0/`, the theme at `/theme/`, the Firebase SDK at `/vendor/firebase/<v>/`, `js/analytics.js`, and `sw.js` at `/sw.js` with scope `/play/`, caches `lvm-<VERSION>` plus `lvm-voice`, every precache entry hashed. Two parts of it are not switched on yet: there is no Firebase config (the site launched with Device boards only, `learnvedicmath` task 8.5), and the R2 voice host `voice.learnvedicmath.com` is not set up, so the deploy builds with `build.py --voice off` and read aloud uses the device's voice (PR #96). Archiving `learnvedicmath` is still pending.
- **The code today** (main, 2026-10-20): 41 modules in `js/` and `js/skills/`, about 10,800 lines with data. `js/app.js` (1,497 lines) holds the route table (25 hash patterns), `mount()`/`teardown()`, every view function, the Sutra, video player and Age dialogs, the World boards section and `parentNote()`. Views write template strings into `#view` with `innerHTML` (69 times in `js/app.js`, 22 in `js/games.js`, 15 in `js/arena.js`, 10 in `js/star.js`). Content modules build HTML strings too: `js/vedic.js` (Trick steps), `js/skills/high.js` and `upper.js` (questions with `<sup>`), `js/viz.js` (SVG pictures), `js/sutra-details.js`, `js/slokas.js`.
- **Lifecycle:** `js/life.js` (`on`, `later`, `every`, `loop`, `child`, `onAbort`) ties every listener and timer to the view's `AbortSignal`. `test/lifecycle-scan.test.mjs` fails on bare calls in named files, with an allow-list of page-lifetime listeners. `js/play/life.js` does the same for the Play experiences.
- **Build:** `build.py` writes an import map pinning every module to `?v=<hash>`, stamps `math.css`, writes the worker's `VERSION` and `PRECACHE`, computes the CSP, and checks the source carries no stamps. The move added `_headers`, `_redirects`, `THIRD_PARTIES`, the landing pages, the moved target and `--voice off`.
- **Voice:** `better-voice` part B recorded every fixed line and about 1,550 clips with Google Chirp 3 HD Aoede; lines with a question's own numbers are stitched from clips or said by the device's voice. Its guardrail was "the game calls no speech provider" and its design kept a live cloud voice as the rejected alternative (plan C). `explanation-audio` reads explanations through the same voice order.
- **Tests:** 33 node test files in `test/` (`node --test`), 30 Playwright specs plus about 130 coverage specs in `e2e/tests/cov/`, chromium, webkit and mobile projects, service workers blocked except in `offline.spec.ts`. About 87 spec files import internal modules by URL (`/js/<x>.js`) inside `page.evaluate`.
- **Paused phase-1 work** (branch `react-ts-phase-1`, commit bd086fa, worktree `wt-react-ts-1`, does not build): pnpm workspaces, `tsconfig.base.json`, `app/vite.config.ts` building today's `js/` as an SPA with every module its own hashed entry and a `modules.json` map for Playwright, `app/src/sw/sw.ts`, `app/vite.sw.config.ts`, `tools/vite-plugin-precache.ts`, and three bundler-compatibility edits in `js/`. Not done there: `build.py`, `workers/src/csp.ts`, the Vitest port, ESLint and stylelint, the budget gate, CI, the e2e module helper. Paused while the framework choice was reconsidered; N7 says what carries over (Migration plan).
- **Plans after the move:** `render-performance` (esbuild per-file minify, `js/views/*.js` split, hash routes kept, "no bundler, no framework, no path routing"), `duel-online` (`worker/` in TypeScript, shared `.js` modules with `// @ts-check`, Turnstile and signed tickets, "a Duel never creates a Firebase identity", ADRs 0009 and 0010), `gpu-effects` (a hand-written WebGL 2 engine in an OffscreenCanvas worker, 20 KB budget, "no three.js", ADR 0011), `placement` and `age-bands` (new views and copy).
- `openspec/config.yaml` and the move's design both still say "no framework, no bundler". This change replaces that rule.

## Goals

- No `innerHTML` XSS class in the game: React renders text as text, and the only way to put markup on screen is one reviewed component.
- Code that is easier to change: typed logic, small components, one router, cleanup the framework enforces.
- Faster feature work for the plans that follow, including server features (Duels, Live sessions, voice) on one TypeScript stack on Cloudflare.
- Every step ships alone, the Playwright suite stays green after each, and feature work pauses only for the views being moved.
- No regression in first load or interaction time compared with today's site, measured in CI.
- Every old link keeps opening the same screen.
- The studio voice for nearly every line a Player hears, within a hard daily spend cap, with nothing about the Player sent.

## Non-goals

- Making the game faster (that is `render-performance`); new features; changing stored data; moving the landing pages to React; rendering Player data on the server (it stays on the device); sending anything new except the text of a game sentence for the server voice.

## Decisions

D1 to D13 are the owner's decisions (2026-10-17, all approved; D5 approved 2026-10-19 as the answer to Q18). D4, D5 and D9 were revised and D14 to D18 added for the owner's decisions N1 to N8 of 2026-10-20 (all "yes"). The owner's answers, including Q27 to Q30 (answered 2026-10-20), are listed under Open questions. B1 to B9 after them are builder choices that follow from them; review can change those without going back to the owner.

### D1. Goal and budget

**Decision.** The goal is safety (no `innerHTML` XSS class), maintainability and speed of building features. Player speed stays its own spec (`render-performance`, re-planned for React). Budget: no regression in first load or interaction time compared with today, measured in CI (performance-budget spec).

**Rationale.** The XSS class is structural: 120 or so `innerHTML` writes, each relying on someone remembering `esc()`. A component model removes the class instead of policing it, and makes the move's stricter Report-Only CSP (`require-trusted-types-for 'script'`) enforceable later. Speed is real but separable; mixing it in would make every migration PR a perf PR, and `render-performance` already has a careful plan that only needs re-basing.

**Baseline first.** `docs/perf/baseline.md` records today's numbers on the live site (task 0.4), and it is measured and merged before the first phase 2 pull request is opened. Phase 1 changes no file a Player downloads except the service worker, which keeps the same rules and list, so the baseline still describes today's game; nothing that changes what is published merges before the baseline exists. It holds: Lighthouse mobile preset (simulated slow 4G, 4x CPU, 5 runs, median) on `/play/` first visit and repeat visit, `/play/#/arena`, `/play/#/games` and `/play/#/sutras/ekadhikena`, including time to first byte; the Brotli bytes of everything a first visit to `/play/` requests before the first tap, including every file the service worker's install downloads; and interaction timings from a Playwright script (open the Arena, answer one Arena question, open a Sutra's Deep dive, light a Star) measured with the Event Timing API under 4x CPU throttling in chromium. After phase 2 the same pages are measured at their path URLs.

**What the gates measure after phase 2 (N2).** The byte gate reads the client build's manifest (`.vite/manifest.json` of the React Router client build, which lists every chunk with its static imports, and the route manifest React Router emits): the entry, the root route and the first route's chunks and CSS, plus the server-rendered or prerendered document itself, fonts, icons and every file in the worker's `PRECACHE`, each unique file once. The server bundle never reaches a browser and is not in that number; it has its own check of its uncompressed size against the Worker size limit. Lighthouse adds server time to first byte for the server-rendered pages, within the same tolerances.

**Alternatives rejected.**
- Make speed a goal of this change: doubles the scope of every PR and duplicates `render-performance`.
- No budget: a framework migration can quietly add 100 KB; the owner wants it measured.
- Absolute budgets (FCP under 1.5 s) now: those are `render-performance`'s targets; this change only promises not to go backwards.
- Measure the baseline after phase 1: phase 1 should not change what Players download, but measuring first proves it.

### D2. Step by step, not a big-bang rewrite

**Decision.** The router mounts a Legacy view or a React view per route. Each PR moves a few views, and the Playwright suite stays green after every PR. Order (revised 2026-10-20, N7): framework-neutral tooling; the React Router framework-mode shell on Workers serving every route as a Legacy view; TypeScript for the logic; the shell pieces (header, nav, dialogs); views from simplest to most interactive, with games, Arena, Party Mode and Play last.

**Rationale.** The game is live, used by children, and has open feature work. A strangler migration keeps it shippable every day, makes each PR reviewable, and lets the Playwright suite prove behavior did not change one view at a time. Tooling first lands the checks before any code moves; the shell next puts the router, the server render and path URLs in place once, so every later PR only adds a route component; logic before views means views are rewritten against typed, tested modules (the framework build is what lets Legacy code import TypeScript, so logic follows the shell); the most interactive views go last, when the patterns (rounds, timers, keypads, focus) are settled.

**How a Legacy view runs inside React.** `app/src/shell/LegacyRoute.tsx` renders one `<div>` and, in an effect, sets the legacy module's view root to it, creates an `AbortController`, calls the legacy view function with `{ signal }` exactly as `mount()` does today, and aborts it (calling `destroy()` first if the view returned one) when the route changes or the component unmounts. Legacy code keeps `js/life.js` and its own `innerHTML` until it moves. `location.hash = '#/x'` writes in legacy code keep working through the hash shim (D5), which turns them into router navigations.

**Alternatives rejected.**
- Big-bang rewrite on a branch: months of drift against content and feature PRs, and one enormous unreviewable merge.
- Micro-frontends or React islands inside legacy views: two routers, two lifecycles and harder tests, for no gain once the shell is React.
- Views first, logic later: views would be written against untyped modules and rewritten again.

### D3. Sequencing

**Decision.**
1. The learnvedicmath.com move ships unchanged. Done: Phase A is live (2026-10-20). Archiving it is pending and does not block this change.
2. Next, this migration.
3. Last, in this order (owner, 2026-10-19, with N5 of 2026-10-20): `placement`, `age-bands`, `render-performance`, `duel-online`, Live sessions (a new change, proposed after Duels, on the same room engine, D18), `gpu-effects`, each built in React and re-planned first (task group 12).

**When to start (owner, 2026-10-19).** Implementation starts the day the `learnvedicmath` move is live. That day has come; phase 1 can start now, and phase 2 waits for the baseline (D1, task 0.4).

Content work (videos, voice, verses) continues throughout. Star Quest's mobile layout is redone when its view moves (the owner reports it looks bad on mobile). The server voice (D16) is its own phase, after phase 2 and independent of the view phases, because it needs only the Worker and `js/voice.js`.

**Rationale.** The move is planned, approved and changes every path; doing both at once would double the risk on launch. Building the later changes in React avoids writing a lot of template-string code that this change would then rewrite (`placement`'s climb, `age-bands`' copy, `duel-online`'s views, `render-performance`'s `js/views/` split, `gpu-effects`' engine). Content is data, not views, so it does not collide with the migration, apart from files that move (B6).

**Alternatives rejected.**
- Migrate before the move: the move's paths, build and worker would then have to be planned again.
- Build `render-performance` first, then migrate: its per-file minify, `js/views/` split and import-map model are all replaced by the framework build; most of it would be thrown away.
- Freeze content during the migration: content is the product; it keeps flowing.

### D4. Stack (revised 2026-10-20, N1 and N2)

**Decision.** React 19 with the React Compiler, TypeScript `strict`, and **React Router v7 in framework mode with server-side rendering (`ssr: true`) in a Cloudflare Worker**, built by Vite with React Router's plugin (`@react-router/dev/vite`) and the Cloudflare Vite plugin (`@cloudflare/vite-plugin`), which runs the server build in the Workers runtime in development as well. All server code is TypeScript on Cloudflare (N1): Workers for requests, Durable Objects for live rooms, R2 for voice files. Public routes that are the same for every visitor are still prerendered at build time (D5). This replaces the first form of this decision (Vite single-page app with React Router in SPA mode, `ssr: false`).

**Rationale.** React 19 is the most widely known component model, with the largest pool of examples and reviewers; the React Compiler removes most hand-written memoization, which matters for timers and rounds that re-render often. TypeScript `strict` catches the kind of shape mistakes the logic modules have today. The game now gets real server code (Duels, Live sessions, the voice endpoint, D16 to D18), so the Worker the site already runs is no longer only a CSP report endpoint; rendering the app in that same Worker costs no new host, vendor or deploy. Framework mode gives one route table for the server and the browser, server rendering of any game path (a cold load paints the shell and every server-safe part at once, with no fallback file), build-time `prerender` for the public pages, per-request nonces for the CSP (D15), and an official, first-party Cloudflare path: React Router's Cloudflare template and the Cloudflare Vite plugin are maintained by the two projects themselves, so there is no adapter in between that can lag a release. React Router keeps the route model of today's table (D5) and `basename: '/play/'`.

**Comparison with Next.js and the OpenNext adapter (rejected).** Next.js is the most used React framework, but it is built for Vercel. On Cloudflare it runs through `@opennextjs/cloudflare`, a community adapter that translates Next's build output for Workers.
- **Adapter lag.** Each Next.js release changes the build output the adapter reads; the adapter follows weeks behind and documents unsupported features per version, so upgrades of the framework would wait on a third party.
- **Vercel-only features.** Image optimization, ISR and its cache, middleware edge behavior and parts of Partial Prerendering depend on Vercel's platform; on Cloudflare they need adapter-specific replacements (R2 or KV incremental cache, a queue for revalidation, a separate image service) or are not available, so we would pay for a framework whose distinctive features we cannot use.
- **Deploy complexity.** OpenNext adds its own build step, config file and cache bindings to the deploy, and the server bundle (Next's runtime plus the adapter) sits close to the Worker size limit, against React Router's small handler. The App Router's server components and server actions are a second mental model the game does not need: Player data is on the device, so there is little to fetch on the server.
- **Hosting on Vercel instead** (N1: no). Vercel Hobby forbids commercial use (ADR 0004), and a second vendor would split the site, the Durable Objects and R2 across platforms.

**Other alternatives rejected.**
- React Router in SPA mode (the first form of this decision): no server rendering of game paths, a fallback file and a Worker miss handler to keep, and hashes only for the CSP. Superseded by N2.
- Preact, Solid, Svelte or Lit: smaller runtimes, but fewer people know them, React Three Fiber (D13) is React only, and the owner chose React.
- TanStack Start: good types, but younger, and its Cloudflare support is less settled than React Router's.
- Plain JS with JSDoc (`checkJs`), as ADR 0010 chose for the browser: workable for shared modules, but not for a component codebase; ADR 0012 supersedes that part of ADR 0010.

### D5. URLs: path routes in `/play/`, rendered by the server (Q18, revised 2026-10-20 for N2)

**Decision.**
- The move shipped hash routes. This change switches `/play/` to path routes (`/play/arena`, `/play/sutras/ekadhikena`, `/play/game/times-sprint/12`) in phase 2.
- **Static files first.** Workers static assets serve every file that exists (hashed `/play/assets/*`, the prerendered pages, the landing and grown-up pages, fonts, icons) without running the Worker. `run_worker_first` lists only `/_csp` and `/api/*`.
- **The React Router server renders the rest of `/play/`.** A request that matches no file reaches the Worker (`not_found_handling` stays unset or `"none"`, so navigation misses are not answered by the asset layer). `workers/src/index.ts` sends `/api/*` to the API handlers, gives a miss under `/play/assets/` the 404 page with status 404, and sends any other path under `/play/` (never one under `/play/assets/`, whatever its headers) to React Router's request handler only when it is a page navigation as the hosting spec defines it (`Sec-Fetch-Mode: navigate`, or, with no `Sec-Fetch-Mode`, a GET outside `/play/assets/` for a path with no file extension); every other miss, and every path outside `/play/`, gets `/404.html` with 404. React Router renders the matched route with status 200; a path under `/play/` that names no screen renders Home (or the Mode picker on a first visit, D14) with status 200 and `noindex`, as today's hash router does for an unknown hash. There is no SPA fallback file (`__spa-fallback.html`) and no `_redirects` rule for the game; `_redirects` keeps only the move's 301s.
- **No server loaders, no lazy route discovery.** Routes in this change have no server `loader` or `action` (Player data is on the device, content is bundled), and `routeDiscovery` is `{ mode: "initial" }`, so the full route manifest ships with the entry. Client-side navigations therefore never call the server (no `.data` or `/__manifest` requests), which keeps them as fast as today and lets them work offline.
- **The hash shim stays forever.** A tiny inline pre-paint script in the root layout's `<head>` runs before anything paints. On a page load whose `location.hash` starts with `#/`, it sends the browser to `/play/<rest>` with `location.replace`, keeping the query, so the server renders (or the static layer serves) the real path and nothing of `/play/` is painted first. Once the app is running, a `hashchange` to a `#/` fragment (legacy code that sets `location.hash`, an old in-page link) becomes a router navigation to the path, without a reload. Hashes that do not start with `#/` (a skip link's `#view`) are left alone. Replacing the location on load costs one extra request for an old link, and in exchange React Router always hydrates a page at the URL it was rendered for: rewriting the address with `history.replaceState` before hydration would hydrate the prerendered `/play/` page at another path, which React Router does not support. The script carries the request's nonce in server-rendered pages and is allowed by its hash in prerendered ones (D15). Old `/vedic-math/#/...` links arrive through the move's redirects (`/vedic-math/* /play/ 301`, the landing page's `#/` forward) and end in the same shim.
- A Playwright test (`e2e/tests/old-routes.spec.ts`) opens every old route form and checks the screen and the final URL.
- **Prerendered where it still makes sense (Q20, kept).** Pages that are the same for every visitor are written at build time, so they are served as static files, cost no Worker run and are cached at the edge: `/play/sutras/` and one page per Sutra and sub-sutra, with real titles, descriptions, canonical links and the Deep dive's text; the Guide (`/play/guide/` and each section); and `/play/` itself with the first-visit Mode picker. `/play/` stays prerendered rather than server-rendered because the server cannot know a returning Player (that is on the device, D14): the pre-paint script marks a returning Player before paint so the picker is not flashed and start-up shows Home (as `render-performance` D7 planned, re-planned in task 12.1). Every other route is server-rendered on a cold load.

**Rationale.** Path URLs are what the owner asked for, they let Sutra pages be prerendered and indexed, and they read better when shared. Server rendering answers a cold deep link with the right page structure at once instead of a generic fallback, and keeps the asset layer as the fast path for everything that is a file. The shim makes the change invisible to old links.

**Alternatives rejected.**
- Keep hash routes for good: no prerendered Sutra pages, and against the owner's Q5 answer.
- Render every page on the server, including the Sutras and the Guide: a Worker run for pages that never change; prerendering is free and faster.
- Server loaders for content (Sutra text through a `loader`): every client-side navigation would then fetch `.data` from the Worker and fail offline; the content is already in the bundle.
- `not_found_handling: "single-page-application"` or a `_redirects` rewrite: the first answers typos everywhere with the game, the second applies even when a file matches; both were already rejected for the SPA plan and neither fits a server render.
- Redirect hashes on the server: a hash never reaches the server.

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

### D9. Service worker (revised 2026-10-20 for N2)

**Decision.** The worker stays hand-written, as `sw.ts`, with today's caching rules as modified by the move. Its precache list comes from the client build's manifest. The offline shell is a page the build renders. No Workbox.

**Rationale.** The worker's rules are specific and tested: network first for pages with a 3.5 s fallback, cache first for hashed files, `lvm-voice` kept across deploys, the `'dev'` and `KILL` branches, install failing on a hash mismatch. Workbox would replace a short, readable file with configuration and a runtime, and its precache manifest format differs from ours. The client build's `.vite/manifest.json` lists every emitted file with its hashed name and its imports, so the list is exact.

**Shape.**
- `app/src/sw/sw.ts` (carried over from bd086fa, N7) is built as one ES module with no chunks to `_site/sw.js`. In phase 1, before there is a framework build, `build.py` keeps writing today's precache list into it. From phase 2, `tools/vite-plugin-precache.ts` (carried over: its walk from the entries, its 3D exclusion by reachability and its `dev`, `moved` and `--voice off` modes) reads the React Router client build's manifest instead of the SPA build's, and injects `VERSION` (a hash of the list and the worker source) and `PRECACHE` (`[url, sha256 prefix]` for the offline shell, the root route and every chunk and CSS file of the entry and the core routes, the vendored design system, theme, fonts, icons and the manifest; never a 3D file, D13) between the existing `build.py: precache` markers. In the source those stay `'dev'` and empty. Hashed files (`/play/assets/*-<hash>.*`) are cache first, which replaces the `?v=` rule.
- **The offline shell is a rendered page.** The build renders the root layout (header, nav, footer, the pre-paint scripts and the view root, with no view drawn) to `_site/play/__shell.html` at build time, so it is a static file with a stable hash the worker can check on install, and its inline scripts are allowed by hashes in its `_headers` entry. Page loads are network first: online, a navigation gets the server-rendered page (or the prerendered one) and it is never stored as the shell; offline, or after 3.5 s, every navigation under `/play/*` gets the shell from the cache, keeping the response headers it was cached with (so its CSP matches its bytes). The shell starts the app in the browser at whatever path is in the address bar: its client entry sees the shell marker and renders the router with `createRoot` instead of hydrating, so the app draws the route itself, the way the Legacy views draw today. Task 2.5 is a spike that proves this on chromium and webkit before the worker relies on it; if React Router's client entry cannot start that way, the fallback is a second small client entry that builds a browser router from the same route modules.
- Requests under `/api/` are never cached, except the server voice's audio files (D16), which are GETs with the content hash in the name and go to the `lvm-voice` cache like the recorded voice.

**Alternatives rejected.** Workbox (`vite-plugin-pwa`) (more moving parts, different update semantics, large config); keeping `sw.js` as plain JS (it should be typed like everything else); no worker (offline play is a spec); caching the last server-rendered page as the shell (its nonce and content belong to one request and one URL, and its hash cannot be checked on install).

### D10. Testing

**Decision.** Playwright stays the behavior contract, unchanged in what it asserts (selectors and URL forms may change). Vitest replaces `node --test`. React Testing Library only for tricky components. E2E specs stop addressing internal modules by URL (N8).

**Rationale.** The Playwright suite and its coverage specs are the proof that a moved view behaves the same; it must not be weakened to make a migration pass. Vitest runs TypeScript directly, shares Vite's config and is fast; the existing node tests port almost line for line. Component tests are expensive to keep up; most behavior is better checked end to end.

**Rules.** A migration PR may change a selector, a URL form (Q18) or a wait, never an expectation about what a Player sees or what is stored or sent; its description lists every changed spec line. React Testing Library is for components with logic that is hard to reach end to end (the keypad's input rules, the Markup component, the 3D fallback chooser, the shell's start-up).

**Internal modules in e2e (N8).** About 87 spec files call `import('/js/<x>.js')` inside `page.evaluate` to reach a module (the store, metrics, voice). Once the framework build bundles them, those URLs no longer exist. One helper in `e2e/tests/fixtures.ts`, `mod(page, 'store')`, maps `/js/<x>.js` to the built module through a small map the build writes (`/play/assets/modules.json`, published only in preview and test builds, never in production; the bd086fa SPA config already wrote the same kind of map); the specs change their pattern from `import('/js/store.js')` to the helper, and nothing they assert. The map lives as long as Legacy modules do; as modules become TypeScript, the map keeps their old names. This is allowed under D10 (a URL form changes, assertions do not), lands early (task 1.2) and is a pure test change, so it can be reviewed alone. Code inside `page.evaluate` stays a named page function (the live CSP has no `'unsafe-eval'`).

**Alternatives rejected.** Jest (slower with TypeScript and ESM, separate config); rewriting e2e tests per view (loses the contract); component tests for everything (cost without signal); exposing modules on `window` in production for tests (a test hook in the product).

### D11. Repo layout

**Decision.** One repo with pnpm workspaces `app`, `workers`, `shared`, `e2e` and `tools`: `app/` (the React Router app), `workers/` (the one Worker: CSP reports, server rendering, the voice endpoint, later the Duel and Live session Durable Objects) `shared/` (question generators, scoring, message types and voice sentence rules, used by both), `e2e/` (the Playwright suite) and `tools/` (build tooling and lint rules).

**Rationale.** One repo keeps the game, server and their shared types in one commit and one CI run; workspaces give each its own `package.json` and `tsconfig.json` without copying code. `shared/` is exactly what ADR 0009 says must be one source for the app and the Duel server.

**Shape.**
```text
pnpm-workspace.yaml        packages: app, workers, shared, e2e, tools
wrangler.jsonc             one Worker: main workers/src/index.ts, assets ./_site, R2, Durable Objects, rate limits
app/                       React Router framework mode (appDirectory: src), Vite with reactRouter() and cloudflare()
  react-router.config.ts   ssr: true, basename /play/, prerender list, routeDiscovery initial
  src/root.tsx             the document: head, pre-paint scripts (nonce or hash), header, nav, footer, <Outlet/>
  src/routes.ts            every route of today's table, each a Legacy or React route module
  src/entry.server.tsx     renderToReadableStream with the request's nonce
  src/entry.client.tsx     hydrate, or render the offline shell (D9)
  src/shell/               Header, Nav, LegacyRoute, dialogs, hash shim source
  src/views/<area>/        one folder per area: guide, watch, sutras, me, learn, dojo, tower, home, sky, star, games, arena, duel, play
  src/components/          shared pieces: Markup, Bolt, Keypad, ResultCard, Crumbs, Board, ClientOnly
  src/logic/               store, settings, fx sound and motion, metrics, cloud, gamify, sky, levels, adapt, check, answers, viz
  src/hooks/               useStore, useAbortSignal, useTimer, useFrame, useEvent, useRound
  src/scenes-3d/           React Three Fiber scenes (browser only)
  src/sw/sw.ts
shared/src/                questions, skills, vedic, mental, lib, names, scoring, messages, markup, voice-text, policy
workers/src/               index.ts (routing), csp.ts (reports and the policy), render.ts (React Router handler),
                           auth/ (Firebase ID token check, session tickets), voice/ (D16); later rooms/ (D18)
site/, vendor/, theme/, fonts/, icons/, thumbs/   unchanged from the move, copied by build.py
e2e/, cloud/               unchanged places
```
`js/` shrinks as modules move and is gone at the end. The move's `worker/csp.js` becomes `workers/src/csp.ts`. `duel-online` planned `worker/` (singular) and shared `.js` files in `js/`; its revision moves them to `workers/src/rooms/` and `shared/src/*.ts` (task 12.3).

**Alternatives rejected.** Separate repos (shared code by package publishing, drift); a single package (the Worker and the app need different TypeScript targets and libs); npm or Yarn workspaces (pnpm's strict `node_modules` catches undeclared dependencies, and it is fast in CI); a second Worker for the API (two deploys and a cross-Worker call for what one router does).

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
- 3D files are never in the service worker's install precache. They are hashed files, so the worker caches them on first use and serves them cache first after that. A first visit never downloads 3D, and the first-load measure (which counts the worker's install downloads, performance-budget spec) proves it. Offline, a Sky whose 3D files were never loaded shows the 2D Sky. A 3D file is an emitted file reachable only through a 3D scene's dynamic `import()`, never from any entry's static imports. A chunk the build shares between the initial app and a 3D scene is not a 3D file for precaching: it is precached and counts toward the first-load budget. The two budgets are separate measures, so the same chunk also counts, once, toward the 3D budget whenever the 3D dependency graph reaches it as task 10.1 defines it. (The 10.1 check that no 3D module is reachable from an entry's static imports keeps three, React Three Fiber and drei out of such a chunk.)
- Fallbacks: Calm, Pause motion or reduced motion get a still frame; no WebGL, or a scene that stays under 30 frames a second for 3 seconds (Q25), gets the 2D canvas or SVG; a hidden tab pauses rendering. Playwright covers each.
- 3D renders on the main thread (Q22), never during a round, and pauses when the tab is hidden.
- Three.js replaces the raw-WebGL plan in `gpu-effects`.
- Order: the Sky (the first 3D scene, shipped inside this change, Q23), then Sutra deep-dive illustrations, then game effects and Mandala.
- Browser only (unchanged by server rendering, N2): a scene module is never imported by the server build and never rendered on the server. The server renders only the scene's host element, with its space reserved (it sits inside `ClientOnly`, D14, because the 2D Sky shows the Player's own Stars); the 2D drawing is drawn in the browser after start-up, and the scene loads after that as above.

**Rationale.** A hand-written engine (the `gpu-effects` plan) is small but is code nobody else knows, and real 3D (depth, camera, lighting) is far more work by hand. React Three Fiber makes a scene a component with the same lifecycle as the rest of the app (it unmounts and disposes with the route), and drei has the pieces the Sky needs (points, instancing, `AdaptiveDpr`, `PerformanceMonitor`). Bundling it ourselves keeps the CSP as it is (`script-src 'self'`) and lets the worker cache the files on first use. Loading it late, behind the 2D Sky, means a Player never waits for 3D.

**Pause motion.** The accessibility spec treats Pause motion like reduced motion, so the still frame applies to Calm, Pause motion and reduced motion alike (confirmed by the owner, 2026-10-19).

**How `gpu-effects` must be revised** (task 12.4): drop `js/gfx/` (`gfx.js`, `gl.js`, the hand-written shaders and the two-renderer scene format) for `app/src/scenes-3d/`; replace the 20 KB decoration budget with this change's 170 KB Brotli 3D budget (performance-budget spec) and "never in first load"; replace ADR 0011's "no library" and its OffscreenCanvas worker with ADR 0013 (ADR 0011's other rule stays: 3D is decoration only, never interface); render on the main thread, paused when the tab is hidden (Q22, decided 2026-10-19); move its Sky backdrop requirement here (the Sky ships in this change's 3D phase, task group 10) and keep Sutra deep-dive illustrations, celebrations, the Moving background and Mandala glow in `gpu-effects`; keep its tests (still frame, context loss, hidden tab, token colors, no flashes) as scenes-3d scenarios.

**Alternatives rejected.** The hand-written WebGL 2 engine (more code to own, no 3D); PixiJS (2D only); Babylon.js (larger, not React-first); loading three from a CDN (new CSP origin, third-party request on a children's site, not cached by our worker); 3D in the first load (the budget forbids it); 3D in the worker's install precache (every first visit would download it, which the first-load measure counts).

### D14. What the server renders (N2)

**Decision.** The server renders the document, the shell and every part of a view that is the same for every visitor; anything that depends on a Player's data renders in the browser after start-up.

**Rationale.** Player data (Players, progress, Sparks, settings, Mode) lives in `localStorage` on the device and never reaches the server, by design (privacy constraint, ADR 0002, ADR 0006). The server therefore cannot know the Mode, the scheme override or a Player's progress, and must not guess them: a server render that differs from the browser's first render causes a hydration mismatch, and React then throws away the server HTML.

**Shape.**
- The store's `getServerSnapshot` returns an empty store (no Players, defaults for settings). `useStore` reads it on the server and during hydration, then the real store, so the first browser render matches the server's.
- `ClientOnly` (a component that renders its fallback on the server and during hydration, and its children after) wraps every part that reads Player data or Mode wording: Home's stats and the Sky, Me, Boards, a round. Its fallback keeps the space (no layout shift).
- The pre-paint scripts (theme, Pause motion, returning Player, hash shim) run before paint in both server-rendered and prerendered pages, as today, so colors and the first screen are right without the server knowing them.
- Legacy views render nothing on the server: `LegacyRoute` renders its empty root, and the Legacy view draws into it after hydration, as today. A server-rendered Legacy route therefore paints the header, nav and footer first, then the view, the same order as the SPA fallback would have had, without a fallback file.
- 3D scenes never render on the server (D13).
- Start-up that writes storage, counts a visit, starts sound or registers the worker runs after hydration in an effect, once (B7).

**Alternatives rejected.** Send Player data to the server in a cookie (against the privacy constraint and ADR 0002); render the Mode's wording on the server from a Mode cookie (a cookie that is a setting about a child, sent with every request; the pre-paint class and `ClientOnly` do the job); turn off server rendering for views that read Player data (that is what `ClientOnly` does, per part, while the rest of the page still renders).

### D15. Content security policy with server rendering (N2)

**Decision.** Inline scripts in server-rendered pages are allowed by a per-request nonce; inline scripts in prerendered and static pages stay allowed by their hashes in `_headers`. The rest of the policy is the move's, from one source for both.

**Rationale.** A server-rendered page's inline scripts include React Router's hydration data, which differs per request and per route, so hashes cannot be computed at build time. A nonce is the standard answer and React Router supports it (`nonce` on `<ServerRouter>`, `<Scripts>`, `<ScrollRestoration>` and `renderToReadableStream`). Prerendered pages and the offline shell are files served without the Worker, so the Worker cannot add a nonce; their scripts are fixed at build time, so hashes keep working as the move built them.

**Shape.**
- `workers/src/render.ts` makes 128 bits from `crypto.getRandomValues` per request, passes it to React Router through the load context, and sets the whole header set on the response: CSP with `script-src 'self' 'nonce-<n>'` (plus the move's other sources), the Report-Only stricter policy, `frame-ancestors 'none'`, `report-to`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and the COOP rules. `_headers` rules do not apply to responses the Worker makes, so the Worker must set them all.
- The policy text lives once, in `shared/src/policy.json` (sources per directive and the third-party list), read by `build.py` for `_headers` and imported by the Worker. A test compares the Worker's headers with `_headers` for `/play/` and fails on any difference other than the script source.
- Server-rendered HTML is sent with `Cache-Control: private, no-cache`, so no shared cache stores a page with its nonce, and the service worker never stores it (D9).
- `style-src` stays as the move set it: React adds no inline styles (D7), and dynamic values use `element.style.setProperty`.
- `require-trusted-types-for 'script'` stays Report-Only (task 9.5); React writes no HTML strings, which is what makes enforcing it possible later.

**Alternatives rejected.** Hashes only (impossible for per-request hydration data); `'unsafe-inline'` (defeats the policy); `'strict-dynamic'` (not needed: every script is same-origin, and it would let a nonce'd script load any URL); moving the hydration data to an external file per request (React Router does not offer it, and it would add a request).

### D16. Hybrid voice: recordings for fixed words, the server for sentences with numbers (N3)

**Decision.**
- **Fixed text stays pre-recorded.** Explanations, Sutra names, lessons, praise, feedback and every other line whose words do not change are recorded ahead of time with Google Chirp 3 HD Aoede by the existing tools (`better-voice`, `explanation-audio`, `sutra-pronunciation`) and served from R2 at `voice.learnvedicmath.com`, as the move planned (`learnvedicmath` D17).
- **Dynamic sentences go to the server.** A sentence that holds a question's own numbers ("What is 47 plus 38?", a worked step) is a **Server line**. The app normalizes it with `shared/src/voice-text.ts` (the same HTML-to-words rules as `js/voice.js` `normalize()`, then Unicode NFC, collapsed spaces, trimmed) and computes its key: the full SHA-256 of `"v1|" + voice + "|" + text`, as 64 hex digits. `voice` is a voice profile id from the table in `shared/src/voice-text.ts` (today one, `aoede-095`: `en-US-Chirp3-HD-Aoede` at speaking rate 0.95, the rate of the recordings), so the rate and every other synthesis setting are part of the profile, the client and the Worker always compute the same key, and a new rate is a new profile id. It first asks `https://voice.learnvedicmath.com/live/<voice>/<key>.mp3` (public R2, cached at the edge, no Worker run). On a 404 it sends `POST /api/voice/v1/say` with `{ v: 1, voice, text }`. The Worker normalizes again, recomputes the key, checks the sentence (below), checks access (D17) and the spend cap, calls Google Text-to-Speech once with the profile's settings (MP3 at 24 kHz, the format every browser plays, so the server never transcodes), writes the audio to R2 at that key with `Cache-Control: public, max-age=31536000, immutable`, and returns it. Every later request for the same sentence, from any Player, is a cached file.
- **Only the game's own sentences are accepted.** The server accepts a sentence only if `shared/src/voice-text.ts` can plan it from the clip vocabulary `better-voice` recorded (the about 1,100 word frames plus numbers, the same planner the clips use), and only up to 240 characters. Anything else gets 422 and is said by the device. That keeps the endpoint from being a free text-to-speech service and means a Server line can never hold a name, a Nickname or anything typed: those words are not in the vocabulary.
- **Voice order.** The natural voice when the Player turned it on and it is loaded; then a whole recorded line; then a Server line; then studio clips (offline and fast, when every clip is in a loaded pack); then the device's voice. One line is always said by one voice. A Server line that has not started playing within 600 ms of the tap is said by clips or the device's voice instead, and the server still finishes and caches it, so the next time it is there. When read aloud is on, the app asks for the next question's Server line when the question is shown, so it is usually ready before the tap; it never prefetches with read aloud off.
- **Daily spend cap on the server.** A Durable Object, `VoiceLedger` (one instance, SQLite), keeps the characters and dollars spent per UTC day and per month, counted at list price ($30 per million characters for Chirp 3 HD, ignoring the free tier, so it can only overstate, as the recording tool's ledger does). Before each Google call the Worker reserves the sentence's cost; the ledger refuses once the day would pass the daily cap or the month would pass the monthly ceiling, and the Worker answers 429 `capped`: a daily cap clears at 00:00 UTC the next day, a monthly ceiling at 00:00 UTC on the first of the next month. When Google answers with audio, the Worker hands the bytes to the ledger, which in one storage transaction commits the charge and keeps the bytes (a line is about 20 KB, well under a Durable Object value's limit), before anything is written to R2. Only then does the Worker write R2 (idempotent: same key, same bytes) and return the audio; when the write succeeds the ledger drops its copy. A Durable Object alarm retries any kept bytes into R2, so audio that was paid for survives a failed write or a Worker that stops after the commit, and a later request for that key is served from the ledger's copy or from R2, never from Google. Only a failed or refused provider call refunds a reservation. A reservation that is neither committed nor refunded (a Worker that stops during the provider call) is never refunded: it stays counted against the cap, and its in-flight mark expires after 60 seconds; that rare case is the only one in which a sentence can be paid for twice. The ledger also coalesces: a second request for a key already being made gets 409 `pending` and the app uses clips or the device's voice for that play.
- **The numbers (owner, 2026-10-20, Q29).** $5 a day (about 166,000 characters, about 4,500 new sentences a day at about 37 characters each), with a $150 monthly ceiling, so the server can never spend more than half of the owner's $300 a month. The recording tool's month budget (`BUDGET_USD`) drops from $300 to $150 when the server voice ships, so recording and the server together stay within $300, and its $50 per run guard (`RUN_USD`) stays. A single day can never reach the $50 per run guard. Google Cloud's $300 budget with alerts and the Text-to-Speech quota (`better-voice` task 2.6) stay as the outer stop.
- **Fallback.** The device's voice says the line whenever the cap is hit, the network is down, the endpoint answers anything but audio, the sentence is refused, or 600 ms pass. Offline, Server lines a Player has heard play from the device's `lvm-voice` cache; others use clips or the device's voice.
- **Secrets and privacy.** The Google key exists only as the Cloudflare secret `GOOGLE_TTS_KEY`, restricted to the Text-to-Speech API; the build fails if a key pattern or the Google endpoint appears in any file under `_site` (the client), and the Worker never returns or logs it. Google receives only the sentence text and the voice name, from the Worker, never the Player's IP address, no cookie, no identifier. The Worker logs the key, the outcome and the character count, never the IP or the token. The access proof (D17) is the one credential a request carries: a Firebase ID token names a Player's anonymous Firebase account, so it is personal data in the GDPR sense even though it says nothing else about the Player; the Worker verifies it and discards it, never logs, stores or forwards it, and never joins it to the sentence, and Players without one send an anonymous ticket instead. Nothing new is stored about a Player; the R2 files are content, the same for everyone. COPPA holds: no personal information of a child is collected or sent (D17 for access). `parentNote()`, `cloud/README.md` and the privacy drafts say that sentences from the game, with no names and nothing about the Player, are sent to our server, which may ask Google to voice them, and that a Player who has posted to a World board also sends the sign-in token of that post, which the server checks and throws away.
- **Off switch.** The Worker variable `VOICE_LIVE` (`on` or `off`). Off, the endpoint answers 503 and every Server line is said by clips or the device's voice. While the R2 voice host is not set up (`build.py --voice off`), the build leaves the server voice off too.

**Rationale.** About 98% of the lines Explorer can say come from two Skills with numbers made up per question (`better-voice` design), so recordings alone can never cover them, and stitched clips sound stitched. Asking the provider for every play was rejected in `better-voice` (plan C) for its monthly cost (about $285 a month uncached at Chirp 3 HD prices); caching each unique sentence forever turns that into a one-time cost per sentence, and the cap bounds the worst case. The owner accepted the trade-off (N3).

**Alternatives rejected.** Record every possible sentence ahead of time (about 1.2 million Explorer lines alone, most never heard); keep clips as the only way to say numbers (the owner wants the studio voice); a cheaper voice for Server lines (two voices in one game sound wrong); call Google from the browser (the key would ship); the Worker serving cache hits itself (every play would run Worker code; public R2 with edge caching costs nothing per hit); a KV store for the ledger (not strongly consistent, so the cap could be overrun under load).

### D17. Server access and identity (N6)

**Decision.** Firebase anonymous auth and World boards stay as they are. Server code verifies a Firebase ID token before giving room or voice access. It never creates an identity for that access.

**Shape.** `workers/src/auth/firebase.ts` checks an ID token sent in `Authorization: Bearer`: RS256 signature against Google's published `securetoken` keys (fetched and cached per their `Cache-Control`), `aud` and `iss` for the Firebase project, `exp`, `iat` and `auth_time` in range, `sub` present. It uses WebCrypto, no Firebase Admin SDK (which does not run in Workers). The token is checked and dropped; the Worker keeps no uid. Cache hits of recorded and Server lines need no check: they are public files.

**Players with no Firebase identity (owner, 2026-10-20, Q27).** Many Players have no Firebase identity and must not get one: every Player whose Age answer is under 13 (ADR 0006: nothing loads Firebase for them), and every Player who has never posted (ADR 0002: no identity before the first post); today the live site has no Firebase config at all. Explorer, where the voice matters most, is mostly under 13, and `duel-online` planned Friend Duels for under-13 Players with no identity. Decision: a request with a valid Firebase ID token is accepted; a request without one is accepted with a **session ticket**, an HMAC the Worker signs (secret `TICKET_KEY`) over a random value and a 30-minute expiry, issued by `POST /api/session` after a Turnstile check for rooms and after rate limits alone for voice, never stored and never tied to a Player. No identity is ever created for voice or rooms. Both paths share per-IP-hash rate limits (Workers rate limiting binding, the hash kept in memory only) and, for voice, the daily cap. This keeps ADR 0002 and ADR 0006 whole.

**Alternatives rejected.** Create an anonymous Firebase identity for every Player at first voice use (breaks ADR 0002 and, for under-13 Players, ADR 0006); voice and rooms only for Players with an identity (under-13 Players, the main audience of read aloud and Friend Duels, would get neither); no access check at all (the daily cap and rate limits would be the only defense; acceptable for voice, not for rooms).

### D18. Rooms: Duels and Live sessions on one Durable Object engine (N4, N5)

**Decision.** `duel-online` keeps its approved rules and is re-planned onto this stack (task 12.3), not redesigned here. Live sessions are a separate change after Duels, on the same room engine. Neither is built in this change.

**Duels (N4).** Friend Duels by room code come first, for every Player; Random Duels (matching with strangers) are for Players whose Age answer is 13 or over, and come after. Results of an under-13 Player stay on the device, with no grown-up override until a verifiable consent method exists (owner, 2026-10-20, Q28): ADR 0006 removed the device Parent step because a switch on the device is not verifiable parental consent, so an override would need a real method (a parent account, after the lawyer's opinion) in its own change and ADR. The re-plan moves `worker/` to `workers/src/rooms/` (a small engine: a Durable Object per room with WebSocket hibernation, a code allocator, seats, a server clock, persistence after each step, the 10-minute deletion), the shared JS modules to `shared/src/*.ts`, `js/duel/safe-html.js` to `Markup`, the views to React route modules (`/play/arena/duel`; the join link becomes `/play/arena/duel#BKTRMZ`, a fragment that does not start with `#/`, so the hash shim leaves it alone and the code still never reaches a server log, as the plan requires), and access to D17 (a Firebase ID token when the Player has one, otherwise the Worker-signed session ticket, plus Turnstile as planned; no identity is ever created).

**Live sessions (N5).** A host starts a quiz, Players join by code, and scores update live for everyone in the room. Notes for the future change, not decided here: the host is a grown-up (a teacher or parent) on their own device; Players join with generated Nicknames only, never typed names; the room keeps scores only while it runs and deletes them after, like a Duel room; under-13 Players in a class raise the COPPA school-authorization question for the lawyer; it reuses the room engine, the question generators in `shared/` and the protocol style of Duels. Order: after `duel-online` (D3).

**Rationale.** One engine for every live room keeps the referee, the clock, reconnection and deletion in one tested place, and both features are rooms of Players answering the same questions.

### B1. Markup from content stays behind one component

Generators and content modules return HTML strings (`<sup>` in questions, `<b>` in Trick steps, SVG from `js/viz.js`). Converting them to typed node trees is a large content change, so phase 1 keeps them as strings, and React renders them only through `app/src/components/Markup.tsx`: it parses the string with the small allow-list parser in `shared/src/markup.ts` (no `DOMParser`, so the same code runs in the browser and in the Worker during server rendering, and it never runs scripts), keeps only what is on the allow-list (the same list `duel-online` planned for `safe-html.js`: `b`, `i`, `sup`, `sub`, `span`, `br`, `small`, `em`, `strong`, and the SVG elements `svg`, `g`, `circle`, `rect`, `line`, `path`, `text`, `tspan`, `polygon`, `polyline` with geometry, `viewBox`, `class` and `aria-*` attributes only), and builds React elements; anything the parser cannot read is dropped as text, never passed through (it fails closed). The browser and the Worker produce the same elements for the same string, which a test checks for every Skill and Trick. Nothing is assigned to `innerHTML` and `dangerouslySetInnerHTML` is banned by lint everywhere else (`react/no-danger` as an error, no exceptions outside `Markup`, which builds elements and does not need it). The allow-list is in `shared/src/markup.ts`, so the online Duel client uses the same one. A typed content format can wait (Q19, decided 2026-10-19).

### B2. Build: the framework build makes the game and the Worker, `build.py` keeps the site steps

`build.py` stays the single command CI runs (`python3 build.py --out _site`). From phase 2 it runs `pnpm --filter app build` (React Router's build through Vite: the client build with base `/play/`, the prerendered pages, the offline shell, and the Worker bundle through the Cloudflare plugin) and places the client output so that every file is served at its URL under `/play/`. The Worker bundle is written outside `_site` (to `build/worker/`), never into the assets directory, so server code (which names the speech provider's endpoint, D16) can never be requested as a file; `wrangler.jsonc`'s `main` points at it. Then it does what the move added: renders `site/`, copies `vendor/`, `theme/`, `fonts/`, `icons/`, `thumbs/`, writes `_headers` from `shared/src/policy.json` (hashes read from the built static HTML: prerendered pages and the shell, including React Router's inline scripts in them), `_redirects`, `robots.txt`, `sitemap.xml` (gains the prerendered Sutra and Guide pages), and runs its checks, plus two new ones: no file under `_site` holds a key pattern or a provider endpoint (D16; the Worker bundle is outside `_site` and is not scanned), and the Worker bundle's uncompressed size, the measure Cloudflare's limit uses (64 MiB on Free and Paid, no compressed limit, checked 2026-10-20), is under 75% of the limit, with its compressed size printed for information. `wrangler.jsonc` keeps `assets.directory: ./_site`. The import map, `?v=` stamping and the "source carries stamps" check go: Vite's hashed file names replace them. The build's import check becomes ESLint's `no-restricted-imports` plus a post-build check that no emitted client file references a host outside `THIRD_PARTIES`. Local work uses `pnpm --filter app dev` (Vite with the Cloudflare plugin, so the server render, the API and the Durable Objects run in the Workers runtime locally). In phase 1, before the framework build exists, `build.py` builds today's game as it does now and only adds the typed worker and the checks.

### B3. Legacy views stay as plain JS until they move

Legacy views are not converted to TypeScript; they move straight to React components. From phase 2 until legacy retires (phase 6), `app/` sets `allowJs` for `js/` so the framework build bundles the legacy files and they import the new `.ts` logic through Vite. In phase 1 they are still served as today's plain modules. The lifecycle scan keeps covering them.

### B4. Analytics route names stay the same

`metrics.routePath()` reads the router's matched route id and params instead of `location.hash`, and produces the same event names (`math/view/arena`, `math/view/game/<id>/level`, `math/view/star/<trick>/star`, `math/view/pick-mode`, `math/view/sky`), so dashboards continue across the switch.

### B5. TypeScript settings

All workspaces use `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (ADR 0010's flags), `verbatimModuleSyntax`, `moduleResolution: "bundler"`. `shared/` has no DOM lib, so nothing in it can touch the page.

### B6. Content files that move

Data modules with active content branches (`js/videos.js`, `js/slokas.js`, `js/sutra-details.js`) and generated files (`js/say-clips.js`, `js/voice-index.js`, written by tools) are converted last in the TypeScript logic step (task 3.3), in a PR announced on the content branches first. Generated files become `.ts` written by their tools (the tools change in the same PR). A content PR open at that moment is rebased with a rename only.

### B7. Rendered pages start without side effects

Server-rendered and prerendered pages hydrate into the full app. Start-up that writes storage, counts a visit, starts sound or registers the worker runs after hydration in an effect, once, the same as today's start-up order, so a crawler's render writes nothing (it has no storage anyway), the server never runs start-up, and a Player's first paint is the rendered page.

### B8. Header

The game's header becomes `app/src/shell/Header.tsx`, written to produce the same markup as the move's `theme/header.html` partial (the landing pages keep the partial). `e2e/tests/header.spec.ts` checks both match (same items, order and sticky behavior), so they cannot drift.

### B9. Strict Mode and the Compiler

The app runs under `<StrictMode>` in development, so effects that do not clean up show up as double timers in tests. The React Compiler runs through `babel-plugin-react-compiler` in Vite; `eslint-plugin-react-hooks` (with the compiler rules) is an error in CI.

## Risks and mitigations

- **Bytes in first load.** React, React DOM and React Router's client add about 70 KB gzip. Today's `/play/` loads every module of the static graph unminified (about 700 KB raw; the same graph minified and bundled is about 140 KB Brotli, measured for `render-performance`), so minification and per-route chunks should more than pay for it. Mitigation: the byte gate runs from phase 1 against the baseline, reads the client manifest from phase 2, and counts the worker's install downloads too (performance-budget spec).
- **Time to first byte on server-rendered routes.** A Worker run is slower than a static file. Mitigation: everything that is the same for every visitor is prerendered (D5); the server renders the shell and server-safe parts only, with no loaders (D14); Lighthouse's first contentful paint tolerance (100 ms) includes it; the Worker's CPU time per render is printed by the perf job.
- **Workers Free limits.** Free allows 10 ms of CPU per request and 100,000 Worker requests a day; a React render can exceed 10 ms, and every cold deep link, voice synthesis and room message runs the Worker. Mitigation: Workers Paid ($5 a month, 30 s CPU, 10 million requests included) before phase 2 reaches production, as ADR 0004 expected once there is Worker code beyond the report endpoint (owner, 2026-10-20, Q30; task 0.8).
- **Hydration mismatches.** A server render that reads Player data, the Mode or the time would differ from the browser's. Mitigation: D14 (`getServerSnapshot`, `ClientOnly`), a lint rule that bans `localStorage`, `window` and `Date.now()` at module and render level in route modules outside effects, and `ssr.spec.ts`, which fails on any hydration warning in the console for every route in all three Modes.
- **Offline shell start-up.** Starting React Router without hydration at an arbitrary URL is not its default path. Mitigation: the spike in task 2.5 decides before the worker relies on it, with a second client entry as the fallback (D9).
- **Two systems during the migration.** Legacy and React views share the store and settings. Mitigation: the store's `subscribe()` notifies both; the LegacyRoute adapter is the only bridge; legacy code never imports React.
- **Hash shim misses a form.** Mitigation: `old-routes.spec.ts` lists every form (D5) and runs on every PR and daily against production.
- **Static-first routing goes wrong.** A wrong `not_found_handling` value would make navigation misses skip the Worker; a wrong `run_worker_first` would run the Worker for files. Mitigation: the build fails unless `wrangler.jsonc` leaves `not_found_handling` unset or `"none"` and `run_worker_first` is exactly `/_csp` and `/api/*`; task 2.3 checks a deep link, a typo outside `/play/`, a missing hashed file and an existing one on `wrangler dev` and the preview.
- **CSP with two mechanisms.** Server-rendered pages use nonces, static ones hashes. Mitigation: one policy source (D15), a test that the two header sets differ only in the script source, and `csp.spec.ts` on a server-rendered, a prerendered and the offline shell page.
- **Server voice spend or abuse.** Mitigation: only the game's own sentences are accepted (D16), the ledger's daily cap and monthly ceiling, per-IP-hash rate limits, the off switch, Google's budget alerts and quota as the outer stop, and a Vitest load test that sends 10,000 distinct sentences and checks the ledger stops at the cap.
- **Server voice and privacy.** A sentence could carry something about a Player if the vocabulary check were loose. Mitigation: the planner accepts only recorded word frames and numbers; Nicknames' words are tested to be outside the vocabulary; the text of the change to `parentNote()` is reviewed with the privacy drafts.
- **Three.js size.** React Three Fiber's default catalogue imports all of `three`; full `three` is about 170 KB gzip, so R3F plus drei could pass the 170 KB Brotli budget. Mitigation: task 10.1 is a measured spike with a go or no-go before any scene work; `extend()` with only the classes used; import drei pieces by path. If it cannot fit, the owner decides (raise the budget or drop drei).
- **drei helpers that fetch from CDNs** (`Environment` presets, default fonts for `Text`). Mitigation: ESLint `no-restricted-imports` for those helpers; the CSP blocks them anyway; `third-party.spec.ts` covers 3D routes.
- **Merge pain with feature and content branches.** Mitigation: D12 locks, short-lived migration PRs, B6 for content files, and phase 1 PRs that rename and convert in separate commits so `git` follows renames.
- **The Playwright suite drifting to fit the code.** Mitigation: D10's rule that a migration PR changes selectors and URL forms only, listed in the PR description and checked in review; the N8 helper lands alone, before any build change.
- **Learning curve.** Mitigation: `CLAUDE.md` gains the component, hook, server-safety and CSS rules; the first moved views (Guide, Watch) are the examples later PRs copy.

## Migration plan

Phases, with rough PR counts. Every PR ships alone, keeps the Playwright suite green on its preview (chromium, webkit, mobile) and the performance gates within budget, and can be reverted alone.

| Phase | What | PRs | Locks |
|---|---|---|---|
| 0 | Before building: the move live (done), baseline measured before phase 2, ADRs and docs | 1 or 2 (docs) | none |
| 1 | Workspaces, TypeScript, tests, lint, framework-neutral: pnpm workspaces, `tsconfig.base.json`, the e2e module helper (N8), the three `js/` edits, `workers/src/csp.ts`, `sw.ts` and the precache plugin, Vitest, ESLint and stylelint, the budget gate. Today's game is still built and served as it is | 3 or 4 | none |
| 2 | React Router framework-mode shell on Workers serving the Legacy views: the framework build, the Worker routing (static first, server render for game paths), path routes, the hash shim, nonces, the offline shell, the budgets on the client manifest; then the TypeScript logic | 3 | the router in `js/app.js` |
| 3 | Shell pieces: header, nav, chip, Mode picker, the video player, Age and Player dialogs, the ESLint lifecycle rule, `Markup` | 1 | header, nav, dialogs |
| 4 | Views, simplest first: Guide and Tour; Watch; Sutras with Deep dive and verses (prerendered); Me; Learn, grade, All places, tiles; Skill lesson and Practice; Mix and Run; Dojo and Katas; Tower and challenges; Home and the Sky; the Star round (Star Quest mobile layout) | about 11 | each PR its own views |
| 5 | The most interactive: games (2 PRs), Arena and Boards, Party Mode, Play experiences (2 or 3 PRs) | about 6 | each PR its own views |
| 6 | Retire legacy: delete `js/life.js`, LegacyRoute, the lifecycle scan, `math.css` remnants, `js/` | 1 | none |
| 7 | 3D: measured spike, then the Sky scene with its fallbacks | 2 | Home and the Sky |
| 8 | Server voice (D16, D17): ledger and endpoint off, then on for previews, then on in production; can start after phase 2 | 3 | the read-aloud code in `js/voice.js` while each PR is open |
| 9 | Re-plan the follow-on changes for React and this stack, in the order `placement`, `age-bands`, `render-performance`, `duel-online`, Live sessions (proposed, not created here), `gpu-effects` (docs only; can start after phase 2) | 1 or 2 | none |

About 33 to 36 PRs in all. Task groups in `tasks.md`: 0 (phase 0), 1 (phase 1), 2 (phase 2), 3 (phase 2, logic), 4 (phase 3), 5 to 7 (phase 4), 8 (phase 5), 9 (phase 6), 10 (phase 7), 11 (phase 8), 12 (phase 9).

**Carried over from branch `react-ts-phase-1` (commit bd086fa, N7).** Cherry-picked into phase 1 PRs, with the original commit named in each: pnpm workspaces and root `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.base.json` and the per-workspace `tsconfig.json`, the lockfile (regenerated), e2e moving from npm to the workspace; `app/src/sw/sw.ts`; `tools/vite-plugin-precache.ts` (its walk, 3D exclusion and modes; the input format changes to the React Router client manifest in phase 2); the three `js/` edits (absolute `/sounds/` URLs in `say.js` and `sutra-ambience.js`, `new Worker(new URL(..., import.meta.url))` in `voice.js`, `/* @vite-ignore */` on runtime-URL imports in `cloud.js`, `voice-worker.js` and `lens-cam.js`). Planned there but not written yet, and kept as phase 1 tasks: `workers/src/csp.ts`, the Vitest port, ESLint and stylelint, the budget gate. **Dropped:** `app/vite.config.ts` as an SPA shell with `app/index.html` and `src/main.ts` (its `modules.json` idea survives in the N8 helper), most of the `build.py` rewrite for that shell, `app/vite.sw.config.ts` as a separate SPA-era build (the worker is built by the framework build's tooling or a small esbuild step), and the SPA fallback and hash-shim tasks as written (old 3.3 and 3.4: `__spa-fallback.html`, `workers/src/fallback.ts`, `replaceState` on load). The branch is left as it is; it is not merged.

Rollback: any PR is a revert. A route that moved to React can go back to its Legacy view by pointing its route entry at `LegacyRoute` again until phase 6 deletes the legacy code. The server voice has its off switch. The hash shim is never removed.

## Open questions

All answered; none is pending. The owner answered Q18 to Q26 on 2026-10-19, N1 to N8 on 2026-10-20, and Q27 to Q30 (raised by N1 to N8) on 2026-10-20 on PR #100, "yes" to every default. Each answer is folded into the decisions above, the spec deltas and the tasks.

- **Q18 (answered 2026-10-19).** Path URLs in `/play/` with the hash shim forever, as in D5. The hash shim is never removed.
- **Q19 (answered 2026-10-19).** Content HTML strings render only through the one allow-list `Markup` component (B1), and `dangerouslySetInnerHTML` is banned everywhere else. A typed content format can wait for a later change.
- **Q20 (answered 2026-10-19, kept 2026-10-20).** Prerendered: the Sutra pages (`/play/sutras/` and each Sutra and sub-sutra), the Guide (`/play/guide/` and each section) and the first-visit Mode picker at `/play/`. With server rendering there is no SPA fallback file; every other game path is rendered by the server (D5).
- **Q21 (answered 2026-10-19).** Every size budget measures Brotli. The 3D chunk budget is 170 KB Brotli (about 200 KB gzip).
- **Q22 (answered 2026-10-19).** 3D renders on the main thread and pauses when the tab is hidden. This supersedes ADR 0011's OffscreenCanvas worker (ADR 0013).
- **Q23 (answered 2026-10-19).** The Sky's 3D scene ships inside this change as the first 3D scene.
- **Q24 (answered 2026-10-19).** The owner signs off Star Quest's new mobile layout from phone screenshots on its PR (task 7.2).
- **Q25 (answered 2026-10-19).** The 2D fallback triggers when a scene stays under 30 frames a second for 3 seconds, at any time while it is drawing. Once on 2D, the page stays on 2D until reload. Pause motion gets the still frame, like Calm and reduced motion.
- **Q26 (answered 2026-10-19).** `duel-online` is kept: true online Duels between any two Players or two friends. It is re-planned onto this stack (task 12.3) and built fourth of the follow-on changes (D3).
- **N1 (answered 2026-10-20).** Stay on Cloudflare: server code in TypeScript Workers, live rooms in Durable Objects, voice files in R2. No Vercel (D4).
- **N2 (answered 2026-10-20).** React Router v7 framework mode with server-side rendering in Cloudflare Workers, replacing the Vite SPA and SPA mode (D4), with path routes rendered by the server and the hash shim forever (D5), static files first (D5), the service worker with a rendered offline shell (D9), nonces for server-rendered pages (D15), budgets on the client manifest (D1), and prerendering kept for the Sutra pages, the Guide and the Mode picker (D5). Next.js with OpenNext was compared and rejected (D4).
- **N3 (answered 2026-10-20).** Hybrid voice: recordings for fixed text from R2, Server lines for sentences with numbers, cached in R2 by a hash of text and voice, a daily spend cap on the server inside $300 a month and the $50 per run guard, the device's voice as the fallback, the key only in a Cloudflare secret, nothing personal sent, COPPA holds (D16, server-voice spec, ADR 0014, task group 11).
- **N4 (answered 2026-10-20).** `duel-online`'s approved rules stay, re-planned onto this stack: Friend Duels by room code first, Random Duels for 13 and over only, under-13 results on the device unless a grown-up allows otherwise (see Q28) (D18, task 12.3).
- **N5 (answered 2026-10-20).** Live sessions (a host starts a quiz, Players join by code, scores update live) are a separate change after Duels on the same room engine; only noted here (D3, D18, task 12.5).
- **N6 (answered 2026-10-20).** Firebase anonymous auth and World boards stay; server code verifies Firebase ID tokens before room or voice access (D17; see Q27).
- **N7 (answered 2026-10-20).** This change is revised, not replaced; phase-1 work from `react-ts-phase-1` carries over as listed in the Migration plan; phase 1 is framework-neutral, phase 2 is the framework-mode shell serving the Legacy views.
- **N8 (answered 2026-10-20).** E2E specs reach internal modules through one helper instead of `/js/<x>.js` URLs (D10, task 1.2).
- **Q27 (answered 2026-10-20).** Server voice and rooms accept a verified Firebase ID token when the Player has one, and otherwise a short-lived anonymous session ticket the Worker signs. No identity is ever created (D17).
- **Q28 (answered 2026-10-20).** No grown-up override for under-13 Duel results until a verifiable consent method exists; under-13 results stay on the device (D18, ADR 0006).
- **Q29 (answered 2026-10-20).** The server voice is capped at $5 a day and $150 a month; the recording tool's month budget drops to $150 and its $50 per run guard stays (D16, ADR 0014).
- **Q30 (answered 2026-10-20).** Move to Workers Paid before phase 2 reaches production, an owner task (task 0.8, Risks).
- **Live sessions order (confirmed 2026-10-20).** Right after `duel-online`, before `gpu-effects` (D3).
