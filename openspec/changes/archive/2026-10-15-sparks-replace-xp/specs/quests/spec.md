# Spec Delta

## MODIFIED Requirements

### Requirement: Completing a quest
When a quest's progress reaches its goal, the system SHALL mark it done, add 25 Sparks once, and show a "Quest complete" message once.

#### Scenario: Goal reached
- **WHEN** a Player reaches the goal of a quest
- **THEN** it is marked done, 25 Sparks are added once, and reaching more of the goal later the same day adds nothing more

#### Scenario: Message wording
- **WHEN** a quest is completed
- **THEN** the message says "+25 Sparks" and does not say XP
