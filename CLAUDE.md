# Vedic Math for Everyone

Served at https://sbmadhav.com/vedic-math/ as part of sbmadhav.com: GitHub project Pages for this repo (branch `main`, Jekyll) under the custom domain of the `sbmadhav.github.io` repo. There is no CNAME here; the domain comes from the user site.

## Shared files come from the main site

This repo does not contain the design system, fonts or site chrome. `index.html` loads them by absolute URL from the rest of sbmadhav.com (the `sbmadhav.github.io` repo, and the design system from wherever `/design-system/` is served), the same way `/state-of-voice-agents/` does:

- `/design-system/tokens.css` and `/design-system/components.css`
- `/assets/explore.js` (site-wide Explore menu) and `/assets/analytics.js` (GoatCounter)
- `/assets/fonts/*.woff2`, `/assets/icons/apple-touch-icon.png`, `/manifest.webmanifest`

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
- Known axe violations go in `KNOWN` in `e2e/tests/a11y.spec.ts` (each becomes a `test.fixme` with a note); remove the entry when fixed.
- `.github/workflows/e2e.yml` runs the suite daily, on demand (optional `base_url`) and on pushes to `main` (after waiting for the Pages deploy).
- Repo-only files are listed in `exclude` in `_config.yml` (`cloud/`, `test/`, `e2e/`, this file, the README, `build.py`). Add new ones there.

## Offline

There is no service worker in this repo. The root service worker of sbmadhav.com (`sw.js` in the main repo, scope `/`) leaves `/vedic-math/` to the network, so visitors always get what this repo serves. If offline play is wanted later, add a worker at `/vedic-math/sw.js` registered with scope `/vedic-math/` and a cache name that does not start with `madhav-` (the root worker deletes those).

## Leaderboards

Firebase with Firestore security rules. Setup, rules and the rules tests live in `cloud/` (see `cloud/README.md`). The browser client is `js/cloud.js`; the config is `js/cloud-config.js`.
