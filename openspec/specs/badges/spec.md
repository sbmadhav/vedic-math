# badges Specification

## Purpose
Award badges only for things a Player actually finished or did right, so a badge always means something.

## Requirements

### Requirement: Sutra scholar
The Sutra scholar badge SHALL be awarded when the Player has collected 10 Sutra cards.

#### Scenario: Tenth card
- **WHEN** a Player collects their 10th Sutra card
- **THEN** they earn the Sutra scholar badge

### Requirement: Video learner
The Video learner badge SHALL be awarded when a video has stayed open and playing in the in-page player for at least 60 seconds.

#### Scenario: Watch for a minute
- **WHEN** a Player opens a video in the player and keeps it open for 60 seconds
- **THEN** they earn the Video learner badge

### Requirement: Earned badges are kept
A badge a Player already holds SHALL stay earned when its rule changes.

#### Scenario: Duelist earned under the old rule
- **WHEN** a Player who earned Duelist by pressing Start opens the Me page after this change
- **THEN** the badge is still shown as earned, under its new name Party host

### Requirement: Title badges
The two badges for reaching a Title SHALL be named after it: "Sum Sprinter", earned at 1000 Sparks, and "Fraction Fighter", earned at 3600 Sparks. Their descriptions SHALL name the Title and SHALL NOT mention a level number. They SHALL keep their existing badge ids, so a Player who earned "Level 5" or "Level 10" holds "Sum Sprinter" or "Fraction Fighter".

#### Scenario: Earned before the update
- **WHEN** a Player who earned the Level 10 badge opens the Me page after the update
- **THEN** the badge shows as "Fraction Fighter", earned

#### Scenario: Reaching Fraction Fighter
- **WHEN** a Player's Sparks reach 3600
- **THEN** they earn the Fraction Fighter badge

### Requirement: Belt badges follow Belts
The White belt, Green belt and Black belt badges SHALL be awarded when the Player holds that Belt, and their descriptions SHALL say a Belt is earned by lighting all 9 Stars of its three Tricks. Badges already held SHALL stay earned.

#### Scenario: White belt
- **WHEN** a Player lights the ninth white belt Star
- **THEN** they earn the White belt badge

#### Scenario: Description
- **WHEN** a Player reads the White belt badge on the Me page
- **THEN** it says to light all 9 white belt Stars, and does not say to master the tricks

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
