# Spec Delta

## ADDED Requirements

### Requirement: Decoration stops with its page
When the route changes, every decoration scene the previous page mounted SHALL be unmounted, its listeners and observers removed and its frames stopped. The decoration worker SHALL be ended 60 seconds after the last mounted scene is unmounted, if no scene has been mounted again in that time.

#### Scenario: Leaving the Sky
- **WHEN** a Player leaves the Sky for the Arena
- **THEN** the Sky backdrop draws no further frames and its canvas is removed

#### Scenario: Nothing mounted
- **WHEN** the last mounted decoration scene was unmounted 60 seconds ago and none has been mounted since
- **THEN** the decoration worker has been ended
