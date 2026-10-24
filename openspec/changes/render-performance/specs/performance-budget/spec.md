# Spec Delta

Builds on `react-typescript`'s `performance-budget` (no regression against the baseline) with the owner's absolute budgets (M5, 2026-10-17): under 150 KB of Brotli JS before play and first contentful paint under 1.5 s on a mid phone over 4G.

## MODIFIED Requirements

### Requirement: What the baseline measures
The baseline SHALL hold Lighthouse mobile preset results (simulated slow 4G, 4x CPU slowdown, median of 5 runs) for `/learn/` first and repeat visit, the Arena, Games and one Deep dive, with time to first byte, and for the landing page `/` and the grown-up page `/parents/`; the Brotli-compressed size of everything a first visit to `/learn/` requests before the first tap, including every file the service worker's install downloads, and, within it, the JS and CSS the page itself requests before the first tap; and interaction timings for opening the Arena, answering one Arena question, opening a Deep dive and lighting a Star. It SHALL also hold WebPageTest real-device results (a Moto G class phone, 4G profile, first and repeat view) for `/`, `/learn/` and `/learn/arena`, a recording from a real mid Android phone (`/learn/` first visit, opening the Arena, a Star round, the Sky scrolled), and the field p75 Core Web Vitals from Cloudflare Web Analytics, each with its date.

#### Scenario: The report
- **WHEN** `docs/perf/baseline.md` is read
- **THEN** it has a value for every page, size and interaction listed here, and the real-device and field numbers with their dates

#### Scenario: Before the first optimisation
- **WHEN** the first code task of `render-performance` is started
- **THEN** `docs/perf/baseline.md` already holds the lab, real-device and field numbers of the game at `/learn/` after the move to React

### Requirement: First load does not grow
The build SHALL measure the Brotli-compressed size of everything a first visit to `/learn/` requests before the first tap: the page, its JS and CSS, fonts, icons and other files, and every file the service worker's install downloads (counted even when install ends after the tap), each unique file once. It SHALL fail when the total is larger than the ceiling recorded in `docs/perf/baseline.json`, and SHALL print the measurement on every build. A pull request that lowers the total SHALL lower the recorded ceiling to its new measurement in the same pull request, with the reason; the ceiling SHALL be raised only by a pull request that says why.

#### Scenario: A heavy import in the shell
- **WHEN** a change makes the shell import a module that brings JS before the first tap above the ceiling
- **THEN** `python3 build.py --out _site` fails and names the budget, the size and the largest new module

#### Scenario: A large file added to the precache
- **WHEN** a change adds a file to the worker's precache list that brings the first visit above the ceiling
- **THEN** `python3 build.py --out _site` fails and names the budget, the size and that file

#### Scenario: An improvement is kept
- **WHEN** a pull request removes the Play experiences from the precache and the first-load total drops by 200 KB
- **THEN** the same pull request records the new total as the ceiling, and a later pull request that adds 100 KB back fails the build

### Requirement: Load and interaction times do not regress
Every pull request with a preview SHALL measure the pages and interactions of the baseline in the same way, and SHALL fail when a median is worse than the baseline by more than the tolerance: first contentful paint or largest contentful paint by more than 100 ms, total blocking time by more than 25 ms, layout shift above the larger of the baseline and 0.1, or any interaction timing by more than 20 ms. A pull request that improves a median beyond its tolerance SHALL record the new median in the baseline in the same pull request, so later pull requests are compared with it.

#### Scenario: A slower Arena answer
- **WHEN** a pull request makes the median time from tapping an Arena answer to the next paint 35 ms slower than the baseline on its preview
- **THEN** the perf check fails on that pull request and shows both numbers

#### Scenario: Production after a deploy
- **WHEN** the same run on production after a deploy misses a budget
- **THEN** an issue is opened with the numbers, and the deploy stays

#### Scenario: A faster first paint is kept
- **WHEN** a pull request brings the median first contentful paint of `/learn/` from 1,900 ms to 1,400 ms
- **THEN** it records 1,400 ms in the baseline, and a later pull request measuring 1,550 ms fails

## ADDED Requirements

### Requirement: What counts as before play
Within the first load, JS and CSS before play SHALL be what the page itself requests before the first tap: the document's scripts and styles, every module its `modulepreload` links name, and whatever is prefetched at idle, without the files only the service worker's install downloads. The build SHALL measure it in Brotli bytes for both a first visit (the prerendered Mode picker) and a returning Player's Home, and print it on every build.

#### Scenario: The install is not before play
- **WHEN** a change adds a file that only the worker's install downloads
- **THEN** the JS before play line does not change, and the first-load total does

### Requirement: Byte budgets before play
The build SHALL fail when JS before play is over 150 KB Brotli, CSS before play is over 40 KB, the JS of any landing or grown-up page is over 15 KB, or the chunks of any one route that are not in the entry or the root route are over 80 KB. It SHALL print each of these lines on every build.

#### Scenario: A large module in the entry
- **WHEN** a change makes the root route import a module that brings JS before play to 152 KB Brotli
- **THEN** `python3 build.py --out _site` fails and names the budget, the size and the module

#### Scenario: A route grows
- **WHEN** a change brings the Arena route's own chunks to 85 KB Brotli
- **THEN** the build fails and names the Arena route

#### Scenario: A landing page script
- **WHEN** a change adds a 20 KB script to `/parents/`
- **THEN** the build fails and names the page

### Requirement: Absolute timing budgets
Every pull request with a preview SHALL run the baseline's Lighthouse pages and SHALL fail when, on any of them, the median first contentful paint is 1.5 s or more, largest contentful paint is 2.5 s or more, layout shift is over 0.1, total blocking time is over 200 ms, or, on a server-rendered page, time to first byte is 800 ms or more. The same run on production after a deploy SHALL open an issue when a limit is missed.

#### Scenario: A slow change
- **WHEN** a pull request makes the median first contentful paint of `/learn/` 1.7 s on its preview, after `/learn/` met the limit
- **THEN** the perf check fails on that pull request

#### Scenario: A slow server render
- **WHEN** a pull request makes the time to first byte of the server-rendered `/learn/arena` 900 ms on its preview, after it met the limit
- **THEN** the perf check fails and shows the number

### Requirement: A limit not met yet is reported until it is met
A byte or timing limit that the start measurement already missed for a page, visit and metric SHALL be reported on each pull request without failing it, until a pull request meets it there in both perf measurements by a margin (100 ms on paints and time to first byte, 25 ms on blocking time, 0.02 on layout shift, so the 0.1 limit switches on at 0.08 or less; none on bytes). That pull request SHALL make it fail for that page, visit and metric from then on.

#### Scenario: A limit not met yet
- **WHEN** the Arena's largest contentful paint has never been under 2.5 s and a pull request measures 3.1 s, no worse than the baseline
- **THEN** the perf comment shows the limit as missed, and the check does not fail for it

#### Scenario: A limit just met
- **WHEN** a pull request brings the Arena's largest contentful paint to 2.3 s and 2.35 s in the perf check's two measurements
- **THEN** the same pull request makes that limit fail for the Arena, and a later pull request measuring 2.6 s fails

#### Scenario: Only one visit meets it
- **WHEN** the repeat visit of `/learn/` meets the first contentful paint limit and the first visit does not
- **THEN** the limit fails pull requests for the repeat visit only, and stays reported for the first visit

### Requirement: Growth is reported
The perf check SHALL compare the byte measurements of a pull request with `main` and comment on the pull request when JS or CSS before play grows by more than 5 KB, even within budget.

#### Scenario: A 7 KB increase
- **WHEN** a pull request adds 7 KB of Brotli JS before play
- **THEN** the pull request gets a comment showing the old size, the new size and the file that grew
