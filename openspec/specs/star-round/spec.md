# star-round Specification

## Purpose
Play one Star end to end: a short round on one Trick where a mistake is taught at once on the Player's own number, fixing it pays more than getting it right first time, and a harder Dare costs nothing to try.

## Requirements

### Requirement: Three Stars per Trick
Each Trick SHALL have three Stars of rising difficulty. Star 1 SHALL draw its questions from the Trick's Katas 1 to 17, Star 2 from Katas 18 to 34, and Star 3 from Katas 35 to 50. Every Star SHALL be open; none SHALL be locked.

#### Scenario: Count
- **WHEN** the Stars are listed
- **THEN** there are 63 Stars, three for each of the 21 Tricks

#### Scenario: Star 2 of Square numbers ending in 5
- **WHEN** a Player plays Star 2 of that Trick
- **THEN** every main question comes from one of its Katas 18 to 34

#### Scenario: Nothing locked
- **WHEN** a new Player opens Star 3 of any Trick by link
- **THEN** the round starts

### Requirement: A Star round is four shuffled questions
A Star round SHALL deal 4 main questions in a shuffled order, drawn fresh each round (the one round that follows the Hook deals them easiest first, see the `hook` spec). Where the Star's pool allows, none of them SHALL be one of the previous round's questions on the same Star.

#### Scenario: Two rounds in a row
- **WHEN** a Player plays the same Star twice in a row
- **THEN** the second round's 4 questions are different from the first round's

#### Scenario: Order
- **WHEN** a Player plays a Star many times
- **THEN** the questions do not come in a fixed order

### Requirement: Sparks in a Star light it
A first-try right answer to a main question SHALL earn 10 Sparks. When the Sparks earned in one round reach 40, the Star SHALL be lit at the end of that round. Lighting a Star SHALL clear its skipped mark. A lit Star SHALL stay lit, and playing it again SHALL still earn Sparks.

#### Scenario: Four right
- **WHEN** a Player gets all 4 main questions right first time
- **THEN** they earn 40 Sparks and the Star is lit

#### Scenario: Not enough
- **WHEN** a Player ends a round with 30 Sparks earned in it
- **THEN** the Star is not lit and the end screen says how many more Sparks it needed

### Requirement: A miss replays the Trick on the Player's number
When a Player misses a main question, the system SHALL show the Trick worked step by step on the numbers of the question they missed, then deal a rematch: a question of the same kind (the same digit counts in its numbers) from the same Star, not already dealt in the round. The replay SHALL be skippable at any time, by a button or the Escape key. A missed rematch SHALL show its right answer and move on to the next main question, with no second replay.

#### Scenario: Miss on 85 squared
- **WHEN** a Player answers 7215 to 85²
- **THEN** the Trick's steps are shown for 85, then a rematch asks another 2-digit number ending in 5

#### Scenario: Skip the replay
- **WHEN** a Player presses Skip, or Escape, during the replay
- **THEN** the replay ends and the rematch is asked at once

#### Scenario: Rematch missed
- **WHEN** a Player misses the rematch
- **THEN** its right answer is shown and the next main question follows

### Requirement: Comeback
A right rematch SHALL be a Comeback and earn 15 Sparks, at most once per kind of question in a round. A later right rematch of a kind that already gave a Comeback in the round SHALL earn 10 Sparks.

#### Scenario: First Comeback
- **WHEN** a Player misses 85², watches the replay and gets the rematch 65² right
- **THEN** a Comeback is shown and they earn 15 Sparks

#### Scenario: Second rematch of the same kind
- **WHEN** later in the same round the Player misses 45² and gets the rematch 35² right
- **THEN** they earn 10 Sparks and no Comeback

### Requirement: Dare
From the second main question on, the round SHALL offer one optional Dare: a harder question from the Katas just above the Star's own (for Star 3, its hardest Katas). A right Dare SHALL earn 20 Sparks. A missed Dare SHALL cost nothing (no Sparks lost, no Rating change, no miss counted) and SHALL still show the replay on its number, then return to the main question. At most one Dare SHALL be offered per round, and it SHALL NOT count as one of the 4 questions.

#### Scenario: Dare taken and won
- **WHEN** a Player on question 2 of Star 1 takes the Dare and answers it right
- **THEN** they earn 20 Sparks and question 2 follows

#### Scenario: Dare missed
- **WHEN** a Player takes the Dare and misses it
- **THEN** the replay plays on the Dare's numbers, no rematch is dealt, and the main question follows, with the round's Sparks unchanged

#### Scenario: Not on question 1
- **WHEN** a round starts
- **THEN** no Dare is offered until the first main question is answered

### Requirement: Skip a Star
A Player SHALL be able to skip a Star from its screen at any time. A skipped Star that is not lit SHALL be marked as skipped and the skip itself SHALL earn nothing; Sparks already earned for answers in the round SHALL stay. Skipping a lit Star SHALL leave it lit. Lighting a skipped Star later SHALL clear the mark.

#### Scenario: Skip before playing
- **WHEN** a Player opens Star 2 and chooses Skip this Star
- **THEN** Star 2 is marked skipped and no Sparks are added

#### Scenario: Skip a lit Star
- **WHEN** a Player skips a Star they lit earlier
- **THEN** it stays lit with no skipped mark

### Requirement: Stars are Practice
A Star round SHALL be Practice: it SHALL have no Score, SHALL post nothing to any Board, and its Sparks SHALL count toward the Player's weekly Sparks total like any other Practice. Its answers SHALL count for quests and badges as answers do elsewhere, and SHALL update the Trick's mastery as Practice does, without earning Practice Sparks twice.

#### Scenario: No post
- **WHEN** a Player who may post finishes a Star round
- **THEN** no Star result is sent to any World board, and only the weekly Sparks total can change

#### Scenario: Quest progress
- **WHEN** a Player answers 4 questions in a Star
- **THEN** the "Answer 15 questions" quest moves by 4

### Requirement: Answer boxes by Mode
The answer entry SHALL show one box per digit of the answer in Challenger (and Explorer), and SHALL show a plain entry with no digit count in Pro. Entry SHALL work by the on-screen keypad and by the keyboard.

#### Scenario: Challenger on 85 squared
- **WHEN** a Challenger Player is asked 85²
- **THEN** four empty digit boxes are shown

#### Scenario: Pro on 85 squared
- **WHEN** a Pro Player is asked 85²
- **THEN** the entry gives no hint of how many digits the answer has

### Requirement: Back by button only
A Star's end screen SHALL offer Play again and a button back to where the Player came from (the Sky once it is home), and SHALL NOT return anywhere on its own, however long it stays open.

#### Scenario: Waiting on the end screen
- **WHEN** a Player lights a Star and does nothing for a minute
- **THEN** the end screen is still shown

### Requirement: Bolt teaches and reacts
Bolt SHALL be drawn as one inline image with six poses: idle, think, surprised, explain, cheer and wink, used for asking, waiting on a rematch, a miss, the replay, a right answer or lit Star, and a Comeback. Bolt SHALL be a teacher only: no feeding, moods to keep up, outfits or collecting. Bolt's image SHALL be hidden from assistive technology; what Bolt says SHALL be text on the page.

#### Scenario: A miss
- **WHEN** a Player misses a main question
- **THEN** Bolt shows the surprised pose, then the explain pose during the replay

#### Scenario: Colors
- **WHEN** Bolt is drawn in either color scheme
- **THEN** its colors come from the design tokens

### Requirement: A video offer after two misses
After a Player's second miss in one round (Dares do not count), once the replay has ended or been skipped, Bolt SHALL offer one short video for the Trick when one is available for the Player's Mode. It SHALL play in the page, be skippable, earn nothing, and appear at most once per round; closing it SHALL return to the round. When no video is available (none matched, the list not loaded, or offline), no offer SHALL appear and the round SHALL go on unchanged.

#### Scenario: No video for the Trick
- **WHEN** a Player misses twice in a Star whose Trick has no matched video
- **THEN** no offer appears and the rematch follows the replay

#### Scenario: Offer once
- **WHEN** a Player misses a third time in the same round
- **THEN** no second offer appears

#### Scenario: Offline
- **WHEN** a Player misses twice while offline
- **THEN** no offer appears

### Requirement: Calm path and announcements
Every replay, burst, Bolt pose change and Star lighting SHALL have a path with no motion, used when the Player's device asks for reduced motion, when the site-wide motion pause is on, or when Calm is on: the same steps and messages appear in place, without movement or particles. Every result (right, miss, Comeback, Dare outcome, Sparks earned, Star lit, Star skipped) and every replay step SHALL be announced to screen readers through a polite live region, once.

#### Scenario: Reduced motion
- **WHEN** a Player with reduced motion turned on in their device misses a question
- **THEN** the replay shows each step without any element moving, and the rematch follows

#### Scenario: Screen reader on a Comeback
- **WHEN** a screen reader user gets a rematch right
- **THEN** they hear the right answer, "Comeback", and the 15 Sparks earned

### Requirement: Where Stars are offered
A Trick's three Stars SHALL be offered on its Trick page and in the Dojo (and, once it ships, on the Sky), each showing whether it is lit, skipped or open, to Challenger and Pro Players. Explorer SHALL NOT be offered Stars; an Explorer Player who opens a Star by link SHALL get the Challenger layout.

#### Scenario: Trick page in Pro
- **WHEN** a Pro Player opens the Trick page for Square numbers ending in 5
- **THEN** its three Stars are shown with their state and each opens its round
