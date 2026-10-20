# Spec Delta

## Purpose

Give every screen of the game a real path under `/learn/`, rendered by the server on a cold load, keep every old `/play/` and `#/` link working forever, let a route be drawn by a Legacy view or a React view while the game moves to React, keep Player data off the server, and make the public Sutra pages readable by search engines.

## ADDED Requirements

### Requirement: Every screen has a path
Every route of the game SHALL be a path under `/learn/`: the hash route `#/<route>` of today becomes `/learn/<route>` with the same parts in the same order (for example `/learn/arena`, `/learn/sutras/ekadhikena`, `/learn/game/times-sprint/12`, `/learn/star/sq5/2`, `/learn/guide/arena`), and Home is `/learn/`. Aliases that exist today (`#/tricks` for the Dojo, `#/progress` for Me) SHALL keep working as paths. Back and Forward SHALL move between screens as they do today.

#### Scenario: Opening the Arena from the nav
- **WHEN** a Player taps Arena in the game's nav
- **THEN** the address bar shows `https://learnvedicmath.com/learn/arena` and the Arena is shown

#### Scenario: Back after a Star
- **WHEN** a Player opens the Sky, then a Star, then presses Back
- **THEN** the Sky is shown at `/learn/` with that Star focused

#### Scenario: An alias
- **WHEN** a Player opens `/learn/progress`
- **THEN** the Me page is shown

#### Scenario: A cold load of a path that is not prerendered
- **WHEN** a Player opens `https://learnvedicmath.com/learn/arena` in a new tab
- **THEN** the server answers 200 with a page it rendered for that path, holding the game's header and nav before any script runs, and the Arena is shown

### Requirement: Game paths are rendered by the server
A page navigation to a path under `/learn/` that has no prerendered page SHALL be answered by the server with the page rendered for that route: the document, the header, the nav and every part of the view that is the same for every visitor. Moving between screens after the first load SHALL happen in the browser without asking the server for the next screen.

#### Scenario: Moving between screens
- **WHEN** a Player who opened `/learn/arena` taps Games in the nav
- **THEN** the Games view is shown and no request for a page or route data is sent to the server

#### Scenario: Moving between screens offline
- **WHEN** a Player who opened the game online loses the connection and taps Games
- **THEN** the Games view is shown

### Requirement: Legacy routes render the shell on the server
For a route still drawn by a Legacy view, the page the server renders SHALL be the document, header, nav and footer with an empty view root, and the view SHALL be drawn after start-up.

#### Scenario: A Legacy route on a cold load
- **WHEN** a Player opens `/learn/tower` in a new tab while the Tower is still a Legacy view
- **THEN** the HTML holds the header, nav and an empty view root, and the Tower is drawn once the game has started

### Requirement: No Player data on the server
The server SHALL render nothing that depends on a Player's data (Players, progress, Sparks, settings, Mode, Age answer), and no request the game sends for a page SHALL carry that data. Parts of a screen that depend on it SHALL be drawn in the browser after start-up, without shifting the layout, and the browser's first render SHALL match the server's.

#### Scenario: Me on a cold load
- **WHEN** a Player with two Players on the device opens `/learn/me` in a new tab
- **THEN** the HTML the server sent names neither Player, and both are shown once the game has started

#### Scenario: No hydration mismatch
- **WHEN** a returning Challenger Player opens any game path in a new tab
- **THEN** the console shows no hydration warning and the Challenger wording is shown

### Requirement: Old `/play/` links reach the same screen, forever
The game's address SHALL move from `/play/` to `/learn/` in the same release that switches to path routes, so the URLs change once. Every address under `/play/` SHALL be answered with a permanent redirect to the same path under `/learn/`, keeping the query, and the fragment the browser carries SHALL then be handled as below. This SHALL never be removed.

#### Scenario: An old path
- **WHEN** a visitor opens `https://learnvedicmath.com/play/arena?source=pwa`
- **THEN** the response is a 301 to `/learn/arena?source=pwa` and the Arena is shown

#### Scenario: An old hash link
- **WHEN** a visitor opens `https://learnvedicmath.com/play/#/arena`
- **THEN** the response is a 301 to `/learn/`, the browser keeps the fragment, and the Arena is shown at `/learn/arena`

### Requirement: Old hash links reach the same screen, forever
The game SHALL send any page load under `/learn/` whose fragment starts with `#/` to the matching path before anything is painted, keeping the query, and SHALL navigate to the matching path, without reloading, whenever the fragment changes to one that starts with `#/` while the game is open. Fragments that do not start with `#/` SHALL be left alone. This SHALL never be removed.

#### Scenario: A bookmark from before the switch
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/sutras/ekadhikena`
- **THEN** the browser is sent to `/learn/sutras/ekadhikena` before anything is painted, and the Sutra's Deep dive opens with no flash of Home or of the Mode picker

#### Scenario: A home-screen app installed before the switch
- **WHEN** a Player opens an app installed before the switch, which starts at `/play/?source=pwa#/arena`
- **THEN** the address becomes `/learn/arena?source=pwa` and the Arena is shown

#### Scenario: A link from the old site
- **WHEN** a visitor opens `https://sbmadhav.com/vedic-math/#/games` after the move's permanent redirect is in place
- **THEN** they end on `https://learnvedicmath.com/learn/games` and the Games view is shown

#### Scenario: Old code that sets a hash
- **WHEN** a Legacy view sets `location.hash` to `#/me`
- **THEN** the address becomes `/learn/me` without a reload and the Me page is shown

#### Scenario: A skip link
- **WHEN** a keyboard Player follows the "Skip to content" link whose target is `#view`
- **THEN** focus moves to the view and the route does not change

### Requirement: One router, Legacy or React per route
The game SHALL have one router. For each route it SHALL mount either a React view or a Legacy view through one adapter that gives the Legacy view its root element and an `AbortSignal`, and aborts that signal when the route changes. A Player SHALL NOT be able to tell from behavior which kind of view a route uses.

#### Scenario: Leaving a Legacy view for a React view
- **WHEN** a Player starts an Arena countdown in a Legacy Arena view and taps Guide, which is a React view
- **THEN** the countdown stops, no Arena sound plays, and the Guide is shown

#### Scenario: Moving a route back
- **WHEN** a migration is reverted by pointing a route at its Legacy view again
- **THEN** the route works as it did before the migration, and the Playwright specs for it pass

### Requirement: Focus and scroll on a new screen
After a route change, the game SHALL move focus to the new screen's main heading, unless the screen put focus somewhere inside itself, and SHALL scroll to the top, as it does today. The first load SHALL NOT move focus.

#### Scenario: Keyboard navigation
- **WHEN** a keyboard Player activates the Games link
- **THEN** focus is on the Games heading and the page is scrolled to the top

### Requirement: Public pages are prerendered
The build SHALL write complete HTML, served as static files without running server code, for `/learn/sutras/`, every Sutra and sub-sutra's Deep dive (`/learn/sutras/<id>/`), the Guide (`/learn/guide/` and `/learn/guide/<section>/`) and `/learn/` (the first-visit Mode picker), each with the page title, a description, a canonical link to its production URL and its text, readable with JavaScript off. `sitemap.xml` SHALL list each page.

#### Scenario: A crawler
- **WHEN** a crawler requests `https://learnvedicmath.com/learn/sutras/ekadhikena/` without running scripts
- **THEN** the response is 200 and its HTML holds the Sutra's name, its English meaning and its Worked examples

#### Scenario: Sitemap
- **WHEN** `sitemap.xml` is fetched
- **THEN** it lists `/learn/sutras/`, one URL per Sutra and sub-sutra, and the Guide and each of its sections

### Requirement: Rendered pages start like any other load
With JavaScript on, a prerendered or server-rendered page SHALL become the full game without a second document load, and SHALL NOT write storage, count a visit or start sound before the app has started as on any other load. The server SHALL never run start-up.

#### Scenario: A Player opens a prerendered page
- **WHEN** a Player opens `/learn/sutras/ekadhikena/`
- **THEN** the Deep dive is shown, the nav works, and one route-view event is counted after start-up

### Requirement: The prerendered Mode picker is for first visits
The prerendered `/learn/` SHALL show the first-visit Mode picker. A returning Player opening `/learn/` SHALL see Home, and the prerendered Mode picker SHALL NOT be painted for them.

#### Scenario: A first visit
- **WHEN** a first-time visitor opens `/learn/` with JavaScript off
- **THEN** the HTML shows the Mode picker with the three Modes and the Guide link

#### Scenario: A returning Player
- **WHEN** a Player who has already picked a Mode opens `/learn/`
- **THEN** Home is shown and the Mode picker is never painted
