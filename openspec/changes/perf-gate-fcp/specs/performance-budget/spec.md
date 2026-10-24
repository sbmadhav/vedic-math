# Spec Delta

## MODIFIED Requirements

### Requirement: Load and interaction times do not regress
Every pull request with a preview SHALL measure the pages and interactions of the baseline in the same way, and SHALL fail when a median is worse than the baseline by more than the tolerance: largest contentful paint by more than 100 ms, total blocking time by more than 25 ms, layout shift above the larger of the baseline and 0.1, or any interaction timing by more than 20 ms. First contentful paint SHALL be measured and shown in the same table with the baseline, the measurement and its 100 ms tolerance, marked reported, and SHALL NOT fail the check until the server-rendered shell is measured (`react-typescript` task 2.7), when it is gated again at 100 ms (owner, 2026-10-23: on today's page Lighthouse's simulated first paint races the module graph, `docs/perf/baseline.md`). Every run SHALL record the measuring machine's CPU speed (Lighthouse's `benchmarkIndex`) with its results and show it with the table, for information.

#### Scenario: A slower Arena answer
- **WHEN** a pull request makes the median time from tapping an Arena answer to the next paint 35 ms slower than the baseline on its preview
- **THEN** the perf check fails on that pull request and shows both numbers

#### Scenario: A slower first contentful paint alone
- **WHEN** a pull request's preview reads a median first contentful paint 400 ms above the baseline on Games while its largest contentful paint, blocking time, layout shift and every interaction are within tolerance
- **THEN** the perf check passes, and the table shows the Games first contentful paint row with both numbers, its 100 ms limit and the word reported

#### Scenario: Production after a deploy
- **WHEN** the same run on production after a deploy misses a budget
- **THEN** an issue is opened with the numbers, and the deploy stays
