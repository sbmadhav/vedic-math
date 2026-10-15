# Spec Delta

## Purpose

Make sure every page and every round cleans up after itself, so a tap is handled exactly once and nothing keeps running after a Player moves on.

## ADDED Requirements

### Requirement: One tap, one action
The system SHALL handle each tap, click or key press in a round exactly once, however many rounds, Duels or questions have been played before on the same page.

#### Scenario: Arena keypad in round 2
- **WHEN** a Challenger Player finishes an Arena round, starts a second round, and taps the keypad keys 1 then 2
- **THEN** the entry shows 12

#### Scenario: Explorer tap in round 2
- **WHEN** an Explorer Player in their second Arena round taps one choice
- **THEN** exactly one question is answered and the round moves to the next question once

#### Scenario: Duel rematch
- **WHEN** two Players start a rematch Duel and one taps a right answer
- **THEN** that side's points go up by exactly 1

#### Scenario: Practice symbol keys after several questions
- **WHEN** a Player has answered 5 Practice questions and taps the "/" symbol key once
- **THEN** exactly one "/" is inserted in the answer

#### Scenario: Hint link after several questions
- **WHEN** a Player has answered 5 Practice questions and taps "Want a hint?" once
- **THEN** exactly one hint is used

### Requirement: Leaving a page stops everything it started
When the route changes, the system SHALL stop every listener, timer, interval and animation-frame loop the previous page started, including any round in progress, and nothing from that page SHALL change the screen, play a sound, award XP or post a Score afterwards.

#### Scenario: Leave during a game's answer hold
- **WHEN** a Player misses a question in a game and leaves the page during the hold
- **THEN** no later question, sound or result from that game appears on the new page

#### Scenario: Leave during a countdown
- **WHEN** a Player starts the Arena countdown and leaves before it ends
- **THEN** the round never starts and nothing is posted

### Requirement: Ending a round stops that round
When a round, Duel, Kata or Practice question ends or is stopped, the system SHALL stop every listener, timer and loop that belongs to it before the next one starts, and its handlers SHALL NOT act on the next round.

#### Scenario: Stop a game round and start again
- **WHEN** a Player stops a game round and immediately starts a new one
- **THEN** only the new round reacts to taps, and no late timer from the stopped round changes the new one

### Requirement: An explanation stays with its question
The system SHALL never show the explanation of one question together with a different question. After a miss in a game, the answered question and its explanation SHALL stay on screen together for 1.2 seconds before the next question appears; after a right answer the next question SHALL appear at once with no explanation left from the previous one.

#### Scenario: Miss in Number bonds
- **WHEN** a Player picks a wrong part in Number bonds
- **THEN** the same question and its explanation are shown together for 1.2 seconds, then the next question appears without that explanation

#### Scenario: Right answer in Times sprint
- **WHEN** a Player types a right answer in Times sprint
- **THEN** the next question appears at once, with no explanation line from an earlier question under it

#### Scenario: Taps during the hold
- **WHEN** a Player taps an answer during the 1.2-second hold
- **THEN** the tap is ignored and does not count as an answer to either question
