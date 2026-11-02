# Coding standards

How code, copy and tests are written here, each rule with its reason.

## Styling: tokens and color schemes

- Every value is a design system token (`var(--coral)`, `var(--space-6)`, `var(--radius-lg)`), so the brand theme and both color schemes restyle the whole site from one place. stylelint fails a raw color in `app/src/**/*.css`.
- A spacing or radius value that is not on the scale takes the nearest step when it is within 2px of one (owner's call, design audit plan B), so the scale stays the one source; a font size that equals a type role's size uses its `--text-<style>-size` token.
- Things told apart by colour (Belts, balloons, grade tiles) use the category colours (`--cat-*`), never `--sky` and `--teal` or `--plum` and `--coral` side by side; Bolt uses the fixed `--bolt-*` tokens; dialogs use `--scrim` and `--shadow-modal`; layers use `--z-*`; motion uses `--duration-*` and `--ease-*`.
- Text on an accent fill uses `var(--on-accent)`, the color each scheme pairs with its accents.
- Every page and view supports both color schemes, Daybreak (light) and Deep Space (dark): the system's scheme by default, the Player's saved choice when there is one.

## Pages: chrome, wording and analytics

- Every page uses the composed header and loads `<script src="/js/analytics.js" defer>` before `</body>`. The header carries no kid mode switch, and no page has an Explore menu or a "Made by" credit.
- The play modes (Explorer, Challenger, Pro) set the wording, page-locally (`js/fx.js`). The site-wide `kidmode` setting belongs to the portfolio, so the game leaves it untouched.
- Record notable actions with `window.siteTrack('area/action', 'Readable title')`. What it sends is bounded by the analytics guardrail in `AGENTS.md`.

## Lifecycle: one signal per view

- Every listener, timer and animation-frame loop in a view or round goes through `js/life.js` (`on`, `later`, `every`, `loop`, `child`) with the view's `signal`. The router aborts that signal when the route changes and rounds run under child signals, so aborting is the one cleanup and nothing outlives its view. `test/lifecycle-scan.test.mjs` fails on a bare `addEventListener`, `setTimeout`, `setInterval` or `requestAnimationFrame`; the few page-lifetime ones are allow-listed there.

## Modules: TypeScript, React and imports

- New code is TypeScript, and React for views (the migration, openspec change `react-typescript`).
- React components and hooks are server-safe: before writing one, read `docs/agent/migration.md`, "Server-safe code" (what a server render may read, and how content markup renders).
- Module imports in `js/` are relative or absolute paths inside `/js/`, or a TypeScript module under `/shared/src/` or `/app/src/` that the build publishes under `/js/ts/` (`docs/agent/build-and-checks.md`). The build pins each `/js/` module in the import map; a bare specifier falls outside the map, a path outside `/js/` is left unpinned, and a full URL runs another site's code. `lvm/legacy-imports` and `build.py` both fail on any other import.

## Tests: one Playwright test per behavior change

- Every change that affects behavior updates or adds the matching Playwright test in `e2e/` in the same commit, so the suite always describes what a Player sees. How specs are written: `docs/agent/e2e.md`.

## Words and copy

- Use the words defined in `GLOSSARY.md` in code comments, docs and plans, so code, specs and docs name each thing the same way.
- Honest framing is a rule, not a preference: the 16 sutras come from Bharati Krishna Tirtha's 1965 book, not the Vedas; older Indian mathematics (Śulba Sūtras, Āryabhaṭa, Bhāskara, Mādhava, Kaṭapayādi) is named accurately. `test/copy.test.mjs` and the honest-framing specs enforce the wording.
- Punctuation in copy follows the em dash guardrail in `AGENTS.md`.
