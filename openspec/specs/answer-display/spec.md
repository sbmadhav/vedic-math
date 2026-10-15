# answer-display Specification

## Purpose
Show the right answer in the form a Player is learning to write, so a revealed answer teaches instead of confusing.

## Requirements

### Requirement: Fraction answers are shown as fractions
When a right answer that is not a whole number is revealed for a fraction skill, or for a problem that asks for a fraction or for simplest form, the system SHALL show it as a fraction in lowest terms, followed by the mixed number when it is more than 1, and SHALL NOT show a rounded decimal, unless the problem asks for a decimal. This SHALL apply in Practice, Endless runs, Katas, worked examples and the challenge tower.

#### Scenario: Improper fraction in Practice
- **WHEN** the answer to 2/3 + 3/3 is revealed
- **THEN** it reads `5/3 = 1 2/3`, not `1.666667`

#### Scenario: Shaded fraction
- **WHEN** the answer to "What fraction is shaded?" with 3 of 8 parts shaded is revealed
- **THEN** it reads `3/8`

#### Scenario: Decimal skills keep decimals
- **WHEN** the answer to "Write 7/10 as a decimal" is revealed
- **THEN** it reads `0.7`

#### Scenario: Other decimal answers stay decimals
- **WHEN** the answer to a percent question, such as 12.5% of 40, is revealed
- **THEN** it reads `5`, and a non-whole percent answer such as 12.5 reads `12.5`, not `25/2`

### Requirement: Algebra keys use real signs
When an algebra answer is revealed, the system SHALL write each sign once and correctly, and SHALL NOT show `+-`, `--`, `+ 0` terms or a coefficient of 1 before a variable.

#### Scenario: Factoring with negative roots
- **WHEN** the answer to "Factor: x² − 3x + 2" is revealed
- **THEN** it reads `(x − 1)(x − 2)`

#### Scenario: Leading coefficient
- **WHEN** the answer to a factoring question with a leading coefficient of 2 and a negative constant is revealed
- **THEN** it reads like `(2x − 3)(x + 4)`, with no `+-`
