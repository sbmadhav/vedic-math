# Spec Delta

## ADDED Requirements

### Requirement: A Star uses its Trick's Rating
A Star round SHALL use the Player's Rating for the Trick's Skill, the same Rating its Practice uses. The Rating at the start of the round SHALL pick where in the Star's third its questions come from: low Ratings draw from the easier Katas, high Ratings from the harder ones. Answers SHALL move the Rating as Practice answers do, and it SHALL be saved at the end of the round under the usual 4-answer rule. A missed Dare SHALL NOT change it.

#### Scenario: Two Players on the same Star
- **WHEN** a Player with Rating 3 and a Player with Rating 17 for Square numbers ending in 5 each play its Star 2
- **THEN** the first draws from Katas near 18 and the second from Katas near 34

#### Scenario: Shared with Practice
- **WHEN** a Player's Star rounds raise their Rating for a Trick
- **THEN** that Trick's Practice questions start at the raised Rating

#### Scenario: Missed Dare
- **WHEN** a Player misses a Dare
- **THEN** their Rating for the Trick does not go down for it
