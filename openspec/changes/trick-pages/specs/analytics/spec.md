# Spec Delta

## ADDED Requirements

### Requirement: Trick page counts
A Trick page SHALL send `math/tricks/calc/<trick>` once per page load, the first time its calculator draws steps, and `math/tricks/practice/<trick>` when Practice this trick is followed, `<trick>` being a Trick id from the catalog. No event SHALL contain the typed numbers. These follow "Events carry no identifiers".

#### Scenario: The calculator
- **WHEN** a visitor presses Show steps three times with different numbers on the Multiply by 11 page
- **THEN** `math/tricks/calc/by11` is sent once, and no event path or title contains a typed number

#### Scenario: Practice this trick
- **WHEN** a visitor follows Practice this trick on that page
- **THEN** `math/tricks/practice/by11` is sent once
