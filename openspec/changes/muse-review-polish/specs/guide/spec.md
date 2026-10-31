# Spec Delta

## ADDED Requirements

### Requirement: The tour never opens under a press
When the first-visit tour is due and the Player presses or types on Home before it opens, the system SHALL NOT open the tour then, SHALL leave it due for the Player's next Home visit, and SHALL let the press do what it was for. A tour the Player asked for (Quick tour, Take the tour) SHALL open as before.

#### Scenario: Playing a Star at once
- **WHEN** a new Challenger Player presses Play this Star before the tour has opened
- **THEN** the Star opens, no tour appears, and the tour opens on the Player's next visit to Home
