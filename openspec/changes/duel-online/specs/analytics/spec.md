# Spec Delta

## ADDED Requirements

### Requirement: Duel events
The app SHALL count online Duels only as fixed-word events of the form `math/duel/<action>/<league>`, where the action is one of `create`, `join`, `queue`, `matched`, `no-match`, `finish`, `win`, `left`, `rematch`, `report`, `block` and `react`. No Duel event SHALL carry a code, a Nickname, a key, a score or a time, and the route view for `/learn/arena/duel` SHALL be counted from the matched route alone, never from the fragment that holds a Duel code.

#### Scenario: Joining by link
- **WHEN** a Player opens `/learn/arena/duel#BKTRMZ` and joins
- **THEN** the analytics requests contain `duel` and `math/duel/join/<league>`, and none contains `BKTRMZ`
