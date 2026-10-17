# Spec Delta

## Purpose

Serve Vedic Math from its own domain, learnvedicmath.com, on Cloudflare Workers static assets, with the game at `/play/` and every old link still reaching the same screen.

## ADDED Requirements

### Requirement: Served from learnvedicmath.com
The site SHALL be served at `https://learnvedicmath.com/` from Cloudflare Workers static assets, configured by `wrangler.jsonc` in the repo, with the build output as its assets directory. `https://www.learnvedicmath.com/` SHALL answer with a 301 to the same path and query on the apex, and plain `http://` requests SHALL be sent to `https://`.

#### Scenario: Apex
- **WHEN** a visitor opens `https://learnvedicmath.com/`
- **THEN** the landing page is served with status 200

#### Scenario: www
- **WHEN** a visitor opens `https://www.learnvedicmath.com/parents/?a=1`
- **THEN** the response is a 301 to `https://learnvedicmath.com/parents/?a=1`

#### Scenario: Plain http
- **WHEN** a visitor opens `http://learnvedicmath.com/play/`
- **THEN** they end up on `https://learnvedicmath.com/play/`

### Requirement: Paths at the root
The game SHALL be served at `/play/`, the landing page at `/`, and the grown-up pages at `/parents/`, `/teachers/`, `/privacy/` and `/terms/`. Modules, styles, fonts, icons, audio and vendored files SHALL be served from root paths (such as `/js/app.js`). No published file SHALL reference a path starting with `/vedic-math/`, except the redirect rules for old links.

#### Scenario: Build output
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/play/index.html`, `_site/index.html` and `_site/js/app.js` exist, and no file in `_site` other than `_redirects` contains `/vedic-math/`

#### Scenario: A hash route in the game
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/arena`
- **THEN** the Arena is shown

### Requirement: Old links reach the same screen
A link to an old route SHALL open the same screen on the new site. A hash route that arrives at the landing page (as GitHub's redirect delivers `sbmadhav.com/vedic-math/#/x` to `https://learnvedicmath.com/#/x`) SHALL be sent on to `/play/` with the same hash before the landing page paints. Any request under `/vedic-math/` on the new site SHALL answer with a 301 to `/play/`.

#### Scenario: Old deep link through the redirect
- **WHEN** a visitor opens `https://learnvedicmath.com/#/sutras/ekadhikena`
- **THEN** they land on `https://learnvedicmath.com/play/#/sutras/ekadhikena` and the Sutra's Deep dive opens

#### Scenario: Old path on the new host
- **WHEN** a visitor opens `https://learnvedicmath.com/vedic-math/#/arena`
- **THEN** the response is a 301 to `/play/` and the Arena opens

### Requirement: Returning Players go straight into the game
When the landing page is opened on a device that already has Players on learnvedicmath.com, it SHALL replace itself with `/play/` before it paints, unless the URL carries `?home`. Every link from the game to the landing page SHALL carry `?home`. The landing page SHALL write nothing to storage.

#### Scenario: A returning Player
- **WHEN** a Player who has played on this device opens `https://learnvedicmath.com/`
- **THEN** `/play/` opens and the landing page is not shown

#### Scenario: The brand link from the game
- **WHEN** that Player taps the brand in the game's header
- **THEN** the landing page opens and stays

#### Scenario: A first visit
- **WHEN** a visitor with no saved Players opens `/`
- **THEN** the landing page is shown, and localStorage is unchanged

### Requirement: Not found
An unknown path SHALL answer with status 404 and a page in the site's style that links to `/` and `/play/`.

#### Scenario: Typo
- **WHEN** a visitor opens `https://learnvedicmath.com/plya/`
- **THEN** the status is 404 and the page links to the landing page and the game

### Requirement: Previews stay out of search
A preview build SHALL send `X-Robots-Tag: noindex, nofollow` on every response. Production SHALL serve `robots.txt` that allows crawling and names `/sitemap.xml`, which lists `/`, `/play/` and the grown-up pages, and every page SHALL carry a `<link rel="canonical">` to its production URL.

#### Scenario: A preview URL
- **WHEN** a request is made to a branch preview on `workers.dev`
- **THEN** the response carries `X-Robots-Tag: noindex, nofollow`

#### Scenario: Production
- **WHEN** a crawler requests `https://learnvedicmath.com/robots.txt`
- **THEN** it allows crawling and points to `https://learnvedicmath.com/sitemap.xml`

### Requirement: Studio voice files follow the chosen voice host
The Studio voice files SHALL be served from the voice host chosen by decision L8 (design D17), named by content hash, with `Cache-Control: public, max-age=31536000, immutable`. Every file SHALL match the recording manifest's SHA-256 before it is published. With an outside voice host (by default R2 on `voice.learnvedicmath.com`, public by design; its CORS rule only limits which web pages may read the files in a browser), the build SHALL fail if any voice file is in its output, and uploads SHALL never delete or overwrite an object.

#### Scenario: A corrupted file
- **WHEN** a voice file's bytes do not match the manifest hash
- **THEN** publishing fails and names the file

#### Scenario: Build output with an outside voice host
- **WHEN** the build runs with a voice release in the index and the outside voice host
- **THEN** `_site` holds no voice audio and has fewer than 20,000 files

### Requirement: Voice as static assets needs Workers Paid
With voice as static assets (L8 option b), the build SHALL place the voice files under `/voice/`, and the site SHALL be deployed on the Workers Paid plan.

#### Scenario: Build output with voice as static assets
- **WHEN** the build runs with `--voice static`
- **THEN** `_site/voice/` holds every file the index names, and the build checks the output against the 100,000-file limit

### Requirement: Within the host's limits
The build SHALL fail when the output has more files than the plan allows (20,000 on Workers Free, 100,000 on Workers Paid, chosen with the voice option), a file larger than 25 MiB, more than 100 header rules, a header line longer than 2,000 characters, or more than 2,000 static redirects.

#### Scenario: An oversized file
- **WHEN** a 30 MiB file is added to the publishable files
- **THEN** the build fails and names it
