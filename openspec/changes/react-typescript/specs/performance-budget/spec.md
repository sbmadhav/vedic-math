# Spec Delta

## Purpose

Make sure moving the game to React never makes it slower than it was before the migration: measure today's site once, then fail CI on any growth in first-load size and on any load or interaction time that is worse than the baseline by more than the stated tolerance.

## ADDED Requirements

### Requirement: A baseline from before the migration
The repo SHALL keep `docs/perf/baseline.md` with the numbers of the live site after the move and before the migration, each with its date and the commit measured, measured and merged before the first pull request that changes what a Player downloads, and at the latest before the first pull request of the server-rendered shell. A change to the baseline SHALL say why in its pull request.

#### Scenario: Before the first migration PR
- **WHEN** the first pull request of the server-rendered shell is opened
- **THEN** `docs/perf/baseline.md` is already on `main` with the numbers for the post-move site

### Requirement: What the baseline measures
The baseline SHALL hold Lighthouse mobile preset results (simulated slow 4G, 4x CPU slowdown, median of 5 runs) for `/learn/` first and repeat visit, the Arena, Games and one Deep dive, with time to first byte; the Brotli-compressed size of everything a first visit to `/learn/` requests before the first tap, including every file the service worker's install downloads; and interaction timings for opening the Arena, answering one Arena question, opening a Deep dive and lighting a Star.

#### Scenario: The report
- **WHEN** `docs/perf/baseline.md` is read
- **THEN** it has a value for every page, size and interaction listed here

### Requirement: Size budgets measure Brotli
Every size budget in this change (first load and the 3D code) SHALL be measured as Brotli-compressed bytes, and the baseline's sizes SHALL be recorded the same way.

#### Scenario: The budget table
- **WHEN** the build prints its budget table
- **THEN** every budget line gives its limit and its measurement in Brotli bytes

### Requirement: First load does not grow
The build SHALL measure the Brotli-compressed size of everything a first visit to `/learn/` requests before the first tap: the page, its JS and CSS, fonts, icons and other files, and every file the service worker's install downloads (counted even when install ends after the tap), each unique file once. It SHALL fail when the total is larger than the baseline, and SHALL print the measurement on every build.

#### Scenario: A heavy import in the shell
- **WHEN** a change makes the shell import a module that brings JS before the first tap above the baseline
- **THEN** `python3 build.py --out _site` fails and names the budget, the size and the largest new module

#### Scenario: A large file added to the precache
- **WHEN** a change adds a file to the worker's precache list that brings the first visit above the baseline
- **THEN** `python3 build.py --out _site` fails and names the budget, the size and that file

### Requirement: Load and interaction times do not regress
Every pull request with a preview SHALL measure the pages and interactions of the baseline in the same way, and SHALL fail when a median is worse than the baseline by more than the tolerance: first contentful paint or largest contentful paint by more than 100 ms, total blocking time by more than 25 ms, layout shift above the larger of the baseline and 0.1, or any interaction timing by more than 20 ms.

#### Scenario: A slower Arena answer
- **WHEN** a pull request makes the median time from tapping an Arena answer to the next paint 35 ms slower than the baseline on its preview
- **THEN** the perf check fails on that pull request and shows both numbers

#### Scenario: Production after a deploy
- **WHEN** the same run on production after a deploy misses a budget
- **THEN** an issue is opened with the numbers, and the deploy stays

### Requirement: The 3D chunk has its own budget
The 3D code SHALL stay under 170 KB Brotli (about 200 KB gzip) in total, measured by the build as the sum of the Brotli sizes of the unique files it emits for the whole 3D dependency graph (three.js, React Three Fiber, drei and the scenes, across every chunk they land in). No 3D module SHALL be reachable from the static imports of any page's entry.

#### Scenario: A large drei import
- **WHEN** a change imports a drei helper that brings the 3D code to 180 KB Brotli
- **THEN** the build fails and names the 3D budget

#### Scenario: 3D split over several chunks
- **WHEN** the build splits the 3D code into a 100 KB Brotli chunk for three and React Three Fiber and two 40 KB Brotli scene chunks
- **THEN** the 3D line of the budget table reads 180 KB and the build fails

#### Scenario: 3D in the entry
- **WHEN** a change imports a 3D scene statically from the Home view
- **THEN** the build fails because 3D code is in the first load

### Requirement: First load is read from the client manifest
From the server-rendered shell on, the build SHALL read the first visit's JS and CSS from the client build's manifest (the entry, the root route and the first route, with their static imports). The server's own code SHALL NOT count toward first load, because a browser never downloads it.

#### Scenario: A server-only dependency
- **WHEN** a change adds a library used only by the Worker
- **THEN** the first-load line of the budget table does not change, and the Worker line does

### Requirement: The server code stays within the Worker's limits
The build SHALL measure the uncompressed size of the Worker bundle (the server render, the API and the Durable Objects), the measure Cloudflare's Worker size limit uses, and SHALL fail when it is above 75% of that limit. It SHALL print the compressed size for information only. No 3D module and no client-only module SHALL be in it.

#### Scenario: A large dependency on the server
- **WHEN** a change makes a route module import a library that brings the Worker bundle above 75% of the limit
- **THEN** `python3 build.py --out _site` fails and names the Worker budget and the size

### Requirement: Server-rendered pages are measured too
The performance checks SHALL measure at least one server-rendered page (the Arena at its path) with the same Lighthouse settings and tolerances as the other pages, including time to first byte, and SHALL print the server's CPU time per render.

#### Scenario: A slow server render
- **WHEN** a pull request makes the first contentful paint of the server-rendered Arena 150 ms slower than the baseline's Arena on its preview
- **THEN** the perf check fails on that pull request and shows both numbers
