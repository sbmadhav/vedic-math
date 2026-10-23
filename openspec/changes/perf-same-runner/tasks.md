# Tasks

The same-runner reference is the option #134 (`perf-gate-fcp`) recorded for the owner; built in one pull request, stacked on `perf-gate-fcp`.

## 1. Measuring both hosts

- [x] 1.1 `e2e/perf/lighthouse.mts --production <url> --production-json <file>`: production and the measured site page by page, every page on each host in turn with the same runs, settings and fixed server latency, the hosts' order swapping on each page (`e2e/perf/interleave.mts`); each host's results and `benchmarkIndex` written to its own file; the two options go together. Verify: `tools/test/interleave.test.ts` (each page on every site in turn, the order swapping); the pull request's perf job writes `perf/results/lighthouse.json` and `perf/results/production/lighthouse.json`.
- [x] 1.2 `preview.yml`: the interaction timings run against production and then the preview, both results kept (`perf/results/production/interactions.json`).

## 2. The gate

- [x] 2.1 `tools/perf-compare.ts --production <lighthouse.json> <interactions.json>`: each limit counted from production's median; largest contentful paint also held to the baseline (`ABSOLUTE`), the smaller limit binding and the table saying `(baseline)` when that one does; the Baseline column kept for information and a Production column added; the notes say what the limits count from and print both hosts' `benchmarkIndex`; without `--production` the behavior is unchanged. Verify: `tools/test/perf-compare.test.ts`: the slow-runner case passes (190 on production, 191 on the preview, baseline 159), 26 ms over production fails, the two largest contentful paint cases, layout shift from production, interactions with the noise allowance from production, a page missing from production fails, both table layouts, the notes; `pnpm test`.
- [x] 2.2 `preview.yml`: the compare step passes both production files; a miss re-measures only the kind that missed, on both hosts, with the first run kept in the artifact; the posted comment says what was compared. `e2e.yml` keeps the baseline comparison and its comment says why.

## 3. The record

- [x] 3.1 `docs/perf/baseline.md` ("The same-runner reference", and the settings and the options of the blocking time finding), `docs/agent/build-and-checks.md`, the workflows' comments.
- [x] 3.2 Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py --voice off`, `openspec validate perf-same-runner --strict`; the pull request's own perf job runs both hosts and posts the table with the Production column, and its minutes are recorded here. Result: see the pull request's perf table and the job time in the proposal.
