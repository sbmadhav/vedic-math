# Spec Delta

## ADDED Requirements

### Requirement: A celebration stops with its page
When the route changes, a celebration that is playing SHALL stop at once, its canvas SHALL be removed and its GPU resources released, and no part of it SHALL appear on the next page.

#### Scenario: Leaving during a Belt burst
- **WHEN** a Player taps Home while a Belt burst is playing
- **THEN** Home shows no burst, and the burst's canvas is gone
