# Spec Delta

## MODIFIED Requirements

### Requirement: No identity before the first post
The system SHALL NOT create an anonymous identity, or contact the sign-in service, until a Player's first actual post to a World board (after the Age answer and, when required, the Parent step).

#### Scenario: Viewing a World board on a fresh device
- **WHEN** a Player who has never posted opens a World board
- **THEN** the Board's top entries are shown and no sign-in request is made

#### Scenario: Earning XP without posting
- **WHEN** a Player earns Sparks (formerly XP) but is not allowed to post (no Age answer, or under 13 without the Parent step)
- **THEN** no sign-in request is made and no identity is created

#### Scenario: First post
- **WHEN** a Player who is allowed to post finishes their first Ranked round
- **THEN** an anonymous identity is created and the Score is posted under it

### Requirement: One identity per Player
The system SHALL give each Player on a device their own anonymous identity for World boards, created at that Player's first actual post and never before. A post SHALL be filed only under the identity of the Player whose Score or weekly Sparks total it is, so that each Player has their own entry on every Board.

#### Scenario: Two Players on one device post to the same Board
- **WHEN** Player A posts a Score of 400 to today's Arena Board and then Player B, on the same device, posts 300 to the same Board
- **THEN** the Board holds two entries, A's with 400 and B's with 300, each with its own Nickname and avatar

#### Scenario: A higher Score from one Player never replaces another Player's entry
- **WHEN** Player B posts a Score higher than Player A's entry on a Board
- **THEN** Player A's entry is unchanged

#### Scenario: A second Player who has never posted
- **WHEN** Player A has posted and Player B, who has never posted, opens a World board on the same device
- **THEN** no identity is created for Player B and no sign-in request is made for Player B

#### Scenario: Weekly XP after switching Player
- **WHEN** Player A earns Sparks (the weekly total formerly called XP), the device switches to Player B before the weekly Sparks total is posted, and the post then happens
- **THEN** Player A's total is posted under Player A's identity, or not at all, and never under Player B's
