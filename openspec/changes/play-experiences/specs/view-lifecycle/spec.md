# Spec Delta

## MODIFIED Requirements

### Requirement: Ending a round stops that round
When a round, Party game, Kata or Practice question ends or is stopped, the system SHALL stop every listener, timer and loop that belongs to it before the next one starts, and its handlers SHALL NOT act on the next round.

#### Scenario: Stop a game round and start again
- **WHEN** a Player stops a game round and immediately starts a new one
- **THEN** only the new round reacts to taps, and no late timer from the stopped round changes the new one

## REMOVED Requirements

### Requirement: One tap, one action
**Reason**: One of its scenarios is the Duel rematch; the Duel is replaced by Party Mode (play-experiences).
**Migration**: The same rule is "One tap, one action, in every round", with a Party Mode scenario.

## ADDED Requirements

### Requirement: One tap, one action, in every round
The system SHALL handle each tap, click or key press in a round exactly once, however many rounds, Party games or questions have been played before on the same page.

#### Scenario: Arena keypad in round 2
- **WHEN** a Challenger Player finishes an Arena round, starts a second round, and taps the keypad keys 1 then 2
- **THEN** the entry shows 12

#### Scenario: Explorer tap in round 2
- **WHEN** an Explorer Player in their second Arena round taps one choice
- **THEN** exactly one question is answered and the round moves to the next question once

#### Scenario: Party Mode setup after a change
- **WHEN** a Player changes a level in Party Mode setup and then taps "Add a player" once
- **THEN** exactly one player is added

#### Scenario: Practice symbol keys after several questions
- **WHEN** a Player has answered 5 Practice questions and taps the "/" symbol key once
- **THEN** exactly one "/" is inserted in the answer

#### Scenario: Hint link after several questions
- **WHEN** a Player has answered 5 Practice questions and taps "Want a hint?" once
- **THEN** exactly one hint is used

