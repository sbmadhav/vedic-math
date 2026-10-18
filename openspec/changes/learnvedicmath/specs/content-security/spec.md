# Spec Delta

## MODIFIED Requirements

### Requirement: The published page carries a Content-Security-Policy
Every HTML page the site serves SHALL be sent with a `Content-Security-Policy` response header, built for that page and written by the build into `_headers`. The policy SHALL default to this origin only, SHALL set `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, `report-to csp` and `report-uri /_csp`, and SHALL NOT allow `'unsafe-inline'`, `'unsafe-eval'` or any scheme or wildcard source for scripts. Neither the source in git nor the published pages SHALL carry a Content-Security-Policy `<meta>`.

#### Scenario: Built page
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/_headers` holds a policy for `/`, `/play/`, `/import/` and each grown-up page, and no published HTML file has a policy `<meta>`

#### Scenario: A policy committed to the source
- **WHEN** a page in git contains a Content-Security-Policy `<meta>`
- **THEN** the build fails and says the source must not carry it

#### Scenario: Framing
- **WHEN** another site puts `https://learnvedicmath.com/play/` in an iframe
- **THEN** the browser refuses to show it

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
