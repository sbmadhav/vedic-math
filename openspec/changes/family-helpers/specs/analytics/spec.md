# Spec Delta

## ADDED Requirements

### Requirement: Family helper visits are counted
Each Family helper visit SHALL send one anonymous event by its level, `math/family/visit/1`, `math/family/visit/2` or `math/family/visit/3`, or `math/family/cheer` for a breakthrough; tapping Ask a friend, Show me and Not now SHALL send `math/family/ask`, `math/family/show_me` and `math/family/not_now`. No event SHALL carry the Skill, the Trick, the Nickname, the Reading band, the setting or anything the Player typed or said.

#### Scenario: A first visit
- **WHEN** a Player with the helpers on gets a level 1 visit and taps Not now
- **THEN** exactly `math/family/visit/1` and `math/family/not_now` are sent for it, each made only of fixed words

### Requirement: Talking with the Family and listening are counted
Sending a message to the Family SHALL send `math/family/talk`, and turning listening mode on SHALL send `math/family/listen`, each a fixed word; no event SHALL carry the words typed or said, the reply, the Skill or the Nickname.

#### Scenario: A message to the Family
- **WHEN** a Player of 15 with talking on sends "why do we add 1?" in a visit
- **THEN** exactly `math/family/talk` is sent for it, and no event holds the words typed or the reply
