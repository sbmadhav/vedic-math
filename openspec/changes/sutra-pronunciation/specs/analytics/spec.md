# Spec Delta

## ADDED Requirements

### Requirement: Say it is counted
Each tap on a Say it button that starts a name clip SHALL send one anonymous `math/say/sutra` event titled "Say a Sutra name". The event SHALL NOT name the Sutra, the voice or the Mode, and SHALL follow "Events carry no identifiers".

#### Scenario: Two taps
- **WHEN** a Player taps Say it for Sutra 1 and then for Sutra 3
- **THEN** two `math/say/sutra` events are sent, identical, with no Sutra id in path or title

#### Scenario: Stopping is not counted
- **WHEN** a Player taps a playing Say it button to stop it
- **THEN** no event is sent
