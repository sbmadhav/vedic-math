# Spec Delta

## ADDED Requirements

### Requirement: Title badges
The two badges for reaching a Title SHALL be named after it: "Sum Sprinter", earned at 1000 Sparks, and "Fraction Fighter", earned at 3600 Sparks. Their descriptions SHALL name the Title and SHALL NOT mention a level number. They SHALL keep their existing badge ids, so a Player who earned "Level 5" or "Level 10" holds "Sum Sprinter" or "Fraction Fighter".

#### Scenario: Earned before the update
- **WHEN** a Player who earned the Level 10 badge opens the Me page after the update
- **THEN** the badge shows as "Fraction Fighter", earned

#### Scenario: Reaching Fraction Fighter
- **WHEN** a Player's Sparks reach 3600
- **THEN** they earn the Fraction Fighter badge
