# Spec Delta

## MODIFIED Requirements

### Requirement: Say it button
The system SHALL show a Say it button next to a Sutra name on each Sutra card, in the Sutra deep dive, on each Trick page (in its Sutra tag) and beside each Constellation name in All places. A tap SHALL play the name clip for that Sutra. The button SHALL NOT be placed inside another button or a link, and a tap on it SHALL NOT flip a Sutra card.

#### Scenario: Deep dive
- **WHEN** a Player opens `#/sutras/s1` and taps Say it
- **THEN** the clip for Ekādhikena Pūrveṇa plays and the button shows it is playing (`aria-pressed="true"`) until the clip ends

#### Scenario: Card does not flip
- **WHEN** a Player taps the Say it button on a Sutra card that is not flipped
- **THEN** the clip plays and the card stays unflipped

#### Scenario: Trick page with a bracketed Sutra
- **WHEN** a Player taps Say it on the Trick page of `div9`, whose Trick's Sutra line is "Nikhilaṃ (division by 9)" and whose Sutra tag now reads "Special case of Nikhilaṃ Navataścaramaṃ Daśataḥ" (in Challenger, "A special case of")
- **THEN** the clip for Sutra 2, Nikhilaṃ Navataścaramaṃ Daśataḥ, plays

#### Scenario: All places
- **WHEN** a Player opens `#/places`
- **THEN** each of the 17 Constellation headings has one Say it button for its Sutra
