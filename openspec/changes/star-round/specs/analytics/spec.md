# Spec Delta

## MODIFIED Requirements

### Requirement: Answer events in untimed play
The system SHALL send one `math/q_answered/<area>/<right|miss>` event for each answered question in Practice, Endless runs, Katas and Star rounds (main questions, rematches and Dares), and SHALL NOT send per-answer events during timed rounds.

#### Scenario: Practice answer
- **WHEN** a Player answers a Practice question right on the first try
- **THEN** one `math/q_answered/practice/right` event is sent

#### Scenario: Arena answers
- **WHEN** a Player answers 30 questions in an Arena round
- **THEN** no per-answer event is sent, and one `round_end` event is sent when the round ends

#### Scenario: Star answer
- **WHEN** a Player misses a main question in a Star and gets the rematch right
- **THEN** `math/q_answered/star/miss` and then `math/q_answered/star/right` are sent

### Requirement: Route views are counted
The system SHALL send one anonymous route-view event each time a hash route is rendered, named after the route with numeric parts collapsed.

#### Scenario: Opening the Arena
- **WHEN** a Player navigates to `#/arena`
- **THEN** one `math/view/arena` event is sent

#### Scenario: Game level
- **WHEN** a Player opens `#/game/times-sprint/12`
- **THEN** the event is `math/view/game/times-sprint/level`, without the level number

#### Scenario: A Star
- **WHEN** a Player opens `#/star/sq5/2`
- **THEN** the event is `math/view/star/sq5/star`, without the Star number
