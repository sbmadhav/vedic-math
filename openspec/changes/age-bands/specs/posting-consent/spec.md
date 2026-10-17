# Spec Delta

## ADDED Requirements

### Requirement: An age from the grade question is the Age answer
When a Player answers the grade question with an age and has no Age answer yet, that age SHALL be saved as their Age answer, so the age question is not asked again. A grade answer SHALL NOT set or change the Age answer. Neither answer SHALL make posting less strict than the Age answer alone.

#### Scenario: Age given at the grade question
- **WHEN** a Player answers the grade question with age 15 and later finishes a Ranked round
- **THEN** the age question is not shown, and the Score posts as for any Player 13 or over

#### Scenario: Grade given
- **WHEN** a Player answers grade 8 and later finishes a Ranked round
- **THEN** the age question is shown before anything is posted

#### Scenario: Existing Age answer kept
- **WHEN** a Player whose Age answer is 11 later answers the grade question with age 14
- **THEN** their Age answer stays 11
