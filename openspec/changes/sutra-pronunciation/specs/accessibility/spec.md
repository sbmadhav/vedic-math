# Spec Delta

## ADDED Requirements

### Requirement: Sutra names say their language
Every Sutra name in IAST SHALL carry `lang="sa-Latn"` and every name in Devanagari `lang="sa"`, on cards, in the deep dive, on Trick and Katas pages and in All places. Each Say it button SHALL have the accessible name "Hear how to say <name>" and a target of at least 44 by 44 CSS pixels.

#### Scenario: Katas page tag
- **WHEN** a Player opens `#/katas/sq5`
- **THEN** the Sutra tag has `lang="sa-Latn"`

#### Scenario: Button name
- **WHEN** a screen reader reaches the Say it button in the deep dive of Sutra 3
- **THEN** it announces "Hear how to say Ūrdhva-Tiryagbhyām, toggle button, not pressed"
