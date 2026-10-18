# Spec Delta

## ADDED Requirements

### Requirement: Try a trick and Find are counted
Pressing Try a trick on the landing SHALL send one `math/try/start` event. Following a Find result SHALL send one `math/find/go` event, the same whatever the kind or the result. Opening the Find page SHALL be counted as a route view, `math/view/find`. These events SHALL follow "Events carry no identifiers"; the Find text, the result's name and the number of results SHALL never be in any event.

#### Scenario: Try a trick
- **WHEN** a new visitor presses Try a trick
- **THEN** `math/try/start` is sent once, followed by the Star's route view

#### Scenario: A Find result
- **WHEN** a Player types "squares" in Find and follows the first result
- **THEN** exactly one `math/find/go` is sent, with no path or title containing "squares" or the result's name
