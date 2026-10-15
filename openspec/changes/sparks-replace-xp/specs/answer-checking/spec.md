# Spec Delta

## MODIFIED Requirements

### Requirement: Arithmetic skills take plain numbers only
For skills in grades K to 8 and for speed-trick skills, the system SHALL accept only a plain number as an answer: an integer, a decimal, a fraction or a mixed number, with an optional sign and thousands commas. Any other input SHALL get a message asking for just the answer and SHALL NOT count as a try, a miss, Sparks or a mastery update.

#### Scenario: Typing the question back
- **WHEN** a Player on 44 × 72 types `44*72`
- **THEN** the input is refused with a message to type just the answer, and the try count, mastery and Sparks are unchanged

#### Scenario: Plain forms are accepted
- **WHEN** the answer is 1225 and the Player types `1225`, `1,225` or `1225.0`
- **THEN** each is right

#### Scenario: Fractions and simplest form still apply
- **WHEN** an arithmetic skill asks for 7/6 in simplest form and the Player types `14/12`
- **THEN** the answer is refused with the existing "simplify" message
