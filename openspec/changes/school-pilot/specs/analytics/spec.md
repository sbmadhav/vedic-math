# Spec Delta

## ADDED Requirements

### Requirement: Class and report counts carry no class, seat or child
The teacher page SHALL send `math/teachers/class/make` when a class code is made and `math/teachers/class/report` when a report is entered; the Me page SHALL send `math/me/class/join` when a Player joins a class and `math/me/class/report` when a report is shown. No event path or title SHALL contain a class code, a class name, a seat number, a count or anything about a Player.

#### Scenario: A report entered
- **WHEN** a teacher enters a report code for seat 12 of class `MAPLE-FOX-42`
- **THEN** `math/teachers/class/report` is sent once, and neither `MAPLE`, `42`, `12` nor any count appears in the event

#### Scenario: A Player joins
- **WHEN** a Player joins a class with a code and a seat
- **THEN** `math/me/class/join` is sent once with a fixed title, and nothing else about the class or the Player is sent
