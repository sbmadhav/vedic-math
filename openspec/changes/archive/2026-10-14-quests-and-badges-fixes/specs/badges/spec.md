# Spec Delta

## Purpose

Award badges only for things a Player actually finished or did right, so a badge always means something.

## ADDED Requirements

### Requirement: Badges are earned by completion or correct use
No badge SHALL be awarded for pressing Start, opening a page, or clicking a link. Each badge's description SHALL say exactly what earns it.

#### Scenario: Start a Duel and leave
- **WHEN** a Player starts a Duel and leaves before anyone reaches 10
- **THEN** the Duelist badge is not awarded

#### Scenario: Open the Sutras page
- **WHEN** a Player opens the Sutras page and leaves
- **THEN** the Sutra scholar badge is not awarded

#### Scenario: Click a Watch link
- **WHEN** a Player clicks a video and closes the player within a few seconds
- **THEN** the Video learner badge is not awarded

### Requirement: Duelist
The Duelist badge SHALL be awarded when a Duel the Player plays on this device ends with a winner.

#### Scenario: Finish a Duel
- **WHEN** a Duel ends with one side reaching 10
- **THEN** the active Player earns the Duelist badge

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
- **THEN** the badge is still shown as earned
