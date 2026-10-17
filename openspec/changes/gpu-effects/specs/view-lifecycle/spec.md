# Spec Delta

## ADDED Requirements

### Requirement: Decoration stops with its page
When the route changes, every decoration scene the previous page mounted SHALL be unmounted, its listeners and observers removed and its frames stopped. The decoration worker SHALL be ended once no scene has been mounted for 60 seconds.

#### Scenario: Leaving the Sky
- **WHEN** a Player leaves the Sky for the Arena
- **THEN** the Sky backdrop draws no further frames and its canvas is removed

#### Scenario: Nothing mounted
- **WHEN** no decoration scene has been mounted for 60 seconds
- **THEN** the decoration worker has been ended
