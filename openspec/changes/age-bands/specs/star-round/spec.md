# Spec Delta

## MODIFIED Requirements

### Requirement: Answer boxes by Mode
The answer entry SHALL show one box per digit of the answer in Challenger (and Explorer), and SHALL show a plain entry with no digit count in Pro. Entry SHALL work by the on-screen keypad and by the keyboard. A Player in the Early Reading band SHALL instead answer every Star question by tapping one of 3 big buttons, in any Mode.

#### Scenario: Challenger on 85 squared
- **WHEN** a Challenger Player is asked 85²
- **THEN** four empty digit boxes are shown

#### Scenario: Pro on 85 squared
- **WHEN** a Pro Player is asked 85²
- **THEN** the entry gives no hint of how many digits the answer has

#### Scenario: Early reader on 85 squared
- **WHEN** an Early Player in Challenger is asked 85²
- **THEN** three big buttons are shown, one of them 7225, and no digit boxes
