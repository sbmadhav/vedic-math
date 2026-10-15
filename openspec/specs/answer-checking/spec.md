# answer-checking Specification

## Purpose
Decide which typed answers count as right, so that every correct way a Player writes a number is accepted and typing the question back never is.

## Requirements

### Requirement: Mixed numbers are numbers
The system SHALL read a whole number followed by a space and a proper fraction as a mixed number wherever a number answer is checked, with an optional leading sign that applies to the whole value. A space between two whole numbers SHALL NOT be read as one number.

#### Scenario: Mixed number for a fraction sum
- **WHEN** the answer is 7/4 and the Player types `1 3/4`
- **THEN** the answer is right

#### Scenario: Negative mixed number
- **WHEN** the answer is -2.5 and the Player types `-2 1/2`
- **THEN** the answer is right

#### Scenario: Extra spaces
- **WHEN** the answer is 7/4 and the Player types ` 1  3/4 `
- **THEN** the answer is right

#### Scenario: Two whole numbers with a space
- **WHEN** the answer is 1225 and the Player types `1 225`
- **THEN** the answer is not right

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

### Requirement: Algebra and higher keep expression input
For skills above grade 8, the system SHALL keep accepting expressions that have the right value, such as `4sqrt(3)` or `pi/6`, and expression answers SHALL keep comparing by value.

#### Scenario: Root answer in precalculus
- **WHEN** a grade 11 skill's answer is 4√3 and the Player types `4sqrt(3)`
- **THEN** the answer is right
