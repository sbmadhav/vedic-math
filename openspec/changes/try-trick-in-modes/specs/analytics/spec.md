# Spec Delta

## MODIFIED Requirements

### Requirement: Try a trick and Find are counted
Pressing a Try a trick button (on the Mode picker or a Home card) SHALL send one `math/try/start` and one `math/try/mode/<mode>`, `<mode>` being the fixed word `explorer`, `challenger` or `pro`; opening it is the route view `math/view/try`. Following a Find result SHALL send one `math/find/go`, whatever the kind or result, and opening Find is the route view `math/view/find`. These follow "Events carry no identifiers": no Find text, result name or result count is ever in an event.

#### Scenario: Try a trick
- **WHEN** a new visitor presses Try a trick under the Pro card
- **THEN** `math/try/start` and `math/try/mode/pro` are sent once each, followed by the route view `math/view/try`, and no event names the Player

#### Scenario: A Find result
- **WHEN** a Player types "squares" in Find and follows the first result
- **THEN** exactly one `math/find/go` is sent, with no path or title containing "squares" or the result's name

#### Scenario: A browse link is not a Find result
- **WHEN** a Player opens Find, or types a word that matches nothing, and follows a link in the browse list
- **THEN** no `math/find/go` is sent

### Requirement: Answer events in untimed play
The system SHALL send one `math/q_answered/<area>/<right|miss>` event for each answered question in Practice, Endless runs, Katas, Star rounds (main questions, rematches and Dares) and a Try a trick (area `try`), and SHALL NOT send per-answer events during timed rounds.

#### Scenario: Practice answer
- **WHEN** a Player answers a Practice question right on the first try
- **THEN** one `math/q_answered/practice/right` event is sent

#### Scenario: Arena answers
- **WHEN** a Player answers 30 questions in an Arena round
- **THEN** no per-answer event is sent, and one `round_end` event is sent when the round ends

#### Scenario: Star answer
- **WHEN** a Player misses a main question in a Star and gets the rematch right
- **THEN** `math/q_answered/star/miss` and then `math/q_answered/star/right` are sent

#### Scenario: Try a trick answer
- **WHEN** a new visitor answers the first question of a Try a trick right
- **THEN** one `math/q_answered/try/right` is sent, and on a new device the first `math/first_win/<bucket>` follows
