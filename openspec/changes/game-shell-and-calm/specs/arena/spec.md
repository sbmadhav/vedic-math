# Spec Delta

## ADDED Requirements

### Requirement: Untimed Arena Practice
The Arena SHALL offer an untimed Practice round next to the daily challenge and the timed Practice round, in every League: 20 questions with no clock, adapting to the Arena Rating as Practice rounds do, which the Player can finish at any time. It SHALL be Practice: its Score SHALL never leave the device. With Calm on, the Arena's Practice choice SHALL be untimed by default.

#### Scenario: An untimed round
- **WHEN** a Challenger Player starts an untimed Practice round
- **THEN** no clock is shown, the round ends after 20 questions or when they press Finish, and nothing is sent to any World board

#### Scenario: Calm default
- **WHEN** a Player with Calm on opens the Arena
- **THEN** the untimed Practice round is selected
