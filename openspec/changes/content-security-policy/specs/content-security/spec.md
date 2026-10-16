## ADDED Requirements

### Requirement: The published page carries a Content-Security-Policy
The published `index.html` SHALL carry a `<meta http-equiv="Content-Security-Policy">` before its first script, and a `<meta name="referrer" content="strict-origin-when-cross-origin">`. The policy SHALL default to this origin only, SHALL set `object-src 'none'`, `base-uri 'self'` and `form-action 'self'`, and SHALL NOT allow `'unsafe-inline'`, `'unsafe-eval'` or any scheme or wildcard source for scripts. The source in git SHALL carry no policy; the build adds it.

#### Scenario: Built page
- **WHEN** `python3 build.py --out _site` runs
- **THEN** `_site/index.html` has the policy right after `<meta charset>`, and `index.html` in git has none

#### Scenario: A policy committed to the source
- **WHEN** `index.html` in git contains a Content-Security-Policy `<meta>`
- **THEN** the build fails and says the source must not carry it

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
Beyond this origin, the policy SHALL allow only `https://www.youtube-nocookie.com` frames and `https://i.ytimg.com` images (Watch shelf and Star round player), `https://sbmadhav.goatcounter.com` (analytics beacons), `data:` images, workers from this origin, and the leaderboard hosts of the next requirement.

#### Scenario: Every main route
- **WHEN** a Player opens home, Learn, a Grade, a Skill, the Dojo, the Arena, Games, a game, the Sutras, Watch, Me and a Star round on the published page
- **THEN** no `securitypolicyviolation` event fires

#### Scenario: A video plays in the page
- **WHEN** a Player opens a video on the Watch shelf
- **THEN** the thumbnails show, the YouTube player frame loads, and no `securitypolicyviolation` event fires

#### Scenario: The natural voice worker
- **WHEN** the natural voice worker starts from its import map URL
- **THEN** it starts with no violation, and its library and model downloads are governed by the worker's own policy, not the page's

### Requirement: Leaderboard hosts follow the configuration
While `js/cloud-config.js` configures leaderboards, the policy SHALL allow the Firebase SDK, Firestore and Auth hosts, including Auth's helper script and its frame on the configured `authDomain`; while App Check is configured, it SHALL also allow the App Check and reCAPTCHA hosts. With leaderboards off it SHALL list none of them.

#### Scenario: World boards
- **WHEN** a Player opens the Arena and its World board loads through the Firebase SDK
- **THEN** no `securitypolicyviolation` event fires

#### Scenario: Leaderboards off
- **WHEN** `js/cloud-config.js` sets `FIREBASE = null` and the build runs
- **THEN** the policy lists no Firebase or Google host
