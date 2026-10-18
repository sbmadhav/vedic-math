# Spec Delta

## ADDED Requirements

### Requirement: The note describes online Duels
The parent note SHALL say, in the words of the Player's Mode, that the only game data online Duels send is the Player's made-up Nickname, avatar color, League and taps; that to run safely they also use a bot check from Cloudflare, the connection's IP address (never kept) and, for Players 13 and over, a yes to being 13 or over and a scrambled weekly Duel key; that there is no chat or typed text; that Players under 13 can only duel friends by code; and how Report and Block work.

#### Scenario: Grown-up reads the note
- **WHEN** a grown-up opens the parent note in any Mode
- **THEN** it says what an online Duel sends and what it uses to run safely, that there is no chat, and that under-13 Players can only duel friends by code

### Requirement: The note says how long Duel data is kept
The parent note SHALL say that nothing about a Duel is kept more than 10 minutes after it ends, except reports (30 days, with no names) and, for Random Duels, Block pairs and automatic limits on scrambled weekly Duel keys (7 days).

#### Scenario: Grown-up checks what is kept
- **WHEN** a grown-up opens the parent note in any Mode
- **THEN** it gives the retention times: 10 minutes for a Duel, 30 days for a report and 7 days for a Block pair or an automatic limit
