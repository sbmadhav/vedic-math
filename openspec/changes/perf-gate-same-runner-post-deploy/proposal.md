# Proposal

Status: built (the ideas sweep of 2026-10-30 builds the approved changes in `openspec/changes/`; owner, 2026-10-29). The calls made while building are under "Calls made while building" in `design.md`.

## Why

Since `perf-same-runner` (#139), a pull request's perf job measures production and the preview in the same job, so the runner's CPU speed moves both and cancels. The check on production after each deploy (the `perf` job of `e2e.yml`) has no second host, so it still compares production with `docs/perf/baseline.json`, and its CPU-bound lines move with the runner:

- **The Deep dive's total blocking time:** baseline 159 ms (2026-10-21, a runner whose speed was not recorded), limit 184 ms. On the slow runners of 24 and 25 October (Lighthouse `benchmarkIndex` about 2,480) production read 169 to 200 ms; on the fast ones of the 2026-10-26 re-measure (3,003 to 4,075) 102 to 138 ms; #134's job on a fast runner (4,177) 89 ms and #139's production side on a slow one (2,458) 198 ms. The code did not change between those numbers; the runner did.
- **It already misses.** The post-deploy comments on #117 include two blocking time misses on slow runners that no pull request caused: `/play/` repeat visit 70 against 67 ms (`benchmarkIndex` 2,487, after `3963615`) and 80 against 67 ms (2,481, after `bd4c0b6`). On the same kind of runner the Deep dive read 177 and 181 against 184.
- `docs/perf/baseline.md` ("Re-measured on 2026-10-26") kept blocking time and the interactions on the 2026-10-21 run for this reason and left this line open, with the two options `perf-gate-fcp` recorded: a same-runner reference or a CPU calibration for the post-deploy check. #117 stays open for it.

So an issue opened by the post-deploy check after a slow runner says nothing about the code, and a real regression on a fast runner can pass under a limit set on a slower one.

## What Changes

- **A pinned reference build.** A build of one fixed commit of `main`, named in `docs/perf/baseline.json` (`reference.commit`, with the date and the reason), is uploaded as a Worker version with the preview alias `perf-ref` on workers.dev, as previews are, with the same voice mode as production.
- **Measured in the same job as production.** After a deploy, the `perf` job of `e2e.yml` measures https://learnvedicmath.com and the reference page by page on one runner, with the same 5 runs, settings and fixed server latency, the hosts' order swapping on each page, and the interaction timings on both (the machinery `perf-same-runner` built for previews: `e2e/perf/lighthouse.mts`, `e2e/perf/interleave.mts`).
- **CPU lines count from the reference.** `tools/perf-compare.ts` counts total blocking time (+25 ms), layout shift (above the larger of the reference's and 0.1) and every interaction (+20 ms, or the noise the baseline records) from the reference's median of this job, exactly as a pull request counts them from production. So the check asks "is production slower than the pinned code, on this runner", which is what the baseline means, with the runner cancelled.
- **The rest as today.** Largest contentful paint stays held to the baseline plus 100 ms (the reference is on workers.dev, a different network chain from the custom domain, as for previews); first contentful paint stays reported; a miss is measured once more before an issue, and one open issue collects the misses. The table gains a Reference column (with the commit) and the baseline stays for information.
- **The pin moves only with a reason**, as the baseline's timings do ("When the baseline changes"): a pull request that moves `reference.commit` says why in `docs/perf/baseline.md`. Small regressions that each passed a pull request's gate add up against the pin, and the post-deploy check reports them when the sum passes the tolerance; moving the pin is how the owner accepts them.
- **Pull request previews: unchanged.** `preview.yml`'s perf job keeps production as its reference and every rule of `perf-same-runner`.

Out of scope:

- **Largest contentful paint after a deploy.** Most of #117's comments are this line (since #129 and #133 deployed, the Deep dive read 5,880 to 6,060 against 5,860 ms; `/play/` first visit 5,670 against 5,650 after `32edc9f`). It is a network chain, not CPU time, and needs its own decision (a re-measure, or measuring production through its own workers.dev URL so the reference compares on the same host: design D5). This change leaves it as it is and says so in the record.
- The tolerances, the statistic (the median of 5), the 4x CPU slowdown and the baseline's numbers.
- The byte budget (`build.py`, `tools/budget.ts`) and `perf.yml`.

Affected: no Player and no Mode. This changes a CI check after a deploy, the issue it opens and the table in it.

## Capabilities

### Modified Capabilities

- `performance-budget`: MODIFIED "Load and interaction times do not regress", on top of `perf-same-runner`'s delta (the run on production after a deploy is compared with the pinned reference measured in the same job, not with the baseline alone; scenario "Production after a deploy" replaced). As for `perf-gate-fcp` and `perf-same-runner`, the capability is still `react-typescript`'s ADDED delta and is not in `openspec/specs/` yet, so `openspec validate --strict` notes that archive would refuse this delta: expected. Order: `react-typescript`'s delta, then `perf-gate-fcp`'s, then `perf-same-runner`'s, are synced to `openspec/specs/` before this change is archived.
- `deploy-pipeline`: MODIFIED "Production and preview credentials are separate" (the preview token also uploads the pinned reference, from `e2e.yml`'s `reference` job in the `preview` environment, in a workflow with no pull request trigger; scenario "The pinned performance reference after a deploy" added; design C2). The capability is still `learnvedicmath`'s ADDED delta, so the same validate note applies, and that delta is synced first.

## Impact

- `.github/workflows/e2e.yml` (a `reference` job in the `preview` environment that builds and uploads the reference; the `perf` job: measuring both hosts, the compare step, the fallback and the issue text; a `perf_only` input for a run by hand: design C1 and C3).
- `tools/check-workflow-secrets.mjs` and `test/workflow-secrets.test.mjs` (the preview token's second allowed place: design C2).
- `e2e/perf/lighthouse.mts` and `tools/perf-compare.ts` (the reference option named for what it is, so production can be either side: design D4), `tools/test/perf-compare.test.ts`.
- `docs/perf/baseline.json` (`reference`), `docs/perf/baseline.md` ("The post-deploy reference"), `docs/agent/build-and-checks.md`.
- Owner: allow `main` to use the `preview` environment if its deployment branches are limited (design D3). On 2026-10-30 the environment allowed protected branches only, and the repository had no classic branch protection rule (`main` is protected by a ruleset), in which case GitHub lets every branch use it: pull request branches upload previews today, and `main` can too.
- Job time: about 5 and a half minutes more Lighthouse and interaction time than today (`perf-same-runner`'s measured cost for two hosts), plus the reference's build and upload; the job blocks nothing, as the deploy is already live.
