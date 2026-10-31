# Spec Delta

## ADDED Requirements

### Requirement: A Sparks history on the device
The Me page SHALL list the Player's last 50 Sparks awards, newest first, each with its amount, what it was for and when; consecutive answer awards in one round SHALL show as one row. The history SHALL be kept on the device with the Player's progress, carried by backup and restore, and never sent anywhere.

#### Scenario: After a kata
- **WHEN** a Player finishes a kata for 30 Sparks and opens Me
- **THEN** the first row of Recent Sparks says the kata earned +30

#### Scenario: Only 50 kept
- **WHEN** a Player has earned Sparks 60 times
- **THEN** Recent Sparks lists the newest 50

### Requirement: Every Sparks award is shown
Every Sparks award SHALL be shown to the Player once when it is made, including watching a trick to its last step, a sutra card's first flip and finishing an experience. When experience Sparks reach the daily cap of 150, the system SHALL say so once that day.

#### Scenario: Watching a trick
- **WHEN** a Player watches a speed trick to its last step for the first time
- **THEN** a "+5 Sparks" message appears

#### Scenario: The daily play cap
- **WHEN** a Player's experience Sparks reach 150 in a day
- **THEN** a message says that is today's play Sparks, once, and later experience finishes that day show no Sparks message
