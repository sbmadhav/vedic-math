# first-visit Specification

## Purpose
Give a curious visitor one obvious thing to do before any choice, and a Home that shows three things first in plain words, so the first minute is a trick, not a menu.

## Requirements

### Requirement: Try a trick before any choice
The landing (the mode picker) SHALL show one primary button, "Try a trick", above the Mode cards, with a line saying it takes about two minutes and needs no sign-up. Pressing it SHALL set the Mode to Challenger as a guess, start the day as a Mode card does, and open the first Star of Bolt's suggested path, the same Star Home offers, starting on that Star's worked example (see "The trial Star teaches before it asks").

#### Scenario: Two taps to a question
- **WHEN** a new visitor opens the app, presses Try a trick (the Trick's worked example opens), then presses Start the Star
- **THEN** the Star round shows its first question with the Star's title and number pad, and pressing a digit enters the first answer

### Requirement: One plain lede, and the Mode cards stay
The landing's lede SHALL be one plain sentence, and the Mode cards SHALL stay as the explicit choice under a heading such as "Or pick who is playing".

#### Scenario: The cards still work
- **WHEN** a new visitor presses the Explorer card instead
- **THEN** Explorer Home opens, exactly as before this change, and no guess is recorded

#### Scenario: Above the fold on a phone
- **WHEN** a new visitor opens the landing on a 390 px wide screen
- **THEN** Try a trick is on screen without scrolling, and the lede has at most 25 words

### Requirement: A guessed Mode is shown and easy to change
When the Mode was guessed, Home's mode line SHALL say so (for example "Mode: Challenger, our guess") beside the Change link. Picking a Mode by hand, on the landing's cards or on Me, SHALL clear the guess. The guess SHALL be kept on the Player record on this device only and SHALL never be sent.

#### Scenario: Home after the trial
- **WHEN** a visitor finishes or leaves the trial Star and goes Home
- **THEN** Home shows the Challenger doors and the mode line says the Mode is a guess, with Change beside it

#### Scenario: Picking clears the guess
- **WHEN** that visitor opens Me and picks Pro
- **THEN** the mode line on Home no longer says the Mode is a guess

### Requirement: Back from a Star opened from Home goes Home
A Star opened from Home or from the landing SHALL offer "Back home" as its way out, returning to Home. A Star opened from the Dojo, a Trick page or by link SHALL keep its present Back (the Dojo, the Trick, or the Sky).

#### Scenario: After the trial
- **WHEN** a visitor who pressed Try a trick leaves the Star round with its Back control
- **THEN** Home opens

#### Scenario: From the Dojo
- **WHEN** a Player opens a Star from the Dojo and leaves it with Back
- **THEN** the Dojo opens, as before

### Requirement: Three doors first on Home
Challenger and Pro Home SHALL show three doors after the Keep going card (when there is one). Challenger: the next Star (belt, the Star's Trick and number, Play this Star, Open the Dojo), the Arena, the Skill map. Pro: the Arena (Play today's round), the Dojo (belts and Stars lit), the Skill map. Each door SHALL carry one plain line introducing its term on first use, and only the first door SHALL have a primary button.

#### Scenario: A new Challenger
- **WHEN** a new Challenger Player opens Home on a 390 px wide screen
- **THEN** the first three actions in the view are Play this Star, Open the Dojo and the Arena door, and the Star door's line says what a Star is

#### Scenario: Pro
- **WHEN** a new Pro Player opens Home
- **THEN** the Arena door with Play today's round, the Dojo door and the Skill map door come before the leaderboard card

### Requirement: More ways to play is folded
After the quests card, Challenger and Pro Home SHALL fold the remaining tiles (Party Mode, Games, Sutra cards or the Sutra deep dives, Watch) under a disclosure named "More ways to play", closed by default and remembered open or closed on this device. Every tile that was on Home before this change SHALL still be on Home, in the doors or under the disclosure.

#### Scenario: Closed by default
- **WHEN** a new Challenger Player opens Home
- **THEN** the Party Mode, Games, Sutra cards and Watch tiles are under a closed "More ways to play" disclosure

#### Scenario: Opened once
- **WHEN** the Player opens the disclosure and comes back to Home later on the same device
- **THEN** it is open

### Requirement: Sparks are explained where they first appear
The quests card SHALL say what Sparks are in its last line (for example "Sparks are the points you earn for right answers. Each quest is worth 25 bonus Sparks. New quests every day.").

#### Scenario: Quests card
- **WHEN** a Challenger or Pro Player looks at the quests card
- **THEN** its last line says Sparks are the points earned for right answers

### Requirement: Explorer Home keeps its pictures
Explorer Home SHALL keep its eight picture tiles, the read-aloud switch and the Watch and sing link, with no disclosure.

#### Scenario: Explorer
- **WHEN** an Explorer Player opens Home
- **THEN** eight picture tiles are shown with nothing folded away

### Requirement: Home fits a phone
On a screen up to 600 px wide, Home SHALL show the Player strip compactly (the avatar, nickname, Title and bar on one row, the Sparks, day streak and badge numbers on one short line), and a new Challenger Player's first primary action (Play this Star) SHALL be on screen without scrolling at 390 by 844, whether they picked the Challenger card or came Home from Try a trick. Nothing on Home SHALL be removed for this.

#### Scenario: After Try a trick
- **WHEN** a new visitor presses Try a trick, starts the Star from the trick card, answers its questions and opens Home on a 390 by 844 screen
- **THEN** Play this Star is on screen without scrolling, the Player strip is at most 130 px tall, and the page does not scroll sideways

### Requirement: Keep going does not repeat the first door
On Challenger Home, the Keep going card SHALL be left out when the Skill it offers is the Trick of the Star the first door offers. Pro and Explorer Home SHALL show Keep going as before.

#### Scenario: After the trial Star
- **WHEN** a visitor who tried a trick on Bolt's first Trick opens Challenger Home
- **THEN** there is no Keep going card, and the Star door offers that Trick's next Star

#### Scenario: Another Skill
- **WHEN** a Challenger Player who last practiced a Skill that is not that Trick opens Home
- **THEN** the Keep going card offers that Skill

### Requirement: The trial Star teaches before it asks
When Try a trick opens its Star, the round SHALL first show one card with the Trick's title, its one-line idea, and a worked example: a problem of that Star the round does not deal, with the Trick's own steps ending in the result. Its one button, "Start the Star", SHALL open the first question; the number pad SHALL be hidden until then. The card SHALL NOT be spoken, and SHALL show only on the Try a trick path, once.

#### Scenario: The worked example
- **WHEN** a new visitor presses Try a trick and the Star is Star 1 of `from9`
- **THEN** a card shows "Subtract from 100, 1000, 10000", the rule that each digit is taken from 9 and the last from 10, and a worked example such as 100 − 84 whose last step gives the result (16), with a Start the Star button and no number pad

#### Scenario: The example is not one of the questions
- **WHEN** the visitor presses Start the Star and plays the round
- **THEN** none of the four questions, rematches or the Dare is the worked example's problem

#### Scenario: Only from Try a trick
- **WHEN** a Challenger Player who picked the Challenger card presses Play this Star on Home, or the trial visitor presses Play again
- **THEN** the round opens on its first question with no worked example card

### Requirement: The worked example card is reachable and still
The Start the Star button SHALL take keyboard focus when the card opens, so Enter or Space starts; Escape SHALL also start. The card SHALL be announced once through the polite live region, and starting SHALL move focus to the first question. Every step SHALL be shown at once with nothing moving and nothing timing out, so the card is the same with Calm on or motion paused.

#### Scenario: Keyboard
- **WHEN** a keyboard user presses Try a trick and then Enter
- **THEN** the first question opens and has focus

#### Scenario: Screen reader
- **WHEN** a screen reader user lands on the card
- **THEN** the live region says "Learn the trick first" with the Trick's title, and the focused button is Start the Star

#### Scenario: Calm
- **WHEN** a new visitor with Calm on presses Try a trick and waits
- **THEN** every step of the worked example is shown at once without animation, and the card stays until Start the Star is pressed
