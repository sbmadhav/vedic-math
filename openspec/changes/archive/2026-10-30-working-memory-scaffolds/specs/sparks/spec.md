# Spec Delta

## MODIFIED Requirements

### Requirement: Titles from total Sparks
Each Player SHALL hold one Title from their total Sparks, at the thresholds the old levels used, so no Player's Title changes. No level number SHALL be shown anywhere. The progress bar beside the Title SHALL show the Sparks still needed for the next Title, and reaching a new Title SHALL show one "New Title" message.

#### Scenario: The eleven Titles
- **WHEN** the Title for a Sparks total is worked out
- **THEN** it is Number Rookie from 0, Digit Dasher from 300, Sum Sprinter from 1000, Times Tamer from 2100, Fraction Fighter from 3600, Sutra Scout from 5500, Mental Ninja from 7800, Equation Ace from 10500, Pattern Sage from 13600, Calculus Comet from 17100 and Vedic Legend from 21000

#### Scenario: Same Title as before
- **WHEN** a Player who was "Level 6 · Sum Sprinter" loads the app after the update
- **THEN** they are a Sum Sprinter and no number is shown

#### Scenario: Crossing a Title line
- **WHEN** a Player at 3,590 Sparks earns 12 more
- **THEN** one "New Title: Fraction Fighter" message is shown

#### Scenario: Nav chip
- **WHEN** any page is shown
- **THEN** the Player chip shows the avatar and a progress bar to the next Title, and its accessible name says the Nickname and Title, then the Belt when a Challenger or Pro Player holds one, with no level number
