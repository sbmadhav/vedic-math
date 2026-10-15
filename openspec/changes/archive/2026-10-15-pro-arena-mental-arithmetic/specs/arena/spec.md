# Spec Delta

## Purpose

Define what the Arena deals in each League, so the daily race is identical and fair for a League and the Pro League trains mental arithmetic.

## ADDED Requirements

### Requirement: Pro Arena is mental arithmetic
Every Pro League Arena question SHALL come from one of five families: a 2-digit by 2-digit product, a square, a percent of a number, a near-base product, or an exact division. No Pro Arena question SHALL require algebra, exponents beyond squares, or logarithms, and every answer SHALL be a whole number typed on the Arena keypad. The only exception is the switch-over below: Pro daily rounds dated before Monday 2026-10-19.

#### Scenario: A full Pro daily set
- **WHEN** the Pro daily set for any date from 2026-10-19 on is generated
- **THEN** every question belongs to one of the five families and has a whole-number answer

#### Scenario: Pro Duel and Practice
- **WHEN** a Pro Player plays an Arena Practice round or a Pro Duel
- **THEN** every question belongs to one of the five families

### Requirement: The switch-over never mixes a Board
Pro daily rounds dated before Monday 2026-10-19 (the first day of ISO week 2026-W43) SHALL keep the previous Pro question pool and seed, and Pro daily rounds from that date on SHALL use the mental arithmetic families with a versioned seed. The switch SHALL use the same local date that names the Board, so no daily or weekly Pro Board holds Scores from both question sets.

#### Scenario: The week before the switch
- **WHEN** a Pro Player plays the daily round on Thursday 2026-10-15
- **THEN** they get the same questions as before this change, so this week's Pro Boards compare like with like

#### Scenario: The first day of the new set
- **WHEN** a Pro Player plays the daily round on Monday 2026-10-19
- **THEN** every question comes from the mental arithmetic families

#### Scenario: No algebra
- **WHEN** a Pro Player plays an Arena round
- **THEN** no question asks to solve for x, simplify a power or evaluate a logarithm

### Requirement: Daily rounds are identical for a League
The daily Arena round SHALL deal the same questions in the same order to every Player in a League on a given local date, and SHALL NOT depend on any Player's Rating. Its difficulty SHALL follow a fixed ramp through the round.

#### Scenario: Two Pro Players on the same date
- **WHEN** two Pro Players with different Arena Ratings play the daily round on the same date
- **THEN** they get the same questions in the same order

#### Scenario: Ramp
- **WHEN** a Pro Player answers through a daily round
- **THEN** later questions are at the same or higher difficulty than earlier ones

### Requirement: Arena Practice rounds adapt
An Arena Practice round SHALL start at the Player's Arena Rating for their League and SHALL raise the difficulty after right answers and lower it after misses, as games do. Practice round Scores SHALL never leave the device.

#### Scenario: Strong Pro Player
- **WHEN** a Pro Player with an Arena Rating of 15 starts an Arena Practice round
- **THEN** the first questions are at difficulty 15, and a run of right answers makes them harder

#### Scenario: Practice is not posted
- **WHEN** an Arena Practice round ends
- **THEN** nothing is sent to any World board

### Requirement: Explorer and Challenger daily rounds are unchanged
The Explorer and Challenger daily Arena rounds SHALL keep their current question pools.

#### Scenario: Challenger daily
- **WHEN** a Challenger Player plays the daily round
- **THEN** its questions come from the same Challenger pool as before this change
