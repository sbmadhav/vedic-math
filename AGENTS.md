# Learn Vedic Math

The site at https://learnvedicmath.com/, on Cloudflare Workers: the landing page at `/`, the game at `/learn/` (old `/play/` links redirect there), moving from Legacy views (`js/`) to React and TypeScript one view at a time. A new fact goes in the file a pointer below names.

## Guardrails

- Tests use the Firebase fake: never write to production Firestore from a test, and never submit an Arena or game score against the live backend.
- Players whose Age answer is under 13 use Device boards only; nothing for them loads Firebase (ADR 0006).
- Never commit studio voice audio or a speech service key; a changed spoken line needs a re-record and publish in the same PR.
- Never commit cache stamps: the build stamps the published copy, so in git `learn/index.html` loads plain `/js/app.js` and `/math.css` with no import map, and `app/src/sw/sw.ts` keeps `VERSION` at `'dev'` and `PRECACHE` empty.
- A non-trivial behavior change starts as an OpenSpec change in `openspec/changes/<name>/`, implemented after the owner approves it.
- Write copy with commas, colons or parentheses; never an em dash.
- Analytics (`window.siteTrack`) never sends personal data.

## Checks before a push

Once per clone: `corepack enable && pnpm install` and `git config core.hooksPath .githooks`. Then `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py` (into `_site/`), and the Playwright suite against that build: `node e2e/local-server.mjs 8124 _site` in its own terminal, then `cd e2e && BASE_URL=http://localhost:8124 pnpm exec playwright test`.

## Where the details are

Read the file before the work its line names.

- **Coding**, `CODING_STANDARDS.md`: writing or changing code, copy or tests.
- **Migration**, `docs/agent/migration.md`: moving a view, or a pull request that touches one (it may be Locked).
- **Build**, `docs/agent/build-and-checks.md`: `build.py`, `_config.yml`, `wrangler.jsonc`, lint config, the hook, CI, the deploy, the first-load budget, a new repo-only file or outside host.
- **Design**, `docs/agent/design-system.md`: `vendor/design-system/`, `theme/`, the header, a new page.
- **Playwright**, `docs/agent/e2e.md`: writing, changing or running a spec.
- **Offline**, `docs/agent/offline.md`: the service worker, the precache, the manifest, installing, `sounds/`.
- **Experiences**, `docs/agent/play-experiences.md`: `js/play/`, `css/play/`.
- **Voice**, `docs/agent/studio-voice.md`: a spoken line, read aloud, `tools/voice/`.
- **Family**, `docs/agent/family-helpers.md`: `js/family-*.js`, its calls and its `math.css` block.
- **Leaderboards**, `docs/agent/leaderboards.md`: `js/cloud*.js`, `cloud/`.
- **Decisions**, `docs/adr/`: changing who can post, what is sent, or when an identity is created.
- **OpenSpec**, `docs/agent/language-and-decisions.md`: proposing, applying or archiving a change.
