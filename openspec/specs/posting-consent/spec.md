# posting-consent Specification

## Purpose
Decide when a Player's Scores and XP may leave the device for World boards, so that no Player under 13 posts anything without a grown-up's permission, whatever Mode they chose.

## Requirements

### Requirement: Age answer before the first post
The system SHALL ask each Player one neutral age question before the first time any Score or weekly Sparks total of theirs would be posted to a World board, and SHALL post nothing for that Player until it is answered. The question SHALL NOT indicate which answer allows posting. The Age answer SHALL be stored only on the device, per Player, and SHALL NOT be sent anywhere.

#### Scenario: First Ranked round of a new Player
- **WHEN** a Player with no Age answer finishes a Ranked round whose Score would be posted
- **THEN** the age question is shown before anything is posted, and the Score is kept on the Device board either way

#### Scenario: Player dismisses the question
- **WHEN** a Player closes the age question without answering
- **THEN** nothing is posted, and the question is offered again at the next would-be post

#### Scenario: Age answer is never sent
- **WHEN** a Player gives an Age answer and later posts a Score
- **THEN** no request leaving the device contains the Age answer

### Requirement: Play is never blocked
The system SHALL let every Player play every Mode, Ranked rounds included, whatever their Age answer and whether or not they have one. Only posting to World boards depends on it.

#### Scenario: Under-13 Player without the Parent step plays the Arena
- **WHEN** an under-13 Player plays an Arena daily round
- **THEN** the round plays normally and its Score ranks on the Device board

### Requirement: Players under 13 use Device boards only
The system SHALL NOT post any Score or weekly Sparks total to a World board for a Player whose Age answer is under 13, in any Mode, and SHALL NOT offer any way to turn World board posting on for them. Their Scores SHALL rank on the Device board as for every other Player, and they SHALL be told, in the words of their Mode, that their Scores stay on this device's board.

#### Scenario: Under-13 Player in Pro mode
- **WHEN** a Player whose Age answer is 11 and who chose Pro finishes a Ranked round
- **THEN** nothing is posted, no Firebase file is loaded, the Score appears on the Device board, and the Player is told their Scores stay on this device

#### Scenario: No switch for grown-ups
- **WHEN** a grown-up opens the Me page for a Player whose Age answer is under 13
- **THEN** there is no control that would let that Player post to World boards

#### Scenario: Imported Parent step
- **WHEN** a Player imported from sbmadhav.com had the Parent step there and their Age answer is under 13
- **THEN** nothing is posted for them on learnvedicmath.com
