# Spec Delta

## MODIFIED Requirements

### Requirement: No identity before the first post
The system SHALL NOT create an anonymous identity, or contact the sign-in service, until a Player's first actual post to a World board, which only a Player whose Age answer is 13 or over can make.

#### Scenario: Viewing a World board on a fresh device
- **WHEN** a Player whose Age answer is 13 or over and who has never posted opens a World board
- **THEN** the Board's top entries are shown and no sign-in request is made

#### Scenario: Earning XP without posting
- **WHEN** a Player earns Sparks but may not post (no Age answer, or an Age answer under 13)
- **THEN** no sign-in request is made and no identity is created

#### Scenario: First post
- **WHEN** a Player whose Age answer is 13 or over finishes their first Ranked round
- **THEN** an anonymous identity is created and the Score is posted under it

### Requirement: World boards are readable without sign-in
The system SHALL allow anyone to read at most 20 entries of a valid Board that began less than 35 days ago, ordered by Score, without signing in. Each entry SHALL expose only the Nickname, avatar color, Score and time. Reading a single entry by its identity, and all writes, SHALL still require the matching identity. In the app, a World board SHALL be shown only to a Player whose Age answer is 13 or over, and only after they tap to show it; every other Player SHALL see the Device board.

#### Scenario: Signed-out list query
- **WHEN** a signed-out client asks for the top 20 entries of today's Arena Board
- **THEN** the entries are returned

#### Scenario: Oversized or invalid query
- **WHEN** a signed-out client asks for more than 20 entries, or for a Board id that is not valid
- **THEN** the request is refused

#### Scenario: An old Board
- **WHEN** a client asks for the entries of a Board that began 40 days ago
- **THEN** the request is refused

#### Scenario: Signed-out write
- **WHEN** a signed-out client tries to write any entry
- **THEN** the request is refused

#### Scenario: Under-13 Player opens the Boards
- **WHEN** a Player whose Age answer is under 13 opens the Arena's Boards
- **THEN** only the Device board is shown and no request leaves the device

## ADDED Requirements

### Requirement: Board entries expire
Every World board entry SHALL carry an `exp` time 30 days after its last write, the rules SHALL refuse an `exp` less than 1 day or more than 31 days ahead, and a Firestore TTL policy on `exp` SHALL delete expired entries.

#### Scenario: An entry with a long expiry
- **WHEN** a client writes an entry whose `exp` is 45 days ahead
- **THEN** the write is refused

#### Scenario: TTL policy
- **WHEN** the project's Firestore TTL policies are listed
- **THEN** the `scores` collection group has an active policy on `exp`

### Requirement: A fresh start on learnvedicmath.com
World boards on learnvedicmath.com SHALL use a Firebase project of their own, separate from the one sbmadhav.com used. No World board identity, entry or saved id SHALL be carried from sbmadhav.com; a Player who posted there gets a new identity at their first post here.

#### Scenario: A Player who posted on sbmadhav.com
- **WHEN** a Player imported from sbmadhav.com, whose Age answer is 16, posts their first Score on learnvedicmath.com
- **THEN** a new anonymous identity is created in the new project, and the old one is not used
