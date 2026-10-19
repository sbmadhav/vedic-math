# Spec Delta

## MODIFIED Requirements

### Requirement: Every precached file is checked
In the published worker, every precache entry SHALL carry the hash the build recorded, and install SHALL fail if any file the network serves does not match. The list SHALL be made from the build's manifest and SHALL cover the game's app shell and SPA fallback, every JS and CSS file of the entry and of the routes needed for offline play, the pinned design-system files, the theme, the fonts, the icons and the manifest. No entry SHALL be unhashed. The worker SHALL be written in TypeScript by hand and built with the game; the source SHALL keep `VERSION = 'dev'` and an empty list.

#### Scenario: Built worker
- **WHEN** `python3 build.py --out _site` runs
- **THEN** every entry in `_site/sw.js`'s precache list has a 10-character hash, and every JS file of the entry in the build manifest is in the list

#### Scenario: A half-propagated deploy
- **WHEN** the network serves an older entry chunk during install
- **THEN** install fails and the previous version keeps serving

### Requirement: Offline play
A Player who opened the game once with a connection SHALL be able to open `/play/` or any game path under it and play Practice, Stars, games and Device boards offline. Page loads SHALL be network first with the saved app shell as the fallback for every path under `/play/`; files with a content hash in their name SHALL be cache first. Studio voice files SHALL be cache first in their own cache. No other origin, and no non-GET request, SHALL be cached.

#### Scenario: Offline after one visit
- **WHEN** a Player opens `/play/games` offline after one online visit
- **THEN** the Games view is shown and a game can be played

#### Scenario: An old hash link offline
- **WHEN** a Player opens `/play/#/games` offline after one online visit
- **THEN** the address becomes `/play/games` and the Games view is shown
