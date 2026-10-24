# Proposal

## Why

The perf gate (`react-typescript` task 1.8, performance-budget spec) fails a pull request when a Lighthouse median is worse than the baseline by more than its tolerance: 100 ms for first and for largest contentful paint. #130 (2026-10-23) fixed the simulation's server latency, so the preview host no longer counts, and `docs/perf/baseline.md` ("First contentful paint races the module graph") explains the line that still misses: Lighthouse builds its simulated first contentful paint from what the unthrottled observation finished before its first paint, and it counts every static import of `app.js` whose download ended before that paint as render-blocking. So the metric is bistable, a floor of about 1,890 ms or 2,000 to 3,700 ms, and the runner's load picks the mode. On the same game code as `main`, the pull requests measured after #130 merged (2026-10-23, 04:08 to 04:25 UTC) failed on that line alone: #119 (Arena 2,393 against a limit of 2,196 ms, Games 2,341 against 2,052), #121 (`/play/` 2,538, Arena 2,652, the Deep dive 2,660), #123 (Games 2,452), #125 (Arena 2,628, Games 2,608), #127 (Arena 2,466, Games 3,051) and #128 (`/play/` 2,141), while #118, #120 and #124 passed every line. Largest contentful paint was within tolerance in every one of those jobs but one (#127's `/play/`, 5,550 against 5,520 ms). The owner decided on 2026-10-23: first contentful paint is reported but not gated until `react-typescript` phase 2's server-rendered shell, which paints before any module arrives; largest contentful paint stays gated.

The Deep dive's total blocking time also missed after #130's fix, by a few ms (191 against the limit of 184 on #125; 184, at the limit, on #123; baseline 159). This change checks with numbers whether the spec's statistic, the median of 5 runs, is too few runs to be stable. It is not: the five runs of a job agree within 9 to 26 ms, and what moves is the job, 92 to 191 ms across eleven jobs on identical code, with every page's blocking time rising and falling together. That is the runner's CPU speed, which the 4x slowdown multiplies, and more runs on the same runner cannot change it. So this change does not touch that limit or its run count; it records the runner's speed with every run (Lighthouse's `benchmarkIndex`) and the finding, and leaves what to do with the line to the owner.

## What Changes

- **First contentful paint is reported, not gated.** `tools/perf-compare.ts` keeps the row with the baseline, the measurement and the 100 ms limit it will be held to again, marks it `reported`, and never counts it as over, on previews (`preview.yml`) and on production (`e2e.yml`). A note under the table says why and until when. `REPORTED` names the metric, so the re-enable is one edit.
- **The runner's speed is recorded.** `e2e/perf/lighthouse.mts` records Lighthouse's `benchmarkIndex` of the machine for every run (`bench`) and the job's median (`benchmarkIndex`); `tools/perf-compare.ts` prints it under the table. Blocking time scales with it, so a miss on that line can be read against the runner.
- **The gate returns with the shell.** `react-typescript` task 2.7 (budgets on the client manifest) gates first contentful paint again, against the server-rendered shell's first measurement.
- **The record.** `docs/perf/baseline.md` records the decision, the evidence and the blocking time finding, with the options left open.

Out of scope:

- A new tolerance, statistic or run count for total blocking time, and a re-measured baseline: the finding and the options (a same-runner reference, calibrating the CPU slowdown from `benchmarkIndex`, a baseline that includes the sky) are recorded for the owner; none is built here.
- The first contentful paint itself: the server-rendered shell is `react-typescript` phase 2.
- The first-load byte gate (`tools/budget.ts`) and the interaction timings: unchanged.

Affected: no Player and no Mode. This changes a CI check and the table it posts.

## Capabilities

### Modified Capabilities

- `performance-budget`: MODIFIED "Load and interaction times do not regress" (first contentful paint measured and shown, marked reported, not gated until the server-rendered shell; the other tolerances unchanged). The capability is `react-typescript`'s ADDED delta and is not in `openspec/specs/` yet, so `openspec validate --strict` notes that archive would refuse this delta: expected, as for `react-typescript`'s own `read-aloud` delta (its task 11.8). Order: `react-typescript`'s `performance-budget` delta is synced to `openspec/specs/` before this change is archived.

## Impact

- `tools/perf-compare.ts`, `tools/test/perf-compare.test.ts`: the reported row, the notes under the table.
- `e2e/perf/lighthouse.mts`: `bench` per run, `benchmarkIndex` per job.
- `.github/workflows/preview.yml` (the perf job's comment), `docs/agent/build-and-checks.md`.
- `docs/perf/baseline.md`: the decision and the two findings.
- `openspec/changes/react-typescript/tasks.md`: task 2.7 re-enables the gate.
