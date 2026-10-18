# Spec Delta

## REMOVED Requirements

### Requirement: Pro Arena is mental arithmetic
**Reason**: One of its scenarios is about the Pro Duel, which Party Mode replaces (play-experiences); Party Mode deals its own questions for each Player's Mode.
**Migration**: The same rule, without the Duel, is "Pro Arena and Practice are mental arithmetic".

## ADDED Requirements

### Requirement: Pro Arena and Practice are mental arithmetic
Every Pro League Arena question SHALL come from one of five families: a 2-digit by 2-digit product, a square, a percent of a number, a near-base product, or an exact division. No Pro Arena question SHALL require algebra, exponents beyond squares, or logarithms, and every answer SHALL be a whole number typed on the Arena keypad. The only exception is the switch-over below: Pro daily rounds dated before Monday 2026-10-19.

#### Scenario: A full Pro daily set
- **WHEN** the Pro daily set for any date from 2026-10-19 on is generated
- **THEN** every question belongs to one of the five families and has a whole-number answer

#### Scenario: Pro Practice
- **WHEN** a Pro Player plays an Arena Practice round
- **THEN** every question belongs to one of the five families
