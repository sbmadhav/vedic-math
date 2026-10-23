# Proposal

## Why

The perf gate (`react-typescript` task 1.8, performance-budget spec; openspec change `perf-gate-fcp`) compares a pull request's preview with `docs/perf/baseline.json`, measured once on a GitHub runner on 2026-10-21. #134 (`perf-gate-fcp`, 2026-10-23) found that the runner is the variable the gate cannot see. The Deep dive's total blocking time on identical code read 92, 134, 163, 164, 169, 169, 170, 176, 179, 184 and 191 ms across the eleven perf jobs after #130 merged, against a baseline of 159 and a limit of 184. The five runs of one job agree within 9 to 26 ms, so the median of 5 is not the problem: the job moves, and every page moves with it (the fastest job read 25 / 9 / 27 / 15 / 92 ms for `/play/` first, repeat, the Arena, Games and the Deep dive, the slowest 52 / 54 / 63 / 70 / 191, the baseline 46 / 42 / 57 / 61 / 159). Under simulated throttling blocking time is the observed task time times the 4x slowdown, so it scales with the runner's own CPU, and GitHub's runners differ by about two to one; since #134 every run records Lighthouse's `benchmarkIndex`, and #134's own job, on a fast runner (4,177), measured the Deep dive at 89 ms. The Deep dive's limit is 16% above a baseline measured before the sky existed, and the sky still costs the page about 10 ms, so a pull request that changes nothing a Player downloads fails that line when it lands on a slow runner (#125, 191 against 184; #123 at the limit) and passes on a fast one. #134 recorded three options for the owner and built none: a same-runner reference, calibrating the CPU slowdown from `benchmarkIndex`, or re-measuring the baseline with the sky (which leaves 25 ms against a runner effect of about 50 ms either way).

This change builds the first. The quantity the gate wants is the regression the pull request adds, and production (what `main` deploys) measured on the same runner minutes apart is that reference: the runner's speed moves both hosts the same way and cancels, with no new tolerance, statistic, run count or baseline number.

## What Changes

- **Production is measured in the same job.** The preview's perf job (`preview.yml`) measures https://learnvedicmath.com and the preview page by page: every page of `tools/lighthouserc.json` on each host in turn, the same 5 runs, the same Lighthouse settings and the same fixed server latency (`e2e/perf/lighthouse.mts --production <url> --production-json <file>`); the hosts' order swaps on each page so neither always goes first (`e2e/perf/interleave.mts`). The interaction timings run against production and then the preview; both hosts' results go in the artifact.
- **Limits count from production.** `tools/perf-compare.ts --production` counts each tolerance from production's median of this job: total blocking time +25 ms, layout shift above the larger of production's and 0.1, interactions +20 ms (or the noise the baseline records), so the gate fails on the regression the pull request adds and passes a slow runner that moves both hosts. The baseline stays in the table for information, in its own column; the table gains a Production column, and the notes say what the limits count from and print both hosts' `benchmarkIndex`.
- **Largest contentful paint keeps its absolute gate.** It is held to production +100 ms and to the baseline +100 ms (`ABSOLUTE`); the smaller limit binds and the table says `(baseline)` when that one does. The byte budget (`build.py`, `tools/budget.ts`) is unchanged. First contentful paint stays reported (`perf-gate-fcp`).
- **A miss re-measures only what missed.** A Lighthouse miss re-measures the pages on both hosts; an interaction miss re-measures the interactions on both; the first run's results stay in the artifact (`results/first`).
- **Production after a deploy is unchanged.** `e2e.yml` compares production with the baseline as before: there is no second host to measure. `perf-compare.ts` without `--production` behaves as today.
- **The record.** `docs/perf/baseline.md` ("The same-runner reference"), `docs/agent/build-and-checks.md`, the workflows' comments.

**Job time.** Before, #134's perf job took 14 min 4 s: 8 min 43 s installing the e2e package and chromium on that runner, 3 min 27 s of Lighthouse, 1 min 42 s of interaction timings; the whole job is 5 to 14 min across recent runs, mostly the install. Lighthouse and the interactions now take twice as long (about 7 and 3.5 min), so a job costs about 5 min more; the first job of this change is recorded in `tasks.md` 3.2. A re-measure adds one kind again (about 7 or 3.5 min), so the worst case with a slow install is about 30 min, inside the job's 40 min limit.

Out of scope:

- The two other options: calibrating the CPU slowdown from `benchmarkIndex` and a re-measured baseline with the sky. Neither is needed for the pull request gate once the runner cancels; both stay open for the production check after a deploy, which has no second host.
- The tolerances, the statistic (the median of 5) and the baseline's numbers: unchanged.
- Gating first contentful paint: `react-typescript` task 2.7.

Affected: no Player and no Mode. This changes a CI check and the table it posts.

## Capabilities

### Modified Capabilities

- `performance-budget`: MODIFIED "Load and interaction times do not regress", on top of `perf-gate-fcp`'s delta (the limits count from production measured in the same job; largest contentful paint also held to the baseline; the baseline shown for information; production after a deploy compared with the baseline as before). As for `perf-gate-fcp`, the capability is still `react-typescript`'s ADDED delta and is not in `openspec/specs/` yet, so `openspec validate --strict` notes that archive would refuse this delta: expected. Order: `react-typescript`'s `performance-budget` delta, then `perf-gate-fcp`'s, are synced to `openspec/specs/` before this change is archived.

## Impact

- `e2e/perf/lighthouse.mts` (`--production`, `--production-json`), `e2e/perf/interleave.mts` (new), `tools/test/interleave.test.ts` (new).
- `tools/perf-compare.ts` (`--production`, `ABSOLUTE`, the Production column, the notes), `tools/test/perf-compare.test.ts`.
- `.github/workflows/preview.yml` (the perf job), `.github/workflows/e2e.yml` (its comment).
- `docs/perf/baseline.md`, `docs/agent/build-and-checks.md`.
