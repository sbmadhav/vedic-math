# Spec Delta

## MODIFIED Requirements

### Requirement: Route views are counted
The system SHALL send one anonymous route-view event each time a route is rendered, named after the route with numeric parts collapsed. The route SHALL be read from the path under `/learn/`; an old `#/` link SHALL be counted once, after the address became its path. The page view of a cold load SHALL name the path without its query.

#### Scenario: Opening the Arena
- **WHEN** a Player navigates to `/learn/arena`
- **THEN** one `math/view/arena` event is sent

#### Scenario: Game level
- **WHEN** a Player opens `/learn/game/times-sprint/12`
- **THEN** the event is `math/view/game/times-sprint/level`, without the level number

#### Scenario: A Star
- **WHEN** a Player opens `/learn/star/sq5/2`
- **THEN** the event is `math/view/star/sq5/star`, without the Star number

#### Scenario: An old hash link
- **WHEN** a Player opens `/play/#/arena`
- **THEN** exactly one `math/view/arena` event is sent

#### Scenario: A problem link's page view
- **WHEN** a visitor opens `/learn/skill/3-mult?problem=2-k7f9`
- **THEN** the page view names `/learn/skill/3-mult` and no event contains `k7f9`

## ADDED Requirements

### Requirement: Problem link counts
The game SHALL send `math/problem/copy/<skill>` when "Copy link to this question" copies a link, and `math/problem/open/<skill>` when a problem link opens its question, `<skill>` being a Skill id from the catalog. No event SHALL contain the seed, the level or the numbers. These follow "Events carry no identifiers".

#### Scenario: Copying and opening
- **WHEN** a Player copies a link on `3-mult` and a friend opens it
- **THEN** `math/problem/copy/3-mult` is sent from the first device and `math/problem/open/3-mult` from the second
