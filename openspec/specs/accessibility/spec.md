# accessibility Specification

## Purpose
Keep every game, round and page usable from the keyboard, with a screen reader, on a 320px screen and without motion, to WCAG 2.1 AA.

## Requirements

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
The system SHALL offer a Pause motion switch on the Me page and in the music panel, saved on the device and applied before the page paints, which sets `html.motion-paused`. The system SHALL treat `html.motion-paused` like the reduced-motion setting: the moving background holds still and looping animations stop, at once and after a reload. Turning off the page's Moving background SHALL also stop the background.

#### Scenario: Pause from the Explore menu
- **WHEN** a Player turns on Pause motion, which is on the Me page now that the site has no Explore menu
- **THEN** the background canvas stops changing and no looping animation runs, still after a reload, and both resume when Pause motion is turned off

#### Scenario: Landing page
- **WHEN** Pause motion is on and the Player opens the landing page
- **THEN** the Nikhilam Family and the page hold still, as they do with reduced motion on the device or Calm on

### Requirement: Sutra names say their language
Every Sutra name in IAST SHALL carry `lang="sa-Latn"` and every name in Devanagari `lang="sa"`, on cards, in the deep dive, on Trick and Katas pages and in All places. Each Say it button SHALL have the accessible name "Hear how to say <name>" and a target of at least 44 by 44 CSS pixels.

#### Scenario: Katas page tag
- **WHEN** a Player opens `#/katas/sq5`
- **THEN** the Sutra tag has `lang="sa-Latn"`

#### Scenario: Button name
- **WHEN** a screen reader reaches the Say it button in the deep dive of Sutra 3
- **THEN** it announces "Hear how to say Ūrdhva-Tiryagbhyām, toggle button, not pressed"
