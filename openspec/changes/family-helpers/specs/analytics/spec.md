# Spec Delta

## ADDED Requirements

### Requirement: Family helper visits are counted
Each Family helper visit SHALL send one anonymous event by its level, `math/family/visit/1`, `math/family/visit/2` or `math/family/visit/3`, or `math/family/cheer` for a breakthrough; tapping Ask a friend, Show me and Not now SHALL send `math/family/ask`, `math/family/show_me` and `math/family/not_now`. No event SHALL carry the Skill, the Trick, the Nickname, the Reading band, the setting or anything the Player typed or said.

#### Scenario: A first visit
- **WHEN** a Player with the helpers on gets a level 1 visit and taps Not now
- **THEN** exactly `math/family/visit/1` and `math/family/not_now` are sent for it, each made only of fixed words
