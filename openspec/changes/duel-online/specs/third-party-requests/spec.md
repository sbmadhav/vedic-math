# Spec Delta

## ADDED Requirements

### Requirement: Turnstile only when a Duel is started
The Turnstile script and challenge SHALL load from `challenges.cloudflare.com` only after a Player taps Duel a friend, I have a code or Find a player, and never on any other page or view. It SHALL be on the build's list of allowed third-party hosts with that reason.

#### Scenario: Opening the Duel lobby
- **WHEN** a Player opens the Duel lobby and looks at it without tapping
- **THEN** no request goes to `challenges.cloudflare.com`

#### Scenario: Starting a Friend Duel
- **WHEN** the Player taps Duel a friend
- **THEN** the Turnstile script loads and, after it passes, the Duel code is shown
