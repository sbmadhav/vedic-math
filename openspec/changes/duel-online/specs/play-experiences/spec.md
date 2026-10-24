# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Party Mode replaces the Duel`
- TO: `### Requirement: Party Mode is the same-screen game`

## MODIFIED Requirements

### Requirement: Party Mode is the same-screen game
Party Mode SHALL let two to four Players play on one screen, each answering questions at their own Mode, at `/learn/arena/party`. `/learn/duel`, and an old `#/duel` link through the hash shim, SHALL open the Online Duel lobby at `/learn/arena/duel`, which SHALL link Party Mode for Players on one screen. Finishing a Party game SHALL count toward the Party host badge.

#### Scenario: An old Duel link
- **WHEN** a Player opens `/learn/duel`, or an old link ending in `#/duel`
- **THEN** the address becomes `/learn/arena/duel` and the Online Duel lobby shows, with a link to Party Mode

#### Scenario: Party Mode stays
- **WHEN** a Player opens `/learn/arena/party`
- **THEN** Party Mode shows as before
