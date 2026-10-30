# Spec Delta

## Purpose

Let a Player hold the first part of a Trick's answer on screen, locked, while they work out the second part.

## ADDED Requirements

### Requirement: Two answer slots for a Trick built in parts
In Practice and in the Katas, a Challenger or Pro Player SHALL answer a question of the Tricks `sq5`, `near-base`, `square-near`, `by9s` and `ends10` in two slots side by side, labelled "Left part" and "Right part", inside a group named "Your answer in two parts". The parts SHALL be the answer's left and right parts after any carry or borrow, joined side by side, so that the two parts joined are the whole answer. A Word problem SHALL keep one box.

#### Scenario: A near-base question in Practice
- **WHEN** a Challenger Player opens Practice on "Multiply numbers near 10, 100 or 1000"
- **THEN** the answer has a "Left part" slot and a "Right part" slot side by side, and no single answer box

#### Scenario: A Kata
- **WHEN** a Pro Player opens Kata 1 of "Square numbers ending in 5"
- **THEN** the answer has a "Left part" slot and a "Right part" slot

#### Scenario: A Trick not built in parts
- **WHEN** a Challenger Player opens Practice on "Multiply any two numbers in one line"
- **THEN** the answer is one box

#### Scenario: The parts after a carry
- **WHEN** the parts of 112 × 112 are worked out
- **THEN** they are 125 and 44

### Requirement: The left part locks
Enter in the left slot, or the Lock button, SHALL lock the left part: the slot SHALL become read only, the Lock button (named "Lock the left part") SHALL read pressed, and focus SHALL move to the right slot. Pressing Lock again SHALL unlock it. Enter in the right slot SHALL check the answer. Locking SHALL be optional.

#### Scenario: Lock with Enter
- **WHEN** a Player types 95 in the left slot and presses Enter
- **THEN** the left slot is read only, the Lock button is pressed, focus is in the right slot, and nothing has been checked

#### Scenario: Unlock
- **WHEN** a Player presses the pressed Lock button
- **THEN** the left slot can be typed in again and the button is not pressed

### Requirement: Checking compares the whole answer
Check SHALL join the two parts as typed and check them as one answer, exactly as the single box is checked, so Sparks, Ratings and mastery are unchanged. A left part with an empty right part SHALL say "Now the right part.", an empty left part with a right part SHALL say "Type the left part too.", and neither SHALL count as a try.

#### Scenario: Right in parts
- **WHEN** a Player answers 98 × 97 with 95 in the left slot and 06 in the right slot
- **THEN** the answer is right

#### Scenario: A short right part
- **WHEN** a Player answers 98 × 97 with 95 and 6
- **THEN** the answer is checked as 956 and is not right

#### Scenario: Only the left part
- **WHEN** a Player checks with 95 in the left slot and the right slot empty
- **THEN** Bolt says "Now the right part." and no try is counted

### Requirement: One box stays available
Under the slots a "Type it in one box" control SHALL switch to the single answer box, and under that box a "Split into parts" control SHALL switch back. The choice SHALL be saved on this device and used for later questions. What the Player has typed SHALL be kept across the switch: the two parts joined in the one box, the one box's text in the left slot.

#### Scenario: One box
- **WHEN** a Player presses "Type it in one box" and answers the next question
- **THEN** that question has one answer box and a "Split into parts" control

### Requirement: Explorer keeps its answers
Explorer Players SHALL NOT get the two slots: their questions keep tap answers where they have them, and the single box otherwise.

#### Scenario: Explorer Practice of a Trick in parts
- **WHEN** an Explorer Player opens Practice on "Square numbers ending in 5"
- **THEN** there is no "Left part" slot

### Requirement: The parts in the Star round's boxes
In a Challenger Player's Star round, a question of those five Tricks SHALL show a bar between the boxes of the left part and those of the right part, and the left part's boxes SHALL be marked held once they are all filled. Typing and checking SHALL be unchanged. A Pro Player's Star round SHALL be unchanged.

#### Scenario: Boxes in two parts
- **WHEN** a Challenger Player types the left part of a near-base question in a Star round
- **THEN** a bar separates the left part's boxes from the right part's, and the left part's boxes are marked held
