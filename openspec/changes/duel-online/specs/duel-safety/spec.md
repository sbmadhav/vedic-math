# Spec Delta

## Purpose

Make online Duels safe for children by design: nothing written can be sent, nobody chooses a name, every Player can report and block, and under-13 Players get no lasting identifier.

## ADDED Requirements

### Requirement: No chat and no typed text
A Duel SHALL offer no way to send words or any typed text to the other Player. The server SHALL reject any message with a field it does not know or a value outside its fixed lists.

#### Scenario: A modified app sends text
- **WHEN** a client sends a Reaction message with an extra `text` field
- **THEN** the server rejects the message and counts it as a strike

### Requirement: Only preset Reactions
A Player SHALL be able to send one of six preset Reactions (Nice one!, Good game, Wow!, Oops!, Rematch?, Thanks!), at most one every 3 seconds and 12 per Duel. A Player SHALL be able to mute incoming Reactions for a Duel, and turn them off for every Duel on the device in Me.

#### Scenario: Muted
- **WHEN** a Player mutes Reactions and the other Player sends Wow!
- **THEN** nothing is shown or announced to the Player who muted

#### Scenario: Too many
- **WHEN** a Player sends Reactions twice within 3 seconds
- **THEN** only the first reaches the other Player

### Requirement: Generated Nicknames only
Each Player SHALL appear in a Duel only as their generated Nickname and one of the five avatar colors. The server SHALL refuse a Nickname not built from the word lists or a color not in the list.

#### Scenario: A made-up name
- **WHEN** a client tries to make a Duel with the name "Real Name 12"
- **THEN** the server refuses it and no room is made

### Requirement: Report and Block
Every match screen and end screen SHALL offer Report, with four fixed reasons and no text box, and Block. Either SHALL end the Duel for the Player who used it. A report SHALL keep no Nickname, IP address, code or text. In Random Duels, two Duel keys where one blocked the other SHALL NOT be paired again for a week. A Block follows the Duel key, not the person, and no copy about Block SHALL promise more than that.

#### Scenario: Reporting mean Reactions
- **WHEN** a Player reports Mean Reactions during a Duel
- **THEN** the Duel ends for them, the other Player is told they left, and the report stores only the reason, the League, the kind of Duel and a summary of the match

#### Scenario: Blocked in a Random Duel
- **WHEN** a Player aged 14 blocks their opponent and both join the queue again the same day with the same Duel keys
- **THEN** they are not paired with each other

### Requirement: Under-13 Players get no lasting identifier
A Player whose Age answer is under 13 SHALL be able to play Friend Duels only, and SHALL get no Duel key or other identifier that lasts beyond one Duel. The server SHALL keep nothing about their Duel more than 10 minutes after it ends, except a report someone makes about it.

#### Scenario: A child's Friend Duel
- **WHEN** a Player aged 8 finishes a Friend Duel
- **THEN** the device holds no Duel key, and 10 minutes later the server holds nothing about that Duel

### Requirement: Teens get a weekly Duel key
For a Player whose Age answer is 13 or over, the app SHALL make a random Duel key at their first Random Duel and a new one each ISO week, and SHALL send only its hash. The replaced key SHALL stay on the device for 7 more days and its hash SHALL be sent as `prev` with each queue join, so the queue checks Block pairs against both hashes and a Block lasts its full 7 days across the week change. Both SHALL be used only for Block and for the automatic limits.

#### Scenario: A new week
- **WHEN** a Player aged 16 plays a Random Duel in a new ISO week
- **THEN** a new key is made, the old one stays on the device and is sent as `prev` for 7 more days, and then it is deleted

#### Scenario: A Block across the week change
- **WHEN** a Player aged 15 blocks an opponent on the last day of an ISO week and both join the queue again the next day
- **THEN** they are not paired with each other, because the queue checks the blocker's new key and its `prev`

### Requirement: Automatic limits on reported devices
In Random Duels, a Duel key reported by three different keys within 24 hours, or with too-fast answers in three Duels in one day, SHALL NOT be paired again until it changes, and its Player SHALL be told only that Find a player is not available right now.

#### Scenario: Three reports
- **WHEN** a key has been reported by three different keys today and its Player taps Find a player
- **THEN** no pairing happens and the app suggests a Friend Duel

### Requirement: Joining a stranger is never automatic
Before joining a Friend Duel, the app SHALL show the host's Nickname and color and ask the Player to confirm, and SHALL tell the Player, in their Mode's words, to go back if they do not know who that is.

#### Scenario: An unknown Nickname
- **WHEN** a Player opens a Duel link from someone they do not know
- **THEN** the join screen shows that Nickname, asks before joining, and says to go back if they do not know them
