# Contributing to Vedic Math for Everyone

Thanks for taking the time to help. Vedic Math is a free learning app for every age, live at https://sbmadhav.com/vedic-math/. Fixes and better explanations are very welcome.

## What is welcome

- Content corrections: a wrong answer, a sutra explained incorrectly, a step that skips too much, a typo. Please say where you saw it (mode, skill or game) and what it should say.
- Bug fixes in lessons, the Dojo, the Arena, games, quests and leaderboards.
- Accessibility: keyboard play, screen reader labels, contrast, reduced motion.
- New practice items or tests for an existing skill.

## What is not

- Ads, trackers, sign-ups or anything that collects personal data. Players are often children.
- New third-party scripts or services, unless discussed in an issue first.
- Changes to the design tokens, the Explore menu or analytics. Those live in [sbmadhav/design-system](https://github.com/sbmadhav/design-system) and [sbmadhav/sbmadhav.github.io](https://github.com/sbmadhav/sbmadhav.github.io).
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

You need Python 3 and Node.js 22 or newer. There is no `npm install` for the app.

The app loads shared files from the rest of sbmadhav.com by absolute URL, so serve it from a checkout of the main site:

```sh
git clone https://github.com/sbmadhav/sbmadhav.github.io.git
git clone https://github.com/sbmadhav/design-system.git
git clone https://github.com/<you>/vedic-math.git
cd vedic-math && git config core.hooksPath .githooks && cd ..
cd sbmadhav.github.io
ln -s ../vedic-math vedic-math        # git ignores both links
ln -s ../design-system design-system
python3 -m http.server 8000
```

Then open http://localhost:8000/vedic-math/.

## Checks

| Check | Command |
|---|---|
| The app builds (and the source has no cache stamps) | `python3 build.py --out /tmp/vm-site` |
| Unit tests | `node --test 'test/**/*.test.{js,mjs}'` |
| End-to-end tests | `cd e2e && npm ci && npx playwright test` |
| Firestore rules tests (only when you change `cloud/`; needs Java) | `cd cloud/test && npm install && npm test` |

The pre-commit hook runs the first two. CI runs them on every pull request and checks that the build holds no repo-only files. Cache stamps are added only by the CI deploy, never in git, so there is nothing to run or commit after editing `index.html`, `math.css` or `js/`.

## Tests

Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit. Run `cd e2e && npx playwright test` before pushing (first run: `npm ci && npx playwright install chromium webkit`).

The suite runs against the live app by default. To test your checkout before it is live, run `node e2e/local-server.mjs 8124`, then `BASE_URL=http://localhost:8124 npx playwright test` in `e2e/`. Tests never write to the production leaderboards: keep using the fake Firebase SDK in `e2e/tests/fixtures.ts`.

## Style rules

- Follow the design system: https://sbmadhav.com/design-system/.
- Use tokens, never raw hex: `var(--coral)`, `var(--space-6)`, `var(--radius-lg)`. Text on accent fills uses `var(--on-accent)`.
- Support both color schemes: Daybreak (light) and Deep Space (dark).
- Write for every play mode: Explorer (young kids), Challenger and Pro.
- Never use em dashes in copy. Use a period, comma or colon.
- Never send personal data to analytics or the leaderboards.
- Module imports stay inside `/vedic-math/js/` (`build.py` fails on anything else).
- Test both schemes, a 390px wide phone, keyboard only and reduced motion.

## Repo-only files

GitHub Pages publishes every file it is not told to skip. If you add a file that is not part of the app (docs, scripts, tests), add it to `exclude` in `_config.yml`. That is the one list: `build.py --out` and Jekyll both read it. Paths starting with `.` or `_` are always left out.

## Security problems

Do not open a public issue. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE), the same license as the rest of this repo.
