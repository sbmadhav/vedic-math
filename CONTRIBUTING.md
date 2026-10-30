# Contributing to Learn Vedic Math

Thanks for taking the time to help. Learn Vedic Math is a free learning game for every age, at https://learnvedicmath.com/.

## What is welcome

Reports. Say where you saw it (Mode, Skill or game) and what it should say:

- Content corrections: a wrong answer, a sutra explained incorrectly, a step that skips too much, a typo.
- Bugs in lessons, Katas, the Arena, games, quests and Boards.
- Accessibility: keyboard play, screen reader labels, contrast, reduced motion.

While this repo is public, open an issue. At any time, write to hello@learnvedicmath.com. Security problems go to security@learnvedicmath.com, never to an issue: see [SECURITY.md](SECURITY.md).

## What is not

Code from outside the project. After the cutoff commit named in [LICENSE](LICENSE), the code and content are proprietary, and the repo goes private once the owner says so (design D13 and D16), so pull requests from outside are not accepted. The owner may take a small fix by exception; by sending one you confirm it is your own work and give the owner a free, worldwide, permanent and irrevocable right to use, change, publish and license it as part of the project, including under the all rights reserved terms that cover code after the cutoff ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)). You keep the copyright, and you are credited in the commit.

Also not, in any change: ads, trackers, sign-ups or anything that collects personal data (Players are often children); new third-party scripts or services; changes to the vendored design system (`vendor/design-system/`, a pinned copy of [sbmadhav/design-system](https://github.com/sbmadhav/design-system): change it there, then vendor the new version here); a kid mode switch in the header (the play modes, Explorer, Challenger and Pro, set the wording).

## How a change gets merged

Changes are made by the owner and the owner's own tooling: a branch from `main`, the checks below, then a pull request against `main` with the checklist filled in. Every pull request needs passing checks (the `check` job in `.github/workflows/ci.yml`), every review conversation resolved and the owner's approval. `main` deploys straight to the live app, so the branch is protected: no direct pushes, no force pushes. A pull request from a fork gets no preview (`.github/workflows/preview.yml` skips it), and any other workflow it starts waits for the owner's approval before it runs.

## Local setup

You need Python 3, Node.js 22.19 or newer (`engines` in `package.json`) and pnpm (`corepack enable`). The app itself has no install step; `pnpm install` once at the root is for the checks.

Build the site and serve it the way Cloudflare does:

```sh
git clone https://github.com/<you>/vedic-math.git
cd vedic-math && git config core.hooksPath .githooks
python3 build.py --dev && node e2e/local-server.mjs 8124 _dev
```

Then open http://localhost:8124/ (the landing page) or http://localhost:8124/play/ (the game). Run the build again after an edit.

## Checks

| Check | Command |
|---|---|
| Type check | `pnpm typecheck` |
| Lint (ESLint and stylelint) | `pnpm lint` |
| Unit tests (Vitest) | `pnpm test` |
| The app builds (and the source has no cache stamps) | `python3 build.py` (into `_site/`) |
| End-to-end tests | `cd e2e && pnpm exec playwright test` |
| Firestore rules tests (only when you change `cloud/`; needs Java) | `cd cloud/test && npm install && npm test` |

The pre-commit hook runs the first four (the build into a throwaway directory). CI runs them on every pull request and checks that the build holds no repo-only files. A build inside the repo goes in a top-level folder whose name starts with `_` (`_site/`, `_dev/`, `_moved/`, or `--out _<name>`): git and ESLint ignore `_*/`, and `build.py` refuses any other place inside the repo. Every build but `--dev` stamps its output (versioned references and a stamped service worker), and that output is never committed: the source in git holds no cache stamps, so there is nothing to run or commit after editing `play/index.html`, `site/`, `math.css` or `js/`.

## Tests

Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit. Run `cd e2e && pnpm exec playwright test` before pushing (first run: `corepack enable && pnpm install` at the repository root, then `pnpm exec playwright install chromium webkit` in `e2e/`).

The suite runs against the live site by default. To test your checkout before it is live, run `python3 build.py && node e2e/local-server.mjs 8124 _site`, then `BASE_URL=http://localhost:8124 pnpm exec playwright test` in `e2e/`. Tests never write to the production leaderboards: keep using the fake Firebase SDK in `e2e/tests/fixtures.ts`.

## Style rules

- Follow the design system (the pinned copy in `vendor/design-system/2.1.0/`, with the theme in `theme/learnvedicmath.css`).
- Use tokens, never raw hex: `var(--coral)`, `var(--space-6)`, `var(--radius-lg)`. Text on accent fills uses `var(--on-accent)`.
- Support both color schemes: Daybreak (light) and Deep Space (dark).
- Write for every play mode: Explorer (young kids), Challenger and Pro.
- Never use em dashes in copy. Use a period, comma or colon.
- Never send personal data to analytics or the leaderboards.
- Module imports stay inside `/js/`, or name a TypeScript module under `shared/src/` or `app/src/` that `build.py` publishes under `/js/ts/` (`build.py` fails on anything else), and nothing loads from another site unless it is in `THIRD_PARTIES` (`shared/src/policy.json`, read by `build.py`).
- Test both schemes, a 390px wide phone, keyboard only and reduced motion.

## Repo-only files

The build publishes every file it is not told to skip. If you add a file that is not part of the site (docs, scripts, tests), add it to `exclude` in `_config.yml`, the one list `build.py` reads. Paths starting with `.` or `_` are always left out.

## Security problems

Do not open a public issue. See [SECURITY.md](SECURITY.md).

## Licence

Code and content up to the cutoff commit named in [LICENSE](LICENSE) are MIT; everything after it is all rights reserved unless a file says otherwise. What is never licensed, and the third-party notices, are in [LICENSE-CONTENT.md](LICENSE-CONTENT.md) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
