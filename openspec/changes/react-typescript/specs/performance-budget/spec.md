# Spec Delta

## Purpose

Make sure moving the game to React never makes it slower than it was before the migration: measure today's site once, then fail CI on any growth in first-load size and on any load or interaction time that is worse than the baseline by more than the stated tolerance.

## ADDED Requirements

### Requirement: A baseline from before the migration
The repo SHALL keep `docs/perf/baseline.md` with the numbers of the live site after the move and before the migration, each with its date and the commit measured. A change to the baseline SHALL say why in its pull request.

#### Scenario: Before the first migration PR
- **WHEN** the first code PR of this change is opened
- **THEN** `docs/perf/baseline.md` already holds the numbers for the post-move site

### Requirement: What the baseline measures
The baseline SHALL hold Lighthouse mobile preset results (simulated slow 4G, 4x CPU slowdown, median of 5 runs) for `/play/` first visit and repeat visit, the Arena, Games and one Sutra's Deep dive; the Brotli-compressed size of the JS and CSS a first visit to `/play/` loads before the first tap; and interaction timings for opening the Arena, answering one Arena question, opening a Deep dive and lighting a Star.

#### Scenario: The report
- **WHEN** `docs/perf/baseline.md` is read
- **THEN** it has a value for every page, size and interaction listed here

### Requirement: Size budgets measure Brotli
Every size budget in this change (first load and the 3D code) SHALL be measured as Brotli-compressed bytes, and the baseline's sizes SHALL be recorded the same way.

#### Scenario: The budget table
- **WHEN** the build prints its budget table
- **THEN** every budget line gives its limit and its measurement in Brotli bytes

### Requirement: First load does not grow
The build SHALL measure the Brotli-compressed size of the JS and CSS a first visit to `/play/` loads before the first tap and SHALL fail when either is larger than the baseline. It SHALL print the measurement on every build.

#### Scenario: A heavy import in the shell
- **WHEN** a change makes the shell import a module that brings JS before the first tap above the baseline
- **THEN** `python3 build.py --out _site` fails and names the budget, the size and the largest new module

### Requirement: Load and interaction times do not regress
Every pull request with a preview SHALL measure the pages and interactions of the baseline in the same way, and SHALL fail when a median is worse than the baseline by more than the tolerance: first contentful paint or largest contentful paint by more than 100 ms, total blocking time by more than 25 ms, layout shift above the larger of the baseline and 0.1, or any interaction timing by more than 20 ms.

#### Scenario: A slower Arena answer
- **WHEN** a pull request makes the median time from tapping an Arena answer to the next paint 35 ms slower than the baseline on its preview
- **THEN** the perf check fails on that pull request and shows both numbers

#### Scenario: Production after a deploy
- **WHEN** the same run on production after a deploy misses a budget
- **THEN** an issue is opened with the numbers, and the deploy stays

### Requirement: The 3D chunk has its own budget
The 3D code SHALL stay under 170 KB Brotli (about 200 KB gzip) in total, measured by the build, and SHALL NOT be reachable from the static imports of any page's entry.

#### Scenario: A large drei import
- **WHEN** a change imports a drei helper that brings the 3D code to 180 KB Brotli
- **THEN** the build fails and names the 3D budget

#### Scenario: 3D in the entry
- **WHEN** a change imports a 3D scene statically from the Home view
- **THEN** the build fails because 3D code is in the first load
