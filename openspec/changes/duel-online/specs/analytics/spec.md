# Spec Delta

## ADDED Requirements

### Requirement: Duel events
The app SHALL count online Duels only as fixed-word events of the form `math/duel/<action>/<league>`, where the action is one of `create`, `join`, `queue`, `matched`, `no-match`, `finish`, `win`, `left`, `rematch`, `report`, `block` and `react`. No Duel event SHALL carry a code, a Nickname, a key, a score or a time, and the route view for `#/arena/duel/<code>` SHALL count only `duel`.

#### Scenario: Joining by link
- **WHEN** a Player opens `#/arena/duel/BKTRMZ` and joins
- **THEN** the analytics requests contain `duel` and `math/duel/join/<league>`, and none contains `BKTRMZ`
