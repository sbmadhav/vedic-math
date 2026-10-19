# Spec Delta

## MODIFIED Requirements

### Requirement: Every precached file is checked
In the published worker, every precache entry SHALL carry the hash the build recorded, and install SHALL fail if any file the network serves does not match. The precache SHALL cover the game shell, `math.css`, the entry module graph and the graphs of Home, Sky, Learn, Dojo, Star, Arena, Games and Me at their import-map URLs, the pinned design-system files, the theme, the fonts, the icons and the manifest. Play experience modules and stylesheets, the Watch data, the Sutra deep dives and the Guide SHALL NOT be precached; the worker SHALL hold a second list with their hashes, and SHALL store one of them only when its bytes match that hash. No entry in either list SHALL be unhashed.

#### Scenario: Built worker
- **WHEN** `python3 build.py --out _site` runs
- **THEN** every entry in `_site/sw.js`'s precache list and lazy list has a 10-character hash, and no `js/play/exp/` module is in the precache list

#### Scenario: A half-propagated deploy
- **WHEN** the network serves an older `math.css` during install
- **THEN** install fails and the previous version keeps serving

#### Scenario: A lazy file with the wrong bytes
- **WHEN** a Player opens Tala Lab and the network serves bytes that do not match its recorded hash
- **THEN** the page gets the response, and the worker does not store it

### Requirement: Offline play
A Player who opened the game once with a connection SHALL be able to open `/play/` and play Practice, Stars, games and Device boards offline. Any other section or Play experience SHALL open offline once it has been opened online with the current or the previous version. Page loads SHALL be network first, using the browser's navigation preload, with the saved shell as the fallback; `?v=` files SHALL be cache first. Other origins and non-GET requests SHALL never be cached.

#### Scenario: Offline after one visit
- **WHEN** a Player opens `/play/#/games` offline after one online visit
- **THEN** the Games view is shown and a game can be played

#### Scenario: An experience opened before a deploy
- **WHEN** a Player opened Daily Number online, a new version is deployed without changing it, and the Player opens it offline
- **THEN** Daily Number shows

#### Scenario: Navigation preload
- **WHEN** a Player with the worker installed opens `/play/` online
- **THEN** the page request starts through navigation preload, without waiting for the worker's fetch handler
