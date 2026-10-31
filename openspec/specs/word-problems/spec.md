# word-problems Specification

## Purpose
Word problems in Practice and Star rounds, by Mode: stories with everyday settings and Sutra-friendly numbers, two hints (read, plan, solve) and the Only Word problems choice, so a Player meets a Trick inside a story and not only in bare numbers.

## Requirements

### Requirement: Word problems join Practice by Mode
In Practice (a Skill page, Endless practice and an Endless run) the system SHALL make a share of the questions Word problems, counted from the round's first question: questions 5, 15, 25 and so on for Explorer, 3, 8, 13 and so on for Challenger, and 2, 5, 8 and so on for Pro. A Word problem SHALL carry a "Word problem" label over the question in Challenger and Pro and "Story time" in Explorer.

#### Scenario: A Challenger's third question
- **WHEN** a Challenger with 20 saved answers opens Practice on Times tables with strategies and answers two questions
- **THEN** the third question is a Word problem labelled "Word problem", and the first two are not

#### Scenario: Pro meets one sooner
- **WHEN** a Pro with 20 saved answers opens Practice on Multiply numbers near 10, 100 or 1000 and answers one question
- **THEN** the second question is a Word problem

### Requirement: A new Player's first answers stay bare
Outside the Word problem Skills (which the Player opens to read stories) and Practice set to Only Word problems (which the Player picks to read stories), a Word problem SHALL be shown only once the Player has at least 20 saved answers. Until then every other question SHALL stay bare, and a Word problem that falls due SHALL wait for the next question.

#### Scenario: A new Player
- **WHEN** a new Challenger with no saved answers answers the first four questions of Practice on Times tables with strategies
- **THEN** none of them is a Word problem

#### Scenario: A new Player who picks a Word problem Skill
- **WHEN** a new Challenger with no saved answers opens Two-step word problems
- **THEN** its first question is a Word problem

### Requirement: A due Word problem waits for a Skill with stories
When the Skill on screen has no Word problem, the next question whose Skill has one SHALL be the Word problem, and a round on a Skill with none SHALL show none.

#### Scenario: A Skill with no story
- **WHEN** a Challenger with 20 saved answers answers eight questions of Practice on Count objects to 20
- **THEN** none of them is a Word problem

### Requirement: Styles grow with the Mode
Explorer Word problems SHALL be one-step picture stories with small numbers, a drawing of the things in the story and short sentences, spoken whole when Read aloud is on. Challenger Word problems SHALL take one or two steps. Pro Word problems SHALL take two or more steps and be set in real life: budgets, travel times, recipes, sports stats, savings, sale prices or growth. When the Skill has no story in the Player's Mode's style, the closest style the Skill has SHALL be used.

#### Scenario: An Explorer picture story
- **WHEN** an Explorer with 20 saved answers and Read aloud on reaches the fifth question of Practice on Add within 10
- **THEN** the question is a story about things being put together, a picture of them is drawn under it, the answers are big buttons, and the whole story is spoken

#### Scenario: A Pro budget
- **WHEN** a Pro opens Real-life problems
- **THEN** the question is a story whose plan hint names at least two steps

### Requirement: The Sutra is the shortcut inside the story
A Word problem that names a Trick SHALL use numbers that Trick makes fast, its plan hint SHALL say which Trick fits in plain words, and its worked steps SHALL use that Trick. A Word problem in a Star round SHALL use the Star's own numbers, so its answer is the Trick's answer.

#### Scenario: Tickets near 100
- **WHEN** a Challenger meets the tickets story on Multiply numbers near 10, 100 or 1000
- **THEN** both numbers in the story are near the same power of ten, the plan hint says so, and the steps work the near-base Trick

### Requirement: Read, plan, solve
Every Word problem SHALL have two hints in order: the first SHALL start "What is it asking?" and say the unknown in plain words, and the second SHALL be the plan (the numbers, the operation or the steps, the Trick). No hint SHALL contain the answer. Show me and the third try SHALL reveal the worked steps and the answer as for every question.

#### Scenario: The first hint asks what it is asking
- **WHEN** a Player presses Hint on a Word problem
- **THEN** Bolt shows a hint that starts "What is it asking?", and pressing Hint again shows the plan

#### Scenario: Hints never hold the answer
- **WHEN** a Player presses Hint twice on a Word problem
- **THEN** neither hint contains the answer

### Requirement: Everyday settings that travel
Word problems SHALL be set in everyday places (shops, kitchens, sport, trips, school, gardens, parks), give money in rupees or dollars written as words, use metric units only, and use first names from a fixed list from many cultures. A Word problem SHALL never hold the Player's Nickname or anything a Player typed, and SHALL need no network request to be made.

#### Scenario: Units and money
- **WHEN** many Word problems are drawn for every Mode
- **THEN** every one gives money as rupees or dollars in words, uses no imperial unit and no currency symbol, and holds no Nickname

#### Scenario: Offline
- **WHEN** a Player answers a Word problem
- **THEN** no request was made to show it

### Requirement: Word problems in Star rounds
In a Star round for Challenger and Pro, once the Player has at least 20 saved answers, main question 3 (Challenger) or main question 2 (Pro) SHALL be a Word problem on the same numbers as the bare question it replaces, for Tricks whose answer is one number and whose numbers make a story. Every other main question and every Dare SHALL stay bare.

#### Scenario: A Challenger's Star
- **WHEN** a Challenger with 20 saved answers plays Star 1 of Square numbers ending in 5
- **THEN** question 3 of 4 is a Word problem about a square, and questions 1, 2 and 4 are bare

#### Scenario: A Trick with no story
- **WHEN** a Challenger with 20 saved answers plays Star 1 of Divide by 9 with running sums
- **THEN** all four questions are bare

### Requirement: Help after a missed Word problem in a Star
The replay after a missed Word problem in a Star round SHALL start with a step that says what the story asks and the plain question it turns into, followed by the Trick's own steps, and the rematch SHALL be a Word problem too.

#### Scenario: A missed Word problem in a Star
- **WHEN** a Challenger misses the Word problem in Star 1 of Square numbers ending in 5
- **THEN** the replay's first step says what the story asks, and the rematch is a Word problem

### Requirement: Word problem Skills
Two-step word problems (`3-twostep`) SHALL ask only Challenger one and two step stories, and Real-life problems (`8-reallife`, grade 8) SHALL ask only Pro's multi-step stories and a small set of hand-written stories. Both SHALL appear in the Skill map under their grade like every Skill.

#### Scenario: Real-life problems in the Skill map
- **WHEN** a Player opens the Grade 8 page
- **THEN** Real-life problems is listed, and its Practice asks a Word problem with a "What is it asking?" first hint

### Requirement: Word problems are read aloud with the existing voice
A Word problem SHALL be spoken through the same path as every question: with Read aloud on, the question on screen and, for Explorer, each hint shown. No new recording SHALL be needed: a line with no Studio voice recording SHALL be spoken by the Built-in voice. Speech SHALL follow the same rules as today (it only ever follows a tap).

#### Scenario: Hear it on a Word problem
- **WHEN** a Challenger presses Hear it on a Word problem
- **THEN** the whole story is spoken

### Requirement: Practice can ask only Word problems
The Endless practice page of a level that has at least one Skill with a Word problem SHALL offer a choice between "Mixed" (the default) and "Only Word problems" ("Only stories" in Explorer). With Only Word problems, every question SHALL be a Word problem from one of that level's Skills that have one, in the Player's Mode's style or the closest style the Skill has, from the first question and whatever the Player's saved answers. A level with no Word problem SHALL offer no choice.

#### Scenario: A new Challenger asks for only Word problems
- **WHEN** a new Challenger with no saved answers opens Endless practice for Grade 3 and picks Only Word problems
- **THEN** each of the first four questions is a Word problem labelled "Word problem", from a Grade 3 Skill

#### Scenario: Back to the mix
- **WHEN** that Player picks Mixed
- **THEN** Practice asks bare questions again, and a Word problem only on Two-step word problems, as today's mix does for a Player with no saved answers

#### Scenario: An Explorer asks for only stories
- **WHEN** an Explorer opens Endless practice for Grade 1 and picks Only stories
- **THEN** each of the first three questions is a picture story labelled "Story time", answered with big buttons

#### Scenario: A level with no Word problem
- **WHEN** a Pro opens Endless practice for Grade 11
- **THEN** no Only Word problems choice is offered
