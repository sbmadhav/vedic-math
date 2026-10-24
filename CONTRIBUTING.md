# Contributing to Vedic Math for Everyone

Thanks for taking the time to help. Learn Vedic Math is a free learning game for every age, at https://learnvedicmath.com/. Fixes and better explanations are very welcome.

## What is welcome

- Content corrections: a wrong answer, a sutra explained incorrectly, a step that skips too much, a typo. Please say where you saw it (mode, skill or game) and what it should say.
- Bug fixes in lessons, the Dojo, the Arena, games, quests and leaderboards.
- Accessibility: keyboard play, screen reader labels, contrast, reduced motion.
- New practice items or tests for an existing skill.

## What is not

- Ads, trackers, sign-ups or anything that collects personal data. Players are often children.
- New third-party scripts or services, unless discussed in an issue first.
- Changes to the vendored design system (`vendor/design-system/`). It is a pinned copy of [sbmadhav/design-system](https://github.com/sbmadhav/design-system); change it there, then vendor the new version here.
- A kid mode switch in the header. The play modes (Explorer, Challenger, Pro) set the wording here.

Big ideas (a new game, a new grade band) are best raised in an issue first.

## How a change gets merged

1. Fork the repo and create a branch from `main`.
2. Make the change and run the checks below.
3. Open a pull request against `main` and fill in the checklist.

Every pull request needs:

- an approving review from the owner (@sbmadhav, the code owner of every file),
- passing checks (the `check` job in `.github/workflows/ci.yml`),
- every review conversation resolved.

Nothing merges without the owner's approval. `main` deploys straight to the live app, so the branch is protected: no direct pushes from contributors, no force pushes. Workflows from forks wait for the owner's approval before they run.

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

The pre-commit hook runs the first four (the build into a throwaway directory). CI runs them on every pull request and checks that the build holds no repo-only files. A build inside the repo goes in a folder whose name starts with `_` (`_site/`, `_dev/`, `_moved/`, or `--out _<name>`): git and ESLint ignore `_*/`, and `build.py` refuses any other place inside the repo. Every build but `--dev` stamps its output (versioned references and a stamped service worker), and that output is never committed: the source in git holds no cache stamps, so there is nothing to run or commit after editing `play/index.html`, `site/`, `math.css` or `js/`.

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
- Module imports stay inside `/js/` (`build.py` fails on anything else), and nothing loads from another site unless it is in `THIRD_PARTIES` in `build.py`.
- Test both schemes, a 390px wide phone, keyboard only and reduced motion.

## Repo-only files

The build publishes every file it is not told to skip. If you add a file that is not part of the site (docs, scripts, tests), add it to `exclude` in `_config.yml`, the one list `build.py` reads. Paths starting with `.` or `_` are always left out.

## Security problems

Do not open a public issue. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE), the same license as the rest of this repo.
