# Performance baseline

The numbers of the live game before the migration to React (openspec change `react-typescript`, task 0.4, design D1, performance-budget spec). The gates of task 1.8 compare every pull request's preview with them, and the build compares its first-load bytes with them. The machine-readable copy is `docs/perf/baseline.json`. A change to either file says why in its pull request.

## What was measured

- **Site:** https://learnvedicmath.com, the game at `/play/`, measured on 2026-10-20 at 23:55 UTC.
- **Commit:** `01dee2f` on `main` (Merge pull request #107). The live `sw.js` had `VERSION = '2e01da18cd'`, the same as `python3 build.py --voice off` of that commit, so the live files were that commit's.
- **Machine:** a GitHub-hosted `ubuntu-latest` runner, through `.github/workflows/perf.yml` (run 39517664770). The gates of task 1.8 run on the same kind of runner, so like is compared with like. Lighthouse 13.5.0, with the Chromium of Playwright 1.64.1.
- **Re-measuring:** run `perf.yml` by hand (Actions, "Perf baseline", optional `base_url`). Locally, from the repository root: `python3 build.py --out _site`, then `node tools/budget.ts _site`. From `e2e/`: `node perf/lighthouse.mts` and `npx playwright test -c perf/playwright.config.ts`.

## First load: 739,463 bytes (Brotli)

The Brotli-compressed size (quality 11) of everything a first visit to `/play/` requests before the first tap, counting each unique file once: 722.1 KB in 120 files. `tools/budget.ts` reads it from a build:
- the page itself;
- every file the page links or loads (styles, the design system, the header script, fonts it preloads, icons, the manifest);
- the static module graph of `/js/app.js`;
- `sw.js`;
- every file in the worker's `PRECACHE`, which the install downloads even when the install ends after the tap.

Today's `PRECACHE` already holds every module of the import map. So the number is the whole game shell, not only what the first screen draws. Requests made after an idle timer (GoatCounter's `count.js`) or after a tap are not counted.

| Biggest files | Brotli |
|---|---|
| `/js/app.js` | 41.2 KB |
| `/fonts/nunito-sans-latin-wght-normal.woff2` | 30.3 KB |
| `/fonts/space-grotesk-latin-wght-normal.woff2` | 21.8 KB |
| `/fonts/jetbrains-mono-latin-500-normal.woff2` | 21.3 KB |
| `/icons/icon-512.png` | 20.4 KB |
| `/js/videos.js` | 20.0 KB |
| `/math.css` | 19.7 KB |

Every file and its size is in `baseline.json` under `firstLoad.files`. The build uses that list to name the largest new or grown file when the budget is missed.

## Load: Lighthouse

Settings:
- Lighthouse's mobile preset: simulated slow 4G, 4x CPU slowdown, a Moto G Power sized screen, performance only.
- Each metric is the median of 5 runs. Each run uses a fresh browser profile, except the repeat visit.
- Pages and settings are in `tools/lighthouserc.json`.

The four kinds of visit:
- **first:** empty storage, so `/play/` shows the Mode picker.
- **returning:** a Player with a saved Mode and cold caches, so the route draws its own screen.
- **repeat:** a returning Player whose earlier visit installed the service worker.
- **The Deep dive:** measured at `#/sutras/s1` (Ekadhikena Purvena). The plan's `#/sutras/ekadhikena` is not a route id.

| Page | Visit | FCP | LCP | TBT | CLS | Speed Index | TTFB |
|---|---|---|---|---|---|---|---|
| `/play/` | first | 1,873 ms | 5,190 ms | 27 ms | 0.001 | 1,873 ms | 78 ms |
| `/play/` | repeat | 823 ms | 1,260 ms | 17 ms | 0.007 | 823 ms | 47 ms |
| `/play/#/arena` | returning | 1,947 ms | 5,540 ms | 35 ms | 0.007 | 1,947 ms | 70 ms |
| `/play/#/games` | returning | 1,948 ms | 5,520 ms | 36 ms | 0.007 | 1,948 ms | 70 ms |
| `/play/#/sutras/s1` | returning | 1,938 ms | 5,561 ms | 106 ms | 0.007 | 2,362 ms | 71 ms |

**How much it varies.** An earlier run of the same workflow on the same commit (run 39516318621, 23:42 UTC) gave medians up to 450 ms away from these for first contentful paint (Arena 2,395 ms, Games 2,176 ms). Its single runs spread from 1,404 to 3,164 ms. The run above has tight runs: every first contentful paint is within about 400 ms of its page's median. A runner's load decides how far a run strays. That is more than the 100 ms tolerance for first and largest contentful paint, so the gate (task 1.8) has to allow for it.

For reference, the same script on an Apple-silicon laptop against the same site (commit `ad54a37`, 23:32 UTC) gave first contentful paint within 100 ms of these numbers and a total blocking time of 0 to 48 ms.

## Interactions

Settings:
- Script: `e2e/perf/interactions.ts`.
- Chromium with 4x CPU slowdown through the DevTools protocol.
- Each interaction runs 5 times in a fresh context, as the e2e fixtures' returning Challenger Player, with analytics answered locally.
- Before each tap the script waits for network idle, an idle callback and the end of finite animations.

Two numbers per interaction, in milliseconds:
- **INP:** the Event Timing API's duration of the tap (pointerdown to the next paint after its handlers), the longest entry of the interaction, as INP counts it. The API reports in steps of 8 ms, with nothing under 16 ms.
- **Visible:** from the tap's event time to the first animation frame in which the result is on screen.

| Interaction | INP (run 1) | INP (run 2) | Visible (run 1) | Visible (run 2) |
|---|---|---|---|---|
| Open the Arena (Home, tap Arena) | 48 | 48 | 33 | 34 |
| Answer an Arena question (Practice round, keypad Go) | 32 | 40 | 2 | 4 |
| Open a Deep dive (flip the first Sutra card, tap Learn more) | 208 | 208 | 32 | 27 |
| Light a Star (Square numbers ending in 5, the fourth right answer) | 48 | 48 | 1,132 | 1,121 |

The baseline is run 1. The two runs of the same job agree within the spec's 20 ms tolerance, which is task 0.4's repeatability check: the largest difference is 11 ms.

**Notes on the numbers:**
- **Deep dive:** the INP is about 208 ms while the dialog's first example is on screen after about 30 ms. The tap's frame is held up by the dialog's layout and paint, which is what INP measures.
- **Light a Star:** "Visible" includes the round's own pause of about 1.1 s before the end screen. It is a fixed delay, not work, and it is stable across runs.
- **Earlier attempts:** the script's first versions measured during a card flip or during the screen's idle work, and the Deep dive's tap came out bimodal. The waits above fixed that.

## When the baseline changes

- **Bytes:** a pull request that grows first load on purpose updates `firstLoad` in `baseline.json` (`node tools/budget.ts _site --json <file>`) and says why. Phase 2 measures `/learn/` and reads the client build's manifest (task 2.7). That pull request records the new page's first measurement next to this one.
- **Timings:** they are re-measured with `perf.yml` and replaced only with a reason, such as a runner image change that moves every number.

