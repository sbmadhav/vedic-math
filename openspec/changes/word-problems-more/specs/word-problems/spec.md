# Word problems

## ADDED Requirements

### Requirement: Practice can ask only Word problems
The Endless practice page of a level that has at least one Skill with a Word problem SHALL offer a choice between "Mixed" (the default) and "Only Word problems" ("Only stories" in Explorer). With Only Word problems, every question SHALL be a Word problem from one of that level's Skills that have one, in the Player's Mode's style or the closest style the Skill has, from the first question and whatever the Player's saved answers. A level with no Word problem SHALL offer no choice.

#### Scenario: A new Challenger asks for only Word problems
- **WHEN** a new Challenger with no saved answers opens Endless practice for Grade 3 and picks Only Word problems
- **THEN** each of the first four questions is a Word problem labelled "Word problem", from a Grade 3 Skill

#### Scenario: Back to the mix
- **WHEN** that Player picks Mixed
- **THEN** the first question is not a Word problem, as in today's mix

#### Scenario: An Explorer asks for only stories
- **WHEN** an Explorer opens Endless practice for Grade 1 and picks Only stories
- **THEN** each of the first three questions is a picture story labelled "Story time", answered with big buttons

#### Scenario: A level with no Word problem
- **WHEN** a Pro opens Endless practice for Grade 11
- **THEN** no Only Word problems choice is offered

## MODIFIED Requirements

### Requirement: A new Player's first answers stay bare
Outside the Word problem Skills (which the Player opens to read stories) and Practice set to Only Word problems (which the Player picks to read stories), a Word problem SHALL be shown only once the Player has at least 20 saved answers. Until then every other question SHALL stay bare, and a Word problem that falls due SHALL wait for the next question.

#### Scenario: A new Player
- **WHEN** a new Challenger with no saved answers answers the first four questions of Practice on Times tables with strategies
- **THEN** none of them is a Word problem

#### Scenario: A new Player who picks a Word problem Skill
- **WHEN** a new Challenger with no saved answers opens Two-step word problems
- **THEN** its first question is a Word problem
