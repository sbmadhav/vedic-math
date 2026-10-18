# Spec Delta

## ADDED Requirements

### Requirement: Placement done
The system SHALL send `math/placement/done` each time a Player finishes a Placement climb, and SHALL send nothing when Placement is skipped or left. The event SHALL carry no step, grade, count, time or Mode. Placement answers SHALL NOT send `q_answered` or `first_win` events.

#### Scenario: Finished climb
- **WHEN** a Player finishes a Placement
- **THEN** exactly one `math/placement/done` event is sent, besides the route view `math/view/placement`

#### Scenario: Skipped
- **WHEN** a Player presses "Skip, just play"
- **THEN** no `placement` event is sent

## MODIFIED Requirements

### Requirement: Events carry no identifiers
No route view or event SHALL contain a Player id, Nickname, avatar, Score, Age answer, Placement level, Placement steps or answers, Board identity, seed, typed text or any other value that could single out a Player or device. Analytics SHALL set no cookies and SHALL send nothing when Do Not Track or Global Privacy Control is on.

#### Scenario: Event contents
- **WHEN** every event the app can send is listed
- **THEN** each path and title is made only of fixed words, route names, game or skill ids, Leagues and the documented buckets

#### Scenario: Global Privacy Control
- **WHEN** the browser sends Global Privacy Control
- **THEN** no analytics request is made

#### Scenario: Placement level
- **WHEN** a Player placed at grade 7 uses the app
- **THEN** no analytics path or title contains "7" because of the Placement level, and none names a grade
