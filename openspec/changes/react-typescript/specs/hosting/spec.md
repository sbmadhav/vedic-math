# Spec Delta

## MODIFIED Requirements

### Requirement: Paths at the root
The game SHALL be served at `/play/` with every screen at a path under it, the landing page at `/`, and the grown-up pages at `/parents/`, `/teachers/`, `/privacy/` and `/terms/`. The game's built files SHALL be served from `/play/assets/` with a content hash in each name; styles of the landing pages, fonts, icons, audio and vendored files SHALL be served from root paths (such as `/ds/2.1.0/tokens.css`). No published file SHALL reference a path starting with `/vedic-math/`, except the redirect rules for old links.

#### Scenario: Build output
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/play/index.html`, `_site/index.html` and at least one `_site/play/assets/*.js` exist, and no file in `_site` other than `_redirects` contains `/vedic-math/`

#### Scenario: A screen in the game
- **WHEN** a Player opens `https://learnvedicmath.com/play/arena`
- **THEN** the Arena is shown

### Requirement: Old links reach the same screen
A link to an old route SHALL open the same screen on the new site. A hash route that arrives at the landing page (as GitHub's redirect delivers `sbmadhav.com/vedic-math/#/x` to `https://learnvedicmath.com/#/x`) SHALL be sent on to `/play/x` before the landing page paints. A hash route under `/play/` SHALL become its path before the game paints. Any request under `/vedic-math/` on the new site SHALL answer with a 301 to `/play/`, and the hash it carries SHALL then become its path.

#### Scenario: Old deep link through the redirect
- **WHEN** a visitor opens `https://learnvedicmath.com/#/sutras/ekadhikena`
- **THEN** they land on `https://learnvedicmath.com/play/sutras/ekadhikena` and the Sutra's Deep dive opens

#### Scenario: Old path on the new host
- **WHEN** a visitor opens `https://learnvedicmath.com/vedic-math/#/arena`
- **THEN** the response is a 301 to `/play/`, the address becomes `/play/arena` and the Arena opens

#### Scenario: A hash route in the game
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/arena`
- **THEN** the address becomes `/play/arena` and the Arena is shown

## ADDED Requirements

### Requirement: The game's paths fall back to the app
A request for a path under `/play/` that matches no published file SHALL be answered with status 200 and the game's app shell, which then shows the screen for that path, or Home for a path that names no screen. A path outside `/play/` that matches no file SHALL keep the 404 page.

#### Scenario: A deep link that is not prerendered
- **WHEN** a visitor opens `https://learnvedicmath.com/play/game/times-sprint/12` on a cold load
- **THEN** the status is 200 and that game Level is shown

#### Scenario: A typo outside the game
- **WHEN** a visitor opens `https://learnvedicmath.com/plya/`
- **THEN** the status is 404 and the page links to the landing page and the game

#### Scenario: A path the game does not know
- **WHEN** a visitor opens `https://learnvedicmath.com/play/nowhere`
- **THEN** the status is 200 and Home (or the Mode picker on a first visit) is shown
