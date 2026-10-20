# Spec Delta

## ADDED Requirements

### Requirement: Toasts keep the primary action clear
A toast (Badge earned, Quest complete, New Title and the like) SHALL NOT cover the action a Player is about to press. While a round's number pad or answer choices are on screen, toasts SHALL show at the top of the screen; elsewhere they SHALL show at the bottom unless a primary button is within 12 px of where they would sit and the top is clearer. Toasts SHALL never take taps.

#### Scenario: Badge earned in a Star round
- **WHEN** a Player earns a badge with a right answer in a Star round on a 390 by 844 screen
- **THEN** the "Badge earned" toast does not overlap the number pad or its Check key

#### Scenario: Home
- **WHEN** a toast shows on Home with no primary button near the bottom of the screen
- **THEN** it shows at the bottom, as before
