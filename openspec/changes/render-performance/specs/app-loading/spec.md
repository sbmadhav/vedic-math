# Spec Delta

## Purpose

Load the game in as few round trips and bytes as possible, fetch what the Player is likely to open next before they open it, and do no drawing or counting the Player cannot see.

## ADDED Requirements

### Requirement: Minified delivery with stamps kept
The published JS and CSS SHALL be minified one file at a time with no bundling, so every module keeps its own URL, its own `?v=` stamp in the import map and its own hash in the worker. A minified module SHALL import exactly the specifiers its source imports. Text responses SHALL be served with Brotli to clients that accept it.

#### Scenario: Built module
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/js/arena.js` is minified, its import map entry carries the hash of the minified bytes, and it imports the same specifiers as `js/arena.js`

#### Scenario: Compressed response
- **WHEN** a browser that sends `Accept-Encoding: br` requests `/js/app.js?v=<hash>`
- **THEN** the response has `content-encoding: br`

### Requirement: Each section loads its own code
The game SHALL load the code of each section (Home, Sky, Learn, Dojo, Star, Arena, Games, Sutras, Watch, Guide, Me and each Play experience) only when that section is first opened or prefetched. A first visit to Home SHALL NOT load the code of the Arena, games, Sutra deep dives, Watch, the Guide or any Play experience.

#### Scenario: First visit to Home
- **WHEN** a first-time visitor picks a Mode and Home is shown
- **THEN** no request is made for `js/arena.js`, `js/games.js`, `js/sutra-details.js`, `js/guide.js` or any `js/play/exp/` module

### Requirement: Waiting for a section's code
While a section's code is loading, the view SHALL keep its height and SHALL show a loading line only after 300 ms. If the code fails to load, the view SHALL show a Retry message, and Retry SHALL load it again. If the Player leaves before the code arrives, nothing from that section SHALL appear.

#### Scenario: The Arena's code fails to load
- **WHEN** a Player opens the Arena and its module request fails
- **THEN** the view says the part did not load and offers Retry, and Retry loads it again

#### Scenario: Leaving while it loads
- **WHEN** a Player opens Games and goes back to Home before the games module arrives
- **THEN** Home stays on screen and the Games view never appears

### Requirement: The entry graph is preloaded
The game page SHALL tell the browser about every module of the entry graph and of Home before the entry script runs, so they are fetched together instead of one import level at a time, and SHALL NOT preload any other section's code.

#### Scenario: Built page
- **WHEN** the built `/play/` is inspected
- **THEN** it has one `modulepreload` link per module of the entry and Home graphs, each with its `?v=` stamp, and none for the Arena or games modules

### Requirement: The likely next section is prefetched
The game SHALL fetch a section's code when the Player points at, focuses or touches a link to it, and SHALL fetch the most likely next section once the browser is idle after a view has rendered. It SHALL prefetch nothing when the browser asks to save data or reports a 2G connection. Prefetch listeners SHALL stop when the page they belong to is left.

#### Scenario: Hover on Arena
- **WHEN** a Player on a computer points at the Arena tab
- **THEN** the Arena module is requested before the Player clicks

#### Scenario: Save-Data
- **WHEN** the browser sends Save-Data and a Player points at the Arena tab
- **THEN** nothing is requested until the Player opens the Arena

### Requirement: Pages are prefetched and the game prerendered without side effects
The landing and grown-up pages SHALL carry Speculation Rules that prefetch same-origin page links on hover or touch, and prerender `/play/` from the landing page. A prerendered `/play/` SHALL NOT write to storage, send any analytics event, start sound or music, register its worker or start the Tour until it is shown; then it SHALL do all of these as on a normal load. No rule SHALL list a URL with a hash route or a query.

#### Scenario: Prerendered but never opened
- **WHEN** Chrome prerenders `/play/` from the landing page and the visitor leaves without opening it
- **THEN** no analytics request is made, and localStorage has no `vm.firstSeen` or quest day it did not have before

#### Scenario: Prerendered and opened
- **WHEN** the visitor then taps Play
- **THEN** `/play/` appears without a new document load and its start-up runs once

### Requirement: The first screen is in the page
`/play/` SHALL contain the first-visit Mode picker as plain HTML, so a first-time visitor sees it before any module runs. A returning Player SHALL NOT see it flash before their own Home.

#### Scenario: First visit with JavaScript slow
- **WHEN** a first-time visitor opens `/play/` and the modules take two seconds
- **THEN** the Mode picker is shown from the first paint

#### Scenario: Returning Player
- **WHEN** a Player with progress opens `/play/`
- **THEN** the static Mode picker is never painted and their Home appears in its place

### Requirement: Fonts are subset and few are preloaded
The published fonts SHALL contain only the characters the site uses (Latin, the IAST letters of Sutra names and the math signs the app prints), and a test SHALL fail when copy uses a character the fonts lack, outside the Devanagari block. Only the body font and the heading font SHALL be preloaded.

#### Scenario: A new symbol in copy
- **WHEN** a change adds the character ∑ to a Skill's question text and the fonts lack it
- **THEN** the fonts test fails and names the character and the file

### Requirement: Work that is not seen is paused
The Sky's animations and parallax SHALL stop while the Sky is off screen or the tab is hidden, and resume when it is seen again. The moving background SHALL start only after the first view has rendered and the browser is idle or the Player has tapped, SHALL hold still while a round is in play, and SHALL keep its rules for reduced motion, Pause motion and Calm.

#### Scenario: Sky scrolled away
- **WHEN** a Player scrolls the Sky fully out of view
- **THEN** no Sky animation runs until it is scrolled back

#### Scenario: A round with the moving background on
- **WHEN** a Player with the Moving background on starts an Arena round
- **THEN** the background holds one still frame until the round ends, then moves again
