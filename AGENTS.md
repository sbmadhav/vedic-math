# Learn Vedic Math

The site at https://learnvedicmath.com/, served from Cloudflare Workers static assets: the landing page at `/`, the game at `/play/`. Every file a page loads comes from this site; the outside hosts a page may reach are listed once, in `THIRD_PARTIES` in `build.py`.

This file holds what every task needs; the rest lives in `docs/agent/`, behind the pointers at the end. Add a fact there, and here only a rule every task needs.

## Guardrails

- Tests run against the Firebase fake: never write to production Firestore from a test, and never submit an Arena or game score against the live backend.
- Players whose Age answer is under 13 use Device boards only; nothing for them loads Firebase (ADR 0006).
- Never commit studio voice audio or a speech service key, and a change to any spoken line needs a re-record and publish in the same PR.
- Never commit cache stamps: `play/index.html` loads plain `/js/app.js` and `/math.css` with no import map, and the worker source `app/src/sw/sw.ts` keeps `const VERSION: string = 'dev';` and `const PRECACHE: [string, string][] = [];`. The build stamps the published copy.
- Every non-trivial behavior change starts as an OpenSpec change in `openspec/changes/<name>/` and is implemented after the owner approves it.
- Write copy with commas, colons or parentheses; never an em dash.
- Record notable actions with `window.siteTrack('area/action', 'Readable title')`; never send personal data.

## Every change

- Follow the design system: tokens for every value (`var(--coral)`, `var(--space-6)`, `var(--radius-lg)`), and `var(--on-accent)` for text on accent fills. Support both color schemes (Daybreak light, Deep Space dark; system default with a saved override).
- Every listener, timer and animation-frame loop in a view or round goes through `js/life.js` (`on`, `later`, `every`, `loop`, `child`) with the view's `signal`; `test/lifecycle-scan.test.mjs` fails on bare ones.
- Module imports in `js/` are relative or absolute paths inside `/js/`.
- Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit.
- Use the words defined in `GLOSSARY.md` in code comments, docs and plans.

## Migration in progress

The game is moving to React and TypeScript one view at a time (openspec change `react-typescript`): Legacy views (`js/`) and React views run side by side under one router. New code is TypeScript, and React for views.

## Checks before a push

`corepack enable && pnpm install` once per clone, then `pnpm typecheck`, `pnpm lint`, `pnpm test` and `python3 build.py` (into `_site/`). Then the Playwright suite against that build: `node e2e/local-server.mjs 8124 _site` in its own terminal, and `cd e2e && BASE_URL=http://localhost:8124 pnpm exec playwright test`. Enable the hook once per clone: `git config core.hooksPath .githooks`.

## Where the details are

- **Migration**: `docs/agent/migration.md`, before writing React or TypeScript, moving a view, or opening a pull request that touches a view (it may be Locked).
- **Build**: `docs/agent/build-and-checks.md`, before adding a repo-only file or touching `build.py`, `_headers` or `THIRD_PARTIES`, `_config.yml`, `wrangler.jsonc`, lint config, the hook, CI, the deploy or the first-load budget.
- **Design**: `docs/agent/design-system.md`, before touching `vendor/design-system/`, `theme/` or the header, or adding a page.
- **Playwright**: `docs/agent/e2e.md`, before writing, changing or running a spec in `e2e/`.
- **Offline**: `docs/agent/offline.md`, before touching the service worker (`app/src/sw/`), the precache, the manifest, installing or `sounds/`.
- **Experiences**: `docs/agent/play-experiences.md`, before touching anything under `js/play/` or `css/play/`.
- **Voice**: `docs/agent/studio-voice.md`, before changing a spoken line, read aloud or the tools in `tools/voice/`.
- **Family**: `docs/agent/family-helpers.md`, before touching `js/family-*.js`, the Family calls in `js/app.js` and `js/star.js`, or the "Family helpers" block of `math.css`.
- **Leaderboards**: `docs/agent/leaderboards.md`, before touching `js/cloud.js`, `js/cloud-config.js` or `cloud/`.
- **Decisions**: `docs/adr/`, before changing who can post, what is sent, or when an identity is created.
- **OpenSpec**: `docs/agent/language-and-decisions.md`, before proposing, applying or archiving a change, and before writing copy about where the sutras come from.
