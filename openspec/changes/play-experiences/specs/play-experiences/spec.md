# Spec Delta

## Purpose

Ways to play where math is what you do: twelve experiences inside the existing sections of the app.

## ADDED Requirements

### Requirement: Experiences live inside sections
The system SHALL offer twelve play experiences, each a page under an existing section (Dojo, Arena, Games or Sutras) at `#/<section>/<name>`, with no new item in the main navigation. Each page SHALL have a Back link to its section, and the section's nav item SHALL show as current.

#### Scenario: Opening Tala Lab
- **WHEN** a Player opens `#/games/tala`
- **THEN** Tala Lab shows, Games is current in the nav, and Back returns to `#/games`

### Requirement: Section shelves by Mode
The Dojo, Arena, Games and Sutras pages SHALL list their experiences for the Player's Mode. Experiences of sections hidden in Explorer (Dojo and Sutras) SHALL NOT be listed for Explorer.

#### Scenario: Explorer Games page
- **WHEN** an Explorer opens Games
- **THEN** the shelf lists Tala Lab, Mandala Studio, Pattern Wall, Teach the Apprentice, Estimation Bets and Math Lens

### Requirement: Party Mode replaces the Duel
Party Mode SHALL let two to four Players play on one screen, each answering questions at their own Mode. `#/duel` SHALL open Party Mode, and finishing a Party game SHALL count toward the Party host badge.

#### Scenario: An old Duel link
- **WHEN** a Player opens `#/duel`
- **THEN** the address becomes `#/arena/party` and Party Mode shows

### Requirement: Per Player state
Each experience SHALL keep its progress for the active Player only, so Players sharing a device keep separate progress.

#### Scenario: Switching Player
- **WHEN** a second Player on the same device opens Daily Number
- **THEN** they see their own puzzles' progress, not the first Player's

### Requirement: Sparks from play, capped
Finishing a puzzle, lock, round, chapter or discovery in an experience SHALL earn Sparks, at most 150 a day from experiences per Player.

#### Scenario: The daily cap
- **WHEN** a Player has earned 150 Sparks from experiences today
- **THEN** further play today earns no more Sparks from experiences

### Requirement: Nothing personal leaves the device
Experiences SHALL NOT send anything to the leaderboards. Share links SHALL carry only puzzle or piece parameters, times, and names built from fixed word lists, never typed text. Math Lens SHALL process camera frames on the device only, never store or send an image, and SHALL be fully playable without the camera.

#### Scenario: Sharing a ghost
- **WHEN** a Player sends their ghost to a friend
- **THEN** the link holds the seed, answer times and an optional nickname from the word lists, and nothing else

#### Scenario: A typed plate in a share link
- **WHEN** a Player types a plate with other words in Math Lens and shares it
- **THEN** the link and the message hold only its digits

### Requirement: Camera and microphone only while in use
Math Lens (camera) and Tala Lab (microphone) SHALL ask for the device only after the Player taps to turn it on, next to a line saying what it is used for, and SHALL use it on the device only, never recording, storing or sending a picture or a sound. Every track SHALL stop when the Player leaves the page, when the page is hidden, and on any error.

#### Scenario: Camera left on in a hidden tab
- **WHEN** a Player has turned on the camera in Math Lens and switches to another tab
- **THEN** every camera track is stopped, and the Player turns it on again with one tap

#### Scenario: Microphone and a route change
- **WHEN** a Player has turned on the microphone in Tala Lab and opens another page or hides the tab
- **THEN** every microphone track is stopped

### Requirement: A removed Player's play progress goes with them
Removing a Player from the device SHALL remove that Player's experience progress, and only theirs.

#### Scenario: Removing a child's Player
- **WHEN** a parent removes a Player on the Me page
- **THEN** that Player's Daily Number, Pattern Wall and other experience progress is no longer stored on the device

### Requirement: Experiences work offline
Once the app has been opened online, every experience page SHALL open offline.

#### Scenario: Tala Lab offline
- **WHEN** a Player who opened the app before is offline and opens `#/games/tala`
- **THEN** Tala Lab shows
