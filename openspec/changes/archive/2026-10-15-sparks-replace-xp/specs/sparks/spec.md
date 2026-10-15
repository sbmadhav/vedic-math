# Spec Delta

## Purpose

Give every Player one progress number, Sparks, earned by everything they do, with a Title that grows from it, so no Player has to work out which number matters.

## ADDED Requirements

### Requirement: Sparks are the only progress number
The system SHALL award Sparks wherever it awarded XP, in the same amounts, except as stated in this spec and the `medals` spec. No Player-facing copy, label, toast, badge description, quest text or Board title SHALL contain "XP" or "experience points".

#### Scenario: A right Practice answer
- **WHEN** a Player answers a Practice question right on the first try with a streak of 2
- **THEN** they earn 12 Sparks and the message says "+12 Sparks"

#### Scenario: Copy scan
- **WHEN** the shipped HTML and every string in the app's scripts are scanned
- **THEN** none shows "XP" to a Player

### Requirement: Stored XP carries over 1:1
When a Player's saved progress holds an XP total, the system SHALL turn it into the same number of Sparks, and this week's XP into the same number of this week's Sparks, the first time that progress is loaded and when a backup code made before this change is restored. It SHALL NOT reset or round any total.

#### Scenario: A Player with 2,340 XP opens the app after the update
- **WHEN** a Player whose saved progress has 2,340 XP, 410 of them this week, loads the app
- **THEN** they have 2,340 Sparks, 410 this week, and the Title they had before

#### Scenario: Restoring an old backup code
- **WHEN** a Player restores a backup code saved before the update with 900 XP
- **THEN** they have 900 Sparks

### Requirement: Watching videos earns no Sparks
Opening or watching a video SHALL NOT earn Sparks. The Video learner badge SHALL keep its rule.

#### Scenario: A new video
- **WHEN** a Player opens a video they have never opened
- **THEN** their Sparks total does not change

### Requirement: The weekly Sparks Board
This week's Sparks total SHALL be posted to the League's weekly Board under the existing Board id `xp-week-YYYY-Www-<league>`, with the existing cap of 60000 and the existing posting rules, and every place that shows that Board SHALL call it the Sparks Board (for example "Most Sparks this week").

#### Scenario: Board id is unchanged
- **WHEN** a Player who may post earns Sparks this week
- **THEN** the post goes to `xp-week-<this week>-<league>` with their weekly Sparks total as the score

#### Scenario: The week of the update
- **WHEN** a Player had a weekly XP entry of 800 before the update and earns 50 Sparks after it, in the same week
- **THEN** their entry on the same Board rises to 850

#### Scenario: Label
- **WHEN** the Arena lobby shows the weekly Board
- **THEN** its heading says Sparks, not XP

### Requirement: Titles from total Sparks
Each Player SHALL hold one Title from their total Sparks, at the thresholds the old levels used, so no Player's Title changes. No level number SHALL be shown anywhere. The progress bar beside the Title SHALL show the Sparks still needed for the next Title, and reaching a new Title SHALL show one "New Title" message.

#### Scenario: The eleven Titles
- **WHEN** the Title for a Sparks total is worked out
- **THEN** it is Number Rookie from 0, Digit Dasher from 300, Sum Sprinter from 1000, Times Tamer from 2100, Fraction Fighter from 3600, Sutra Scout from 5500, Mental Ninja from 7800, Equation Ace from 10500, Pattern Sage from 13600, Calculus Comet from 17100 and Vedic Legend from 21000

#### Scenario: Same Title as before
- **WHEN** a Player who was "Level 6 · Sum Sprinter" loads the app after the update
- **THEN** they are a Sum Sprinter and no number is shown

#### Scenario: Crossing a Title line
- **WHEN** a Player at 3,590 Sparks earns 12 more
- **THEN** one "New Title: Fraction Fighter" message is shown

#### Scenario: Nav chip
- **WHEN** any page is shown
- **THEN** the Player chip shows the avatar and a progress bar to the next Title, and its accessible name says the Nickname and Title, with no level number
