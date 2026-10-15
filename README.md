# Vedic Math for Everyone

Speed tricks from the sutras, a counting-to-calculus skill map, games, daily quests, an Arena with leaderboards and duels. Three play modes for every age. Live at [sbmadhav.com/vedic-math](https://sbmadhav.com/vedic-math/).

Part of [sbmadhav.com](https://sbmadhav.com). GitHub Pages publishes this repo (branch `main`) as a project site, and the user site's custom domain puts it at `/vedic-math/`. The design system (`/design-system/`, from [sbmadhav/design-system](https://github.com/sbmadhav/design-system)) and the fonts, Explore menu and analytics (`/assets/`, from [sbmadhav/sbmadhav.github.io](https://github.com/sbmadhav/sbmadhav.github.io)) are loaded by absolute URL.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `math.css` | The page and its styles |
| `js/` | ES modules (`app.js` is the entry; `skills/` holds the skill map) |
| `test/` | Unit tests (`node --test`) |
| `cloud/` | Firebase setup, Firestore rules and the rules tests |
| `build.py` | Stamps the import map and cache versions |

History before the split comes from `vedic-math/` in `sbmadhav.github.io` (`git subtree split`). The first versions, from when the app lived at `math/`, stay in that repo (commits `2c5b256` and `7933aee`).

## Run locally

Pages use absolute paths (`/vedic-math/...` and the main site's `/design-system/...`, `/assets/...`), so serve them all from one root. With the three repos cloned side by side:

```sh
cd ../sbmadhav.github.io
ln -s ../vedic-math vedic-math         # both links are ignored by that repo's .gitignore
ln -s ../design-system design-system   # clone sbmadhav/design-system next to it first
python3 -m http.server 8000
```

Then open http://localhost:8000/vedic-math/.

## Checks

| Check | Command |
|---|---|
| Stamped files are current | `python3 build.py && git diff --exit-code` |
| Unit tests | `node --test 'test/**/*.test.{js,mjs}'` |
| Firestore rules tests (emulator, needs Java) | `cd cloud/test && npm install && npm test` |

The pre-commit hook in `.githooks/` runs the first two. Enable it once per clone:

```sh
git config core.hooksPath .githooks
```

CI (`.github/workflows/ci.yml`) runs the same on every push and pull request to `main`.

`main` is protected: every change from someone else arrives as a pull request, needs the owner's review and passing checks, and nothing merges without approval.

## Contributing

Content corrections, bug fixes and accessibility improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose a change, and [SECURITY.md](SECURITY.md) to report a security problem privately.

## License

[MIT](LICENSE), including the lessons and games. The name Madhav Srinivasan and his likeness are not licensed; see [LICENSE-CONTENT.md](LICENSE-CONTENT.md).

## Thank you, Claude

Built with Claude: much of Vedic Math was designed and written together with Claude, Anthropic's AI assistant, through Claude Code. Thank you, Claude.
