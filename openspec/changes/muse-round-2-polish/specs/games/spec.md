# Spec Delta

## ADDED Requirements

### Requirement: Stopped rounds say what they save
A game's lobby SHALL say, next to the Player's skill in that game, that Stop ends a round with nothing saved (no Score, no Sparks and no change to the skill), and a Ranked round's exit SHALL be labelled "Stop (nothing saved)". A stopped round SHALL change no saved skill, Score or Sparks.

#### Scenario: The lobby after a stopped round
- **WHEN** a Challenger starts a Ranked round of Times rocket at skill 5, answers two questions right so the round's level rises, and presses Stop
- **THEN** the lobby shows "Your skill in this game: Level 5" with the sentence "Stop ends a round with nothing saved: no score, no Sparks and no change to this skill." beside it, and no Score or Sparks were saved

#### Scenario: Endless practice keeps Finish
- **WHEN** a Player starts Endless practice of any game
- **THEN** the exit reads "Finish" and pressing it ends the round with its Practice score and Sparks

### Requirement: Game prompts are read aloud
When read aloud is on, every game SHALL speak its question or prompt when it shows, in the words read aloud uses for the same markup (a fraction as "three sixths", a power as "2 cubed"), without pausing a timed round. Match the pairs has no question and SHALL say nothing.

#### Scenario: More or less at a fraction level
- **WHEN** read aloud is on and More or less shows three sixths and two fifths
- **THEN** the voice says "Which is more: three sixths or two fifths?" and the round's clock, if any, keeps running

#### Scenario: Number rain
- **WHEN** read aloud is on and a Number rain round starts with the magic number 7
- **THEN** the voice says "Tap the multiples of 7." and says it again when the magic number changes

#### Scenario: Read aloud off
- **WHEN** read aloud is off
- **THEN** no game speaks a question, and sound effects play as before

### Requirement: Number rain stands still without motion
Under Calm, Pause motion or the reduced-motion preference, Number rain SHALL show each number in place without moving it, keep it for at least 2.5 seconds (4 seconds at level 1, a tenth less per level), count an untapped multiple as a miss when it leaves, and describe the numbers as waiting, not falling. With motion on, the numbers SHALL drift as before.

#### Scenario: Calm on
- **WHEN** Calm is on and a Number rain round shows the number 14 with magic number 7
- **THEN** 14 does not move for the time it is shown, a tap on it scores, and the group is described as "Numbers that wait. Tap multiples of 7."

#### Scenario: Motion on
- **WHEN** Calm and Pause motion are off and the device does not prefer reduced motion
- **THEN** the numbers drift down as before and the round plays unchanged
