# Spec Delta

## MODIFIED Requirements

### Requirement: Explorer answers with three big choices
Every Placement question SHALL be answered by tapping big buttons, at every step including algebra, for Explorer Players and for Early Players in any Mode. There SHALL be 3 buttons for Early Players and for Explorer Players with no Reading band, and 4 for Growing and Fluent Explorer Players. For a number answer the buttons SHALL be the answer and different nearby non-negative numbers, in ascending order. Other Players SHALL use their Mode's entry.

#### Scenario: Explorer at grade 6
- **WHEN** an Explorer Player with no Reading band reaches a grade 6 question
- **THEN** it shows exactly 3 big answer buttons, one of which is right, and no text field or keypad

#### Scenario: Early reader in Pro
- **WHEN** an Early Player in Pro gets a Placement question
- **THEN** it shows exactly 3 big answer buttons

#### Scenario: Growing Explorer
- **WHEN** a Growing Player in Explorer gets a Placement question
- **THEN** it shows 4 big answer buttons

#### Scenario: Pro
- **WHEN** a Fluent Player in Pro gets a Placement question
- **THEN** it is answered with the Pro entry, as in Practice

### Requirement: Read aloud during Placement
Each Placement question SHALL be read aloud when it appears for Early Players in any Mode and for Explorer Players with no Reading band, unless the Player has turned Read aloud off, with a button that reads it again. For every other Player a question SHALL be read only when they tap Hear it. Speech SHALL only follow a tap: the first question follows the Start tap and each later one follows the answer tap.

#### Scenario: Explorer
- **WHEN** an Explorer Player with no Reading band presses Start
- **THEN** the first question is spoken without another tap, and "Hear it again" speaks it again

#### Scenario: Early reader in Challenger
- **WHEN** an Early Player in Challenger presses Start
- **THEN** the first question is spoken without another tap

#### Scenario: Growing Explorer
- **WHEN** a Growing Player in Explorer gets a question and does not tap Hear it
- **THEN** nothing is spoken
