# parent-note Specification

## Purpose
Tell grown-ups exactly what the World boards send and keep, in plain words, wherever World boards appear.

## Requirements

### Requirement: Where the parent note appears
The parent note SHALL appear next to every World board and on the Me page, worded for the current Mode.

#### Scenario: Note beside a World board
- **WHEN** any World board is shown, in any Mode
- **THEN** the parent note is available beside it

### Requirement: The note names every kind of post
The parent note SHALL name every kind of post the app makes (Arena daily round Scores, ranked game round Scores, the weekly Sparks total) and SHALL name nothing the app does not send.

#### Scenario: Note matches what is sent
- **WHEN** the parent note is compared with every request the app can send to World boards
- **THEN** each kind of post appears in the note, and the note mentions no other

### Requirement: The note states consent, identity and keeping
The parent note SHALL state that nothing is posted before the Age answer, nothing for a Player under 13 before the Parent step, and that no identity exists until the first post. It SHALL list the fields an entry holds, say that entries are not deleted automatically, and say how to ask for removal.

#### Scenario: Note for an under-13 Player without the Parent step
- **WHEN** a grown-up opens the note for an under-13 Player who does not have the Parent step
- **THEN** it says nothing is being posted for this Player and how to turn World boards on

### Requirement: The note says the ID belongs to one Player
The parent note SHALL say that the random ID behind World board entries belongs to one Player on this browser, that each Player on the device gets their own when they first post, and that removing a Player forgets their ID on this device without deleting their entries.

#### Scenario: Grown-up reads the note on a shared tablet
- **WHEN** a grown-up opens the parent note on a device with several Players
- **THEN** it says each Player who posts has their own random ID and their own entries, and it does not say the ID belongs to the browser

#### Scenario: Note explains removing a Player
- **WHEN** a grown-up reads the note
- **THEN** it says removing a Player forgets their ID on this device, and that entries already posted stay until removal is requested

### Requirement: The note mentions anonymous usage counts
The parent note SHALL say that the site counts anonymous visits and actions to improve the app, with no cookies, no IDs and no names, and that this is separate from World boards.

#### Scenario: Grown-up reads the note
- **WHEN** a grown-up opens the parent note in any Mode
- **THEN** it says usage is counted anonymously without cookies or IDs, separately from World boards

### Requirement: The note explains Sparks and Practice
The parent note SHALL state that Sparks from all play, Practice included, add up to one weekly total that is posted, and that Practice Scores never leave the device. It SHALL NOT mention XP.

#### Scenario: A parent reads about Practice
- **WHEN** a grown-up reads the note
- **THEN** it does not say Practice keeps everything on the device without also saying its Sparks count toward the posted weekly total

### Requirement: The note mentions videos
The parent note SHALL say, in one sentence, that videos come from YouTube in privacy-enhanced mode and that YouTube's own rules apply once one plays. Videos SHALL stay available without the Parent step.

#### Scenario: Grown-up reads the note
- **WHEN** a grown-up opens the parent note in any Mode
- **THEN** it says videos play from YouTube in privacy-enhanced mode and YouTube's rules apply once one plays

#### Scenario: Under 13 without the Parent step
- **WHEN** an under-13 Player without the Parent step opens a video
- **THEN** it plays
