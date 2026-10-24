# Spec Delta

## MODIFIED Requirements

### Requirement: Try a trick before any choice
The landing (the mode picker) SHALL show one primary button, "Try a trick", above the Mode cards, with a line saying it takes about two minutes and needs no sign-up. Pressing it SHALL set the Mode to Challenger as a guess, start the day as a Mode card does, and open the first Star of Bolt's suggested path, the same Star Home offers, starting on the Hook when it plays on that Star (see the `hook` capability), and otherwise on that Star's worked example (see "The trial Star teaches before it asks"). The landing's lede SHALL be one plain sentence, and the Mode cards SHALL stay as the explicit choice under a heading such as "Or pick who is playing".

#### Scenario: Two taps to a question
- **WHEN** a new visitor opens the app and presses Try a trick
- **THEN** the Hook's dare on that Star's Trick shows its problem, the calculator and the number pad, and pressing a digit enters the first answer

#### Scenario: Two taps to a question when the Hook does not play
- **WHEN** a visitor whose Player has seen or skipped the Hook presses Try a trick (the Trick's worked example opens), then presses Start the Star
- **THEN** the Star round shows its first question with the Star's title and number pad, and pressing a digit enters the first answer

#### Scenario: The cards still work
- **WHEN** a new visitor presses the Explorer card instead
- **THEN** Explorer Home opens, exactly as before this change, and no guess is recorded

#### Scenario: Above the fold on a phone
- **WHEN** a new visitor opens the landing on a 390 px wide screen
- **THEN** Try a trick is on screen without scrolling, and the lede has at most 25 words

### Requirement: The trial Star teaches before it asks
When Try a trick opens its Star and the Hook does not play on it, the round SHALL first show one card with the Trick's title, its one-line idea, and a worked example: a problem of that Star the round does not deal, with the Trick's own steps ending in the result. Its one button, "Start the Star", SHALL open the first question; the number pad SHALL be hidden until then. The card SHALL NOT be spoken, and SHALL show only on the Try a trick path, once. When the Hook plays on that Star, the card SHALL NOT be shown.

#### Scenario: The worked example
- **WHEN** a visitor whose Player has seen or skipped the Hook presses Try a trick and the Star is Star 1 of `from9`
- **THEN** a card shows "Subtract from 100, 1000, 10000", the rule that each digit is taken from 9 and the last from 10, and a worked example such as 100 − 84 whose last step gives the result (16), with a Start the Star button and no number pad

#### Scenario: The example is not one of the questions
- **WHEN** the visitor presses Start the Star and plays the round
- **THEN** none of the four questions, rematches or the Dare is the worked example's problem

#### Scenario: Only from Try a trick
- **WHEN** a Challenger Player who picked the Challenger card presses Play this Star on Home, or the trial visitor presses Play again
- **THEN** the round opens on its first question with no worked example card

#### Scenario: Not with the Hook
- **WHEN** a new visitor presses Try a trick and the Hook plays on that Star
- **THEN** no worked example card is shown before, during or after the Hook

### Requirement: The worked example card is reachable and still
The Start the Star button SHALL take keyboard focus when the card opens, so Enter or Space starts; Escape SHALL also start. The card SHALL be announced once through the polite live region, and starting SHALL move focus to the first question. Every step SHALL be shown at once with nothing moving and nothing timing out, so the card is the same with Calm on or motion paused.

#### Scenario: Keyboard
- **WHEN** a keyboard user whose Player has seen or skipped the Hook presses Try a trick and then Enter
- **THEN** the first question opens and has focus

#### Scenario: Screen reader
- **WHEN** a screen reader user lands on the card
- **THEN** the live region says "Learn the trick first" with the Trick's title, and the focused button is Start the Star

#### Scenario: Calm
- **WHEN** a visitor with Calm on whose Player has seen or skipped the Hook presses Try a trick and waits
- **THEN** every step of the worked example is shown at once without animation, and the card stays until Start the Star is pressed
