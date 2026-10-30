# Spec Delta

## ADDED Requirements

### Requirement: A Word problems round in the Arena
The Arena SHALL offer a Word problems round ("Story time" in Explorer) next to its other round types, in every League: 10 Word problems of the League's Mode style with no clock, which the Player can finish at any time. It SHALL be Practice: its Score SHALL never leave the device, it SHALL send nothing to Firestore and have no Board, and it SHALL leave the Arena Rating unchanged. The daily round and its Boards SHALL NOT change.

#### Scenario: A Challenger Word problems round
- **WHEN** a Challenger Player starts a Word problems round
- **THEN** no clock is shown, each question is a Word problem labelled "Word problem", the round ends after 10 questions or when they press Finish, and nothing is sent to any World board or kept on a device board

#### Scenario: The Arena Rating stays
- **WHEN** a Player with an Arena Rating of 12 answers every question of a Word problems round right
- **THEN** their Arena Rating is still 12

#### Scenario: Story time for an Explorer
- **WHEN** an Explorer Player starts a Story time round
- **THEN** each question is a picture story labelled "Story time", with a picture and answer buttons to tap

#### Scenario: A Pro Word problems round
- **WHEN** a Pro Player plays a Word problems round
- **THEN** each question is a multi-step story with a whole-number answer typed on the keypad

## MODIFIED Requirements

### Requirement: Arena Practice rounds adapt
An Arena Practice round other than the Word problems round SHALL start at the Player's Arena Rating for their League and SHALL raise the difficulty after right answers and lower it after misses, as games do. Practice round Scores SHALL never leave the device.

#### Scenario: Strong Pro Player
- **WHEN** a Pro Player with an Arena Rating of 15 starts an Arena Practice round
- **THEN** the first questions are at difficulty 15, and a run of right answers makes them harder

#### Scenario: Practice is not posted
- **WHEN** an Arena Practice round ends
- **THEN** nothing is sent to any World board

### Requirement: Pro Arena and Practice are mental arithmetic
Every Pro League Arena question SHALL come from one of five families: a 2-digit by 2-digit product, a square, a percent of a number, a near-base product, or an exact division. No Pro Arena question SHALL require algebra, exponents beyond squares, or logarithms, and every answer SHALL be a whole number typed on the Arena keypad. There are two exceptions: Pro daily rounds dated before Monday 2026-10-19 (the switch-over), and the Word problems round, whose questions are Pro Word problems.

#### Scenario: A full Pro daily set
- **WHEN** the Pro daily set for any date from 2026-10-19 on is generated
- **THEN** every question belongs to one of the five families and has a whole-number answer

#### Scenario: Pro Practice
- **WHEN** a Pro Player plays a timed or untimed Arena Practice round
- **THEN** every question belongs to one of the five families
