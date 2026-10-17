# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Party Mode replaces the Duel`
- TO: `### Requirement: Party Mode is the same-screen game`

## MODIFIED Requirements

### Requirement: Party Mode is the same-screen game
Party Mode SHALL let two to four Players play on one screen, each answering questions at their own Mode, at `#/arena/party`. `#/duel` SHALL open the Online Duel lobby, which SHALL link Party Mode for Players on one screen. Finishing a Party game SHALL count toward the Party host badge.

#### Scenario: An old Duel link
- **WHEN** a Player opens `#/duel`
- **THEN** the address becomes `#/arena/duel` and the Online Duel lobby shows, with a link to Party Mode

#### Scenario: Party Mode stays
- **WHEN** a Player opens `#/arena/party`
- **THEN** Party Mode shows as before
