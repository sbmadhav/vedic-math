# Design

## Context

- **Today after a deploy** (`e2e.yml`, job `perf`, needs `deploy` and `e2e`): one host, https://learnvedicmath.com, measured with `e2e/perf/lighthouse.mts` (5 runs a page, `tools/lighthouserc.json`, the fixed 30 ms server latency) and `e2e/perf/interactions.ts` (4x CPU, 5 runs), compared by `tools/perf-compare.ts` with `docs/perf/baseline.json`. A miss runs everything once more; a second miss comments on the open "Performance budget missed on production" issue (#117) or opens one. The deploy stays.
- **On a pull request** (`preview.yml`, job `perf`, `perf-same-runner`): the preview and production in the same job, page by page with the hosts' order swapping (`--production`, `e2e/perf/interleave.mts`); limits from production's median for blocking time, layout shift and the interactions; largest contentful paint from the baseline (`ABSOLUTE`), first contentful paint reported (`REPORTED`). Its cost: about 11 min a job without a re-measure, against about 5 for one host.
- **Why the CPU lines move:** under simulated throttling blocking time is the observed task time times 4, so it follows the runner's CPU. GitHub's `ubuntu-latest` runners differ about two to one (`benchmarkIndex` 2,373 to 4,177 in the recorded jobs). Blocking time counts only the part of each task over 50 ms, so it moves more than the CPU does: the Deep dive read 89 ms at 4,177 and 198 ms at 2,458, a ratio of 2.2 for a CPU ratio of 1.7.
- **Previews are Worker versions** with a preview alias (`wrangler versions upload --preview-alias pr-<n>`, `preview_urls: true` in `wrangler.jsonc`), uploaded with `CLOUDFLARE_PREVIEW_TOKEN` from the `preview` environment.

## Decisions

### D1. The reference: a pinned build measured on the same runner

Options weighed:
- (a) **A pinned reference build** (one fixed commit of `main`, uploaded at a stable alias), measured in the same job as production. The runner cancels as it does on pull requests, and the reference does not move with each deploy, so the check still asks what the baseline asks (has production grown past a fixed point), including small regressions that each passed a pull request's gate. Cost: a second host in the job, a build and an upload, and the preview token in the post-deploy job.
- (b) **The previous deploy as the reference** (the commit before this push, built and uploaded at an alias). The runner cancels too, but the reference moves with every deploy, so the check only sees the step this deploy added: the pull request gate already measured that step against production, so this repeats it and never sees a slow creep. It catches only a merge that differs from what its pull request measured.
- (c) **Scale the CPU lines by `benchmarkIndex`**: limit = baseline × (the baseline's index / this run's index) + tolerance. No extra host or minute. But the baseline run recorded no index, so the baseline's CPU lines would be re-measured first; blocking time is not proportional to the index (above: 2.2 against 1.7, through the 50 ms threshold), so each page needs its own fitted curve from a handful of jobs; and the index itself varies run to run within a job. A limit built on a fit of a few points is a new statistic the spec would have to describe and defend.
- (d) **Calibrate the CPU slowdown per run from `benchmarkIndex`** (Lighthouse's throttling guide: choose the multiplier that brings the machine to a target index). Every number then means "this phone" whatever the runner, but it replaces the spec's 4x, moves every timing on pull requests too (which this change must not), needs the whole baseline re-measured, and rests on the same rough index.
- (e) **Report the CPU lines after a deploy instead of gating them**, or widen their tolerance there. Cheapest, and it ends the noise, but a real regression that reaches production (a merge that skipped or raced the gate) would go unseen on that line.

Chosen: (a). It is the same idea the owner chose for pull requests (`perf-same-runner`), with the same scripts and rules, and the only one that cancels the runner while keeping the baseline's meaning. (b) is the fallback if keeping a pinned version alive proves fragile (D3).

### D2. Which commit is pinned

Options weighed:
- (a) **`main` when this change is built**, recorded in `baseline.json` (`reference.commit`, date, reason) and moved only with a reason, like the baseline's timings. The commit named is the `main` tip the pull request is last merged with before it lands (its base), not its own merge commit, which does not exist yet when `baseline.json` is written. That is the same game: the pull request changes CI, tools and docs only, none of the files a Player downloads, so production after the merge serves what the reference builds. The pull request is brought up to date with `main` right before it lands, so no other merge sits between the two. The first post-deploy check then compares production with the same code, so it starts green, and anything later counts from there.
- (b) The commit the baseline's blocking time describes (`1401890`, 2026-10-21). Exactly the baseline's code, but it predates the sky, the Install guide, Try a trick, the Family helpers and Sutras first, which the pull request gates accepted; the first check would likely miss on work the owner already took.

Chosen: (a). When the pin moves, `baseline.md` records the commit, the reason and, for information, the reference's medians on the job that moved it.

### D3. Keeping the reference uploaded

Options weighed:
- (a) **Build and upload it in every post-deploy job**: check out `reference.commit` into a second directory, `python3 build.py --preview` with production's voice mode, `wrangler versions upload --preview-alias perf-ref` from `deploy/`. Always the pinned code, never stale, no state to look after; costs a build and an upload each time (measured in task 1.3) and one more Worker version per deploy, as each pull request push already adds.
- (b) Upload once when the pin moves, and have the job check that the alias still answers with the pinned build. No upload most of the time, but the check needs a build stamp to compare, and a version that ages out or an alias moved by hand makes the job fail for reasons unrelated to the code.

Chosen: (a). The upload uses `CLOUDFLARE_PREVIEW_TOKEN`, so the job runs in the `preview` environment; the production token is not needed or reachable. If the owner limited that environment's deployment branches to pull requests, `main` is added (owner task 1.1). If the reference cannot be uploaded, the job falls back to today's comparison with the baseline alone and says so in the table's notes, so a Cloudflare problem never hides a regression and never opens a false issue by itself.

### D4. The same rules as pull requests, with the reference named for what it is

`tools/perf-compare.ts --production <lighthouse.json> <interactions.json>` already counts limits from a second host. The option is renamed `--reference` (with `--production` kept as its other name, so `preview.yml` is untouched or changed only in name) and takes `--reference-label`, which names the column: "Production" on a pull request, "Reference (`<commit>`)" after a deploy, where production is the measured side. `e2e/perf/lighthouse.mts` gets the same rename. The rules do not change: blocking time, layout shift and interactions from the reference, largest contentful paint from the baseline (`ABSOLUTE`), first contentful paint reported. The issue's text says production was compared with the pinned reference measured in the same job, with the baseline for information, and prints both hosts' `benchmarkIndex`.

### D5. Largest contentful paint stays on the baseline

Options weighed:
- (a) **Keep it on the baseline, as on pull requests.** The reference is on workers.dev and production on the custom domain, and the two differ on the network chain (60 to 150 ms on a cold first visit with the same bytes, `docs/perf/baseline.md`, "The same-runner reference").
- (b) Measure production through its own version's workers.dev URL as well, so production and the reference compare on the same host and largest contentful paint can count from the reference too. A third host in the job (about 5 more minutes), and the custom domain, which is what Players load, would still need its own line.

Chosen: (a), for this change. Most of #117's comments are this line, so it is recorded as the open item in the record and the proposal, with (b) and a re-measure as the options for a later decision.

## Risks

- **Two hosts in one job take longer.** About 11 min without a re-measure and 18 with one, inside the job's 40 min limit, as `perf-same-runner` measured; nothing waits for it.
- **The pin goes stale on purpose.** As pull requests add accepted work, production drifts from the pin until the check reports it; that issue is the signal to move the pin with a reason, not a fault.
- **The reference's own build changes.** A later `wrangler` or Cloudflare runtime change could move the reference and production alike; both are measured on it in the same job, so it cancels.
