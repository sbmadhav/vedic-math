# Learn Vedic Math

Speed tricks from the sutras, a counting-to-calculus skill map, games, daily quests, an Arena with Boards. Three play modes for every age. Served at [learnvedicmath.com](https://learnvedicmath.com/) from Cloudflare Workers static assets (`wrangler.jsonc`, ADR 0004): the landing page at `/`, the game at `/play/`, pages for grown-ups at `/parents/`, `/teachers/`, `/privacy/` and `/terms/`. Until the move is launched (openspec change `learnvedicmath`), the previous app keeps serving at sbmadhav.com/vedic-math/ from this repo's GitHub Pages.

The site is self-contained: the design system is a pinned copy (`vendor/design-system/2.1.0/`, published at `/ds/2.1.0/`) with its own theme (`theme/learnvedicmath.css`), and the fonts, icons, GoatCounter script and Firebase SDK are served from this site too.

## Layout

| Path | What it is |
|---|---|
| `play/index.html`, `math.css` | The game page and its styles |
| `site/` | The landing page and the pages for grown-ups (rendered into place by the build; the legal pages include `docs/legal/`) |
| `theme/` | The brand theme, the fonts stylesheet, the site header partial and the styles of the static pages |
| `vendor/`, `fonts/`, `icons/`, `thumbs/` | Pinned third-party files (listed in `THIRD-PARTY-NOTICES.md`), fonts, icons and video thumbnails |
| `workers/src/` | The Worker (`index.ts`): today only the Content-Security-Policy report endpoint (`/_csp`, `csp.ts`) |
| `js/` | ES modules (`app.js` is the entry; `skills/` holds the skill map; `play/` holds the play experiences) |
| `css/play/` | Styles of the play experiences, loaded with their pages |
| `test/` | Unit tests (Vitest, `pnpm test`) |
| `e2e/` | Playwright end-to-end tests against the live site |
| `cloud/` | Firebase setup, Firestore rules and the rules tests |
| `build.py` | Builds the published copy (`_site/`) with the import map, cache versions, `_headers` and `_redirects` |
| `wrangler.jsonc`, `deploy/` | The Cloudflare Worker configuration and the pinned wrangler that deploys it |
| `docs/PLAN.md` | Product plan: phases, gates, metrics (not published) |

History before the split comes from `vedic-math/` in `sbmadhav.github.io` (`git subtree split`). The first versions, from when the app lived at `math/`, stay in that repo (commits `2c5b256` and `7933aee`).

## Run locally

Build the site and serve it the way Cloudflare does (`_headers` and `_redirects` applied):

```sh
python3 build.py --dev                  # _dev/: the published layout without stamps, and a worker that caches nothing
node e2e/local-server.mjs 8124 _dev     # http://localhost:8124/ and http://localhost:8124/play/
```

`python3 build.py && node e2e/local-server.mjs 8124 _site` serves exactly what the deploy publishes (stamped, with the real worker). `pnpm --filter workers exec wrangler dev --config ../wrangler.jsonc` runs the same `_site` in Cloudflare's own runtime.

## Offline

After one visit online, the game works offline: `/sw.js` (scope `/play/`) saves the page, its modules, styles, the design system, fonts and icons, each checked against the hash the build recorded. The deploy build stamps its version and file list. Leaderboards need a connection and fall back to this device. The source in git has a `'dev'` worker that caches nothing. To test offline locally, build and serve the published copy: `python3 build.py && node e2e/local-server.mjs 8124 _site`.

## Checks

| Check | Command |
|---|---|
| Type check | `pnpm typecheck` |
| Lint (ESLint and stylelint) | `pnpm lint` |
| Unit tests (Vitest) | `pnpm test` |
| The app builds, and the source has no cache stamps | `python3 build.py` (into `_site/`) |
| Firestore rules tests (emulator, needs Java) | `cd cloud/test && npm install && npm test` |
| End-to-end tests (live site, or `BASE_URL=http://localhost:8124` for a local build) | `cd e2e && pnpm exec playwright install chromium webkit && pnpm exec playwright test` |

The pnpm commands need `corepack enable && pnpm install` once per clone. The pre-commit hook in `.githooks/` runs the first four. Enable it once per clone:

```sh
git config core.hooksPath .githooks
```

CI (`.github/workflows/ci.yml`) runs the same on every push and pull request to `main`. Pull requests from branches of this repo get a preview on workers.dev (`.github/workflows/preview.yml`) and the end-to-end suite runs against it. `.github/workflows/e2e.yml` runs the suite against https://learnvedicmath.com daily, on demand and after each deploy.

The end-to-end tests never write to production Firestore: the Firebase SDK is faked in all but one read-only leaderboard test, and any write-shaped Firestore request fails the run. The service worker is blocked in every spec except `e2e/tests/offline.spec.ts` (chromium and mobile only). To test this checkout before pushing, run `python3 build.py && node e2e/local-server.mjs 8124 _site` and then `BASE_URL=http://localhost:8124 pnpm exec playwright test` in `e2e/` (with `E2E_VOICE_ORIGIN` set while the voice host is not live yet; see `docs/agent/e2e.md`).

## Deploy

On a push to `main`, CI (`.github/workflows/ci.yml`) builds `_site/` with `python3 build.py --out _site` and checks it; its `voice-upload` job copies any new Studio voice files to the voice host, and then its `deploy` job publishes the checked `_site/` with `wrangler deploy`, using the Cloudflare API token held in the `production` environment (main only). The deploy runs once the repository variable `CLOUDFLARE_ACCOUNT_ID` is set, and the voice upload once `R2_ACCOUNT_ID` is (`docs/owner-setup-learnvedicmath.md`). Until R2 is set up, CI builds with `python3 build.py --voice off`, which leaves the voice host out of the published site, and deploys that: read aloud and Listen use the device voice.

Phase B of the move publishes the "Vedic Math has moved" page at sbmadhav.com/vedic-math/ once, by hand: `.github/workflows/moved.yml` (`python3 build.py --target moved`).

### Studio voice audio

Read aloud plays the Studio voice (Google Chirp 3 HD, Aoede), recorded ahead of time. The audio is not in git: it lives in a GitHub Release of this repo (tag `voice-<hash>`, one `.tar`), and `js/voice-index.js` (generated, committed) names that release, the archive's SHA-256 and the voice host. The CI `voice-upload` job runs `node tools/voice/r2-upload.mjs`, which downloads the archive, checks the hash, uploads any file the R2 bucket does not have yet (never overwriting or deleting) and checks that every file the index names is there; the files are served from https://voice.learnvedicmath.com/ (design D17). A line with no recording is read by the device's own voice. The site never calls a speech service, and `build.py` fails if a provider address or anything shaped like a key appears in a published file.

After changing anything that is read aloud, re-record and publish (only new or changed lines are paid for; caps of $300 a month and $50 a run at list price, 300 requests a minute, in `tools/voice/voice-lib.mjs`):

```sh
gcloud auth login   # once; the owner's Google account, project sbmadhav-vedic-math
node tools/voice/lines.mjs
GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token) GOOGLE_CLOUD_PROJECT=sbmadhav-vedic-math node tools/voice/record.mjs
node tools/voice/publish.mjs   # uploads the archive with gh and writes its tag and hash into js/voice-index.js
```

Commit `js/voice-index.js` and `tools/voice/manifest.json` with the wording change. `test/voice-coverage.test.mjs` fails when an Explorer line has no recording.

`main` is protected: every change from someone else arrives as a pull request, needs the owner's review and passing checks, and nothing merges without approval.

## Contributing

Reports of a wrong answer, a confusing explanation or an accessibility problem are welcome; code from outside the project is not accepted since the cutoff commit named in `LICENSE`. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report, and [SECURITY.md](SECURITY.md) to report a security problem privately.

## License

[MIT](LICENSE) up to the cutoff commit named there, including the lessons and games published by then; later code and content are all rights reserved. The name Madhav Srinivasan and his likeness are never licensed. Details in [LICENSE-CONTENT.md](LICENSE-CONTENT.md); third-party licences in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Thank you, Claude

Built with Claude: much of Vedic Math was designed and written together with Claude, Anthropic's AI assistant, through Claude Code. Thank you, Claude.
