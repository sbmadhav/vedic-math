# Learn Vedic Math

Served at https://learnvedicmath.com/ from Cloudflare Workers static assets (`wrangler.jsonc`, deployed by CI from `main`; ADR 0004): the landing page at `/`, the game at `/play/`, the grown-up pages at `/parents/`, `/teachers/`, `/privacy/`, `/terms/`, the hand-off import page at `/import/`. Until the move's owner setup is done, the old app at https://sbmadhav.com/vedic-math/ keeps serving from this repo's GitHub Pages (`build.py --target moved` builds its Phase B replacement).

This file holds the rules; the details behind them live in `docs/agent/`, read on demand (the index is at the end). Keep this file short; add facts there, not here.

## Everything is served by this site

Every file a page loads comes from this site, never from sbmadhav.com or another repo. The design system is a pinned copy in `vendor/design-system/2.1.0/` (published at `/ds/2.1.0/`, with `SHA256SUMS`; a new version is a deliberate PR, never a hand edit), the brand theme is `theme/learnvedicmath.css` (existing token names only), the header is `theme/header.html` (composed into every page with the vendored `compose.py`), and the Firebase SDK and GoatCounter's `count.js` are in `vendor/`. Third parties a page may reach are listed once, in `THIRD_PARTIES` in `build.py`.

## Rules

- Follow the design system: tokens for every value (`var(--coral)`, `var(--space-6)`, `var(--radius-lg)`), and `var(--on-accent)` for text on accent fills.
- Support both color schemes (Daybreak light, Deep Space dark; system default with a saved override).
- The play modes (Explorer, Challenger, Pro) set the wording. The header has no kid mode switch, and the page leaves the site-wide `kidmode` setting untouched.
- No Explore menu and no "Made by" credit on any page. Every page loads `<script src="/js/analytics.js" defer>` before `</body>`. Record notable actions with `window.siteTrack('area/action', 'Readable title')`; never send personal data.
- Write copy with commas, colons or parentheses; never an em dash.
- Every listener, timer and animation-frame loop in a view or round goes through `js/life.js` (`on`, `later`, `every`, `loop`, `child`) with the view's `signal`; `test/lifecycle-scan.test.mjs` fails on bare ones.
- Module imports are relative or absolute paths inside `/js/`; the game is at `/play/` (`build.py` fails on anything else, on any `/vedic-math/` path outside `_redirects`, and on any reference to sbmadhav.com except the export page).
- Never commit cache stamps: `play/index.html` loads plain `/js/app.js` and `/math.css` with no import map, and the worker source `app/src/sw/sw.ts` keeps `const VERSION: string = 'dev';` and `const PRECACHE: [string, string][] = [];`. The build stamps the published copy and writes `_headers` (a Content-Security-Policy per page), so no page carries a policy `<meta>`.
- Players whose Age answer is under 13 use Device boards only; nothing for them loads Firebase (ADR 0006).
- Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit, and `e2e/tests/cov/` holds one spec per live OpenSpec scenario.
- Tests run against the Firebase fake: never write to production Firestore from a test, and never submit an Arena or game score against the live backend.
- Every non-trivial behavior change starts as an OpenSpec change in `openspec/changes/<name>/`, is implemented after the owner approves it, and is archived after release. Run `openspec validate --strict` before committing a change.
- Use the words defined in `GLOSSARY.md` in code comments, docs and plans; read `docs/adr/` before changing who can post, what is sent, or when an identity is created.
- Never commit studio voice audio or a speech service key, and a change to any spoken line needs a re-record and publish in the same PR.
- A new repo-only file or folder goes in `exclude` in `_config.yml`.
- A build inside the repo goes in a top-level folder whose name starts with `_` (`_site/`, `_dev/`, `_moved/`, or `--out _<name>` in a worktree); `build.py` refuses any other place inside the repo.

## Migration in progress (openspec change `react-typescript`)

The game is moving to React Router v7 (framework mode, server-rendered on Cloudflare Workers) and TypeScript, one view at a time (`openspec/changes/react-typescript/`, ADRs 0012 to 0014). Until the last view moves, Legacy views (the template-string code in `js/`) and React views run side by side under one router. Rewritten in task 9.4, when the migration ends.

- A Locked view is one a migration pull request is moving (its description starts with `Locks:`). A feature pull request that touches a Locked view waits for that pull request; content changes go ahead.
- A migration pull request changes no behavior. In `e2e/` it may change selectors, waits and URL forms, never what a test expects a Player to see or what is stored or sent, and its description lists every changed spec line.
- New code is TypeScript, and React for views. Nothing a server render reaches may read `window`, `document`, `localStorage`, `sessionStorage` or `Date.now()`: a component and a custom hook's body run on the server too, so read them in an effect or an event handler, through a store hook that gives a server snapshot (`useSyncExternalStore`), or inside `<ClientOnly>`. Markup from content goes through the one `Markup` component.
- Specs reach the game's modules through the helpers in `e2e/tests/fixtures.ts`: `e2eMod(name)` inside `page.evaluate`, and `mod(page, name)` when a test needs the URL.
- First load is budgeted against `docs/perf/baseline.json` (the build fails past it; each pull request's preview runs the load and interaction checks). A pull request that grows first load on purpose updates the baseline and says why.

## Checks before a push

`corepack enable && pnpm install` once per clone, then `pnpm typecheck`, `pnpm lint`, `pnpm test` and `python3 build.py` (into `_site/`). Then the Playwright suite against that build: `node e2e/local-server.mjs 8124 _site` in its own terminal, and `cd e2e && BASE_URL=http://localhost:8124 pnpm exec playwright test`. Enable the hook once per clone: `git config core.hooksPath .githooks`.

## Where the details are

- **Build**: `docs/agent/build-and-checks.md`, before touching `build.py`, `_headers` or `THIRD_PARTIES`, `_config.yml`, `wrangler.jsonc`, lint config, the hook, CI or the first-load budget.
- **Playwright**: `docs/agent/e2e.md`, before writing, changing or running a spec in `e2e/`.
- **Offline**: `docs/agent/offline.md`, before touching the service worker (`app/src/sw/`), the precache, the manifest, installing or `sounds/`.
- **Experiences**: `docs/agent/play-experiences.md`, before touching anything under `js/play/` or `css/play/`.
- **Voice**: `docs/agent/studio-voice.md`, before changing a spoken line, read aloud or the tools in `tools/voice/`.
- **Family**: `docs/agent/family-helpers.md`, before touching `js/family-*.js`, the Family calls in `js/app.js` and `js/star.js`, or the "Family helpers" block of `math.css`.
- **Leaderboards**: `docs/agent/leaderboards.md`, before touching `js/cloud.js`, `js/cloud-config.js` or `cloud/`.
- **OpenSpec**: `docs/agent/language-and-decisions.md`, before proposing, applying or archiving a change, and before writing copy about where the sutras come from.
