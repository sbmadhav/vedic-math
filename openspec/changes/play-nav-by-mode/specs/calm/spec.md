# Spec Delta

## MODIFIED Requirements

### Requirement: A Calm switch
The system SHALL offer a Calm switch in the Calm and sound panel of the header on every page of the game, in the header of every play screen and in the Me page settings. It SHALL be off by default, remembered on this device, and the same switch in all three places: turning it on or off in one SHALL show at once in the others.

#### Scenario: Turning Calm on in a game
- **WHEN** a Player turns on Calm in the header of a game's play screen
- **THEN** the Me page shows Calm on, and it is still on after a reload

#### Scenario: Turning Calm on from the header
- **WHEN** a Player on the Dojo page opens Calm in the header and turns the Calm switch on
- **THEN** the page has no motion, the Me page shows Calm on, and nothing else in the panel changed
