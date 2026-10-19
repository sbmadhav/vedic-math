# Spec Delta

## ADDED Requirements

### Requirement: Play fills the screen with the keypad in view
Every timed round (Arena, Duel, game rounds, tower challenges) and every Star round SHALL play in a full-screen, fixed layout where the question, the answer and the on-screen keypad or choices all fit on screen without scrolling, on phones and Chromebooks, in either orientation, with the device's own keyboard kept from covering them. Leaving the play screen SHALL return focus to the control that started the round.

#### Scenario: Arena on a phone
- **WHEN** a Player starts an Arena round on a 390 by 844 phone screen
- **THEN** the question, the entry and every keypad key are on screen and the page does not scroll during the round

#### Scenario: Chromebook with a touch screen
- **WHEN** a Player taps the answer area in a Star round on a 1366 by 768 touch laptop
- **THEN** the on-screen keypad stays visible and the system keyboard does not open over it

#### Scenario: Round over
- **WHEN** a round ends
- **THEN** the result is shown in the play screen, and leaving it returns to the page with focus on the start button

### Requirement: Text size A and A+
Every play screen SHALL offer a text size switch with two sizes, A (normal) and A+ (larger), that scales the question, answers, choices and keypad. The choice SHALL be remembered on this device and SHALL keep the layout within the screen at both sizes.

#### Scenario: A+ on a phone
- **WHEN** a Player picks A+ in a Star round on a phone
- **THEN** the question and keypad grow, and everything still fits without scrolling
