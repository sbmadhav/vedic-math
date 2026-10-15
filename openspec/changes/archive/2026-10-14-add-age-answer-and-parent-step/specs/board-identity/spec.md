# Spec Delta

## Purpose

Keep any identifier for a Player off the server until that Player actually posts something, and let anyone view World boards without one.

## ADDED Requirements

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
