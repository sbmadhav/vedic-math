# Vedic Math for Everyone

Speed tricks from the sutras, a counting-to-calculus skill map, games, daily quests, an Arena with leaderboards and duels. Three play modes for every age. Live at [sbmadhav.com/vedic-math](https://sbmadhav.com/vedic-math/).

Part of [sbmadhav.com](https://sbmadhav.com). The design system (`/design-system/`), fonts, Explore menu and analytics come from the rest of sbmadhav.com ([`sbmadhav.github.io`](https://github.com/sbmadhav/sbmadhav.github.io)) and are loaded by absolute URL.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `math.css` | The page and its styles |
| `js/` | ES modules (`app.js` is the entry; `skills/` holds the skill map) |
| `test/` | Unit tests (`node --test`) |
| `e2e/` | Playwright end-to-end tests against the live site |
| `cloud/` | Firebase setup, Firestore rules and the rules tests |
| `build.py` | Stamps the import map and cache versions |

History before the split comes from `vedic-math/` in `sbmadhav.github.io` (`git subtree split`). The first versions, from when the app lived at `math/`, stay in that repo (commits `2c5b256` and `7933aee`).

## Run locally

Pages use absolute paths (`/vedic-math/...` and the main site's `/design-system/...`, `/assets/...`), so serve both repos from one root. With the two repos cloned side by side:

```sh
cd ../sbmadhav.github.io
ln -s ../vedic-math vedic-math   # ignored by that repo's .gitignore
# if /design-system/ also lives in its own repo: ln -s ../design-system design-system
python3 -m http.server 8000
```

Then open http://localhost:8000/vedic-math/.

## Checks

| Check | Command |
|---|---|
| Stamped files are current | `python3 build.py && git diff --exit-code` |
| Unit tests | `node --test 'test/**/*.test.{js,mjs}'` |
| Firestore rules tests (emulator, needs Java) | `cd cloud/test && npm install && npm test` |
| End-to-end tests (live site) | `cd e2e && npm ci && npx playwright install chromium webkit && npx playwright test` |

The pre-commit hook in `.githooks/` runs the first two. Enable it once per clone:

```sh
git config core.hooksPath .githooks
```

CI (`.github/workflows/ci.yml`) runs the same on every push and pull request to `main`. `.github/workflows/e2e.yml` runs the end-to-end suite against https://sbmadhav.com daily, on demand and after each push to `main` once Pages has deployed it.

The end-to-end tests never write to production Firestore: the Firebase SDK is faked in all but one read-only leaderboard test, and any write-shaped Firestore request fails the run. To test this checkout before pushing, run `node e2e/local-server.mjs 8124` and then `BASE_URL=http://localhost:8124 npx playwright test` in `e2e/`.
