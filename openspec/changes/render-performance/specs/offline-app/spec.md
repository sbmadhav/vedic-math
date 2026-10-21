# Spec Delta

Builds on `offline-app` as `react-typescript` modifies it (the precache from the client build's manifest, the rendered offline shell, the worker at `/learn/`).

## MODIFIED Requirements

### Requirement: Every precached file is checked
In the published worker, every precache entry SHALL carry the hash the build recorded, and install SHALL fail if any file the network serves does not match. The list SHALL be made from the client build's manifest and SHALL cover the game's offline shell (a page the build renders), every JS and CSS file of the entry, the root route and the core routes (Home, the Sky, Learn, Dojo, Star, Arena, Games and Me), the pinned design-system files, the theme, the body and heading fonts, the icons and the manifest. The code of any other route (each Play experience, Watch, the Sutra deep dives, the Guide), the other fonts and every 3D file (a file reached only through a 3D scene's dynamic import) SHALL NOT be precached: they are cached only when a page first requests them. The list SHALL be found by walking from the entry, the root route and the core routes, not from every dynamic import. An entry whose URL is fixed (the shell and the files the move pins) SHALL be refreshed through its digest and `VERSION`, never by its name. The worker SHALL be written in TypeScript by hand and built with the game; the source SHALL keep `VERSION = 'dev'` and empty lists.

#### Scenario: A file with a fixed URL changes
- **WHEN** a deploy changes the offline shell, whose URL `/learn/__shell.html` stays the same
- **THEN** its recorded digest and the worker's `VERSION` change, the new worker installs a fresh cache, and a network copy that does not match the digest fails the install

#### Scenario: Built worker
- **WHEN** `python3 build.py --out _site` runs
- **THEN** every entry in `_site/sw.js`'s precache list has a 10-character hash, every JS file of the entry and the core routes in the build manifest is in the list, and no chunk that only a Play experience route uses is in it

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
A Player who opened the game once with a connection SHALL be able to open `/learn/` or any game path under it and play Practice, Stars, games and Device boards offline. Any other route, Play experience or 3D scene SHALL work offline once a page has loaded its files online, with the current version or an earlier one whose files the current version still uses. Page loads SHALL be network first, using the browser's navigation preload, with the saved offline shell as the fallback for every path under `/learn/`, and a page the server rendered SHALL never be saved as the shell; the shell SHALL open the screen for whatever path it is shown at; files with a content hash in their name SHALL be cache first, and the worker SHALL store one the first time a page requests it, only when the response is a success of the expected type. On activation, the worker SHALL keep every stored hashed file the new version still uses. A route whose 3D files were never loaded SHALL show its 2D drawing offline. Studio voice files SHALL be cache first in their own cache. No other origin, no non-GET request and nothing under `/api/` SHALL be cached, except the audio files of Server lines, which are kept with the studio voice files.

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

#### Scenario: An experience opened before a deploy
- **WHEN** a Player opened Daily Number online, a new version is deployed without changing its files, and the Player opens it offline
- **THEN** Daily Number shows

#### Scenario: A 404 is not stored
- **WHEN** a page requests a hashed file the network answers with the 404 page
- **THEN** the page gets that response, and the worker does not store it

#### Scenario: Navigation preload
- **WHEN** a Player with the worker installed opens `/learn/` online
- **THEN** the page request starts through navigation preload, without waiting for the worker's fetch handler
