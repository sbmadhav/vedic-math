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

#### Scenario: A Star
- **WHEN** a Player opens `#/star/sq5/2`
- **THEN** the event is `math/view/star/sq5/star`, without the Star number

### Requirement: Answer events in untimed play
The system SHALL send one `math/q_answered/<area>/<right|miss>` event for each answered question in Practice, Endless runs, Katas, Star rounds (main questions, rematches and Dares) and a Try a trick (area `try`), and SHALL NOT send per-answer events during timed rounds.

#### Scenario: Practice answer
- **WHEN** a Player answers a Practice question right on the first try
- **THEN** one `math/q_answered/practice/right` event is sent

#### Scenario: Arena answers
- **WHEN** a Player answers 30 questions in an Arena round
- **THEN** no per-answer event is sent, and one `round_end` event is sent when the round ends

#### Scenario: Star answer
- **WHEN** a Player misses a main question in a Star and gets the rematch right
- **THEN** `math/q_answered/star/miss` and then `math/q_answered/star/right` are sent

#### Scenario: Try a trick answer
- **WHEN** a new visitor answers the first question of a Try a trick right
- **THEN** one `math/q_answered/try/right` is sent, and on a new device the first `math/first_win/<bucket>` follows

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

### Requirement: Listening to a verse is counted
Each Listen tap that starts speech SHALL send one anonymous event `math/sloka/listen`, with no verse id, voice or other value.

#### Scenario: Listen
- **WHEN** a Player taps Listen on any verse
- **THEN** exactly `math/sloka/listen` is sent once

### Requirement: Star Quest counts
The system SHALL send one anonymous event when a Star is lit in a round (`math/star/lit/<trick>`), when a Star is skipped (`math/star/skipped/<trick>`), on each Comeback (`math/star/comeback/<trick>`), when a Dare is taken (`math/star/dare_taken/<trick>`) and when a Dare is won (`math/star/dare_won/<trick>`). `<trick>` SHALL be a Trick id from the catalog. Stars lit by the one-time migration of Kata progress SHALL send nothing. These events SHALL follow "Events carry no identifiers".

#### Scenario: A round with a Comeback that lights the Star
- **WHEN** a Player misses once, makes a Comeback and lights Star 1 of `sq5`
- **THEN** `math/star/comeback/sq5` and `math/star/lit/sq5` are each sent once

#### Scenario: A Dare lost
- **WHEN** a Player takes a Dare on `by11` and misses it
- **THEN** `math/star/dare_taken/by11` is sent and `math/star/dare_won/by11` is not

#### Scenario: Migration
- **WHEN** a Player's Kata progress lights 12 Stars on first load
- **THEN** no `math/star/lit` event is sent for them

### Requirement: Sky views are counted
When home shows the Sky, its route view SHALL be `math/view/sky` instead of `math/view/home`, and the All places menu SHALL be counted as `math/view/places`.

#### Scenario: Home with the Sky on
- **WHEN** a Pro Player with the Sky on opens `#/`
- **THEN** one `math/view/sky` event is sent and no `math/view/home`

### Requirement: Guide and tour counts
Opening the guide SHALL be counted as a route view, `math/view/guide`, or `math/view/guide/section` when opened at a section, without the section's name. The tour SHALL send `math/tour/start` when it opens, and then exactly one of `math/tour/finish` (Done on the last step) or `math/tour/skip` (Skip tour, Escape, or leaving Home while it is open). These events SHALL follow "Events carry no identifiers".

#### Scenario: Guide at a section
- **WHEN** a Player opens `#/guide/katas`
- **THEN** one `math/view/guide/section` event is sent

#### Scenario: Tour finished
- **WHEN** a Player goes through every step of the tour and presses Done
- **THEN** `math/tour/start` and `math/tour/finish` are each sent once, and no `math/tour/skip`

#### Scenario: Tour skipped with Escape
- **WHEN** a Player presses Escape on the second step
- **THEN** `math/tour/start` and `math/tour/skip` are each sent once

### Requirement: Say it is counted
Each tap on a Say it button whose name clip starts playing SHALL send one anonymous `math/say/sutra` event titled "Say a Sutra name". The event SHALL NOT name the Sutra, the voice or the Mode, and SHALL follow "Events carry no identifiers".

#### Scenario: Two taps
- **WHEN** a Player taps Say it for Sutra 1, its clip starts playing, and then the Player taps Say it for Sutra 3 and that clip starts playing too
- **THEN** two `math/say/sutra` events are sent, identical, with no Sutra id in path or title

#### Scenario: Stopping is not counted
- **WHEN** a Player taps a playing Say it button to stop it
- **THEN** no event is sent

#### Scenario: A clip that never plays is not counted
- **WHEN** a Player taps Say it and the clip cannot be fetched or decoded, so the device voice reads the respelling instead
- **THEN** no event is sent

### Requirement: Play experience events
Route views of a play experience SHALL be counted as `math/view/play/<name>`, never including the params after the name. Experiences SHALL send only `math/play/<experience>/<action>` events made of fixed words, with no score, count, seed, time or typed text in the path or title.

#### Scenario: A shared ghost link
- **WHEN** a Player opens `#/arena/ghosts/r/<code>`
- **THEN** the route view sent is `math/view/play/ghosts`

### Requirement: Try a trick and Find are counted
Pressing a Try a trick button (on the Mode picker or a Home card) SHALL send one `math/try/start` and one `math/try/mode/<mode>`, `<mode>` being the fixed word `explorer`, `challenger` or `pro`; opening it is the route view `math/view/try`. Following a Find result SHALL send one `math/find/go`, whatever the kind or result, and opening Find is the route view `math/view/find`. These follow "Events carry no identifiers": no Find text, result name or result count is ever in an event.

#### Scenario: Try a trick
- **WHEN** a new visitor presses Try a trick under the Pro card
- **THEN** `math/try/start` and `math/try/mode/pro` are sent once each, followed by the route view `math/view/try`, and no event names the Player

#### Scenario: A Find result
- **WHEN** a Player types "squares" in Find and follows the first result
- **THEN** exactly one `math/find/go` is sent, with no path or title containing "squares" or the result's name

#### Scenario: A browse link is not a Find result
- **WHEN** a Player opens Find, or types a word that matches nothing, and follows a link in the browse list
- **THEN** no `math/find/go` is sent
