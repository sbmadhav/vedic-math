# Spec Delta

## MODIFIED Requirements

### Requirement: Paths at the root
The game SHALL be served at `/learn/` with every screen at a path under it, the landing page at `/`, and the grown-up pages at `/parents/`, `/teachers/`, `/privacy/` and `/terms/`. The game's built files SHALL be served from `/learn/assets/` with a content hash in each name; styles of the landing pages, fonts, icons, audio and vendored files SHALL be served from root paths (such as `/ds/2.1.0/tokens.css`). No published file SHALL reference a path starting with `/vedic-math/`, except the redirect rules for old links.

#### Scenario: Build output
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/learn/index.html`, `_site/index.html` and at least one `_site/learn/assets/*.js` exist, and no file in `_site` other than `_redirects` contains `/vedic-math/`

#### Scenario: A screen in the game
- **WHEN** a Player opens `https://learnvedicmath.com/learn/arena`
- **THEN** the Arena is shown

### Requirement: Old links reach the same screen
A link to an old route SHALL open the same screen on the new site. A hash route that arrives at the landing page (as GitHub's redirect delivers `sbmadhav.com/vedic-math/#/x` to `https://learnvedicmath.com/#/x`) SHALL be sent on to `/learn/x` before the landing page paints. Any request under `/play/` SHALL answer with a 301 to the same path under `/learn/`, and any request under `/vedic-math/` with a 301 to `/learn/`, as `_redirects` rules that run no server code; a hash route under `/learn/` SHALL become its path before the game paints. The hand-off import (`/import/`) SHALL send Players to `/learn/`.

#### Scenario: Old deep link through the redirect
- **WHEN** a visitor opens `https://learnvedicmath.com/#/sutras/ekadhikena`
- **THEN** they land on `https://learnvedicmath.com/learn/sutras/ekadhikena` and the Sutra's Deep dive opens

#### Scenario: Old path on the new host
- **WHEN** a visitor opens `https://learnvedicmath.com/vedic-math/#/arena`
- **THEN** the response is a 301 to `/learn/`, the address becomes `/learn/arena` and the Arena opens

#### Scenario: A hash route in the old game address
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/arena`
- **THEN** the response is a 301 to `/learn/`, the address becomes `/learn/arena` and the Arena is shown

#### Scenario: An old game path
- **WHEN** a visitor opens `https://learnvedicmath.com/play/sutras/ekadhikena/`
- **THEN** the response is a 301 to `/learn/sutras/ekadhikena/`, with no server code run

#### Scenario: A hand-off import
- **WHEN** a Player finishes a hand-off at `/import/`
- **THEN** they are sent to `/learn/`

## ADDED Requirements

### Requirement: Game paths with no file are rendered by the server
A page navigation to a path under `/learn/` that matches no published file SHALL be answered with status 200 and a page the server renders for that path, which shows the screen for that path, or Home (or the Mode picker on a first visit) for a path that names no screen. A page for a path that names no screen SHALL tell search engines not to index it. There SHALL be no fallback file for the game.

#### Scenario: A deep link that is not prerendered
- **WHEN** a visitor opens `https://learnvedicmath.com/learn/game/times-sprint/12` on a cold load
- **THEN** the status is 200, the HTML holds the game's header and nav, and that game Level is shown

#### Scenario: A path the game does not know
- **WHEN** a visitor opens `https://learnvedicmath.com/learn/nowhere`
- **THEN** the status is 200, the page carries `noindex`, and Home (or the Mode picker on a first visit) is shown

### Requirement: What counts as a page navigation
A request for a path under `/learn/assets/` SHALL never count as a page navigation. Any other request SHALL count as one only with explicit evidence: it carries `Sec-Fetch-Mode: navigate`; or, from a browser that sends no `Sec-Fetch-Mode` at all, it is a GET for a path outside `/learn/assets/` whose last segment has no file extension. A request with any other `Sec-Fetch-Mode` (such as `cors` or `no-cors`) SHALL never count as a page navigation, whatever its `Accept` header.

#### Scenario: A navigation to a missing asset
- **WHEN** a visitor opens `/learn/assets/missing.js` in the address bar (`Sec-Fetch-Mode: navigate`)
- **THEN** the status is 404 with the 404 page, not a page of the game

#### Scenario: A browser without fetch metadata
- **WHEN** a browser that sends no `Sec-Fetch-Mode` opens `/learn/arena`
- **THEN** the request counts as a page navigation and the Arena is shown

### Requirement: Other misses get a 404
Any request that matches no published file and is not a page navigation under `/learn/`, including every miss under `/learn/assets/` and every script, style, image or data request, SHALL be answered with the 404 page and status 404, never with HTML at status 200. A path outside `/learn/` that matches no file SHALL be answered the same way.

#### Scenario: A fetch that asks for HTML
- **WHEN** page code sends `fetch('/learn/missing')` with `Accept: text/html` (so `Sec-Fetch-Mode: cors`)
- **THEN** the status is 404 and the response is the 404 page, not a page of the game

#### Scenario: A missing script under the game
- **WHEN** the browser requests `/learn/assets/old-chunk-1a2b3c.js`, which no longer exists, as a script
- **THEN** the status is 404 and the response is the 404 page, not a page of the game

#### Scenario: A typo outside the game
- **WHEN** a visitor opens `https://learnvedicmath.com/plya/`
- **THEN** the status is 404 and the page links to the landing page and the game

### Requirement: Static files first, server code only for misses and the API
Every request for a published file SHALL be served as that file without running server code. Server code SHALL run only for requests that match no published file and for the paths `/_csp` and `/api/*`; `not_found_handling` SHALL stay unset or `"none"`. Neither the server render nor the 404 answer SHALL be a `_redirects` rule.

#### Scenario: A file that exists under the game
- **WHEN** a browser requests one of the game's hashed files under `/learn/assets/`
- **THEN** that file is served with its own content type and no server code runs

#### Scenario: A prerendered page
- **WHEN** a visitor opens `https://learnvedicmath.com/learn/sutras/ekadhikena/`
- **THEN** the prerendered file is served and no server code runs

### Requirement: Server-rendered pages carry the site's headers
A page the server renders SHALL carry the same security headers as a published page of the game (the content security policy, the Report-Only stricter policy, `frame-ancestors 'none'`, reporting, HSTS, content-type, referrer and permissions policies), except that its inline scripts SHALL be allowed by a nonce made for that one response instead of by hashes. It SHALL NOT be stored or revalidated by any cache: it is sent with `no-store` and without validators.

#### Scenario: Two loads of the same path
- **WHEN** a visitor opens `/learn/arena` twice
- **THEN** each response has a different nonce, no policy violation is reported, `Cache-Control` is `no-store`, and neither response has an `ETag` or `Last-Modified` header
