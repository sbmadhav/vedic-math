# Spec Delta

## ADDED Requirements

### Requirement: The note says the ID belongs to one Player
The parent note SHALL say that the random ID behind World board entries belongs to one Player on this browser, that each Player on the device gets their own when they first post, and that removing a Player forgets their ID on this device without deleting their entries.

#### Scenario: Grown-up reads the note on a shared tablet
- **WHEN** a grown-up opens the parent note on a device with several Players
- **THEN** it says each Player who posts has their own random ID and their own entries, and it does not say the ID belongs to the browser

#### Scenario: Note explains removing a Player
- **WHEN** a grown-up reads the note
- **THEN** it says removing a Player forgets their ID on this device, and that entries already posted stay until removal is requested
