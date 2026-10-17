# Spec Delta

## ADDED Requirements

### Requirement: Players under 13 use Device boards only
The system SHALL NOT post any Score or weekly Sparks total to a World board for a Player whose Age answer is under 13, in any Mode, and SHALL NOT offer any way to turn World board posting on for them. Their Scores SHALL rank on the Device board as for every other Player, and they SHALL be told, in the words of their Mode, that their Scores stay on this device's board.

#### Scenario: Under-13 Player in Pro mode
- **WHEN** a Player whose Age answer is 11 and who chose Pro finishes a Ranked round
- **THEN** nothing is posted, no Firebase file is loaded, the Score appears on the Device board, and the Player is told their Scores stay on this device

#### Scenario: No switch for grown-ups
- **WHEN** a grown-up opens the Me page for a Player whose Age answer is under 13
- **THEN** there is no control that would let that Player post to World boards

#### Scenario: Imported Parent step
- **WHEN** a Player imported from sbmadhav.com had the Parent step there and their Age answer is under 13
- **THEN** nothing is posted for them on learnvedicmath.com

## MODIFIED Requirements

### Requirement: Play is never blocked
The system SHALL let every Player play every Mode, Ranked rounds included, whatever their Age answer and whether or not they have one. Only posting to World boards depends on it.

#### Scenario: Under-13 Player without the Parent step plays the Arena
- **WHEN** an under-13 Player plays an Arena daily round
- **THEN** the round plays normally and its Score ranks on the Device board

## REMOVED Requirements

### Requirement: Parent step for Players under 13
**Reason**: A grown-up's toggle on the device is not verifiable parental consent under the amended COPPA Rule (in force since 2026-04-22). On learnvedicmath.com under-13 Players are device-only instead (docs/adr/0006).
**Migration**: Replaced by "Players under 13 use Device boards only". The `parentOk` field is no longer written or read, and is not carried by the hand-off.

### Requirement: Withdrawing the Parent step
**Reason**: There is no Parent step left to withdraw (docs/adr/0006).
**Migration**: None needed. Entries an under-13 Player posted on sbmadhav.com stay in the old Firebase project until it is deleted at the end of the move.
