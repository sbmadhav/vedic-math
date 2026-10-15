# medals Specification

## Purpose
Rate numbered game Levels and tower challenges with Medals, and keep Katas unrated, so the word "Star" is free for Star Quest and each result means one thing.

## Requirements

### Requirement: Game Levels and tower challenges earn Medals
A finished game Level or tower challenge SHALL earn a bronze, silver or gold Medal, or none, by the same goals that gave 1, 2 or 3 stars before. The best Medal SHALL be kept. Medals SHALL be shown as bronze, silver or gold with a text label, never as stars, and no count of stars SHALL be shown for game Levels or the tower.

#### Scenario: Two goals reached
- **WHEN** a Player finishes game Level 12 with a score past the second goal but not the third
- **THEN** they earn a silver Medal for that Level

#### Scenario: A worse result later
- **WHEN** a Player with a gold Medal on a tower challenge plays it again and reaches only the first goal
- **THEN** the challenge still shows gold

#### Scenario: Accessible label
- **WHEN** a screen reader reads a game Level node with a silver Medal
- **THEN** it hears the Level number and "silver Medal"

### Requirement: Existing stars become Medals 1:1
A Player's saved game Level and tower challenge results SHALL become Medals on first load after this change: 1 star is bronze, 2 silver, 3 gold, 0 none. Levels and challenges that were open SHALL stay open.

#### Scenario: A Level with 3 stars
- **WHEN** a Player whose game Level 5 had 3 stars loads the app after the update
- **THEN** Level 5 shows a gold Medal, and Level 6 is open as before

### Requirement: Katas are done or not done
A Kata SHALL have no rating of its own. A Kata SHALL count as done when the Player gets at least 60% of its problems right, and SHALL stay done afterwards. Kata Sparks SHALL be 5 per right answer plus 10 when the Kata is done. A Kata SHALL open when the one before it is done, as before.

#### Scenario: Finishing a Kata
- **WHEN** a Player gets 5 of 6 problems right in Kata 3
- **THEN** Kata 3 is done, they earn 35 Sparks, the result shows no stars, and Kata 4 opens

#### Scenario: Old Kata stars
- **WHEN** a Player had 1 to 3 stars on a Kata before the update
- **THEN** that Kata is done after the update; a Kata with 0 stars is not done

#### Scenario: Dojo counts
- **WHEN** a Player opens the Dojo or a Trick's Katas
- **THEN** it shows how many Katas are done, and no star count
