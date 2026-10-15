# Spec Delta

## Purpose

Keep one 1 to 20 Rating per Player for each game, the Arena and each Skill, so every kind of play starts at the right difficulty and adapts to the Player.

## ADDED Requirements

### Requirement: A Rating per game, Arena League and Skill
Each Player SHALL have a separate Rating from 1 to 20 for each game, for the Arena in their League, and for each Skill they practice. Ratings SHALL be stored only on the device, per Player.

#### Scenario: Separate Ratings
- **WHEN** a Player raises their Times sprint Rating
- **THEN** their Arena Rating and their Skill Ratings are unchanged

#### Scenario: Ratings stay on the device
- **WHEN** a Player's Ratings change
- **THEN** no request leaving the device contains a Rating

### Requirement: Starting Rating by Mode
A Player with no Rating yet for a game, the Arena or a Skill SHALL start at 1 in Explorer, 5 in Challenger and 9 in Pro. A Player who practiced a Skill before Skill Ratings existed SHALL instead start that Skill at a Rating inside the band of their current mastery level, so their questions stay at the level they had.

#### Scenario: First Arena Practice round as Pro
- **WHEN** a Pro Player with no Arena Rating starts an Arena Practice round
- **THEN** it starts at difficulty 9

#### Scenario: Existing Player on a Skill they already practiced
- **WHEN** a Pro Player whose mastery level on a Skill is 1 practices it for the first time after this change
- **THEN** their questions on that Skill are still generated at level 1

### Requirement: Ratings move with answers
Within a round or Practice session, a right answer SHALL raise the difficulty and a miss SHALL lower it. At the end, the Player's Rating SHALL move toward the level they held, so one bad round does not erase progress, and a round with fewer than 4 answers SHALL NOT change it.

#### Scenario: Short round
- **WHEN** a Player answers 3 questions and leaves
- **THEN** their Rating is unchanged

#### Scenario: Good Practice session
- **WHEN** a Player answers 10 Practice questions on one Skill with only one miss
- **THEN** that Skill's Rating is higher afterwards

### Requirement: Skill Rating picks the Practice question level
Practice and Endless run questions SHALL be generated at the level that matches the Player's current Rating for that Skill, within the levels the Skill offers. Mastery SHALL keep being measured as before.

#### Scenario: Rating climbs in a session
- **WHEN** a Player's Rating on a Skill crosses into the range of the Skill's next level during a session
- **THEN** the following questions on that Skill are generated at that next level

#### Scenario: Mastery unchanged
- **WHEN** a Player answers a Practice question
- **THEN** the Skill's mastery ring changes exactly as it did before Ratings were added
