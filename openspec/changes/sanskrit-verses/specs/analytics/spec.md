# Spec Delta

## ADDED Requirements

### Requirement: Listening to a verse is counted
Each Listen tap that starts speech SHALL send one anonymous event `math/sloka/listen`, with no verse id, voice or other value.

#### Scenario: Listen
- **WHEN** a Player taps Listen on any verse
- **THEN** exactly `math/sloka/listen` is sent once
