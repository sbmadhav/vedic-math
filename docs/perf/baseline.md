# Performance baseline

The numbers of the live game before the migration to React (openspec change `react-typescript`, task 0.4, design D1, performance-budget spec). Task 1.8 adds the gates that use them: the build compares its first-load bytes with them, and each pull request's preview is measured the same way and compared. The machine-readable copy is `docs/perf/baseline.json`. A change to either file says why in its pull request.

## What was measured

- **Site:** https://learnvedicmath.com, the game at `/play/`, measured on 2026-10-21 at 01:17 UTC.
- **Commit:** `1401890` on `main` (Merge pull request #109). The live `sw.js` had `VERSION = '1730cf8552'`, the same as the job's `python3 build.py --voice off` of this pull request merged into that commit (the pull request publishes nothing), so the live files were that commit's.
- **Machine:** a GitHub-hosted `ubuntu-latest` runner, through `.github/workflows/perf.yml` (run 39526007402). The gates of task 1.8 run on the same kind of runner, so like is compared with like. Lighthouse 13.5.0, with the Chromium of Playwright 1.64.1.
- **Re-measuring:** run `perf.yml` by hand (Actions, "Perf baseline", optional `base_url`). Locally, from the repository root: `python3 build.py --out _site --voice off` (the mode production builds in while R2 is not set up), then `node tools/budget.ts _site`. From `e2e/`: `node perf/lighthouse.mts` and `pnpm exec playwright test -c perf/playwright.config.ts`.

## First load: 758,072 bytes (Brotli)

The Brotli-compressed size (quality 11) of everything a first visit to `/play/` requests before the first tap, counting each unique file once: 740.3 KB in 125 files, the budget since #115. The live site measured 744,827 bytes (727.4 KB) in 122 files; the sky background merged since (#110, #111) and phase 1's own edits brought it here (see the table at the end). `tools/budget.ts` reads it from a build:
- the page itself;
- every file the page links or loads (styles, the design system, the header script, fonts it preloads, icons, the manifest);
- the static module graph of `/js/app.js`;
- `sw.js`;
- every file in the worker's `PRECACHE`, which the install downloads even when the install ends after the tap.

Today's `PRECACHE` already holds every module of the import map. So the number is the whole game shell, not only what the first screen draws. Requests made after an idle timer (GoatCounter's `count.js`) or after a tap are not counted.

| Biggest files | Brotli |
|---|---|
| `/js/app.js` | 41.7 KB |
| `/fonts/nunito-sans-latin-wght-normal.woff2` | 30.3 KB |
| `/fonts/space-grotesk-latin-wght-normal.woff2` | 21.8 KB |
| `/fonts/jetbrains-mono-latin-500-normal.woff2` | 21.3 KB |
| `/math.css` | 20.6 KB |
| `/icons/icon-512.png` | 20.4 KB |
| `/js/videos.js` | 20.0 KB |

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

| Page | Visit | FCP | LCP | TBT | CLS | Speed Index | TTFB | Server response |
|---|---|---|---|---|---|---|---|---|
| `/play/` | first | 1,923 ms | 5,420 ms | 46 ms | 0.001 | 1,923 ms | 479 ms | 70 ms |
| `/play/` | repeat | 831 ms | 1,260 ms | 42 ms | 0.007 | 831 ms | 50 ms | 50 ms |
| `/play/#/arena` | returning | 2,096 ms | 5,544 ms | 57 ms | 0.007 | 2,096 ms | 500 ms | 58 ms |
| `/play/#/games` | returning | 1,952 ms | 5,647 ms | 61 ms | 0.007 | 1,952 ms | 508 ms | 77 ms |
| `/play/#/sutras/s1` | returning | 2,258 ms | 5,667 ms | 159 ms | 0.007 | 2,640 ms | 498 ms | 43 ms |

- **TTFB:** time to first byte as Lighthouse's throttled run models it, with DNS, connection, TLS and the server's answer (the metrics audit's `timeToFirstByte`).
- **Server response:** the server's own response time (the `server-response-time` audit).
- **The repeat visit:** the worker answers the page, so Lighthouse has no network time to first byte for it; the worker's answer time (the server response audit) stands in, for that visit only.

**How much it varies.** Earlier runs of the same workflow (20 and 21 October) gave first contentful paint medians within about 150 ms of these on most pages, but up to 450 ms away on some: Arena 2,395 ms in run 39516318621, whose single runs spread from 1,404 to 3,164 ms. A runner's load decides how far a run strays. That is more than the 100 ms tolerance for first and largest contentful paint, so the gate (task 1.8) has to allow for it.

For reference, the same script on an Apple-silicon laptop against the same site (commit `ad54a37`, 23:32 UTC) gave first contentful paint within 100 ms of these numbers and a total blocking time of 0 to 48 ms.

## Interactions

Settings:
- Script: `e2e/perf/interactions.ts`.
- Chromium with 4x CPU slowdown through the DevTools protocol, and motion reduced, as in the e2e suite.
- Each interaction runs 5 times in a fresh context, as the e2e fixtures' returning Challenger Player, with analytics answered locally.
- Before each tap the script waits for network idle, an idle callback and the end of finite animations.

Two numbers per interaction, in milliseconds:
- **INP:** the Event Timing API's duration of the tap (pointerdown to the next paint after its handlers), the longest entry of the interaction, as INP counts it. The API reports in steps of 8 ms, with nothing under 16 ms.
- **Visible:** from the tap's event time to the first animation frame in which the result is on screen.

| Interaction | INP (run 1) | INP (run 2) | Visible (run 1) | Visible (run 2) |
|---|---|---|---|---|
| Open the Arena (Home, tap Arena) | 64 | 64 | 38 | 39 |
| Answer an Arena question (Practice round, keypad Go) | 40 | 40 | 1 | 2 |
| Open a Deep dive (flip the first Sutra card, tap Learn more) | 200 | 176 | 4 | 7 |
| Light a Star (Square numbers ending in 5, the fourth right answer) | 32 | 32 | 1,125 | 1,125 |

The baseline is run 1. Task 0.4's repeatability check: the same job runs the script twice and fails when a median moves more than the spec's 20 ms. One timing has a recorded allowance instead (below). Every other median moved 1 ms or less here.

**Notes on the numbers:**
- **Deep dive:** the INP is about 200 ms while the dialog's first example is on screen within about 10 ms. The tap's frame is held up by the dialog's layout and paint, which is what INP measures.
- **The Deep dive INP's noise allowance:** this INP is the one timing that will not hold still on a GitHub runner. Its median moved between 136 and 264 ms across six runs of the job. Within one job, the two runs differed by up to 104 ms.
  - The cause: Learn more is a hash link. The heavy dialog is built in the `hashchange` task that follows the click, and whether that task lands before or after the tap's next paint varies.
  - The fix for the measurement: `baseline.json` records `interactions.noise` with 120 ms for this INP. The repeat check and the gate (task 1.8) then allow that much instead of 20 ms.
  - Its "visible" number moves with it (the dialog is drawn in the click's frame or the next one, 4 or about 30 ms), so it gets 40 ms; a slower dialog still fails. The router of phase 2 removes the hash change, and the allowance goes with it.
- **Light a Star:** "Visible" includes the round's own pause of about 1.1 s before the end screen. It is a fixed delay, not work, and it is stable across runs.
- **Why motion is reduced:** with the background animating, the Deep dive's tap came out at about 35 ms or about 200 ms run by run. A tap sometimes shared its frame with a heavy background frame, and two runs of one job were 104 ms apart. With motion reduced the background draws once, and every interaction's five runs are within 24 ms of each other. Earlier versions of the script also tapped during a card flip and during the screen's idle work; the waits above fixed that.

## When the baseline changes

- **Bytes:** a pull request that grows first load on purpose updates `firstLoad` in `baseline.json` (`node tools/budget.ts _site --json <file>`) and says why. Phase 2 measures `/learn/` and reads the client build's manifest (task 2.7). That pull request records the new page's first measurement next to this one.
- **Timings:** they are re-measured with `perf.yml` and replaced only with a reason, such as a runner image change that moves every number.

## Changes to the baseline

| Date | Pull request | First load (Brotli) | Why |
|---|---|---|---|
| 2026-10-21 | #110 | 744,827 to 755,652 bytes | Merged on `main` after the baseline was measured: the animated sky background (`js/sky-bg.js` and its styles), a feature outside this change. Counted here because the gate starts after it. |
| 2026-10-21 | #111 | 755,652 to 757,612 bytes | Merged on `main` after #110: the sky background's second part (`js/sky-bg.js`), a feature outside this change. |
| 2026-10-21 | #115 | 757,612 to 758,072 bytes | Phase 1's own edits from #114 and #115: the three `js/` edits (comments and absolute `/sounds/` URLs) and `sw.js` published from `sw.ts` (its new header comment, the `/api/` rule and the lint fixes). No new file. |
