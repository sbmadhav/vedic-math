# Spec Delta

## Purpose

Keep the game working offline on learnvedicmath.com, with a service worker that serves exactly one checked version of every file.

## ADDED Requirements

### Requirement: The worker controls the game only
The game SHALL register `/sw.js` with scope `/play/`, on https and on localhost only. The landing and grown-up pages SHALL NOT be controlled by it.

#### Scenario: Registration
- **WHEN** a Player opens `/play/` on https
- **THEN** a worker with scope `https://learnvedicmath.com/play/` is registered, and `/parents/` is not controlled by it

### Requirement: Every precached file is checked
In the published worker, every precache entry SHALL carry the hash the build recorded, and install SHALL fail if any file the network serves does not match. The list SHALL cover the game shell, `math.css`, every module at its import-map URL, the on-demand stylesheets, the pinned design-system files, the theme, the fonts, the icons and the manifest. No entry SHALL be unhashed.

#### Scenario: Built worker
- **WHEN** `python3 build.py --out _site` runs
- **THEN** every entry in `_site/sw.js`'s precache list has a 10-character hash

#### Scenario: A half-propagated deploy
- **WHEN** the network serves an older `math.css` during install
- **THEN** install fails and the previous version keeps serving

### Requirement: Offline play
A Player who opened the game once with a connection SHALL be able to open `/play/` and play Practice, Stars, games and Device boards offline. Page loads SHALL be network first with the saved shell as the fallback; `?v=` files SHALL be cache first. Other origins and non-GET requests SHALL never be cached.

#### Scenario: Offline after one visit
- **WHEN** a Player opens `/play/#/games` offline after one online visit
- **THEN** the Games view is shown and a game can be played

### Requirement: Its own caches
Caches SHALL be named `lvm-<VERSION>`. The worker SHALL keep the current and the previous version and delete only older `lvm-*` caches. The source in git SHALL keep `VERSION = 'dev'` and an empty precache list, and a `'dev'` worker SHALL cache nothing. Setting `KILL = true` and deploying SHALL delete every `lvm-*` cache and unregister the worker.

#### Scenario: Two deploys later
- **WHEN** a Player has visited three versions
- **THEN** only the newest two `lvm-*` caches remain
