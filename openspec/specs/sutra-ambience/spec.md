# sutra-ambience Specification

## Purpose
A very mild, optional Sutra ambience (a soft bowl strike, an optional hum, an opt-in Om) while learning the Sutras, always silent when sound is not wanted and stopped on leaving.

## Requirements

### Requirement: Bowl strike on the Sutra pages
When Sutra ambience is on, the system SHALL play one soft singing-bowl strike, synthesized with Web Audio, when the Sutra page (`#/sutras`) renders and when a Sutra deep dive opens, at most once every 4 seconds. Turning Sutra ambience on SHALL play one strike at once as feedback for the toggle; that strike is outside the 4 second gap, which applies to page renders and deep dive openings. Sound SHALL start only after a user gesture on the page: without one, the strike waits for the first pointer or key press and is skipped if none comes, or if that gesture is on a Say it or Ambience button.

#### Scenario: Opening a deep dive
- **WHEN** a Player with Sutra ambience on taps a card's Learn more
- **THEN** one bowl strike plays with a slow fade

#### Scenario: Paging quickly
- **WHEN** a Player moves to the next deep dive twice within 4 seconds
- **THEN** only the first opening strikes

#### Scenario: Fresh load on the page
- **WHEN** the browser loads `#/sutras` directly and the Player has not touched the page
- **THEN** no sound plays and no AudioContext is started until the first tap or key press

### Requirement: Optional hum
When Low hum is on (it is off by default) and Sutra ambience is on, the system SHALL play a very quiet low hum while the Player is on the Sutra pages, fading in over at least 4 seconds and out over at least 1 second.

#### Scenario: Hum on
- **WHEN** a Player turns on Low hum on the Me page and opens `#/sutras`
- **THEN** after the first gesture a hum fades in and keeps playing while they read

### Requirement: Opt-in Om
The system SHALL offer a Chanted Om switch, off by default. When it is on, the Om recording SHALL play instead of the bowl strike, and instead of the hum when Low hum is on. The recording SHALL be loaded only when the switch is on.

#### Scenario: Om off by default
- **WHEN** a Player who never changed the setting opens `#/sutras`
- **THEN** no Om recording is requested

#### Scenario: Om on
- **WHEN** a Player turns on Chanted Om and opens a deep dive
- **THEN** the Om plays once instead of the bowl strike

### Requirement: Ambience can always be turned off
The Sutra page and the deep dive SHALL show an Ambience toggle button (`aria-pressed`) that turns Sutra ambience on or off at once, and the Me page SHALL have the same setting with Low hum and Chanted Om. Turning it off SHALL fade out any ambience within 2 seconds.

#### Scenario: Turning it off on the page
- **WHEN** the hum is playing and the Player presses the Ambience button
- **THEN** the hum fades out, the button shows off, and the setting stays off on the next visit

### Requirement: Ambience stays silent when sound is not wanted
The system SHALL play no ambience when Sound effects is off, when Calm is on, when Pause motion is on, or when the site's Calm music is playing as the Sutra page opens; in the last case the music SHALL keep playing. If Calm music starts while the ambience plays, the ambience SHALL fade out. Reduced motion SHALL NOT affect the ambience.

#### Scenario: Calm music already playing
- **WHEN** Calm music is playing and the Player opens `#/sutras`
- **THEN** no bowl strike or hum starts and the music keeps playing

#### Scenario: Sound effects off
- **WHEN** Sound effects is off and the Player opens a deep dive
- **THEN** no ambience plays

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion and Sutra ambience is on
- **THEN** the bowl strike still plays after a gesture

### Requirement: Ambience stops on leaving
The ambience SHALL fade out and release its audio nodes when the Player leaves the Sutra pages for another route, and SHALL fade out when the tab is hidden. All of its listeners and timers SHALL be tied to the Sutra view's AbortSignal.

#### Scenario: Route change
- **WHEN** the hum is playing and the Player goes to `#/dojo`
- **THEN** the hum fades out within 2 seconds and no ambience timer remains

#### Scenario: Tab hidden
- **WHEN** the hum is playing and the tab is hidden
- **THEN** the hum fades out, and when the tab is shown again on a Sutra page it fades back in without a strike
