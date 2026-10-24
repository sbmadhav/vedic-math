# Spec Delta

## ADDED Requirements

### Requirement: A Deep dive opens without a Mode
A Deep dive's route (`#/sutras/<id>`) SHALL open its Deep dive over the Sutras page before a Mode is picked, as `#/sutras` does, using Challenger's wording, so a page outside the game can link to it.

#### Scenario: A link from the landing page
- **WHEN** a first-time visitor opens `/play/#/sutras/s2`
- **THEN** the Deep dive of Nikhilaṃ Navataścaramaṃ Daśataḥ opens over the Sutras page, and no Mode is stored
