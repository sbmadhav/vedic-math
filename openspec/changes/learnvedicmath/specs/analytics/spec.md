# Spec Delta

## MODIFIED Requirements

### Requirement: Events carry no identifiers
No route view or event SHALL contain a Player id, Nickname, avatar, Score, Age answer, Board identity, seed, typed text, any part of a hand-off payload or fragment, or anything else that could single out a Player or device. Analytics SHALL set no cookies, store nothing, and send nothing under Do Not Track or Global Privacy Control. The only tools SHALL be GoatCounter (the learnvedicmath site code, its script served from this site) and Cloudflare Web Analytics, never Google Analytics.

#### Scenario: Event contents
- **WHEN** every event the app can send is listed
- **THEN** each path and title is made only of fixed words, route names, game or skill ids, Leagues and the documented buckets

#### Scenario: Global Privacy Control
- **WHEN** the browser sends Global Privacy Control
- **THEN** no analytics request is made

#### Scenario: Only the listed tools
- **WHEN** every request the site makes during a full visit is listed
- **THEN** analytics requests go only to the learnvedicmath GoatCounter endpoint and Cloudflare Web Analytics, and the GoatCounter script loads from this site

## ADDED Requirements

### Requirement: Traffic is counted at the edge without cookies
Every page SHALL report page loads to Cloudflare Web Analytics, which sets no cookie and stores nothing in the browser, and SHALL send nothing to it when Do Not Track or Global Privacy Control is on.

#### Scenario: A page load
- **WHEN** a visitor without Do Not Track opens `/parents/`
- **THEN** one Cloudflare Web Analytics beacon is sent and no cookie is set

### Requirement: Hand-off results are counted
The import page SHALL send one `math/handoff/<result>` event per visit, where the result is one of accepted, replaced, kept, declined, invalid, too-big or popup, and only after the fragment has been removed. The moved page and the export page on sbmadhav.com SHALL each send one count of the form `move/handoff/<sent|empty|too-big>` and `move/export/<sent|empty>`. None of them SHALL carry anything else.

#### Scenario: Accepted hand-off
- **WHEN** a Player chooses Bring it on the import page
- **THEN** exactly one `math/handoff/accepted` event is sent, after the address bar shows `/import/`
