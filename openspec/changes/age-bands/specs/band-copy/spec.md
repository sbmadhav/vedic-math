# Spec Delta

## Purpose

Keep the app's varying copy in one table with a variant per Mode and per Reading band, pick the right line for each Player, and check every variant for length, placeholders and wording rules.

## ADDED Requirements

### Requirement: One copy table
Copy that varies by Mode or Reading band on the mapped screens SHALL live in one table, `js/copy.js`, keyed `<screen>.<line>`, where each entry has Mode variants or a default, and MAY have `early` and `growing` variants. A line MAY be a set of lines, from which one is picked each time.

#### Scenario: A mapped screen
- **WHEN** a reviewer looks for the Placement result wording
- **THEN** every variant of it is in `js/copy.js` under one key

### Requirement: Choosing a line
For a Player, the system SHALL use the entry's variant for their Reading band (`early` or `growing`) when it exists, else the variant for their Mode, else the default. Fluent Players and Players with no band SHALL get the Mode variant or the default.

#### Scenario: Growing with no growing variant
- **WHEN** a Growing Player in Pro sees a line that has only Mode variants
- **THEN** they see the Pro variant

#### Scenario: Early variant
- **WHEN** an Early Player in Challenger misses a Practice question
- **THEN** they see the `early` variant of the retry line

### Requirement: Early lines are short and plain
Every key used on a mapped screen SHALL have an `early` variant. An `early` variant SHALL have at most 2 sentences of at most 8 words each, and no word longer than 10 letters except an allowlist of names. A `growing` variant SHALL have sentences of at most 14 words.

#### Scenario: Too long
- **WHEN** an author adds an `early` variant with a 12-word sentence
- **THEN** `test/copy-bands.test.mjs` fails and names the key

#### Scenario: Missing early variant
- **WHEN** a mapped screen uses a key with no `early` variant
- **THEN** the test fails and names the key and the screen

### Requirement: Variants agree
Every variant of an entry SHALL use the same placeholders, every key used in code SHALL exist in the table, and no variant SHALL contain an em dash or call the sutras Vedic.

#### Scenario: Placeholder dropped
- **WHEN** the `early` variant of the Placement result leaves out `{n}`
- **THEN** the test fails for that key

### Requirement: Early lines are recorded whole
Every `early` variant and every Bolt line SHALL be a fixed line the Studio voice records whole, apart from counts given as placeholders.

#### Scenario: Voice coverage
- **WHEN** the Studio voice coverage test runs
- **THEN** every `early` variant and Bolt line has a whole recording
