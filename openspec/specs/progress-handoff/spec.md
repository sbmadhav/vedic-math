# progress-handoff Specification

## Purpose
Move each device's progress from sbmadhav.com/vedic-math/ to learnvedicmath.com once, on the device, with no server, and never accept untrusted data without checking it and asking first.

## Requirements

### Requirement: The moved page (Phase B)
During Phase B, `https://sbmadhav.com/vedic-math/` and its not-found page SHALL be a "Vedic Math has moved" page. It SHALL unregister any service worker whose scope is `/vedic-math/`, delete only caches whose names start with `vedic-math-`, pack this device's progress, record `vm.migratedAt` on this origin, and replace itself with `https://learnvedicmath.com/import/#v=1&d=<payload>&r=<route>`, or with `https://learnvedicmath.com/play/` plus the route when no Players are stored.

#### Scenario: A Player with progress
- **WHEN** a Player with saved progress opens `https://sbmadhav.com/vedic-math/#/arena`
- **THEN** the old worker is unregistered, `vedic-math-*` caches are gone, `madhav-*` caches are untouched, and the browser is on `https://learnvedicmath.com/import/` with no fragment left in the address bar

#### Scenario: An empty device
- **WHEN** a visitor with no saved Players opens `https://sbmadhav.com/vedic-math/#/arena`
- **THEN** they land on `https://learnvedicmath.com/play/#/arena`

#### Scenario: JavaScript off
- **WHEN** the moved page is opened with JavaScript off
- **THEN** it sends the visitor to `https://learnvedicmath.com/` at once

### Requirement: The moved page stays minimal
The moved page SHALL keep a visible link to the new site, carry `<link rel="canonical" href="https://learnvedicmath.com/">` and a `<noscript>` instant refresh to `https://learnvedicmath.com/`, and SHALL load no app module, no Firebase code and no analytics other than one hand-off count.

#### Scenario: What the moved page loads
- **WHEN** the moved page runs
- **THEN** it requests no file under `/vedic-math/js/` other than its own packer, nothing from Firebase, and sends one hand-off count

### Requirement: Only listed data moves
The payload SHALL hold only what the shared hand-off schema lists: each Player's id, Nickname, avatar color, Mode, created time and Age answer; their progress record; optionally their play-experience records (plain data only); and the listed device settings. It SHALL NOT hold World board identities, Firebase data, the Parent step, Device board entries or analytics milestones. A test SHALL fail when a `vm.*` key used in the app is in neither the moved nor the excluded list.

#### Scenario: A device still on the oldest saved format
- **WHEN** the moved page runs on a device that has a bare `mathquest.v1` record with progress and no `vm.players`
- **THEN** it packs that record as one Player (id `p1`, a Nickname made from the word lists, avatar teal) and hands it off like any other, instead of treating the device as empty

#### Scenario: Identities stay behind
- **WHEN** a device whose Player has posted to World boards is handed off
- **THEN** the payload holds no Firebase id and no `parentOk`

### Requirement: The payload is small
The payload SHALL be gzip-compressed and base64url-encoded, SHALL travel only in the URL fragment (never a query string), and SHALL be at most 32 KB. Over that, the moved page SHALL leave out optional parts, the biggest first, until it fits, and the import page SHALL name them. Still over 32 KB, the moved page SHALL NOT redirect with data; it SHALL say the progress stays on the old site and link to the new one.

#### Scenario: Big extras
- **WHEN** a device's play-experience records make the payload over 32 KB
- **THEN** the redirect carries the Players and their progress without those records, and the import page says the game extras stay on the old site

#### Scenario: A very large record
- **WHEN** the packed payload would be over 32 KB even without the optional parts
- **THEN** no redirect with data happens, and the page says the progress stays here and shows a "Go to learnvedicmath.com" link

### Requirement: The fragment is removed first
The import page SHALL copy and remove the fragment from the address bar (with `history.replaceState`) in its first inline script, before any other script, analytics included, runs. The fragment SHALL never be sent anywhere.

#### Scenario: Analytics never sees the payload
- **WHEN** the import page opens with a payload in its fragment
- **THEN** the address bar shows `/import/` before any analytics request is made, and no request leaving the device contains the payload

### Requirement: Strict validation
The import page SHALL decompress at most 256 KB, parse inside a guard, and accept the payload only if it matches the hand-off schema exactly: version 1, only known keys, the right types, numbers in range, ids and Nicknames in the allowed forms, and entry counts under the caps. A payload that fails SHALL import nothing and say "This link did not carry progress we can use", with a button to play. No value from a payload SHALL be inserted as HTML.

#### Scenario: A crafted link
- **WHEN** someone opens `/import/` with a payload whose Nickname is `<img src=x onerror=alert(1)>`
- **THEN** nothing is written, no script runs, and the page says the link carried no usable progress

#### Scenario: A huge payload
- **WHEN** the payload decompresses to more than 256 KB
- **THEN** decompression stops and nothing is written

### Requirement: Ask before importing
A valid payload SHALL be imported only after the person chooses on a prompt ("Bring your progress from the old site?") that lists each Player's Nickname and Sparks. With no progress here, it SHALL offer "Bring it" and "Not now"; with progress here, "Keep this device's", "Use the old site's" and "Keep both", never overwriting without that choice. "Not now" and "Keep this device's" SHALL write nothing. After importing it SHALL record `vm.migratedAt` and open `/play/` with the original route.

#### Scenario: A first hand-off
- **WHEN** a valid payload with two Players arrives on a device with no Players here, and the Player chooses Bring it
- **THEN** both Players, their progress and settings are saved, and the game opens on the original route

#### Scenario: Existing progress here
- **WHEN** a valid payload arrives on a device that already has progress here, and the person chooses Keep this device's
- **THEN** nothing on this device changes

#### Scenario: Age answer under 13
- **WHEN** a Player whose Age answer is 10 and who had the Parent step on sbmadhav.com is imported
- **THEN** their Age answer is kept, the Parent step is not, and their Scores stay on the Device board

### Requirement: Keep both keeps Players whole
"Keep both" SHALL add the old site's Players next to this device's as separate Players, never merging one Player's progress into another's. An id already used here, or one with a World board identity on this device, SHALL get a new id. This device's settings SHALL win. It SHALL be offered only while the total stays within the Player cap. "Use the old site's" SHALL remove this device's Players, their progress and the Device board, as the Me page's remove does.

#### Scenario: Keep both
- **WHEN** a valid payload whose Player is p1 arrives on a device whose p1 has progress, and the person chooses Keep both
- **THEN** this device's p1 is unchanged, and the old site's Player is added under a new id with their own progress

### Requirement: The export page
`https://sbmadhav.com/vm-export/` SHALL exist permanently in the user-site repo. Opened as a popup by a click on the import page, it SHALL answer only a request message whose origin is `https://learnvedicmath.com`, post the same payload with that exact target origin, and close. Opened any other way it SHALL send nothing and link to the new site. It SHALL keep working after the Phase C redirect.

#### Scenario: Late hand-off
- **WHEN** a Player in Phase C taps "Bring my progress from sbmadhav.com" on `/import/`
- **THEN** a popup opens on sbmadhav.com, the import page receives the payload and shows the prompt, and the popup closes

#### Scenario: Another site asks
- **WHEN** a page on any other origin opens the export page and asks for the payload
- **THEN** the export page sends nothing

### Requirement: Backup code for every Player
The Me page's backup code SHALL hold every Player on the device in the hand-off payload format, and Restore from code SHALL accept it, and old single-Player codes, only through the same validation and prompt.

#### Scenario: Restore a family's code
- **WHEN** a grown-up pastes a backup code with three Players into Restore from code
- **THEN** the prompt lists the three Players and imports them only after Bring it

#### Scenario: A malformed code
- **WHEN** someone pastes text that is not a valid code
- **THEN** nothing changes and the Me page says the code could not be used

### Requirement: The old worker is retired
The Phase B deploy of the old origin SHALL publish `sw.js` with `KILL = true` and a built `VERSION`, so a browser that checks for an update deletes every `vedic-math-*` cache and unregisters the old worker.

#### Scenario: A tab that never reaches the moved page
- **WHEN** a browser with the old worker checks `/vedic-math/sw.js` for an update during Phase B
- **THEN** the KILL worker installs, deletes the `vedic-math-*` caches and unregisters itself

### Requirement: Permanent redirect (Phase C)
From Phase C, every `https://sbmadhav.com/vedic-math/*` request SHALL answer with a 301 to the same path and query on learnvedicmath.com, without the `/vedic-math/` prefix, and a daily check SHALL fail when it does not. Phase C SHALL count as done only once that check passes; until then the moved page SHALL stay in place, and if GitHub's custom-domain redirect does not give the 301, the redirect SHALL be made another way (design D13) without changing where learnvedicmath.com is hosted.

#### Scenario: GitHub does not redirect
- **WHEN** the custom domain is set on the Pages site but `https://sbmadhav.com/vedic-math/x` does not answer with that 301 within 24 hours
- **THEN** the custom domain is removed again, the moved page keeps serving, and the fallback redirect of design D13 is used instead

#### Scenario: Daily check
- **WHEN** the daily run requests `https://sbmadhav.com/vedic-math/x?y=1`
- **THEN** the answer is a 301 whose Location is `learnvedicmath.com/x?y=1` (http or https)
