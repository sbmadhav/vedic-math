# page-layout Specification

## Purpose
Keep game prompts readable at a glance and the page steady while it loads, so young Players can read the question and nothing jumps under a tap.

## Requirements

### Requirement: Game prompts are large and high contrast
Every game's main prompt and instruction line SHALL render at the game prompt size and in the main ink color, whatever element or card contains it.

#### Scenario: Balloon pop prompt
- **WHEN** an Explorer Player starts Balloon pop
- **THEN** the "Pop N balloons" prompt renders at least 24 px and in the main ink color, not 15 px grey

#### Scenario: Make ten and Multiple rain
- **WHEN** a Player starts Make ten or Multiple rain
- **THEN** the target line renders at the game instruction size and in the main ink color

### Requirement: Stable layout while loading
The main view SHALL reserve at least the screen height before its content renders, so the footer and page do not jump. Cumulative layout shift on a phone-sized first load SHALL be below 0.1.

#### Scenario: Phone first load
- **WHEN** the home page loads on a phone-sized screen with an empty cache
- **THEN** the measured cumulative layout shift is below 0.1

### Requirement: Play fills the screen with the keypad in view
Every timed round (Arena, Party Mode, game rounds, tower challenges) and every Star round SHALL play in a full-screen, fixed layout where the question, the answer and the on-screen keypad or choices all fit on screen without scrolling, on phones and Chromebooks, in either orientation, with the device's own keyboard kept from covering them. Leaving the play screen SHALL return focus to the control that started the round.

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
