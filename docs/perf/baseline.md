# Performance baseline

The numbers of the live game before the migration to React (openspec change `react-typescript`, task 0.4, design D1, performance-budget spec). Task 1.8 adds the gates that use them: the build compares its first-load bytes with them, and each pull request's preview is measured the same way and compared. The machine-readable copy is `docs/perf/baseline.json`. A change to either file says why in its pull request.

## What was measured

- **Site:** https://learnvedicmath.com, the game at `/play/`, measured on 2026-10-21 at 01:17 UTC.
- **Commit:** `1401890` on `main` (Merge pull request #109). The live `sw.js` had `VERSION = '1730cf8552'`, the same as the job's `python3 build.py --voice off` of this pull request merged into that commit (the pull request publishes nothing), so the live files were that commit's.
- **Machine:** a GitHub-hosted `ubuntu-latest` runner, through `.github/workflows/perf.yml` (run 39526007402). The gates of task 1.8 run on the same kind of runner, so like is compared with like. Lighthouse 13.5.0, with the Chromium of Playwright 1.64.1.
- **Re-measuring:** run `perf.yml` by hand (Actions, "Perf baseline", optional `base_url`). Locally, from the repository root: `python3 build.py --out _site --voice off` (the mode production builds in while R2 is not set up), then `node tools/budget.ts _site`. From `e2e/`: `node perf/lighthouse.mts` and `pnpm exec playwright test -c perf/playwright.config.ts`.

## First load: 758,499 bytes (Brotli)

The Brotli-compressed size (quality 11) of everything a first visit to `/play/` requests before the first tap, counting each unique file once: 740.7 KB in 125 files, the budget since #115. The live site measured 744,827 bytes (727.4 KB) in 122 files; what merged since (the sky background #110 and #111, phase 1's #114, the Home redo #116) and #115's own edits brought it here (see the table at the end). `tools/budget.ts` reads it from a build:
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
- Since 2026-10-22 the simulation's server latency is fixed at 30 ms for the measured origin (`serverResponseTime` in `tools/lighthouserc.json`, applied by `e2e/perf/lantern.mts`); the baseline run used production's observed latency, about the same value. Why is under "The server latency is fixed" below.
- Since 2026-10-23 every run records Lighthouse's `benchmarkIndex` of the machine (`bench` per run, the job's median as `benchmarkIndex` in the results, and a line under the perf table): its CPU speed measure, higher is faster. Blocking time scales with it (see "The Deep dive's blocking time, after the fix"). The baseline run did not record it.
- First contentful paint is reported, not gated, since 2026-10-23 (owner; openspec change `perf-gate-fcp`): why is under "First contentful paint races the module graph" below.
- Since 2026-10-23 a pull request's perf job measures production in the same job as the preview, page by page on one runner, and counts each limit from production's median; the baseline stays in the table for information, and largest contentful paint stays held to it alone (owner; openspec change `perf-same-runner`). Why is under "The same-runner reference" below.

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

**The server latency is fixed.** With simulated throttling, Lighthouse adds the measured origin's observed server response time to every request it models, and largest contentful paint sits at the end of a long chain of them (the page, `app.js`, three levels of static imports with no modulepreload, the styles they load). Measured from a laptop with the latency pinned to 300 ms, production's `/play/` read 8,700 ms against about 5,400 ms: about 12 ms of largest contentful paint per 1 ms of server latency (first contentful paint about 2 ms per 1 ms). So the gate was comparing hosts, not code:
- Production, the host the baseline was measured on, re-measured on the runner on 2026-10-21 with the sky (#110, #111), the Home redo (#116) and phase 1 (#114) deployed, read largest contentful paint 5,384 / 5,528 / 5,414 / 5,642 ms (03:42 UTC), 5,403 / 5,377 / 5,472 / 5,568 ms (05:07) and 5,468 / 5,533 / 5,438 / 5,583 ms (05:12) for `/play/` first, the Arena, Games and the Deep dive: all within tolerance of the baseline.
- Pull request previews on workers.dev of the same code read 170 to 380 ms over on every cold-cache page: PR #115 5,512 / 5,841 / 5,845 / 5,932 and 5,503 / 5,926 / 5,945 / 5,921 ms; PR #124, a docs-only change, 5,768 / 5,832 / 5,722 / 5,897 and 5,593 / 5,752 / 5,830 / 6,014 ms. The repeat visit, answered by the service worker with no network, read 1,260 ms on both hosts.
- The difference is the host's answer time. The document's server response time was 21 to 77 ms on production and 67 to 256 ms on previews; lantern's per-origin latency, measured from a laptop, 21 to 32 ms on production (largest contentful paint 5,355 to 5,421 ms) and 51 to 55 ms on a preview (5,515 to 5,605 ms).

The fixed value, 30 ms, is lantern's own default for an origin it has no data for and inside production's observed range, so the baseline's numbers stand. Every run now simulates the same server whichever host answers, and the observed latency is recorded as `lat` in the results for information. A real server regression still shows: the server response time (`srt`) is observed, not simulated. Measured this way on 2026-10-23, production read largest contentful paint 5,340 / 1,260 / 5,430 / 5,340 / 5,490 ms and a preview 5,490 / 1,260 / 5,430 / 5,490 / 5,504 ms (observed latency 27 to 39 against 33 to 70 ms).

**First contentful paint races the module graph.** Lighthouse builds its simulated first contentful paint from what the unthrottled observation finished before its first paint, and it keeps a High-priority script it finds no evaluation task for as render-blocking. Every static import of `app.js` is such a script: ES module evaluation leaves no per-module EvaluateScript event (only `app.js` and `life.js` get one), so an import counts whenever its download ended before the observed first paint. On `/play/` the paint lands about 370 to 460 ms into the observed load and the first level of imports ends about 390 to 450 ms in, so a run counts none of them or a dozen (29 requests before the paint in one run), and the median of five moves between a floor of about 1,890 ms and 2,000 to 3,700 ms. Single runs on 2026-10-23 with the fixed latency: production's Deep dive 2,816 / 3,697 / 2,147 / 1,896 / 2,010 ms and Arena 3,144 / 1,889 / 1,889 / 2,204 / 1,893 ms, a preview's Arena 2,325 / 2,734 / 2,321 / 2,644 / 3,283 ms; largest contentful paint in the same runs stayed within 5,280 to 5,640 ms. The runner's load decides the mode (a slower first paint lets more imports finish before it), which is the spread noted above, so the 100 ms tolerance on first contentful paint does not hold on either host: a miss on that line alone, with largest contentful paint and blocking time within tolerance, is this race and not the code.

**First contentful paint is reported, not gated** (owner, 2026-10-23; openspec change `perf-gate-fcp`). The decision was between the gate's statistic for this metric and the page's loading, and the loading is what changes: phase 2's server-rendered shell paints before any module arrives, so the race ends there. Until then `tools/perf-compare.ts` keeps every first contentful paint row with the baseline, the measurement and the 100 ms limit, marked `reported`, and never counts it as over; `react-typescript` task 2.7 gates it again against the shell's first measurement. Largest contentful paint stays gated. The evidence after #130 merged, the pull requests re-measured on 2026-10-23 between 04:08 and 04:25 UTC, every one on the same game code as `main` (none changes a file a Player downloads): #119 Arena 2,393 against a limit of 2,196 ms and Games 2,341 against 2,052; #121 `/play/` 2,538 against 2,023, Arena 2,652 and the Deep dive 2,660 against 2,358; #123 Games 2,452; #125 Arena 2,628 and Games 2,608; #127 Arena 2,466 and Games 3,051; #128 `/play/` 2,141; while #118, #120 and #124 passed every line. Largest contentful paint was within tolerance in all of those jobs except #127's `/play/` (5,550 against 5,520 ms; its single runs read 5,490 to 5,640), and no other line missed except the Deep dive's blocking time (next section). Single runs behind a miss show the two modes side by side: #127's Games read 2,374 / 3,204 / 3,051 / 2,123 / 3,226 ms, #121's Arena 2,652 / 3,149 / 3,275 / 2,576 / 2,624.

**The Deep dive's blocking time.** Total blocking time on `/play/#/sutras/s1` was 159 ms in the baseline and 248 to 275 ms on production from the sky's first deploy (#110) on (issue #117), 241 and 248 ms on a preview. The sky's first frame measured the page before clearing behind its text: on the Deep dive, about 2,250 elements and 1,700 runs of text, nearly all below the fold, 3,490 box measurements that took 43 ms under the 4x throttle on a laptop and over 100 ms on the runner, a long task on that route alone (the Arena has 217 elements). Since 2026-10-22 `js/sky-bg.js` enters only what is on screen: 175 measurements and 4.6 ms on the same page (`e2e/tests/background-perf.spec.ts`, "the first frame, which measures the page, is not a long task"). The other pages' blocking time, 46 to 61 ms in the baseline, did not move.

**The Deep dive's blocking time, after the fix** (openspec change `perf-gate-fcp`, 2026-10-23). The line still missed by a few ms: 191 ms on #125 against the limit of 184 (single runs 191 / 182 / 203 / 202 / 183), and 184 on #123, at the limit (174 / 197 / 189 / 183 / 184). The question was whether the median of 5 is too few runs to be stable. The eleven perf jobs run after #130 merged, between 01:47 and 04:25 UTC on the same game code (#130's last two pushes, and #118 to #128 without #122 and #126, which were not re-measured), say it is not:
- The five runs of a job agree. Their spread (largest minus smallest) was 9 to 26 ms in every job, so the median of 5 moves by about 10 ms on one runner.
- The job moves. The eleven medians, sorted: 92, 134, 163, 164, 169, 169, 170, 176, 179, 184, 191 ms, against the baseline's 159. Every page moves with it: the fastest job (#127) read 25 / 9 / 27 / 15 / 92 ms for `/play/` first, repeat, the Arena, Games and the Deep dive, the slowest (#125) 52 / 54 / 63 / 70 / 191, the baseline 46 / 42 / 57 / 61 / 159. Under simulated throttling, blocking time is the observed task time times the 4x slowdown, so it scales with the runner's own CPU, and GitHub's runners differ by about two to one.
- The Deep dive has the least room. The other pages' limits sit 40 to 60% above their baselines; the Deep dive's is 16% above a baseline measured before the sky existed, and the sky still costs this page about 10 ms after the fix (the typical job reads 169 ms), so about 15 ms of the 25 ms tolerance is left for a runner effect of about 50 ms either way.

So more runs would not steady the line (they would run on the same runner) and the limit is not raised. What `perf-gate-fcp` did is record the runner's speed: Lighthouse's `benchmarkIndex` with every run, and a line under the perf table, so a miss on this line can be read against it. The options it left to the owner: compare the preview against production measured in the same job (the same runner, so the runner cancels), calibrate the CPU slowdown from `benchmarkIndex` as Lighthouse's own throttling guide does (a change to the spec's 4x), or re-measure the baseline with the sky in it (allowed by the spec, with the reason recorded; it still leaves 25 ms against a 50 ms runner effect). The first is built (next section); the other two are not.

**The same-runner reference** (owner, 2026-10-23; openspec change `perf-same-runner`). The quantity the gate wants is the regression a pull request adds, and production (what `main` deploys) measured on the same runner minutes apart is that reference: the runner's speed moves both hosts the same way and cancels, with no new tolerance, statistic, run count or baseline number. A pull request's perf job (`preview.yml`) now measures https://learnvedicmath.com and the preview in the same job: every page of `tools/lighthouserc.json` on each host in turn, the same 5 runs, settings and fixed server latency, the hosts' order swapping on each page so neither always goes first (`e2e/perf/lighthouse.mts --production`, `e2e/perf/interleave.mts`); the interaction timings run against production and then the preview. `tools/perf-compare.ts --production` counts each limit from production's median of that job (blocking time +25 ms, layout shift above the larger of production's and 0.1, interactions +20 ms or the noise recorded here), so on the slow runner above a Deep dive at 190 ms on production and 191 on the preview passes, and a preview 26 ms over production fails however fast the runner. The baseline keeps its column in the table for information. Largest contentful paint stays on the baseline +100 ms, as before, with production shown for information (the table says `(baseline)`): it sits at the end of the network chain, where the hosts differ, while blocking time and the interactions are CPU time, where the runner differs and cancels. The first job of this change (#139, run 39909990545, 2026-10-23) showed both effects at once. On a slow runner (`benchmarkIndex` 2,458 against 4,177 on #134's job) the Deep dive read 198 ms on production and 183 on the preview, so production itself was over the baseline's 184 limit and the preview passed against 223. And on `/play/` first visit, with the same bytes on both hosts (the same Brotli sizes and headers), largest contentful paint read 5,340 ms on production and 5,490 then 5,460 on the preview in the job's two runs (single runs 5,280 to 5,490 against 5,430 to 5,520), as the measurement after #130 had already seen (5,340 against 5,490 above), so a production +100 ms limit on that line fails identical code; the workers.dev edge answers 40 to 150 ms later from a laptop, and what is left of that in the simulation after the pinned latency is the host, not the code. First contentful paint stays reported. A miss re-measures only the kind that missed (the Lighthouse pages or the interactions, on both hosts), and the first run's results stay in the artifact. The byte gate (`build.py`) is unchanged, and so is the production check after a deploy (`e2e.yml`), which has no second host and keeps the baseline as its reference; a slow runner can still open an issue there, so the two other options stay open for it. Both hosts' `benchmarkIndex` print under the table, so a drift within the job shows. Cost: on #139 Lighthouse took 7 min 4 s and the interactions 3 min 40 s (3 min 27 s and 1 min 42 s on #134), about 5 and a half minutes more per job; the Lighthouse re-measure took 6 min 54 s more.

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
| 2026-10-21 | #114, #116 | 757,612 to 758,466 bytes | Merged on `main`: phase 1's #114 (the three `js/` edits, comments and absolute `/sounds/` URLs, and `sw.js` published from `sw.ts` with its header comment and the `/api/` rule) and the Home redo (#116). |
| 2026-10-21 | #115 | 758,466 to 758,499 bytes | Task 1.7's lint fixes in `sw.ts` (optional catch bindings, no non-null assertions). No new file. |
