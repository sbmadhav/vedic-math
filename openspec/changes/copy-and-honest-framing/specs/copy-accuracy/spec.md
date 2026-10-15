# Spec Delta

## Purpose

Keep greetings, question wording, lesson pictures and related links accurate, because small errors are what parents and older Players notice first.

## ADDED Requirements

### Requirement: Greeting matches the visit
The home greeting SHALL say "Welcome back" only to a Player who has played on an earlier day. A Player on their first day SHALL get a first-visit greeting worded for their Mode.

#### Scenario: First visit as Challenger
- **WHEN** a new Player picks Challenger and sees the home page
- **THEN** the greeting does not say "Welcome back"

#### Scenario: Returning Pro Player
- **WHEN** a Pro Player who played yesterday opens the home page
- **THEN** the greeting says "Welcome back"

### Requirement: Correct ordinals
Every ordinal number in a question SHALL use the right English suffix.

#### Scenario: Multiples question
- **WHEN** a question asks for the 2nd, 3rd or 4th multiple of a number
- **THEN** it reads "2nd", "3rd" and "4th", never "2th" or "3th"

### Requirement: Lesson pictures match the number
A picture shown with a question SHALL represent the same quantity as the question.

#### Scenario: Hundredths
- **WHEN** a question asks how many hundredths are in 0.25
- **THEN** the picture is a 10 by 10 grid with 25 squares shaded

#### Scenario: Small hundredths
- **WHEN** a question asks how many hundredths are in 0.04
- **THEN** the picture has 4 squares shaded, not none

### Requirement: Related videos match whole words
"Watch it explained" links SHALL be chosen by whole words or tags of the skill or trick, never by a word fragment inside another word.

#### Scenario: Percent lesson
- **WHEN** a Player opens "Discounts, tax and percent change"
- **THEN** no counting video for young children, such as Numberblocks, is linked
