# Spec Delta

## Purpose

Find where each Player's Practice should start with a short, untimed climb through the school grades, separate from the Mode they chose, so a child who is ahead of (or behind) their age group gets math that fits from the first session.

## ADDED Requirements

### Requirement: Placement is offered after the Mode pick
On a first visit to `/play/`, after a Player picks a Mode, the system SHALL offer Placement with one screen that says it takes about 3 minutes and has no clock, with a Start button and a "Skip, just play" button. Each new Player added on the device SHALL get the same offer after their Mode pick. The offer SHALL NOT appear again on its own after Start or Skip.

#### Scenario: New Player
- **WHEN** a new visitor opens `/play/` and picks Challenger
- **THEN** the Placement offer appears with Start and "Skip, just play", before home

#### Scenario: Another Player on the device
- **WHEN** a grown-up adds a Player in Me and that Player picks Explorer
- **THEN** the Placement offer appears for the new Player

### Requirement: Skipping Placement changes nothing
Skip, and leaving the climb before it ends, SHALL take the Player home with no Placement level saved, and the app SHALL then behave exactly as it did before this change.

#### Scenario: Skip
- **WHEN** a new Pro Player presses "Skip, just play"
- **THEN** home opens, no Placement level is saved, and their first Arena Practice round starts at difficulty 9

#### Scenario: Leaving mid-climb
- **WHEN** a Player leaves the climb after 3 questions by going home
- **THEN** no Placement level is saved and the offer is not shown again on home

### Requirement: One question per grade step
A Placement SHALL ask one question at a time, each from a school Skill (never a Trick) at the current step, where the steps are the grades K, 1, 2 and so on to 12. It SHALL start at the first grade of the Player's Mode: Explorer K, Challenger 3, Pro 8.

#### Scenario: Start step
- **WHEN** a Pro Player presses Start
- **THEN** the first question is from a grade 8 Skill

### Requirement: The climb moves up on a right answer
A right answer SHALL move the climb up one step, with no upper limit below grade 12 whatever the Mode. A miss SHALL stay on the step and ask a question from a different Skill at that step.

#### Scenario: Climbing past the age group
- **WHEN** a Challenger Player answers the first 9 questions right
- **THEN** the 10th question is from a grade 12 Skill

#### Scenario: A miss, then a right answer
- **WHEN** an Explorer Player misses at grade 1, then answers the next grade 1 question right
- **THEN** the next question is from grade 2, and the two grade 1 questions came from different Skills

### Requirement: When the climb ends
The climb SHALL end at the second miss on the same step, after 12 questions, or after a right answer at grade 12, whichever comes first.

#### Scenario: Two misses at one step
- **WHEN** a Pro Player answers grade 8 and grade 9 right, then misses twice at grade 10
- **THEN** the climb ends after 4 questions

#### Scenario: Twelve questions
- **WHEN** an Explorer Player has answered 12 questions without two misses at any step
- **THEN** the climb ends

### Requirement: The climb is untimed and does not teach
Placement SHALL have no clock, no hints, no Sparks and no answer shown after a miss; a miss SHALL get a neutral line. Every question SHALL offer an "I'm not sure" button that counts as a miss.

#### Scenario: No clock
- **WHEN** a Player waits 5 minutes on a Placement question
- **THEN** the question is still waiting for an answer

#### Scenario: Not sure
- **WHEN** a Player presses "I'm not sure"
- **THEN** it counts as a miss, and no answer is shown

### Requirement: The Placement level
The Placement level SHALL be the highest step answered right. When no step was answered right, it SHALL be the step below the start step, and K for a climb that started at K. The number of steps climbed SHALL be the number of right answers.

#### Scenario: Highest step answered right
- **WHEN** a Challenger Player answers grades 3, 4 and 5 right and misses twice at grade 6
- **THEN** the Placement level is grade 5 and the Player climbed 3 steps

#### Scenario: Nothing right
- **WHEN** a Pro Player misses twice at grade 8
- **THEN** the Placement level is grade 7

### Requirement: Explorer answers with three big choices
In Explorer every Placement question SHALL be answered by tapping one of 3 big buttons, at every step including algebra, keeping Explorer's look. For a number answer the buttons SHALL be the answer and 2 different nearby non-negative numbers, in ascending order. Challenger and Pro SHALL answer with their Mode's usual entry.

#### Scenario: Explorer at grade 6
- **WHEN** an Explorer Player reaches a grade 6 question
- **THEN** it shows exactly 3 big answer buttons, one of which is right, and no text field or keypad

#### Scenario: Pro
- **WHEN** a Pro Player gets a Placement question
- **THEN** it is answered with the Pro entry, as in Practice

### Requirement: Read aloud during Placement
In Explorer each Placement question SHALL be read aloud when it appears, unless the Player has turned Read aloud off, and SHALL have a button that reads it again. In Challenger and Pro a question SHALL be read only when the Player taps Hear it. Speech SHALL only follow a tap: the first question follows the Start tap and each later one follows the answer tap.

#### Scenario: Explorer
- **WHEN** an Explorer Player presses Start
- **THEN** the first question is spoken without another tap, and "Hear it again" speaks it again

#### Scenario: Challenger
- **WHEN** a Challenger Player gets a question and does not tap Hear it
- **THEN** nothing is spoken

### Requirement: The result shows steps to the Player
The result screen SHALL tell the Player how many steps they climbed and that Bolt will start them there, and SHALL NOT show a grade, a number of questions missed or the word "test". The grade SHALL be shown only to grown-ups: in the parent note and in small print in Me, as "about grade N" (with the course name for grades 9 to 12).

#### Scenario: Result
- **WHEN** a Challenger Player finishes a Placement at grade 5 after climbing 3 steps
- **THEN** the result says they climbed 3 steps, and no text on the screen mentions grade 5

#### Scenario: Me
- **WHEN** that Player opens Me
- **THEN** a small-print line says "about grade 5" with a Retake button

### Requirement: The Placement level sets where Practice starts
For a Player with a Placement level, Practice SHALL start where that level says when the Player has no Rating yet (see the `ratings` capability), and the Skill map SHALL suggest the grades one below, at and one above the level under "Suggested for you".

#### Scenario: Suggested grades
- **WHEN** a Challenger Player placed at grade 6 opens the Skill map
- **THEN** grades 5, 6 and 7 are listed under "Suggested for you"

### Requirement: The first Star at the Placement level
In Challenger and Pro, Bolt's path SHALL start at the first Belt, in Belt order, that has a Trick at the Placement level's grade or above, so the first Star Bolt suggests is at the Placement level.

#### Scenario: First Star at the level
- **WHEN** a new Challenger Player finishes a Placement at grade 5 and opens home
- **THEN** Bolt suggests Star 1 of the first yellow belt Trick

### Requirement: Explorer starts at the Placement level
Explorer's home SHALL show a "Start here" tile first that opens the first unmastered Skill of the Placement level's grade.

#### Scenario: Explorer ahead of their age group
- **WHEN** an Explorer Player placed at grade 3 opens home
- **THEN** the first tile is "Start here" and opens a grade 3 Skill

### Requirement: The Placement level never changes the League
The Placement level SHALL NOT change the Player's Mode, League, Boards, Ranked rounds or the daily Arena set.

#### Scenario: League unchanged
- **WHEN** an Explorer Player placed at grade 8 plays the daily Arena round
- **THEN** it is the Explorer League's daily set, the Player's Mode is still Explorer, and the Score ranks on Explorer Boards

### Requirement: Players who already have progress
A Player who has any progress when Placement ships SHALL see one optional Placement card on home, with Start and Not now, and SHALL never be sent into Placement without choosing it. Either button SHALL retire the card. Finishing a Placement SHALL only raise saved Ratings that are below the Placement level's start, and SHALL only move Bolt's start Belt forward. It SHALL NOT lower any Rating or change Medals, Stars, Belts, mastery or Sparks.

#### Scenario: Card once
- **WHEN** an existing Player presses Not now on the Placement card
- **THEN** the card does not appear again, and Me still offers "Find your level"

#### Scenario: Raise only
- **WHEN** a Player with a Times sprint Rating of 12 and a Make ten Rating of 2 finishes a Placement whose start for games is 7
- **THEN** Times sprint stays 12, Make ten becomes 7, and no Medal changes

### Requirement: Retake
Me SHALL let a Player take Placement again at any time. A retake SHALL replace the saved Placement level with the new one, even when it is lower, and SHALL then apply the raise-only rule, so no saved Rating goes down. Changing Mode SHALL keep the Placement level.

#### Scenario: Lower retake
- **WHEN** a Player placed at grade 6 retakes and places at grade 4
- **THEN** Me shows about grade 4, and every saved Rating is unchanged

### Requirement: Placement stays on the device
Only the result of a Placement (the Placement level, the steps climbed and when it was taken) SHALL be saved, only on the device, in the Player's record. Placement answers SHALL be kept only while the climb runs and SHALL NOT be saved. Neither SHALL be posted to any Board or included in any request leaving the device. Placement answers SHALL NOT count as answered questions for quests, badges, mastery, Sparks or the first-win measure.

#### Scenario: Nothing sent
- **WHEN** a Player finishes a Placement
- **THEN** no request leaving the device contains the Placement level, the steps or any answer, and the only analytics event besides the route view is `math/placement/done`

#### Scenario: No answers counted
- **WHEN** a new Player answers 6 Placement questions right
- **THEN** their answered-question count and Sparks are still 0

### Requirement: The Placement result moves only with the Player's progress
The saved Placement result SHALL leave the device only inside the Player's own progress, when someone explicitly copies the backup code or uses the progress hand-off, whose data rides in the URL fragment and never reaches a server. No other export or transfer of it SHALL exist.

#### Scenario: Backup code
- **WHEN** a grown-up copies a placed Player's backup code and restores it on another device
- **THEN** the Player keeps their Placement level there, and no request was made that contains it

### Requirement: Placement with Calm and screen readers
Placement SHALL work by keyboard and screen reader: each question's heading SHALL take focus, the step and the result SHALL be announced through the polite live region, and the answer buttons SHALL be named by their values. When motion is off (reduced motion, Pause motion or Calm), the staircase picture SHALL change without moving.

#### Scenario: Screen reader
- **WHEN** a screen reader user answers a question right
- **THEN** they hear the new step announced, and focus is on the next question's heading

#### Scenario: Reduced motion
- **WHEN** a Player with reduced motion climbs a step
- **THEN** the staircase shows the new step and `document.getAnimations()` is empty
