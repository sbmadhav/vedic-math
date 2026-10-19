# Spec Delta

## ADDED Requirements

### Requirement: Star Quest fits a phone
On a phone-sized screen (360 by 740 CSS pixels, and reflowing down to 320 pixels wide), the Star round SHALL show the question, the answer area or choices, and the main action without horizontal scrolling and without scrolling to reach the answer controls, and the Sky SHALL show its Stars and Landmarks with tap targets of at least 44 by 44 CSS pixels, in both color schemes and in every Mode.

#### Scenario: A Star on a phone
- **WHEN** an Explorer Player opens a Star round on a 360 by 740 screen
- **THEN** the question and all choices are visible without scrolling, and the page does not scroll sideways

#### Scenario: The Sky at 320 pixels
- **WHEN** a Challenger Player opens the Sky on a 320 pixel wide screen
- **THEN** every Star and Landmark can be tapped, each target is at least 44 by 44 CSS pixels, and nothing overflows sideways
