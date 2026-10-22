# Spec Delta

## Purpose

Load the game in as few round trips and bytes as possible, fetch what the Player is likely to open next before they open it, and do no drawing or counting the Player cannot see, on the React Router stack (`react-typescript`).

## ADDED Requirements

### Requirement: Compressed and immutable delivery
Text responses (JS, CSS, HTML, JSON, SVG), whether static files or pages the server rendered, SHALL be served with Brotli to clients that accept it, with `Vary: Accept-Encoding`, and uncompressed or in another encoding to clients that do not. Files under `/learn/assets/` whose name carries a content hash SHALL be served with `Cache-Control: public, max-age=31536000, immutable`; no other path SHALL be marked immutable.

#### Scenario: Compressed response
- **WHEN** a browser that sends `Accept-Encoding: br` requests the entry chunk under `/learn/assets/`, the prerendered `/learn/` or the server-rendered `/learn/arena`
- **THEN** each response is a 200 of the content type expected for its URL and has `content-encoding: br` and `Vary: Accept-Encoding`

#### Scenario: No Brotli asked for
- **WHEN** a client that does not send `br` in `Accept-Encoding` requests the same entry chunk after a Brotli client did
- **THEN** the response is not Brotli-encoded

#### Scenario: A hashed file
- **WHEN** a browser requests a chunk under `/learn/assets/` whose name carries its content hash
- **THEN** the response has `Cache-Control: public, max-age=31536000, immutable`, and `/learn/`, `/learn/__shell.html` and `/sw.js` do not

### Requirement: Each route loads its own code
The game SHALL load the code of each route only when that route is opened or prefetched. A first visit to the Mode picker or a returning Player's Home SHALL NOT request a chunk that only the Arena, the games, the Sutra deep dives, Watch, the Guide or a Play experience use, and SHALL NOT request the full skill data.

#### Scenario: First visit to Home
- **WHEN** a first-time visitor picks a Mode and Home is shown
- **THEN** no request is made for a chunk that only the Arena, Games, the Sutra deep dives, Watch, the Guide or a Play experience route uses

#### Scenario: The build knows
- **WHEN** `python3 build.py --out _site` runs
- **THEN** the budget table lists each route's own chunks, and none but the Home route's is in the `modulepreload` links of the prerendered `/learn/`

### Requirement: Waiting for a route's code
While the next route's code is loading, the current screen SHALL stay on screen, and a quiet loading line SHALL appear only after 300 ms without moving the layout. If the code fails to load, the route SHALL show a message that the part did not load with a Retry button, and Retry SHALL load it again. If the Player starts another navigation before the code arrives, the first route SHALL never appear. Offline, the failure SHALL show the message without reloading the page again and again.

#### Scenario: The Arena's code fails to load
- **WHEN** a Player opens the Arena and its route module request fails
- **THEN** the view says the part did not load and offers Retry, and Retry reloads the page at the Arena's path, which requests the module again

#### Scenario: Leaving while it loads
- **WHEN** a Player opens Games and taps Home before the Games route module arrives
- **THEN** Home stays on screen and the Games view never appears

#### Scenario: Slow code
- **WHEN** the Arena's route module takes 1 second to arrive
- **THEN** the current screen stays, the loading line shows after 300 ms, and the layout does not shift

### Requirement: The first route's code is preloaded
Every game document, prerendered or server-rendered, SHALL name every chunk of the entry, the root route and the matched route as a `modulepreload` link in its head, so they are fetched together instead of one import level at a time, and SHALL NOT preload any other route's code or any 3D file. A server-rendered page SHALL send its head, with these links, the stylesheets and the font preloads, before the rest of the render is done.

#### Scenario: Built page
- **WHEN** the prerendered `/learn/` is inspected
- **THEN** it has one `modulepreload` link per chunk of the entry, the root route and the Home route, and none for the Arena or Games route

#### Scenario: Streamed head
- **WHEN** a browser requests the server-rendered `/learn/arena`
- **THEN** the response, read up to `</head>`, holds the Arena route's `modulepreload` links, and the server started sending it without waiting for the whole render to finish

#### Scenario: A crawler
- **WHEN** a crawler requests `/learn/arena`
- **THEN** it receives the complete rendered page in one response

### Requirement: The likely next route is prefetched
The game SHALL fetch a route's code when the Player points at, focuses or touches a link to it, and SHALL fetch the code of the most likely next route once the browser is idle after a view has rendered, at most one per screen. It SHALL prefetch nothing when the browser asks to save data or reports a 2G connection. Prefetching tied to a screen SHALL stop when that screen is left.

#### Scenario: Hover on Arena
- **WHEN** a Player on a computer points at the Arena tab
- **THEN** the Arena route's code is requested before the Player clicks

#### Scenario: Save-Data
- **WHEN** the browser sends Save-Data and a Player points at the Arena tab
- **THEN** nothing is requested until the Player opens the Arena

#### Scenario: Idle on Home
- **WHEN** Home has rendered for a returning Player and the browser is idle
- **THEN** the code of the route the Star Bolt suggests is requested once

### Requirement: Pages are prefetched between documents
The landing and grown-up pages SHALL carry Speculation Rules that prefetch same-origin page links on hover or touch, and prerender `/learn/` from the landing page; the game's documents SHALL carry a rule that prefetches only the grown-up pages. No rule SHALL list a game path other than `/learn/`, a URL with a hash or a URL with a query. Every rules block SHALL be allowed by the page's content security policy (its hash on static pages, the request's nonce on server-rendered ones).

#### Scenario: The rules
- **WHEN** the rules blocks of the landing page and a game page are read
- **THEN** they list no game path other than `/learn/`, no hash and no query

#### Scenario: The rules and the policy
- **WHEN** the landing page and a server-rendered game page load
- **THEN** no content security policy violation is reported for their rules blocks

### Requirement: A prerendered game starts only when shown
A prerendered `/learn/` SHALL NOT write to storage, send any analytics event, start sound or music, register its worker or start the Tour until it is shown; then it SHALL do all of these once, as on a normal load.

#### Scenario: Prerendered but never opened
- **WHEN** Chrome prerenders `/learn/` from the landing page and the visitor leaves without opening it
- **THEN** no analytics request is made, and localStorage has no `vm.firstSeen` or quest day it did not have before

#### Scenario: Prerendered and opened
- **WHEN** the visitor then taps Play
- **THEN** `/learn/` appears without a new document load and its start-up runs once

### Requirement: The first screen paints from its HTML
The prerendered `/learn/` SHALL paint the first-visit Mode picker from its HTML and CSS alone, before any module runs. When a returning Player's Home replaces the hidden picker, the layout SHALL NOT shift.

#### Scenario: First visit with JavaScript slow
- **WHEN** a first-time visitor opens `/learn/` and the modules take two seconds
- **THEN** the Mode picker is shown from the first paint

#### Scenario: Returning Player
- **WHEN** a Player with progress opens `/learn/`
- **THEN** the Mode picker is never painted, Home appears in its place, and the layout shift of the load is under 0.1

### Requirement: Fonts are subset and few are preloaded
The published fonts SHALL contain only the characters the site uses (Latin, the IAST letters of Sutra names and the math signs the app prints), and a test SHALL fail when copy uses a character the fonts lack, outside the Devanagari block. Only the body font and the heading font SHALL be preloaded.

#### Scenario: A new symbol in copy
- **WHEN** a change adds the character ∑ to a Skill's question text and the fonts lack it
- **THEN** the fonts test fails and names the character and the file

#### Scenario: Preloads
- **WHEN** the prerendered `/learn/` is inspected
- **THEN** it preloads exactly two fonts: the body font and the heading font

### Requirement: Work that is not seen is paused
The Sky's animations and parallax SHALL stop while the Sky is off screen or the tab is hidden, and resume when it is seen again. The Moving background SHALL start only after the first view has rendered and the browser is idle or the Player has tapped, SHALL hold still while a round is in play, and SHALL keep its rules for reduced motion, Pause motion and Calm.

#### Scenario: Sky scrolled away
- **WHEN** a Player scrolls the Sky fully out of view
- **THEN** no Sky animation runs until it is scrolled back

#### Scenario: A round with the Moving background on
- **WHEN** a Player with the Moving background on starts an Arena round
- **THEN** the background holds one still frame until the round ends, then moves again
