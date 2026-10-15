# Spec Delta

## Purpose

Keep every game, round and page usable from the keyboard, with a screen reader, on a 320px screen and without motion, to WCAG 2.1 AA.

## ADDED Requirements

### Requirement: Focus stays in the game after an answer
When keyboard focus is inside a game's play area and an answer rebuilds or disables the options, the system SHALL move focus to the first option of the next question (or the same tile on a board that keeps its tiles). The system SHALL NOT move focus when it was outside the play area.

#### Scenario: Two keyboard answers in Number bonds
- **WHEN** a Player starts an Endless practice of Number bonds from the keyboard and answers twice with Enter
- **THEN** focus is on an option inside the play area after each answer, including after a miss's 1.2-second hold

#### Scenario: Mouse click elsewhere
- **WHEN** a Player clicks the page heading during a round and then an option is answered
- **THEN** focus is not moved into the play area

### Requirement: Answers are announced
The system SHALL announce the result of each Arena and challenge answer, and each right answer in Times sprint, through a polite status message, one short message per answer.

#### Scenario: Arena Practice answer
- **WHEN** an Explorer Player taps an answer in an Arena Practice round
- **THEN** a status message says "Right, plus N. Score S." or "Not quite. It was A.", and the visual pop stays hidden from assistive technology

#### Scenario: Right answer in Times sprint
- **WHEN** a Player types a right answer in Times sprint
- **THEN** the status line says "Right! N so far." and the explanation line under the question stays empty

### Requirement: Pages reflow at 320px
At a 320px wide viewport, with or without a text spacing override (line height 1.5, letter spacing 0.12em, word spacing 0.16em), pages SHALL NOT scroll sideways and sutra cards SHALL NOT clip their text.

#### Scenario: Settings on a small phone
- **WHEN** a Player opens `#/me` on a 320px wide screen
- **THEN** the voice picker fits the screen and the page does not scroll sideways

### Requirement: Motion can be paused
The system SHALL treat the site's Pause motion setting (`html.motion-paused`) like the reduced-motion setting: the moving background holds still and looping animations stop, at once and after a reload. Turning off the page's Moving background SHALL also stop the background.

#### Scenario: Pause from the Explore menu
- **WHEN** a Player turns on Pause motion in the Explore menu
- **THEN** the background canvas stops changing and no looping animation runs, and both resume when Pause motion is turned off
