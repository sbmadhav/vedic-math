# Spec Delta

## MODIFIED Requirements

### Requirement: Events carry no identifiers
No route view or event SHALL contain a Player id, Nickname, avatar, Score, Age answer, Grade answer, Reading band, Placement level, Placement steps or answers, Board identity, seed, typed text or any other value that could single out a Player or device. Analytics SHALL set no cookies and SHALL send nothing when Do Not Track or Global Privacy Control is on.

#### Scenario: Event contents
- **WHEN** every event the app can send is listed
- **THEN** each path and title is made only of fixed words, route names, game or skill ids, Leagues and the documented buckets

#### Scenario: Global Privacy Control
- **WHEN** the browser sends Global Privacy Control
- **THEN** no analytics request is made

#### Scenario: Placement level
- **WHEN** a Player placed at grade 7 uses the app
- **THEN** no analytics path or title contains "7" because of the Placement level, and none names a grade

#### Scenario: Grade answer
- **WHEN** a Player answers the grade question and plays in each band
- **THEN** no analytics path or title names a grade, an age or a Reading band, and answering the grade question sends no event
