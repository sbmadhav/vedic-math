# Spec Delta

## Purpose

Render the game's paths under `/learn/` with React Router: a cold load of a path with no published file is rendered by the server, a route is drawn by a Legacy view or a React view while the game moves to React, Player data stays off the server, and a rendered page starts like any other load. The paths themselves, the old `/play/` and `#/` link rules and the published page per path are the `game-urls` and `search-pages` capabilities (openspec change `indexable-routes`, which ships them with Legacy code); what React changes about them is in this change's `game-urls` and `search-pages` deltas (its design D13).

## ADDED Requirements

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

### Requirement: Rendered pages start like any other load
With JavaScript on, a prerendered or server-rendered page SHALL become the full game without a second document load, and SHALL NOT write storage, count a visit or start sound before the app has started as on any other load. The server SHALL never run start-up.

#### Scenario: A Player opens a prerendered page
- **WHEN** a Player opens `/learn/sutras/ekadhikena/`
- **THEN** the Deep dive is shown, the nav works, and one route-view event is counted after start-up
