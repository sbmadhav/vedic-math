# board-identity Specification

## Purpose
Keep any identifier for a Player off the server until that Player actually posts something, and let anyone view World boards without one.

## Requirements

### Requirement: No identity before the first post
The system SHALL NOT create an anonymous identity, or contact the sign-in service, until a Player's first actual post to a World board, which only a Player whose Age answer is 13 or over can make.

#### Scenario: Viewing a World board on a fresh device
- **WHEN** a Player whose Age answer is 13 or over and who has never posted opens a World board
- **THEN** the Board's top entries are shown and no sign-in request is made

#### Scenario: Earning XP without posting
- **WHEN** a Player earns Sparks but may not post (no Age answer, or an Age answer under 13)
- **THEN** no sign-in request is made and no identity is created

#### Scenario: First post
- **WHEN** a Player whose Age answer is 13 or over finishes their first Ranked round with a Score the Board accepts (10 or more, within the Board's cap)
- **THEN** an anonymous identity is created and the Score is posted under it

#### Scenario: First Ranked round with a Score too low to post
- **WHEN** a Player whose Age answer is 13 or over finishes their first Ranked round with a Score below 10
- **THEN** nothing is posted and no identity is created

### Requirement: World boards are readable without sign-in
The system SHALL allow anyone to read at most 20 entries of a valid Board that began less than 28 days ago, ordered by Score, without signing in. Each entry SHALL expose only the Nickname, avatar color, Score and time. Reading a single entry by its identity, and all writes, SHALL still require the matching identity. In the app, a World board SHALL be shown only to a Player whose Age answer is 13 or over, and only after they tap to show it; every other Player SHALL see the Device board.

#### Scenario: Signed-out list query
- **WHEN** a signed-out client asks for the top 20 entries of today's Arena Board
- **THEN** the entries are returned

#### Scenario: Oversized or invalid query
- **WHEN** a signed-out client asks for more than 20 entries, or for a Board id that is not valid
- **THEN** the request is refused

#### Scenario: An old Board
- **WHEN** a client asks for the entries of a Board that began 29 days ago
- **THEN** the request is refused

#### Scenario: Signed-out write
- **WHEN** a signed-out client tries to write any entry
- **THEN** the request is refused

#### Scenario: Under-13 Player opens the Boards
- **WHEN** a Player whose Age answer is under 13 opens the Arena's Boards
- **THEN** only the Device board is shown and no request leaves the device

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

### Requirement: Board entries expire
Every World board entry SHALL carry an `exp` time 30 days after its last write, and the rules SHALL refuse an `exp` less than 29 or more than 31 days ahead, so that no entry of a Board that can still be listed has expired. No read SHALL return an expired entry, and the app SHALL NOT show one. A Firestore TTL policy on `exp` SHALL delete expired entries; that deletion runs in the background and is not immediate.

#### Scenario: An entry with a long expiry
- **WHEN** a client writes an entry whose `exp` is 45 days ahead
- **THEN** the write is refused

#### Scenario: An entry with a short expiry
- **WHEN** a client writes an entry whose `exp` is 2 days ahead
- **THEN** the write is refused

#### Scenario: Expired but not yet deleted
- **WHEN** an entry's `exp` has passed and TTL has not yet removed it, and a signed-out client lists its Board
- **THEN** the list is refused, because that Board began more than 28 days ago

#### Scenario: The app's own guard
- **WHEN** the app receives a Board row whose `exp` is in the past
- **THEN** it does not show it

#### Scenario: TTL policy
- **WHEN** the project's Firestore TTL policies are listed
- **THEN** the `scores` collection group has an active policy on `exp`

### Requirement: A fresh start on learnvedicmath.com
World boards on learnvedicmath.com SHALL use a Firebase project of their own, separate from the one sbmadhav.com used. No World board identity, entry or saved id SHALL be carried from sbmadhav.com; a Player who posted there gets a new identity at their first post here.

#### Scenario: A Player who posted on sbmadhav.com
- **WHEN** a Player imported from sbmadhav.com, whose Age answer is 16, posts their first Score on learnvedicmath.com
- **THEN** a new anonymous identity is created in the new project, and the old one is not used
