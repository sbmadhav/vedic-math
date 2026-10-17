# Spec Delta

## MODIFIED Requirements

### Requirement: Starting Rating by Mode
A Player with no Rating yet for a game, the Arena or a Skill SHALL start at 1 in Explorer, 5 in Challenger and 9 in Pro, except in Practice for a Player with a Placement level. In Practice (Skill practice, Endless runs, Stars, Endless practice in a game, Arena Practice rounds), a Player with a Placement level and no Rating yet SHALL start a game or the Arena at the Placement level's start (K 1, grade 1 2, 2 3, 3 5, 4 6, 5 7, 6 8, 7 8, 8 9, 9 10, 10 11, 11 12, 12 13), and SHALL start a Skill or Trick at 10 when its grade is below the Placement level, 5 when it is at the Placement level and 1 when it is above. A Ranked round with no Rating yet SHALL always start at the Mode's start. A Player who practiced a Skill before Skill Ratings existed SHALL instead start that Skill at a Rating inside the band of their current mastery level, so their questions stay at the level they had.

#### Scenario: First Arena Practice round as Pro
- **WHEN** a Pro Player with no Arena Rating and no Placement level starts an Arena Practice round
- **THEN** it starts at difficulty 9

#### Scenario: Existing Player on a Skill they already practiced
- **WHEN** a Pro Player whose mastery level on a Skill is 1 practices it for the first time after this change
- **THEN** their questions on that Skill are still generated at level 1

#### Scenario: Explorer placed at grade 5
- **WHEN** an Explorer Player placed at grade 5, with no Make ten Rating, starts Endless practice in Make ten
- **THEN** it starts at difficulty 7

#### Scenario: A Skill below the Placement level
- **WHEN** a Challenger Player placed at grade 6 practices `4-mult2` for the first time
- **THEN** the first question is generated at level 2

#### Scenario: Ranked round keeps the Mode's start
- **WHEN** an Explorer Player placed at grade 5, with no Make ten Rating, starts a Make ten Ranked round
- **THEN** it starts at difficulty 1

#### Scenario: Placed at the Mode's first grade
- **WHEN** a Challenger Player placed at grade 3 starts Endless practice in a game they have never played
- **THEN** it starts at difficulty 5, as for a Challenger Player who skipped Placement
