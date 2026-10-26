# Spec Delta

## MODIFIED Requirements

### Requirement: Load and interaction times do not regress
Every pull request with a preview SHALL measure the pages and interactions of the baseline on the preview and on production in the same job, page by page on one runner, with the same runs and settings for both, and SHALL fail when the preview's median is worse than production's median of that job by more than the tolerance: total blocking time by more than 25 ms, layout shift above the larger of production's and 0.1, or any interaction timing by more than 20 ms. Largest contentful paint SHALL fail when it is more than 100 ms worse than the baseline, as before, and SHALL be shown with production's median for information: it is a network chain on which the preview host and production differ, while blocking time and the interactions are CPU time, where the runner differs and cancels. The baseline SHALL be shown in the same table for information. First contentful paint SHALL be measured and shown with production's, the baseline's and its 100 ms tolerance, marked reported, and SHALL NOT fail the check until the server-rendered shell is measured (`react-typescript` task 2.7), when it is gated again at 100 ms (owner, 2026-10-23: on today's page Lighthouse's simulated first paint races the module graph, `docs/perf/baseline.md`). Every run SHALL record the measuring machine's CPU speed (Lighthouse's `benchmarkIndex`) for each host with its results and show them with the table, for information. The same run on production after a deploy SHALL measure production and a pinned reference build (one fixed commit of `main`, named with the reason in `docs/perf/baseline.json` and moved only with a reason) in the same job, page by page on one runner, and SHALL count those same limits from the reference's median of that job, with largest contentful paint held to the baseline and first contentful paint reported as on a pull request; when the reference cannot be uploaded it SHALL compare production with the baseline alone and say so with the table. A miss after a deploy SHALL be measured once more, and a second miss SHALL open an issue with the numbers, or comment on the open one; the deploy stays.

#### Scenario: A slower Arena answer
- **WHEN** a pull request makes the median time from tapping an Arena answer to the next paint 35 ms slower than production's median measured in the same job
- **THEN** the perf check fails on that pull request and shows production's number, the preview's and the baseline's

#### Scenario: A slow runner
- **WHEN** a pull request that changes no file a Player downloads is measured on a runner where the Deep dive's blocking time reads 190 ms on production and 191 ms on the preview, against a baseline of 159 ms
- **THEN** the perf check passes, and the table shows the three numbers with the limit of 215 ms

#### Scenario: The preview host's largest contentful paint
- **WHEN** production's largest contentful paint on `/play/` reads 5,340 ms in the job and the preview's 5,460 ms with the same bytes on both hosts, against a baseline of 5,420 ms
- **THEN** the perf check passes, and the table shows the three numbers with the baseline's limit of 5,520 ms

#### Scenario: A slower largest contentful paint than the baseline
- **WHEN** production's largest contentful paint on `/play/` reads 5,600 ms in the job and the preview's 5,550 ms, against a baseline of 5,420 ms
- **THEN** the perf check fails on that line, as the preview is more than 100 ms slower than the baseline, and the table says the limit is the baseline's

#### Scenario: A slower first contentful paint alone
- **WHEN** a pull request's preview reads a median first contentful paint 400 ms above production's and the baseline's on Games while its largest contentful paint, blocking time, layout shift and every interaction are within tolerance
- **THEN** the perf check passes, and the table shows the Games first contentful paint row with the three numbers, its 100 ms limit and the word reported

#### Scenario: Production after a deploy on a slow runner
- **WHEN** after a deploy that changes no file a Player downloads, the Deep dive's blocking time reads 196 ms on production and 190 ms on the pinned reference in the same job, against a baseline of 159 ms
- **THEN** no issue is opened, and the table shows the reference's, production's and the baseline's numbers with the limit of 215 ms

#### Scenario: A regression that reaches production
- **WHEN** after a deploy the repeat visit's blocking time on `/play/` reads 30 ms above the pinned reference's in the same job, and again when measured once more
- **THEN** an issue is opened with the numbers, or the open one gets a comment, and the deploy stays

#### Scenario: Small regressions that add up
- **WHEN** several deploys each add 10 ms to the Deep dive's blocking time, each within its pull request's tolerance against production, until production reads 30 ms above the pinned reference in the same job
- **THEN** the check after the deploy that passes the tolerance opens an issue, until the pin is moved with a reason or the time is won back

#### Scenario: The reference cannot be uploaded
- **WHEN** the pinned reference cannot be uploaded after a deploy
- **THEN** production is compared with the baseline alone, as before, and the notes under the table say the reference was not measured
