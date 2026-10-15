# Spec Delta

## Purpose

Open a new Player's first Star with the Hook: a dare to beat the calculator, a short reveal of the Trick, then quick wins, so the first minute shows what the Trick can do.

## ADDED Requirements

### Requirement: The Hook opens a new Player's first Star
When a new Player in Challenger or Pro opens their first Star, and that Star's Trick has a Hook dare, the Hook SHALL play before the round: the dare, the reveal, then the round. A new Player SHALL be one who has never answered a question, has no Sparks, has no Star lit or skipped, and has not seen or skipped the Hook. Explorer Players SHALL NOT get the Hook.

#### Scenario: First Star of a new Challenger Player
- **WHEN** a new Challenger Player opens Star 1 of `from9`
- **THEN** the Hook's dare appears before the first question

#### Scenario: Explorer
- **WHEN** a new Explorer Player opens a Star by link
- **THEN** the round starts without the Hook

#### Scenario: A first Star with no Hook dare
- **WHEN** a new Player's first Star is a Trick with no Hook dare, such as `zero-sum`
- **THEN** the round starts without the Hook, and the Hook is not shown on any later Star

### Requirement: Returning Players skip the Hook
A Player who is not new SHALL never see the Hook. Once a Player has seen the Hook or skipped it, it SHALL NOT play again for that Player.

#### Scenario: A Player who has practiced
- **WHEN** a Player with 40 answered Practice questions opens their first Star
- **THEN** the round starts without the Hook

#### Scenario: Second Star
- **WHEN** a Player who saw the Hook on their first Star opens another Star
- **THEN** there is no Hook

### Requirement: Beat the calculator, honestly
The dare SHALL show one problem for the Star's Trick and an on-screen calculator that types it as a basic calculator would (the digits, the operator, the digits, then "="), one key every 0.45 seconds, and shows its answer after "=". The Player SHALL win if they enter the right answer before the calculator shows its answer. Every Hook problem SHALL need at least 6 key presses including "=" (at least 2.7 seconds), and SHALL be one a Player who knows the Trick can answer in that time.

#### Scenario: The calculator's time
- **WHEN** the dare is 85² and the calculator types `8 5 × 8 5 =`
- **THEN** its answer appears 2.7 seconds after it starts

#### Scenario: The Player wins
- **WHEN** a Player enters 7225 before the calculator shows its answer
- **THEN** Bolt says they beat the calculator

#### Scenario: The calculator wins
- **WHEN** the calculator shows its answer first
- **THEN** Bolt says the calculator won this time and offers to show the Trick

### Requirement: The reveal
After the dare, the system SHALL show the Trick worked on the dare's own numbers, step by step, in at most 20 seconds, skippable by a button or Escape, and then start the round. The round that follows SHALL deal its 4 questions easiest first, so the Player's first answers are quick wins.

#### Scenario: Reveal length
- **WHEN** a Player watches the whole reveal for 85²
- **THEN** it ends within 20 seconds and the first question of the round follows

#### Scenario: Quick wins
- **WHEN** the round after the Hook starts
- **THEN** its questions come in order of their Kata number, lowest first

### Requirement: The Hook can be skipped
The dare and the reveal SHALL each have a Skip control. Skipping SHALL start the round and SHALL count as having seen the Hook.

#### Scenario: Skip the dare
- **WHEN** a new Player presses Skip on the dare
- **THEN** the round starts and the Hook never plays for them again

### Requirement: The Hook in Calm and for screen readers
When Calm is on, the dare SHALL NOT race: it SHALL state how long the calculator would take and let the Player answer in their own time. When motion is reduced or paused, the calculator's display SHALL still change key by key but nothing SHALL move. The dare, the race result and every reveal step SHALL be announced through the polite live region; individual calculator key presses SHALL NOT be announced.

#### Scenario: Calm
- **WHEN** a new Player with Calm on opens their first Star
- **THEN** the dare says the calculator needs 2.7 seconds for 85², no race runs, and the reveal follows their answer

#### Scenario: Screen reader
- **WHEN** a screen reader user plays the dare
- **THEN** they hear the dare, then who won, and not each key the calculator types
