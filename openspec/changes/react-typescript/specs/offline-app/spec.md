# Spec Delta

## MODIFIED Requirements

### Requirement: Every precached file is checked
In the published worker, every precache entry SHALL carry the hash the build recorded, and install SHALL fail if any file the network serves does not match. The list SHALL be made from the client build's manifest and SHALL cover the game's offline shell (a page the build renders), every JS and CSS file of the entry, the root route and the routes needed for offline play, the pinned design-system files, the theme, the fonts, the icons and the manifest. An entry whose URL is fixed (the shell and the files the move pins) SHALL be refreshed through its digest and `VERSION`, never by its name. No entry SHALL be a 3D file (three.js, React Three Fiber, drei or a scene): 3D files are cached only when a route first loads them. The worker SHALL be written in TypeScript by hand and built with the game; the source SHALL keep `VERSION = 'dev'` and an empty list.

#### Scenario: A file with a fixed URL changes
- **WHEN** a deploy changes the offline shell, whose URL `/learn/__shell.html` stays the same
- **THEN** its recorded digest and the worker's `VERSION` change, the new worker installs a fresh cache, and a network copy that does not match the digest fails the install

#### Scenario: Built worker
- **WHEN** `python3 build.py --out _site` runs
- **THEN** every entry in `_site/sw.js`'s precache list has a 10-character hash, and every JS file of the entry in the build manifest is in the list

#### Scenario: No 3D in the precache
- **WHEN** `python3 build.py --out _site` runs
- **THEN** no file of the 3D dependency graph in the build manifest is in `_site/sw.js`'s precache list

#### Scenario: A chunk shared with a 3D scene
- **WHEN** the build emits a chunk that both the app's entry imports statically and a 3D scene imports
- **THEN** that chunk is in the precache list, and the chunks only the 3D scene's dynamic import reaches are not

#### Scenario: A half-propagated deploy
- **WHEN** the network serves an older entry chunk during install
- **THEN** install fails and the previous version keeps serving

### Requirement: Offline play
A Player who opened the game once with a connection SHALL be able to open `/learn/` or any game path under it and play Practice, Stars, games and Device boards offline. Page loads SHALL be network first with the saved offline shell as the fallback for every path under `/learn/`, and a page the server rendered SHALL never be saved as the shell; the shell SHALL open the screen for whatever path it is shown at; files with a content hash in their name SHALL be cache first, including 3D files, which the worker stores the first time a route loads them. A route whose 3D files were never loaded SHALL show its 2D drawing offline. Studio voice files SHALL be cache first in their own cache. No other origin, no non-GET request and nothing under `/api/` SHALL be cached, except the audio files of Server lines, which are kept with the studio voice files.

#### Scenario: Offline after one visit
- **WHEN** a Player opens `/learn/games` offline after one online visit
- **THEN** the Games view is shown and a game can be played

#### Scenario: The Sky offline before any 3D
- **WHEN** a Player whose only online visit never loaded the 3D Sky opens the Sky offline
- **THEN** the 2D Sky is shown, and no error is reported

#### Scenario: A screen never opened before, offline
- **WHEN** a Player whose only online visit was Home opens `/learn/dojo` offline
- **THEN** the offline shell is served and the Dojo is shown

#### Scenario: A server-rendered page is not the shell
- **WHEN** a Player opens `/learn/arena` online, then `/learn/games` offline
- **THEN** the Games view is shown, drawn from the offline shell, not the saved Arena page

#### Scenario: An old hash link offline
- **WHEN** a Player opens `/play/#/games` offline after one online visit to `/learn/`
- **THEN** the old scope's worker redirects to `/learn/`, the browser is sent to `/learn/games`, the offline shell is served and the Games view is shown

## ADDED Requirements

### Requirement: The worker moves to `/learn/`
The service worker SHALL be registered with scope `/learn/`. The worker a device still has for the old `/play/` scope SHALL retire cleanly when it next updates: it SHALL keep no cache of its own, answer every page load under `/play/` with a redirect to the same path under `/learn/` (online or offline), and leave other requests to the network. Shared caches (`lvm-<VERSION>`, `lvm-voice`) SHALL be managed only by the `/learn/` worker, so studio voice files a Player already has are kept.

#### Scenario: A device that had the old worker
- **WHEN** a Player whose device registered the worker under `/play/` opens `/play/` after the move to `/learn/`
- **THEN** they reach `/learn/`, a worker with scope `/learn/` is registered, and the old scope's worker keeps no cache

#### Scenario: Voice files survive the move
- **WHEN** a Player who heard studio lines before the move opens the game at `/learn/` offline
- **THEN** those lines still play from the device
