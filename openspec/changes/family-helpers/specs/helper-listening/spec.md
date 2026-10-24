# Spec Delta

Planned for step 3 (after react-typescript phase 2); not built in step 2. ADR 0015.

## ADDED Requirements

### Requirement: Push-to-talk in Pro
With the Family helpers on, a Pro Player SHALL be able to hold a mic button to ask the Family for help by voice and release it to stop. Nothing SHALL listen before the press or after the release.

#### Scenario: Asking by voice
- **WHEN** a Pro Player holds the mic button, says "how does this work?" and releases it
- **THEN** a visit opens as if Ask a friend had been tapped, and the mic is off

### Requirement: An opt-in listening mode
A Player SHALL be able to turn on a listening mode, never on by default. While it listens a visible mic badge SHALL show. It SHALL stop when the tab is hidden, after 2 minutes with no speech, and when the Player leaves the round. It SHALL use speech recognition that runs on the device; where the browser offers none, the mode SHALL NOT be offered. It SHALL only look for help phrases ("I don't get it", "how?", "help", a frustrated word), and a match SHALL count as a help signal and nothing else.

#### Scenario: The tab is hidden
- **WHEN** a Player with listening mode on switches to another tab
- **THEN** listening stops and the mic badge is gone when they come back, until they turn it on again

#### Scenario: A help phrase
- **WHEN** a Player in listening mode says "I don't get it" on a Practice question
- **THEN** a visit opens, following the same escalation and 3 minute rule as the other help signals

### Requirement: Nothing heard is kept or sent
Listening SHALL NOT store or send audio, transcripts or whether a phrase was heard. Analytics SHALL count only that listening mode was turned on, with fixed words.

#### Scenario: Requests while listening
- **WHEN** a Player uses listening mode for a round
- **THEN** no request made during the round holds audio or any of the words said
