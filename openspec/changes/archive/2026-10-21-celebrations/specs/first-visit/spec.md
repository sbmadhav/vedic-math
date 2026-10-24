# Spec Delta

## MODIFIED Requirements

### Requirement: Try a trick before any choice
The landing (the mode picker) SHALL show one primary button, "Try a trick", above the Mode cards, with a line saying it takes about two minutes and needs no sign-up. Pressing it SHALL set the Mode to Challenger as a guess, start the day as a Mode card does, and open the first Star of Bolt's suggested path, the same Star Home offers, starting on that Star's worked example (see "The trial Star teaches before it asks").

#### Scenario: Two taps to a question
- **WHEN** a new visitor opens the app, presses Try a trick (the Trick's worked example opens), then presses Start the Star
- **THEN** the Star round shows its first question with the Star's title and number pad, and pressing a digit enters the first answer

## ADDED Requirements

### Requirement: The app's hero says little
The landing's hero SHALL say as little as it can: one short headline, the one short line about two minutes and no sign-up, Try a trick as the big first action (at least 56 px tall, in the accent colour, with a gentle glow every few seconds that stops under reduced motion, Pause motion and Calm), and the Nikhilam Family beside it as the mascot, with no Bolt.

#### Scenario: The hero says little
- **WHEN** a new visitor opens the app
- **THEN** the hero shows "Fast, fun math for every brain", the line "One trick, two minutes, no sign-up." and Try a trick, at most 14 words before the button, with the Nikhilam Family beside it

#### Scenario: Try a trick draws the eye and works every way
- **WHEN** a new visitor opens the app at 320, 375, 768 or 1280 px wide
- **THEN** Try a trick is on screen without scrolling, works by click, tap and Enter, glows every few seconds while the family's nine nods toward it, and holds still with reduced motion, Pause motion or Calm
