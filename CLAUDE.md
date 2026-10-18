# Vedic Math for Everyone

Served at https://sbmadhav.com/vedic-math/ as part of sbmadhav.com: GitHub project Pages for this repo under the custom domain of the `sbmadhav.github.io` repo. There is no CNAME here; the domain comes from the user site.

This file holds the rules. The details behind each rule live in `docs/agent/` and are read on demand (the index is at the end). Keep this file short; add facts there, not here.

## Shared files come from the main site

`index.html` loads the design system, fonts and site chrome by absolute URL from the rest of sbmadhav.com: `/design-system/tokens.css` and `components.css`, `/assets/explore.js`, `/assets/analytics.js`, `/assets/fonts/*.woff2` and `/assets/icons/*.png`. They are not `?v=` stamped. Do not copy them in; change them where they live (the `sbmadhav.github.io` and `design-system` repos).

## Rules

- Follow the design system (https://sbmadhav.com/design-system/). Tokens only (`var(--coral)`, `var(--space-6)`, `var(--radius-lg)`), never raw hex. Text on accent fills uses `var(--on-accent)`, not white.
- Support both color schemes (Daybreak light, Deep Space dark; system default with a saved override).
- No kid mode switch in the header. The play modes (Explorer, Challenger, Pro) set the wording, and the page never writes the site-wide `kidmode` setting.
- Keep the Explore button (`<button id="exploreBtn" class="xp-btn">`) in the header and `<script src="/assets/explore.js" defer>` plus `<script src="/assets/analytics.js" defer>` before `</body>`. Record notable actions with `window.siteTrack('area/action', 'Readable title')`; never send personal data.
- Never use em dashes in copy.
- Every listener, timer and animation-frame loop in a view or round goes through `js/life.js` (`on`, `later`, `every`, `loop`, `child`) with the view's `signal`; `test/lifecycle-scan.test.mjs` fails on bare ones.
- Every page URL starts with `/vedic-math/`. Module imports are relative or absolute paths inside `/vedic-math/js/` (`build.py` fails on anything else).
- Never commit cache stamps: `index.html` loads plain `/vedic-math/js/app.js` and `math.css` with no import map, and `sw.js` keeps `const VERSION = 'dev';` and `const PRECACHE = [];`. The build stamps the published copy.
- Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit, and `e2e/tests/cov/` holds one spec per live OpenSpec scenario.
- Never write to production Firestore from a test, and never submit an Arena or game score against the live backend.
- Every non-trivial behavior change starts as an OpenSpec change in `openspec/changes/<name>/`, is implemented after the owner approves it, and is archived after release. Run `openspec validate --strict` before committing a change.
- Use the words defined in `GLOSSARY.md` in code comments, docs and plans; read `docs/adr/` before changing who can post, what is sent, or when an identity is created.
- Repo-only files (`cloud/`, `test/`, `docs/`, `tools/`, `e2e/`, this file, the README, `build.py`) are listed in `exclude` in `_config.yml`; add new ones there.

## Checks before a push

`python3 build.py --out /tmp/vm-site` and `node --test 'test/**/*.test.{js,mjs}'`; then `cd e2e && npx playwright test` (details in `docs/agent/e2e.md`). Enable the pre-commit hook once per clone: `git config core.hooksPath .githooks`.

## Where the details are

- `docs/agent/build-and-checks.md`: what `build.py` stamps, the published file set, the hook, CI and the Pages deploy.
- `docs/agent/e2e.md`: the live suite, the local server, the Firebase fake, the service worker rule, coverage specs, the CSP rule for tests, the workflow.
- `docs/agent/offline.md`: the service worker, caches, precache list, sounds, how to retire it.
- `docs/agent/play-experiences.md`: the twelve experiences under `js/play/`, their module shape, kit, analytics and Math Lens.
- `docs/agent/leaderboards.md`: Firebase, rules and the browser client.
- `docs/agent/language-and-decisions.md`: the glossary, ADRs, `docs/PLAN.md` and the OpenSpec workflow.
