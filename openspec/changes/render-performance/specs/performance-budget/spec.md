# Spec Delta

## Purpose

Keep Vedic Math fast on the phones and tablets children actually use: measure on a mid Android phone over 4G, hold every page to written budgets, and fail CI on a regression.

## ADDED Requirements

### Requirement: A measured baseline
The repo SHALL keep a performance report (`docs/perf/baseline.md`) with lab results for `/`, `/parents/`, `/play/` (first visit and repeat visit), `/play/#/arena` and `/play/#/games` under the Lighthouse mobile preset (Moto G Power class device, simulated slow 4G, 4x CPU slowdown), results from a real mid Android phone, and the field p75 Core Web Vitals from Cloudflare Web Analytics, each with its date. A change to a budget SHALL update this report in the same pull request.

#### Scenario: Before the first optimisation
- **WHEN** the first code task of this change is started
- **THEN** `docs/perf/baseline.md` already holds the lab and real-device numbers for today's site

### Requirement: JS and CSS byte budgets
The build SHALL measure the Brotli size of everything a first visit to `/play/` loads before the Player's first tap, and SHALL fail when that JS is over 150 KB, that CSS is over 40 KB, the JS of any landing or grown-up page is over 15 KB, or the graph of any one route is over 80 KB. It SHALL print the measurements on every build.

#### Scenario: A large module is added to the entry graph
- **WHEN** a change makes `js/app.js` statically import a module that pushes JS before play to 152 KB compressed
- **THEN** `python3 build.py --out _site` fails and names the budget and the size

#### Scenario: A route grows
- **WHEN** a change brings the Arena route's own graph to 85 KB compressed
- **THEN** the build fails and names the Arena route

### Requirement: Timing budgets on every pull request
Every pull request with a preview SHALL run Lighthouse with the mobile preset, five runs per page, on `/`, `/parents/`, `/play/`, `/play/#/arena` and `/play/#/games`, and SHALL fail when the median first contentful paint is 1.5 s or more, largest contentful paint is 2.5 s or more, cumulative layout shift is over 0.1, or total blocking time is over 200 ms on any of them.

#### Scenario: A slow change
- **WHEN** a pull request makes the median first contentful paint of `/play/` 1.7 s on its preview
- **THEN** the perf check fails on that pull request

#### Scenario: Production after a deploy
- **WHEN** the same run on production after a deploy finds a budget missed
- **THEN** an issue is opened with the numbers, and the deploy itself stays

### Requirement: Growth is reported
The perf check SHALL compare the byte measurements of a pull request with `main` and comment on the pull request when JS or CSS before play grows by more than 5 KB, even within budget.

#### Scenario: A 7 KB increase
- **WHEN** a pull request adds 7 KB of compressed JS before play
- **THEN** the pull request gets a comment showing the old size, the new size and the module that grew
