# content-security Specification

## Purpose
A Content-Security-Policy on the published page, added by the build: scripts run only from this site and, by hash, from the build's own inline scripts, so a script injected through a bug or a third party cannot run or act as a Player.

## Requirements

### Requirement: The published page carries a Content-Security-Policy
Every HTML page the site serves SHALL be sent with a `Content-Security-Policy` response header, built for that page and written by the build into `_headers`: this origin by default, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, `report-to csp` and `report-uri /_csp`, and no `'unsafe-inline'`, `'unsafe-eval'`, scheme or wildcard script source. Neither the source in git nor a published page SHALL carry a policy `<meta>`.

#### Scenario: Built page
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/_headers` holds a policy for `/`, `/play/`, `/import/` and each grown-up page, and no published HTML file has a policy `<meta>`

#### Scenario: A policy committed to the source
- **WHEN** a page in git contains a Content-Security-Policy `<meta>`
- **THEN** the build fails and says the source must not carry it

#### Scenario: Framing
- **WHEN** another site puts `https://learnvedicmath.com/play/` in an iframe
- **THEN** the browser refuses to show it

### Requirement: Inline scripts run only by hash
Every inline script of the published page, the import map included, SHALL be allowed by its sha256, computed by the build. Any other inline script, inline event handler attribute or `javascript:` URL SHALL be blocked, and the build SHALL fail if the page has an inline event handler attribute or a `javascript:` URL.

#### Scenario: The page's own inline scripts
- **WHEN** a Player opens the published page
- **THEN** the color scheme script, the import map and the color mode buttons work, with no policy violation

#### Scenario: An injected inline script
- **WHEN** a script element with inline code is added to the page at run time
- **THEN** it does not run and a `securitypolicyviolation` event reports `script-src`

#### Scenario: An inline handler in the source
- **WHEN** `index.html` has an `onclick="..."` attribute or a `javascript:` link
- **THEN** the build fails

### Requirement: Only the origins the app uses are allowed
Beyond this origin, the policy SHALL allow only the hosts in the build's third-party list: `https://www.youtube-nocookie.com` frames, the learnvedicmath GoatCounter endpoint, Cloudflare Web Analytics, `data:` images, workers from this origin, and the leaderboard hosts of the next requirement. It SHALL NOT allow `https://i.ytimg.com`, `https://www.gstatic.com/firebasejs/`, `https://gc.zgo.at` or any sbmadhav.com host.

#### Scenario: Every main route
- **WHEN** a Player opens home, Learn, a Grade, a Skill, the Dojo, the Arena, Games, a game, the Sutras, Watch, Me and a Star round
- **THEN** no `securitypolicyviolation` event fires

#### Scenario: A video plays in the page
- **WHEN** a Player opens a video on the Watch shelf and presses play
- **THEN** the thumbnail shows from this site, the YouTube player frame loads, and no `securitypolicyviolation` event fires

#### Scenario: The natural voice worker
- **WHEN** the natural voice worker starts from its import map URL
- **THEN** it starts with no violation, and its library and model downloads are governed by the worker's own policy, not the page's

### Requirement: Leaderboard hosts follow the configuration
While `js/cloud-config.js` configures leaderboards, the policy of `/play/` SHALL allow the Firestore and Auth hosts, including Auth's helper script and its frame on the configured `authDomain`; while App Check is configured, it SHALL also allow the App Check and reCAPTCHA hosts. The Firebase SDK itself SHALL come from this origin. With leaderboards off the policy SHALL list none of them, and pages other than `/play/` SHALL never list them.

#### Scenario: World boards
- **WHEN** a Player whose Age answer is 13 or over opens a World board in the Arena
- **THEN** no `securitypolicyviolation` event fires

#### Scenario: Leaderboards off
- **WHEN** `js/cloud-config.js` sets `FIREBASE = null` and the build runs
- **THEN** no policy lists a Firebase or Google host

#### Scenario: The landing page
- **WHEN** the policy for `/` is read
- **THEN** it lists no Firebase, Google or YouTube host
