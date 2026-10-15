# Vedic Math for Everyone

Served at https://sbmadhav.com/vedic-math/ as part of sbmadhav.com: GitHub project Pages for this repo (branch `main`, Jekyll) under the custom domain of the `sbmadhav.github.io` repo. There is no CNAME here; the domain comes from the user site.

## Shared files come from the main site

This repo does not contain the design system, fonts or site chrome. `index.html` loads them by absolute URL from the rest of sbmadhav.com (the `sbmadhav.github.io` repo, and the design system from wherever `/design-system/` is served), the same way `/state-of-voice-agents/` does:

- `/design-system/tokens.css` and `/design-system/components.css`
- `/assets/explore.js` (site-wide Explore menu) and `/assets/analytics.js` (GoatCounter)
- `/assets/fonts/*.woff2` and `/assets/icons/*.png` (the touch icon, and the icons this repo's own `manifest.webmanifest` lists)

They are not `?v=` stamped (this repo cannot hash them). Do not copy them in; change them where they live.

## Rules

- Follow the design system: its guidelines are published at https://sbmadhav.com/design-system/ (source: `design-system/README.md`, in the `sbmadhav.github.io` repo or its own `design-system` repo once split out).
- Use tokens (`var(--coral)`, `var(--space-6)`, `var(--radius-lg)`), never raw hex. Text on accent fills uses `var(--on-accent)`, not white.
- Support both color schemes (Daybreak light, Deep Space dark; system default with a saved override).
- No kid mode switch in the header. The play modes (Explorer, Challenger, Pro) set the wording, and the page never writes the site-wide `kidmode` setting.
- Keep the Explore button (`<button id="exploreBtn" class="xp-btn">`) in the header and `<script src="/assets/explore.js" defer>` plus `<script src="/assets/analytics.js" defer>` before `</body>`. Record notable actions with `window.siteTrack('area/action', 'Readable title')`; never send personal data.
- Never use em dashes in copy.
- Every page URL starts with `/vedic-math/`. Module imports are relative or absolute paths inside `/vedic-math/js/` (`build.py` fails on anything else).

## Build, checks and hook

- After editing `index.html`, `math.css` or anything in `js/`, run `python3 build.py`. It rewrites the import map in `index.html` (every module pinned to `?v=<hash>`) and stamps the entry script and `math.css`.
- Tests: `node --test 'test/**/*.test.{js,mjs}'`.
- Pre-commit hook in `.githooks/pre-commit` runs the build (fails if it changed a file: stage and commit again) and the tests. Enable once per clone: `git config core.hooksPath .githooks`.
- `.github/workflows/ci.yml` runs the same checks on pushes and pull requests to `main`.

## End-to-end tests (`e2e/`)

- Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit. Run `cd e2e && npx playwright test` before pushing (`BASE_URL=http://localhost:8124` for a local server: `node e2e/local-server.mjs 8124` serves this checkout at `/vedic-math/` and proxies the rest of the site from https://sbmadhav.com).
- The suite targets the LIVE https://sbmadhav.com/vedic-math/ by default (projects chromium, webkit, mobile). First run: `cd e2e && npm ci && npx playwright install chromium webkit`.
- Never write to production Firestore from a test. `e2e/tests/fixtures.ts` replaces the Firebase SDK with a fake that records attempted writes (`cloudLog(page)`), and aborts and fails the test on any write-shaped request to `firestore.googleapis.com`. Only `leaderboard.live.spec.ts` loads the real SDK (one anonymous sign-in, reads only, chromium, no retries). Never submit an Arena or game score against the live backend.
- The service worker is blocked (`serviceWorkers: 'block'` in `e2e/playwright.config.ts`) everywhere except `e2e/tests/offline.spec.ts`. Two reasons: Playwright WebKit does not route requests from a worker-controlled page, so the fake SDK and the local GoatCounter answer are bypassed there (real anonymous sign-ins, counted visits); and a worker installing in every fresh test context roughly doubles the requests and gets the IP rate limited by GitHub Pages (HTTP 429, every test then times out). Keep offline specs off WebKit and keep their tripwire for live Google backends.
- Known axe violations go in `KNOWN` in `e2e/tests/a11y.spec.ts` (each becomes a `test.fixme` with a note); remove the entry when fixed.
- `.github/workflows/e2e.yml` runs the suite daily, on demand (optional `base_url`) and on pushes to `main` (after waiting for the Pages deploy).
- Repo-only files are listed in `exclude` in `_config.yml` (`cloud/`, `test/`, `docs/`, `e2e/`, this file, the README, `build.py`). Add new ones there.

## Offline

`sw.js` is this app's service worker, registered by `js/app.js` with scope `/vedic-math/` (on https and localhost). That scope is more specific than the root worker of sbmadhav.com (scope `/`, which leaves `/vedic-math/` to the network), so it controls these pages, including their requests to `/assets/` and `/design-system/`.

- `build.py` writes its `VERSION` and `PRECACHE` list (between the `build.py: precache` markers): the shell, `math.css`, every module at its import-map URL and the manifest, each with a hash the worker checks on install, plus the shared files `index.html` and the manifest reference. Never edit that block by hand.
- Page loads are network first with the saved shell as the offline fallback; `?v=` files are cache first; shared files are stale while revalidate. Other origins (Firebase, Google, analytics) and non-GET requests are never cached. Leaderboards fall back to this device when offline.
- Caches are `vedic-math-<VERSION>`; the worker keeps the current and previous one and never touches `madhav-*` (the root worker's). Never rename the prefix to `madhav-`.
- New same-origin files the page loads must be in `index.html` or the manifest (build.py lists them), and a module worker must be started with `import.meta.resolve(...)` so it gets its `?v=` stamp.
- To retire it, set `KILL = true` in `sw.js`, run `build.py` and deploy (see the comment there).
- `manifest.webmanifest` here makes Vedic Math its own installable app (scope `/vedic-math/`); the main site's manifest is unchanged.

## Leaderboards

Firebase with Firestore security rules. Setup, rules and the rules tests live in `cloud/` (see `cloud/README.md`). The browser client is `js/cloud.js`; the config is `js/cloud-config.js`.
