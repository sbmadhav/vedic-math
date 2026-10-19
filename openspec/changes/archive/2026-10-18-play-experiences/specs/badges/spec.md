# Spec Delta

## MODIFIED Requirements

### Requirement: Earned badges are kept
A badge a Player already holds SHALL stay earned when its rule changes.

#### Scenario: Duelist earned under the old rule
- **WHEN** a Player who earned Duelist by pressing Start opens the Me page after this change
- **THEN** the badge is still shown as earned, under its new name Party host

## REMOVED Requirements

### Requirement: Badges are earned by completion or correct use
**Reason**: Its first scenario is about the Duel, which Party Mode replaces (play-experiences).
**Migration**: The same rule is "Badges are earned only by completion or correct use", with a Party Mode scenario.

### Requirement: Duelist
**Reason**: The Duel is replaced by Party Mode (play-experiences).
**Migration**: The badge keeps its id (`duel`) and counter (`duelsDone`) and is now Party host; see "Party host".

## ADDED Requirements

### Requirement: Badges are earned only by completion or correct use
No badge SHALL be awarded for pressing Start, opening a page, or clicking a link. Each badge's description SHALL say exactly what earns it.

#### Scenario: Start a Party game and leave
- **WHEN** a Player starts a Party Mode game and leaves before the podium
- **THEN** the Party host badge is not awarded

#### Scenario: Open the Sutras page
- **WHEN** a Player opens the Sutras page and leaves
- **THEN** the Sutra scholar badge is not awarded

#### Scenario: Click a Watch link
- **WHEN** a Player clicks a video and closes the player within a few seconds
- **THEN** the Video learner badge is not awarded

### Requirement: Party host
The Party host badge SHALL be awarded when a Party Mode game the Player hosts on this device reaches its podium. It keeps the Duelist badge's id, so a Player who held Duelist holds Party host.

#### Scenario: Finish a Party game
- **WHEN** a Party Mode game on this device reaches its podium
- **THEN** the active Player earns the Party host badge
