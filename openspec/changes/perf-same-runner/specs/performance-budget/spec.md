# Spec Delta

## MODIFIED Requirements

### Requirement: Load and interaction times do not regress
Every pull request with a preview SHALL measure the pages and interactions of the baseline on the preview and on production in the same job, page by page on one runner, with the same runs and settings for both, and SHALL fail when the preview's median is worse than production's median of that job by more than the tolerance: total blocking time by more than 25 ms, layout shift above the larger of production's and 0.1, or any interaction timing by more than 20 ms. Largest contentful paint SHALL fail when it is more than 100 ms worse than the baseline, as before, and SHALL be shown with production's median for information: it is a network chain on which the preview host and production differ, while blocking time and the interactions are CPU time, where the runner differs and cancels. The baseline SHALL be shown in the same table for information. First contentful paint SHALL be measured and shown with production's, the baseline's and its 100 ms tolerance, marked reported, and SHALL NOT fail the check until the server-rendered shell is measured (`react-typescript` task 2.7), when it is gated again at 100 ms (owner, 2026-10-23: on today's page Lighthouse's simulated first paint races the module graph, `docs/perf/baseline.md`). Every run SHALL record the measuring machine's CPU speed (Lighthouse's `benchmarkIndex`) for each host with its results and show them with the table, for information. The same run on production after a deploy, which has no second host, SHALL compare production with the baseline.

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

#### Scenario: Production after a deploy
- **WHEN** the same run on production after a deploy misses a budget against the baseline
- **THEN** an issue is opened with the numbers, and the deploy stays
