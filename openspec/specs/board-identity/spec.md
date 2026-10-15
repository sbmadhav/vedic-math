# board-identity Specification

## Purpose
Keep any identifier for a Player off the server until that Player actually posts something, and let anyone view World boards without one.

## Requirements

### Requirement: No identity before the first post
The system SHALL NOT create an anonymous identity, or contact the sign-in service, until a Player's first actual post to a World board (after the Age answer and, when required, the Parent step).

#### Scenario: Viewing a World board on a fresh device
- **WHEN** a Player who has never posted opens a World board
- **THEN** the Board's top entries are shown and no sign-in request is made

#### Scenario: Earning XP without posting
- **WHEN** a Player earns XP but is not allowed to post (no Age answer, or under 13 without the Parent step)
- **THEN** no sign-in request is made and no identity is created

#### Scenario: First post
- **WHEN** a Player who is allowed to post finishes their first Ranked round
- **THEN** an anonymous identity is created and the Score is posted under it

### Requirement: World boards are readable without sign-in
The system SHALL allow anyone to read at most 20 entries of a valid Board, ordered by Score, without signing in. Each entry SHALL expose only the Nickname, avatar color, Score and time. Reading a single entry by its identity, and all writes, SHALL still require the matching identity.

#### Scenario: Signed-out list query
- **WHEN** a signed-out client asks for the top 20 entries of today's Arena Board
- **THEN** the entries are returned

#### Scenario: Oversized or invalid query
- **WHEN** a signed-out client asks for more than 20 entries, or for a Board id that is not valid
- **THEN** the request is refused

#### Scenario: Signed-out write
- **WHEN** a signed-out client tries to write any entry
- **THEN** the request is refused

### Requirement: One identity per Player
The system SHALL give each Player on a device their own anonymous identity for World boards, created at that Player's first actual post and never before. A post SHALL be filed only under the identity of the Player whose Score or XP total it is, so that each Player has their own entry on every Board.

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
- **WHEN** Player A earns XP, the device switches to Player B before the weekly XP total is posted, and the post then happens
- **THEN** Player A's total is posted under Player A's identity, or not at all, and never under Player B's

### Requirement: Me marks only the active Player's own entry
On a World board, the system SHALL mark as "me" only the entry that belongs to the active Player's own identity, and SHALL mark nothing when the active Player has no identity.

#### Scenario: Switching Player changes the highlighted row
- **WHEN** Players A and B both have entries on a Board and the device switches from A to B
- **THEN** only B's entry is marked as "me"

### Requirement: Removing a Player forgets their identity
When a Player is removed from the device, the system SHALL sign that Player out and forget their identity on this device, and SHALL NOT change their entries already on World boards.

#### Scenario: Remove a Player who has posted
- **WHEN** a Player who has posted is removed and a new Player is then added
- **THEN** the new Player gets a new identity at their first post, and the removed Player's World board entries are unchanged

### Requirement: Existing shared identity stays with the first Player
An identity created before Players had their own SHALL be kept by the device's first Player, if that Player still exists. Every other Player SHALL get their own identity at their next post.

#### Scenario: Single-Player device after the update
- **WHEN** a device with one Player who posted before the update posts again
- **THEN** the post is filed under the same identity as before, and no new identity is created

#### Scenario: Second Player after the update
- **WHEN** a second Player on a device that used the shared identity posts after the update
- **THEN** a new identity is created for that Player, and the first Player's entries are not changed by the post
