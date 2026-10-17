# Spec Delta

## Purpose

Fit how the app talks and how a Player answers to how well they read, in every Mode, from one question asked once and kept on the device, without ever changing how hard the math is.

## ADDED Requirements

### Requirement: The grade question is asked once
On a first visit, before the Mode pick, the system SHALL ask each new Player "What grade are you in?" with big buttons for Pre-K, K, grades 1 to 12 and Grown-up, a way to answer with an age instead (3 to 17 and Grown-up), and Skip. A speaker button SHALL read the question on tap. The question SHALL NOT say what any answer changes.

#### Scenario: New visitor
- **WHEN** a new visitor opens `/play/`
- **THEN** the grade question appears before the Mode picker, with Pre-K to 12, Grown-up, "Tell my age instead" and Skip

#### Scenario: Skip
- **WHEN** a new Player presses Skip
- **THEN** the Mode picker opens, no Grade answer is saved, and the app behaves by Mode as before this change

### Requirement: Existing Players are asked once, never forced
A Player who has a Mode but no Grade answer when this change ships SHALL see one optional home card that opens the grade question. Answering it or pressing Not now SHALL retire the card.

#### Scenario: Not now
- **WHEN** an existing Player presses Not now on the card
- **THEN** the card does not appear again, and Me still offers the question

### Requirement: The Grade answer stays on the device
The Grade answer SHALL be stored only on the device, in the Player's record, and SHALL NOT be included in any request leaving the device, any analytics event or any Board entry. Removing the Player SHALL remove it.

#### Scenario: Nothing sent
- **WHEN** a Player who answered grade 2 plays Practice, an Arena daily round and a Star
- **THEN** no request URL or body contains the Grade answer or the Reading band

### Requirement: The Grade answer moves only with the Player's progress
The Grade answer SHALL leave the device only inside the Player's own progress, when someone explicitly copies the backup code or uses the progress hand-off, whose data rides in the URL fragment and never reaches a server. No other export or transfer of it SHALL exist.

#### Scenario: Hand-off
- **WHEN** a Player's progress moves to a new device with the hand-off
- **THEN** their Grade answer comes with it, and no request URL or body contained it

### Requirement: A grown-up can change it in Me
Me SHALL show the Grade answer under "For grown-ups" as how much reading help the Player gets, with Change, which opens the grade question, and Clear, which removes the answer.

#### Scenario: Change
- **WHEN** a grown-up changes a Player's answer from K to grade 3 in Me
- **THEN** the Player's next question uses the Growing band's rules

#### Scenario: Clear
- **WHEN** a grown-up presses Clear
- **THEN** the Player has no Reading band and the app behaves by Mode

### Requirement: Three Reading bands
The Reading band SHALL be Early for Pre-K, K, grade 1 or ages 3 to 6; Growing for grades 2 to 4 or ages 7 to 9; and Fluent for grade 5 and above, ages 10 and up, or Grown-up. A Player with no Grade answer SHALL have no band. The band name SHALL NOT be shown to the Player.

#### Scenario: Grade 4
- **WHEN** a Player answers grade 4
- **THEN** their Reading band is Growing

#### Scenario: Age 6
- **WHEN** a Player answers age 6
- **THEN** their Reading band is Early

### Requirement: Bands apply in every Mode
A Player's Reading band SHALL apply in Explorer, Challenger and Pro alike, and SHALL NOT change the Player's Mode or League.

#### Scenario: Early reader in Pro
- **WHEN** a Player whose band is Early picks Pro
- **THEN** their Practice questions are answered with big buttons and read aloud, and they are in the Pro League

### Requirement: Read aloud by band
Read aloud SHALL be a choice per Player. When the Player has not set it, it SHALL be on for Early (each question, hint and Bolt line spoken after the tap that shows it, with a replay button) and off for Growing and Fluent, which SHALL show Hear it on every question. With no band the default SHALL stay on for Explorer and off otherwise. Speech SHALL only follow a tap.

#### Scenario: Early in Challenger
- **WHEN** an Early Player in Challenger presses Next in Practice
- **THEN** the next question is spoken without another tap

#### Scenario: Growing in Explorer
- **WHEN** a Growing Player in Explorer opens a Practice question
- **THEN** nothing is spoken until they tap Hear it

#### Scenario: Two Players on one device
- **WHEN** one Player turns Read aloud off and another Player on the same device is Early
- **THEN** the Early Player still hears questions read

### Requirement: Answers and choices by band
An Early Player SHALL answer every question whose answer is a whole number or a choice by tapping one of 3 big buttons, with the Skill's picture shown when it has one, in every Mode, in Practice, Endless runs, Stars, Arena Practice and Placement. Growing and Fluent Players SHALL use their Mode's entry, and wherever choices are shown they SHALL see 4.

#### Scenario: Early in Pro Practice
- **WHEN** an Early Player in Pro practices `3-mult`
- **THEN** each question shows 3 big buttons and no text field

#### Scenario: Growing in Explorer Practice
- **WHEN** a Growing Player in Explorer gets a whole-number question
- **THEN** it shows 4 buttons

### Requirement: Timers by band
In Practice, an Early Player SHALL have no clock and the Hook's dare SHALL NOT race; a Growing Player SHALL keep Practice clocks with no countdown tick sound and the clock shown as a bar. Fluent Players and Players with no band SHALL keep today's timers.

#### Scenario: Early in a game Level
- **WHEN** an Early Player starts a timed game Level
- **THEN** the round has no clock, as it would in Calm, and nothing else about motion changes

#### Scenario: Growing in Arena Practice
- **WHEN** a Growing Player plays a timed Arena Practice round
- **THEN** the clock shows as a bar and no tick sound plays

### Requirement: Ranked rounds keep the League's rules
A Ranked round SHALL keep the League's clock length, input and number of choices for every band. Bands MAY change only its wording, read aloud, Bolt's lines, tick sounds and how the clock is drawn.

#### Scenario: Early in the Challenger daily round
- **WHEN** an Early Player in Challenger plays the Arena daily round
- **THEN** it has the Challenger clock and keypad, no tick sound, and the clock drawn as a bar

### Requirement: Bolt's tone by band
Bolt's lines SHALL come from the band's line set: for Early, 1 to 4 warm, literal words with no idioms or sarcasm; for Growing, a short friendly coach of up to 8 words; for Fluent and no band, the Mode's lines.

#### Scenario: Early right answer
- **WHEN** an Early Player gets a Star question right
- **THEN** Bolt says a line from the Early set, such as "You did it!", and never "Boom."

### Requirement: The Mode picker suggests a Mode
When the Player has a Grade answer, the Mode picker SHALL tag one Mode "Suggested" (Explorer for Pre-K to grade 2 or ages 3 to 7, Challenger for grades 3 to 7 or ages 8 to 12, Pro otherwise) and SHALL preselect none. Any Mode SHALL stay selectable.

#### Scenario: Grade 1
- **WHEN** a Player who answered grade 1 sees the Mode picker
- **THEN** Explorer is tagged "Suggested" and choosing Pro works

### Requirement: Bands never change math difficulty
A Reading band SHALL NOT change any Rating, how Ratings move, question generation or levels, Kata problems, Star bands, the daily Arena set, Placement's start step or questions, Scores or Sparks.

#### Scenario: Same questions
- **WHEN** an Early and a Fluent Player with the same Ratings and seed start the same Practice
- **THEN** they get the same questions at the same levels, and the same right and wrong answers move their Ratings the same way
