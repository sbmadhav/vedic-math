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
The parent note SHALL name every kind of post the app makes (Arena daily round Scores, ranked game round Scores, the weekly XP total) and SHALL name nothing the app does not send.

#### Scenario: Note matches what is sent
- **WHEN** the parent note is compared with every request the app can send to World boards
- **THEN** each kind of post appears in the note, and the note mentions no other

### Requirement: The note explains XP and Practice
The parent note SHALL state that XP from all play, Practice included, adds up to one weekly total that is posted, and that Practice Scores never leave the device.

#### Scenario: A parent reads about Practice
- **WHEN** a grown-up reads the note
- **THEN** it does not say Practice keeps everything on the device without also saying its XP counts toward the posted weekly total

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
