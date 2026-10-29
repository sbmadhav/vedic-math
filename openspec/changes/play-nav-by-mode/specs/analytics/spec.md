# Spec Delta

## MODIFIED Requirements

### Requirement: Try a trick and Find are counted
Pressing a Home card's Try a trick button SHALL send one `math/try/start` and one `math/try/mode/<mode>`, `<mode>` being the fixed word `explorer`, `challenger` or `pro`; opening it is the route view `math/view/try`. Following a Find result SHALL send one `math/find/go`, whatever the kind or result, and opening Find is the route view `math/view/find`; opening the Arcade is the route view `math/view/arcade`. These follow "Events carry no identifiers": no Find text, result name or result count is ever in an event.

#### Scenario: Try a trick
- **WHEN** a new visitor picks Pro and presses the Try a trick card's button on Home
- **THEN** `math/try/start` and `math/try/mode/pro` are sent once each, followed by the route view `math/view/try`, and no event names the Player

#### Scenario: A Find result
- **WHEN** a Player types "squares" in Find and follows the first result
- **THEN** exactly one `math/find/go` is sent, with no path or title containing "squares" or the result's name

#### Scenario: A browse link is not a Find result
- **WHEN** a Player opens Find, or types a word that matches nothing, and follows a link in the browse list
- **THEN** no `math/find/go` is sent

#### Scenario: The Arcade
- **WHEN** a Challenger opens Arcade
- **THEN** one `math/view/arcade` route view is sent
