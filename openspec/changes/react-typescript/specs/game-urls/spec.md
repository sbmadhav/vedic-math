# Spec Delta

The `game-urls` capability is added by openspec change `indexable-routes`, which ships the paths, the old-link rules and the published page per path with Legacy code. This delta changes only what the React Router shell adds to three of its requirements (that change's design D13); it applies after `indexable-routes` is archived.

## MODIFIED Requirements

### Requirement: Every screen has a path under /learn/
Every screen of the game SHALL have one path under `/learn/`, made from its route with the same parts in the same order and no trailing slash (`/learn/arena`, `/learn/sutras/s1`, `/learn/game/times-sprint/12`, `/learn/kata/sq5/12`), with Home at `/learn/` and the Skill map at `/learn/skills`. The address bar SHALL show that path whenever the screen is shown. Back and Forward SHALL move between screens as they do today, without loading a page. The React Router shell SHALL serve the same paths: its route table SHALL be built from the one route table the Legacy router reads, so no path, alias or id changes when a route moves to React, and a cold load of a path with no published file SHALL be answered by the server with a page rendered for that path (hosting, "Game paths with no file are rendered by the server").

#### Scenario: Opening the Arena from the nav
- **WHEN** a Player taps Arena in the game's nav
- **THEN** the address bar shows `https://learnvedicmath.com/learn/arena`, the Arena is shown, and no page is requested from the server

#### Scenario: A cold load of a deep path
- **WHEN** a returning Challenger Player opens `https://learnvedicmath.com/learn/game/times-sprint` in a new tab
- **THEN** the response is 200 and the Times sprint game is shown

#### Scenario: Back after a Star
- **WHEN** a Player opens the Dojo, then a Star, then presses Back
- **THEN** the Dojo is shown at `/learn/dojo`

#### Scenario: A link in a view
- **WHEN** a Player opens the context menu on a Skill card on a level page
- **THEN** the link's address is `https://learnvedicmath.com/learn/skill/<id>`, not a `#/` address

#### Scenario: A route moves to React
- **WHEN** a route is pointed at its React view instead of its Legacy view
- **THEN** its path, its aliases and every link to it are unchanged, and the deep-link and old-route specs pass without a URL change

### Requirement: Old /play/ links reach the same screen, forever
Every address under `/play/` SHALL be answered with a 301 to the same path under `/learn/`, keeping the query, by a rule that runs no server code, and the move's `/vedic-math/` rules SHALL end at `/learn/`. These rules SHALL never be removed. With server code in front of misses, it SHALL still never run for an address under `/play/` or `/vedic-math/`: the redirect rules answer before any miss reaches the Worker, and the Worker SHALL never render a page for such an address.

#### Scenario: The old game address with a query
- **WHEN** a visitor opens `https://learnvedicmath.com/play/?mode=explorer`
- **THEN** the response is a 301 to `/learn/?mode=explorer` and Explorer is picked as today

#### Scenario: An old hash link to the old address
- **WHEN** a visitor opens `https://learnvedicmath.com/play/#/arena`
- **THEN** the response is a 301 to `/learn/`, the address becomes `/learn/arena` and the Arena is shown

#### Scenario: An old asset address
- **WHEN** a browser requests `/play/assets/x.js`, which matches no file
- **THEN** the response is a 301 to `/learn/assets/x.js` and no Worker code runs

### Requirement: Old hash links reach the same screen, forever
A page load under `/learn/` or at the landing page whose fragment starts with `#/` SHALL be sent to the matching path under `/learn/` before anything is painted, keeping the query. While the game is open, a fragment change to one starting with `#/` SHALL become the matching path without a reload. Other fragments SHALL be left alone. This SHALL never be removed. In the React shell, the pre-paint script that does this SHALL be inlined in the root layout and SHALL send the browser to the path with `location.replace`, never by rewriting the address in place, so that React Router hydrates every page at the URL it was rendered for; it SHALL be allowed by the request's nonce in a server-rendered page and by its hash in a published one; and a fragment change to `#/` while the game is open SHALL become a React Router navigation, which leaves the current view as any route change does.

#### Scenario: A bookmark from before the switch
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/sutras/s1`
- **THEN** the address becomes `/learn/sutras/s1` and the Deep dive opens, with no flash of Home or of the Mode picker

#### Scenario: A link that reached the landing page
- **WHEN** a visitor opens `https://learnvedicmath.com/#/games`
- **THEN** the address becomes `/learn/games` before the landing page paints, and Games is shown

#### Scenario: Old code that sets a hash
- **WHEN** a Legacy view sets `location.hash` to `#/me`
- **THEN** the address becomes `/learn/me` without a reload and the Me page is shown

#### Scenario: A skip link
- **WHEN** a keyboard Player follows "Skip to content", whose target is `#view`
- **THEN** focus moves to the view and the route does not change

#### Scenario: An old fragment on a server-rendered page
- **WHEN** a visitor opens a path the server renders, with a `#/arena` fragment
- **THEN** the script runs under that response's nonce with no policy violation, and the Arena is shown at `/learn/arena`
