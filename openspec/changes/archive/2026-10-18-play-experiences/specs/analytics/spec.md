# Spec Delta

## ADDED Requirements

### Requirement: Play experience events
Route views of a play experience SHALL be counted as `view/play/<name>`, never including the params after the name. Experiences SHALL send only `math/play/<experience>/<action>` events made of fixed words, with no score, count, seed, time or typed text in the path or title.

#### Scenario: A shared ghost link
- **WHEN** a Player opens `#/arena/ghosts/r/<code>`
- **THEN** the route view sent is `view/play/ghosts`
