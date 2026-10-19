# Spec Delta

## MODIFIED Requirements

### Requirement: Route views are counted
The system SHALL send one anonymous route-view event each time a route is rendered, named after the route with numeric parts collapsed. The names SHALL be the same whether the route was opened by its path or by an old hash link, and the same as before the switch to path routes.

#### Scenario: Opening the Arena
- **WHEN** a Player navigates to `/play/arena`
- **THEN** one `math/view/arena` event is sent

#### Scenario: Game level
- **WHEN** a Player opens `/play/game/times-sprint/12`
- **THEN** the event is `math/view/game/times-sprint/level`, without the level number

#### Scenario: A Star
- **WHEN** a Player opens `/play/star/sq5/2`
- **THEN** the event is `math/view/star/sq5/star`, without the Star number

#### Scenario: An old hash link
- **WHEN** a Player opens `/play/#/arena`
- **THEN** exactly one `math/view/arena` event is sent, after the address has become `/play/arena`
