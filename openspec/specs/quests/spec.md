# quests Specification

## Purpose
Give each Player three small daily goals that count only what they do that day, show honest progress, and never complete by accident.

## Requirements

### Requirement: Progress counts from zero each day
Each quest's progress SHALL be the Player's activity on that local date only, starting at 0, and SHALL be shown as a whole number from 0 to the goal.

#### Scenario: First day, first action
- **WHEN** a new Player answers their first question on their first day
- **THEN** the "Answer 15 questions" quest shows 1/15, and no quest shows a decimal

#### Scenario: Next day
- **WHEN** a Player who answered 40 questions yesterday opens the app today
- **THEN** today's answer quest shows 0 of its goal

### Requirement: Quests have stable ids
The system SHALL track each quest's completion by the quest's own id, so that a quest is shown as done only if that quest was completed today.

#### Scenario: Mode change after completing a quest
- **WHEN** a Challenger Player completes their first quest and then switches to Pro
- **THEN** no Pro quest is shown as done unless that same quest was completed

### Requirement: Changing Mode starts the new quests at zero
When a Player changes Mode during a day, the new Mode's quests SHALL count only activity from that day, and SHALL NOT complete from earlier activity.

#### Scenario: Challenger to Explorer mid-day
- **WHEN** a Player with hundreds of lifetime right answers switches from Challenger to Explorer during a day
- **THEN** the Explorer "Get 5 right" quest shows only today's right answers and is not completed by the switch

### Requirement: Quests rotate daily
Each Mode SHALL have a pool of more than three quests, and the system SHALL pick three per local date with a seeded draw, so every Player in the same Mode sees the same three quests on the same date.

#### Scenario: Two Players in the same Mode
- **WHEN** two Challenger Players on different devices open the app on the same date
- **THEN** they see the same three quests

#### Scenario: A week of quests
- **WHEN** a Player looks at quests on seven consecutive dates
- **THEN** the set of three is not the same every day

### Requirement: Completing a quest
When a quest's progress reaches its goal, the system SHALL mark it done, add 25 Sparks once, and show a "Quest complete" message once.

#### Scenario: Goal reached
- **WHEN** a Player reaches the goal of a quest
- **THEN** it is marked done, 25 Sparks are added once, and reaching more of the goal later the same day adds nothing more

#### Scenario: Message wording
- **WHEN** a quest is completed
- **THEN** the message says "+25 Sparks" and does not say XP
