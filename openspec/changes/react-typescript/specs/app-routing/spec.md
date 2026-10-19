# Spec Delta

## Purpose

Give every screen of the game a real path under `/play/`, keep every old `#/` link working forever, let a route be drawn by a Legacy view or a React view while the game moves to React, and make the public Sutra pages readable by search engines.

## ADDED Requirements

### Requirement: Every screen has a path
Every route of the game SHALL be a path under `/play/`: the hash route `#/<route>` of today becomes `/play/<route>` with the same parts in the same order (for example `/play/arena`, `/play/sutras/ekadhikena`, `/play/game/times-sprint/12`, `/play/star/sq5/2`, `/play/guide/arena`), and Home is `/play/`. Aliases that exist today (`#/tricks` for the Dojo, `#/progress` for Me) SHALL keep working as paths. Back and Forward SHALL move between screens as they do today.

#### Scenario: Opening the Arena from the nav
- **WHEN** a Player taps Arena in the game's nav
- **THEN** the address bar shows `https://learnvedicmath.com/play/arena` and the Arena is shown

#### Scenario: Back after a Star
- **WHEN** a Player opens the Sky, then a Star, then presses Back
- **THEN** the Sky is shown at `/play/` with that Star focused

#### Scenario: An alias
- **WHEN** a Player opens `/play/progress`
- **THEN** the Me page is shown

### Requirement: Old hash links reach the same screen, forever
The game SHALL turn any address under `/play/` whose fragment starts with `#/` into the matching path before anything is painted, keeping the query, and SHALL do the same whenever the fragment changes to one that starts with `#/` while the game is open. Fragments that do not start with `#/` SHALL be left alone. This SHALL never be removed.

#### Scenario: A bookmark from before the switch
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/sutras/ekadhikena`
- **THEN** the address becomes `/play/sutras/ekadhikena` without a reload and the Sutra's Deep dive opens, with no flash of Home

#### Scenario: A home-screen app installed before the switch
- **WHEN** a Player opens the installed app at `/play/?source=pwa#/arena`
- **THEN** the address becomes `/play/arena?source=pwa` and the Arena is shown

#### Scenario: A link from the old site
- **WHEN** a visitor opens `https://sbmadhav.com/vedic-math/#/games` after the move's permanent redirect is in place
- **THEN** they end on `https://learnvedicmath.com/play/games` and the Games view is shown

#### Scenario: Old code that sets a hash
- **WHEN** a Legacy view sets `location.hash` to `#/me`
- **THEN** the address becomes `/play/me` and the Me page is shown

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

### Requirement: Public Sutra pages are prerendered
The build SHALL write complete HTML for `/play/sutras/` and for every Sutra and sub-sutra's Deep dive (`/play/sutras/<id>/`), with the page title, a description, a canonical link to its production URL and the Deep dive's text, readable with JavaScript off. With JavaScript on, the page SHALL become the full game without a second document load, and SHALL NOT write storage, count a visit or start sound before the app has started as on any other load. `sitemap.xml` SHALL list each page.

#### Scenario: A crawler
- **WHEN** a crawler requests `https://learnvedicmath.com/play/sutras/ekadhikena/` without running scripts
- **THEN** the response is 200 and its HTML holds the Sutra's name, its English meaning and its Worked examples

#### Scenario: A Player opens a prerendered page
- **WHEN** a Player opens `/play/sutras/ekadhikena/`
- **THEN** the Deep dive is shown, the nav works, and one route-view event is counted after start-up

#### Scenario: Sitemap
- **WHEN** `sitemap.xml` is fetched
- **THEN** it lists `/play/sutras/` and one URL per Sutra and sub-sutra
