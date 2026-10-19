# Spec Delta

## Purpose

Send the response headers a children's site needs on every page, collect policy violations without collecting people, and say how to report a security problem.

## ADDED Requirements

### Requirement: Security headers on every response
Every response SHALL carry `Strict-Transport-Security: max-age=63072000; includeSubDomains` (without `preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Resource-Policy: same-origin` and `X-Frame-Options: DENY`, written by the build into `_headers`.

#### Scenario: Any page
- **WHEN** `https://learnvedicmath.com/play/` is requested
- **THEN** the response carries each of these headers with these values

### Requirement: Powerful features are off
Every response SHALL carry a `Permissions-Policy` that turns off geolocation, payment, USB, serial, Bluetooth and interest-based ad topics, and allows fullscreen, autoplay, encrypted media and picture-in-picture only for this site and `https://www.youtube-nocookie.com`. Every page except the game SHALL also turn off camera and microphone; the game page (`/play/`) SHALL allow them for this site only, for Math Lens (camera) and Tala Lab (microphone).

#### Scenario: Camera on a grown-up page
- **WHEN** a script on `/parents/` asks for the camera
- **THEN** the browser refuses without asking the Player

#### Scenario: Camera in the game
- **WHEN** the Player taps Turn on the camera in Math Lens on `/play/`
- **THEN** the browser asks the Player for the camera, and a frame from another origin cannot use it

### Requirement: Opener isolation
Every page SHALL send `Cross-Origin-Opener-Policy: same-origin`, except `/import/`, which SHALL send `same-origin-allow-popups` so the export popup can answer it.

#### Scenario: The game page
- **WHEN** `/play/` is requested
- **THEN** it carries `Cross-Origin-Opener-Policy: same-origin`

#### Scenario: The import page
- **WHEN** `/import/` opens the export popup and the popup posts its message
- **THEN** the import page receives it

### Requirement: Policy violations are reported
Every HTML response SHALL send `Reporting-Endpoints: csp="/_csp"`; its enforced policy SHALL name `report-to csp` and `report-uri /_csp`, and its Report-Only policy `report-to csp` only.

#### Scenario: A preview reports to itself
- **WHEN** a page of a branch preview on `workers.dev` blocks a script
- **THEN** the report goes to that preview's `/_csp`, not to learnvedicmath.com

### Requirement: The report endpoint keeps nothing personal
The `/_csp` endpoint SHALL accept only POSTs of CSP reports up to 8 KB and answer 204, SHALL log only the directive, the blocked origin (or `inline` or `eval`), the page path without query or fragment, the disposition and the browser family, and SHALL NOT log the IP address, full URLs, the referrer or the script sample.

#### Scenario: A blocked script
- **WHEN** a script from a host the policy does not allow is blocked on `/play/`
- **THEN** one log line records `script-src-elem`, that host's origin and `/play/`, and nothing else about the visitor

#### Scenario: Anything else
- **WHEN** a GET, or a POST larger than 8 KB, is sent to `/_csp`
- **THEN** it is refused and nothing is logged

### Requirement: A stricter policy is tried before it is enforced
Every HTML page SHALL also send a `Content-Security-Policy-Report-Only` policy with `style-src 'self'` and `require-trusted-types-for 'script'`, reporting to the same endpoint through `report-to`, so its reports can be reviewed before it is enforced in a later change.

#### Scenario: Report-only violation
- **WHEN** a view sets a `style=""` attribute
- **THEN** it renders as before and a report-only violation reaches `/_csp`

### Requirement: security.txt
The site SHALL serve `/.well-known/security.txt` (RFC 9116) with a `Contact: mailto:security@learnvedicmath.com`, an `Expires` date less than a year ahead, `Preferred-Languages: en`, `Canonical: https://learnvedicmath.com/.well-known/security.txt` and a `Policy` link to the site's security page. The build SHALL fail when `Expires` is less than 30 days away.

#### Scenario: Expiring soon
- **WHEN** the build runs 20 days before the `Expires` date
- **THEN** it fails and says to renew security.txt
