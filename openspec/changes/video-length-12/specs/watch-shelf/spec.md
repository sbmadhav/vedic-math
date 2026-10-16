# Spec Delta

## ADDED Requirements

### Requirement: Every video meets the length bar
Every video and Short on the Watch shelf SHALL be under 12 minutes long, for every Mode, Explorer included.

#### Scenario: A long video
- **WHEN** an entry of 12 minutes or more is added to the data file
- **THEN** the node tests fail and name it

#### Scenario: Explorer
- **WHEN** an Explorer Player opens the Watch shelf
- **THEN** it may list videos up to 12 minutes long, made for kids and shortest first as before

## MODIFIED Requirements

### Requirement: Filters on the Watch shelf
The Watch shelf SHALL open filtered to the Player's Mode and SHALL let the Player filter by Skill area, by Trick, by length (under 2 minutes, 2 to 5, 5 to 8, 8 to 12) and by videos or Shorts, within what their Mode may see.

#### Scenario: Shorts about tricks
- **WHEN** a Challenger Player picks Shorts and the Tricks filter
- **THEN** only Shorts matched to a Trick, visible to Challenger, are shown

#### Scenario: Longer videos
- **WHEN** a Player picks "8 to 12 min"
- **THEN** only videos from 8 minutes up to 12 minutes long are shown, or a note that none match
