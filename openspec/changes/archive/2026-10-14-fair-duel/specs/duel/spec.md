# Spec Delta

## Purpose

Make a same-screen Duel a fair race: both Players answer the same question at the same time and see everything the question needs.

## ADDED Requirements

### Requirement: Both sides get the same question
The system SHALL show both sides of a Duel the same question with the same choices at the same time, from the first question to the last.

#### Scenario: Duel starts
- **WHEN** a Duel starts
- **THEN** both sides show the same question text and the same set of choices

#### Scenario: After a point
- **WHEN** one side answers right
- **THEN** that side gains 1 point and both sides show the same next question

### Requirement: Resolving a question
The first right answer SHALL win the question. A wrong answer SHALL freeze only that side for 1.2 seconds while the other side can still answer. When both sides have missed, the system SHALL show the right answer briefly and then deal the next question to both.

#### Scenario: One side misses, the other is right
- **WHEN** Player 1 taps a wrong choice and Player 2 then taps the right one
- **THEN** Player 1 is frozen for 1.2 seconds, Player 2 gains the point, and both get the next question

#### Scenario: Both miss
- **WHEN** both Players tap wrong choices on the same question
- **THEN** neither gains a point, the right answer is shown, and both get the next question

### Requirement: Pictures are shown in Duels
When a Duel question has a picture (dots, a ten frame or similar), the system SHALL show it on both sides, including the flipped side in face-to-face play.

#### Scenario: Explorer counting question
- **WHEN** an Explorer-level Duel deals "How many dots?"
- **THEN** both sides show the dots picture next to the same choices

### Requirement: A Duel ends at 10
The first side to reach 10 points SHALL win, and no further taps SHALL score after that.

#### Scenario: Winning tap
- **WHEN** a side reaches 10 points
- **THEN** the Duel ends with that side as the winner and later taps change nothing
