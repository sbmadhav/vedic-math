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

### Requirement: Parent step for Players under 13
The system SHALL NOT post any Score or weekly Sparks total to a World board for a Player whose Age answer is under 13 until a grown-up gives the Parent step for that Player on this device. This SHALL apply in every Mode. The Parent step SHALL include a simple check that a grown-up is present and SHALL be stored only on the device.

#### Scenario: Under-13 Player in Pro mode
- **WHEN** a Player who answered under 13 and chose Pro finishes a Ranked round
- **THEN** nothing is posted, the Score appears on the Device board, and the Player is told a grown-up can turn on World boards

#### Scenario: Grown-up gives the Parent step
- **WHEN** a grown-up completes the Parent step for an under-13 Player
- **THEN** that Player's later Scores and weekly Sparks totals post to World boards as for any other Player

#### Scenario: Players 13 and over
- **WHEN** a Player whose Age answer is 13 or over finishes a Ranked round
- **THEN** the Score posts to World boards without the Parent step

### Requirement: Withdrawing the Parent step
The system SHALL let a grown-up withdraw the Parent step for a Player on this device, after which nothing more is posted for that Player until it is given again.

#### Scenario: Parent step withdrawn
- **WHEN** a grown-up withdraws the Parent step and the Player then finishes a Ranked round
- **THEN** nothing is posted, and entries already on World boards are left unchanged

### Requirement: Play is never blocked
The system SHALL let every Player play every Mode, Ranked rounds included, whether or not they have an Age answer or the Parent step. Only posting to World boards depends on them.

#### Scenario: Under-13 Player without the Parent step plays the Arena
- **WHEN** an under-13 Player without the Parent step plays an Arena daily round
- **THEN** the round plays normally and its Score ranks on the Device board
