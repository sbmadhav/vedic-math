# analytics Specification

## Purpose
Count how the app is used, page by page and round by round, with anonymous aggregate events only, so the plan's gates can be measured without identifying anyone.

## Requirements

### Requirement: Route views are counted
The system SHALL send one anonymous route-view event each time a hash route is rendered, named after the route with numeric parts collapsed.

#### Scenario: Opening the Arena
- **WHEN** a Player navigates to `#/arena`
- **THEN** one `math/view/arena` event is sent

#### Scenario: Game level
- **WHEN** a Player opens `#/game/times-sprint/12`
- **THEN** the event is `math/view/game/times-sprint/level`, without the level number

### Requirement: Answer events in untimed play
The system SHALL send one `math/q_answered/<area>/<right|miss>` event for each answered question in Practice, Endless runs and Katas, and SHALL NOT send per-answer events during timed rounds.

#### Scenario: Practice answer
- **WHEN** a Player answers a Practice question right on the first try
- **THEN** one `math/q_answered/practice/right` event is sent

#### Scenario: Arena answers
- **WHEN** a Player answers 30 questions in an Arena round
- **THEN** no per-answer event is sent, and one `round_end` event is sent when the round ends

### Requirement: Round events
The system SHALL send `math/round_end/<area>/<league>/<r1|r2|r3plus>` when a timed round ends, and `math/round2_start/<area>` when a Player starts a second round in the same visit.

#### Scenario: Second Arena round
- **WHEN** a Challenger Player finishes one Arena round and starts and finishes another in the same visit
- **THEN** one `math/round2_start/arena` and two `round_end` events (`.../r1` and `.../r2`) are sent

#### Scenario: Stopped round
- **WHEN** a Player stops a game round or leaves the page before it ends
- **THEN** no `round_end` event is sent for it

### Requirement: Once-per-device milestones
The system SHALL send `math/first_win/<bucket>` once per device on the first right answer, with the time since the device first opened the app in one of five buckets, and `math/return_d1` and `math/return_d7` once per device on a visit 1 day, and 7 to 13 days, after the first visit.

#### Scenario: First win
- **WHEN** a new device gets its first right answer 45 seconds after first opening the app
- **THEN** `math/first_win/30-60` is sent once, and later right answers send no `first_win`

#### Scenario: Return on day 8
- **WHEN** a device first used 8 days ago opens the app
- **THEN** `math/return_d7` is sent once, and a later visit on day 9 sends nothing more

### Requirement: Share clicks
Every share action the app offers SHALL send `math/share_click/<surface>` when used.

#### Scenario: Share button
- **WHEN** a Player taps a share button on a result
- **THEN** one `math/share_click/<surface>` event is sent

### Requirement: Events carry no identifiers
No route view or event SHALL contain a Player id, Nickname, avatar, Score, Age answer, Board identity, seed, typed text or any other value that could single out a Player or device. Analytics SHALL set no cookies and SHALL send nothing when Do Not Track or Global Privacy Control is on.

#### Scenario: Event contents
- **WHEN** every event the app can send is listed
- **THEN** each path and title is made only of fixed words, route names, game or skill ids, Leagues and the documented buckets

#### Scenario: Global Privacy Control
- **WHEN** the browser sends Global Privacy Control
- **THEN** no analytics request is made
