# trick-connectors Specification

## Purpose
Point from the question's numbers to the digits each step of a Trick uses, so the Player does not have to find them.

## Requirements

### Requirement: Lines join the digits each step uses
In the Trick animator ("Watch it work") of "Multiply numbers near 10, 100 or 1000" and "Multiply any two numbers in one line", each step that uses digits of the question SHALL show a diagram of the question's numbers with coloured lines joining the digits that step uses. The lines SHALL use only the category colour tokens (coral, teal, sky, sun, plum), matching the colours of the step's own highlights. Steps that use no digit of the question SHALL show no diagram.

#### Scenario: Near-base, the distances
- **WHEN** the animator shows the first step of 97 × 94
- **THEN** a coral line joins 97 to its distance −3 and a teal line joins 94 to its distance −6

#### Scenario: Near-base, the cross
- **WHEN** the animator shows the second step of 97 × 94
- **THEN** a sky line crosses from 97 to −6

#### Scenario: Near-base, the right part
- **WHEN** the animator shows the third step of 97 × 94
- **THEN** a sun line joins −3 and −6

#### Scenario: Crosswise columns
- **WHEN** the animator steps through 23 × 41
- **THEN** column 1 has one line joining the top 3 and the bottom 1, column 2 has two lines joining the top 2 and the bottom 1 and the top 3 and the bottom 4, and column 3 has one line joining the top 2 and the bottom 4

#### Scenario: The answer step
- **WHEN** the animator shows the last step of 23 × 41
- **THEN** no diagram is shown

### Requirement: Stepping by keyboard
With focus on the animator's steps, Space and the right arrow SHALL show the next step and the left arrow the step before, as Next step and Back do.

#### Scenario: Space
- **WHEN** a Player focuses the steps of 97 × 94 and presses Space
- **THEN** the second step is shown and the page does not scroll

### Requirement: Lines are shown, not animated, without motion
Each line SHALL draw in when its step is shown, except under Calm, Pause motion or the device's reduced motion setting, where it SHALL be shown fully at once.

#### Scenario: Calm
- **WHEN** a Player with Calm on shows the first step of 97 × 94
- **THEN** both lines are fully drawn and have no animation

### Requirement: A text alternative for each diagram
Each diagram SHALL be an image whose text alternative names what its lines join.

#### Scenario: Near-base, the distances
- **WHEN** a screen reader reaches the first step's diagram of 97 × 94
- **THEN** it reads "Lines join 97 to its distance minus 3, and 94 to its distance minus 6."
