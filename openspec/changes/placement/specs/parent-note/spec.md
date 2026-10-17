# Spec Delta

## ADDED Requirements

### Requirement: The note gives the Placement level for grown-ups
When the Player has a Placement level, the parent note SHALL say, in grown-up words, about which grade the Player placed at, that it only sets where Practice starts, and that it stays on this device. When the Player has no Placement level, the note SHALL say nothing about Placement.

#### Scenario: Placed Player
- **WHEN** a grown-up reads the parent note of a Player placed at grade 9
- **THEN** it says the Player placed at about Algebra 1 (grade 9), that this only sets where practice starts, and that it stays on this device

#### Scenario: No Placement
- **WHEN** a grown-up reads the parent note of a Player who skipped Placement
- **THEN** it does not mention Placement
