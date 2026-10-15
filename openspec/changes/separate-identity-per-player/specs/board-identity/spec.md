# Spec Delta

## ADDED Requirements

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
