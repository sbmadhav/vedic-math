# Tasks

Approved by the owner on 2026-10-23 (first contentful paint reported, not gated, until the server-rendered shell; largest contentful paint stays gated), so the tasks are built in the same pull request.

## 1. The gate

- [x] 1.1 `tools/perf-compare.ts`: first contentful paint rows are `reported`: the row keeps the baseline, the measurement and the 100 ms limit, its status column reads `reported`, and it never counts as over; `REPORTED` names the metric so the re-enable is one edit; a note under the table says why and until when. Verify: `tools/test/perf-compare.test.ts`: a first contentful paint 400 ms over passes with `reported` and its would-be limit in the row, every other metric still fails one step past its tolerance, the note appears only when a reported row exists; `pnpm test`.
- [x] 1.2 The comments and docs that state the gate: `.github/workflows/preview.yml` (the perf job's header) and `docs/agent/build-and-checks.md`. Verify: `grep -rn "first or largest" .github docs/agent` finds nothing.

## 2. The Deep dive's blocking time

- [x] 2.1 Check with numbers whether the misses (191 on #125, 184 on #123, against 184) are the median of 5 being too few runs: the posted tables and the `perf-preview` artifacts of the eleven perf jobs after #130 merged (2026-10-23). Finding, recorded in `docs/perf/baseline.md` ("The Deep dive's blocking time, after the fix"): the five runs of a job agree within 9 to 26 ms; the job's median ranges from 92 to 191 ms on identical code, and every page's blocking time moves with it, so the level is the runner's CPU speed. More runs on one runner would not change it, and the limit is not raised. Verify: the numbers in the report match the artifacts (`gh run download <run> -n perf-preview`).
- [x] 2.2 `e2e/perf/lighthouse.mts` records Lighthouse's `benchmarkIndex` for every run (`bench`) and the job's median (`benchmarkIndex` in the results); `tools/perf-compare.ts` prints it under the table. Verify: `perf-compare.test.ts` shows the line when the results carry the number and not otherwise; the pull request's own perf job prints it.

## 3. The record

- [x] 3.1 `docs/perf/baseline.md`: the decision and its evidence under "First contentful paint races the module graph", the recorded `benchmarkIndex` under the Lighthouse settings, and the blocking time finding with the options left open. Verify: the report names the pull requests and numbers above.
- [x] 3.2 `openspec/changes/react-typescript/tasks.md` task 2.7 re-enables the gate: `REPORTED` loses `fcp`, against the server-rendered shell's first measurement, with its test. Verify: the task's text says so.
- [x] 3.3 Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py --voice off`, `openspec validate perf-gate-fcp --strict`; the pull request's perf job passes with its first contentful paint rows reported.
