# Spec Delta

## ADDED Requirements

### Requirement: Following a Sutra tag is counted
Following a Sutra tag's link SHALL send one anonymous `math/sutra_tag/<surface>` event titled "Sutra tag: <surface>", where `<surface>` is one fixed word for where the tag was (`trick`, `star`, `try`, `kata`, `katas`, `dojo`, `arena`, `watch`, `game` or `home`). The event SHALL NOT name the Sutra, the Trick, the Mode or the Player's progress, and SHALL follow "Events carry no identifiers".

#### Scenario: From a Trick page
- **WHEN** a Player follows the Sutra tag on the Trick page for Square numbers ending in 5
- **THEN** one `math/sutra_tag/trick` event is sent, and the Deep dive's own route view follows
