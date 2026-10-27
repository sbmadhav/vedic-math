# first-visit Specification

## Purpose
Give a curious visitor one obvious thing to do before any choice, and a Home that shows three things first in plain words, so the first minute is a trick, not a menu.

## Requirements

### Requirement: One plain lede, and the Mode cards stay
The Mode picker's lede SHALL be one plain sentence, and the three Mode cards (Explorer, Challenger, Pro) SHALL be the choice under the heading "Pick who is playing". Each card SHALL have its own Try a trick button directly under it, named with its Mode ("Try a trick as Explorer"), and the picker SHALL have no other Try a trick button. Pressing a card SHALL open that Mode's Home as before.

#### Scenario: The cards still work
- **WHEN** a new visitor presses the Explorer card
- **THEN** Explorer Home opens, exactly as before this change, and no Try a trick opens and no guess is recorded

#### Scenario: Above the fold on a phone
- **WHEN** a new visitor opens the Mode picker on a 390 by 844 screen
- **THEN** the Explorer card's Try a trick is on screen without scrolling, and the lede has at most 25 words

#### Scenario: Three Try a trick buttons
- **WHEN** a new visitor opens the Mode picker
- **THEN** there are exactly three Try a trick buttons, one under each Mode card, named "Try a trick as Explorer", "Try a trick as Challenger" and "Try a trick as Pro"

### Requirement: A guessed Mode is shown and easy to change
Nothing in the app SHALL set a Mode guess any more. When a Player record still holds a Mode guess written by the earlier Try a trick, Home's mode line SHALL say so (for example "Mode: Challenger, our guess for a first try") beside the Change link. Picking a Mode by hand, on the Mode picker's cards, a card's Try a trick, a Mode link or Me, SHALL clear the guess. The guess SHALL be kept on the Player record on this device only and SHALL never be sent.

#### Scenario: Home after the trial
- **WHEN** a Player whose record holds a Challenger Mode guess opens Home
- **THEN** Home shows the Challenger doors and the mode line says the Mode is a guess, with Change beside it

#### Scenario: Picking clears the guess
- **WHEN** that Player opens Me and picks Pro
- **THEN** the mode line on Home no longer says the Mode is a guess

#### Scenario: Try a trick sets no guess
- **WHEN** a new visitor presses Try a trick under the Challenger card
- **THEN** the Player's Mode is Challenger with no guess, and `math/mode/challenger` is sent as for a card pick

### Requirement: Back from a Star opened from Home goes Home
A Star opened from Home or from the end of a Try a trick SHALL offer "Back home" as its way out, returning to Home. A Star opened from the Dojo, a Trick page or by link SHALL keep its present Back (the Dojo, the Trick, or the Sky).

#### Scenario: After the trial
- **WHEN** a Challenger who finished Try a trick presses Play Star 1 on its end card and leaves the Star round with its Back control
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
On a screen up to 600 px wide, Home SHALL show the Player strip compactly (the avatar, nickname, Title and bar on one row, the Sparks, day streak and badge numbers on one short line), and a new Challenger Player's first primary action (Play this Star) SHALL be on screen without scrolling at 390 by 844, whether they picked the Challenger card or came Home from its Try a trick. Nothing on Home SHALL be removed for this.

#### Scenario: After Try a trick
- **WHEN** a new visitor presses Try a trick under the Challenger card, finishes it and opens Home on a 390 by 844 screen
- **THEN** Play this Star is on screen without scrolling, the Player strip is at most 130 px tall, and the page does not scroll sideways

### Requirement: Keep going does not repeat the first door
On Challenger Home, the Keep going card SHALL be left out when the Skill it offers is the Trick of the Star the first door offers. Pro and Explorer Home SHALL show Keep going as before. A Try a trick SHALL leave Keep going as it was.

#### Scenario: After the trial Star
- **WHEN** a visitor who played a Star of Bolt's first Trick from Home opens Challenger Home
- **THEN** there is no Keep going card, and the Star door offers that Trick's next Star

#### Scenario: Another Skill
- **WHEN** a Challenger Player who last practiced a Skill that is not that Trick opens Home
- **THEN** the Keep going card offers that Skill

### Requirement: The app's hero says little
The Mode picker's hero SHALL say as little as it can: the headline "Fast, fun math for every brain", the one line "One trick, two minutes, no sign-up." and the Nikhilam Family beside them as the mascot, with no Bolt and no button. The family SHALL move gently and hold still under reduced motion, Pause motion and Calm. Each Try a trick under a Mode card SHALL be at least 44 px tall and work by click, tap and Enter.

#### Scenario: The hero says little
- **WHEN** a new visitor opens the app
- **THEN** the hero shows "Fast, fun math for every brain" and "One trick, two minutes, no sign-up.", at most 14 words, with the Nikhilam Family beside them and no button

#### Scenario: Try a trick draws the eye and works every way
- **WHEN** a new visitor opens the app at 320, 375, 768 or 1280 px wide
- **THEN** nothing scrolls sideways, every Try a trick is at least 44 px tall and opens its Mode's Try a trick by click, tap and Enter, and the family holds still with reduced motion, Pause motion or Calm

### Requirement: Try a trick inside each Mode
Each Mode SHALL have its own Try a trick at `#/try`, which opens the one of the Player's Mode: a short lesson on one Trick under the Sutra that Trick belongs to in the app's Sutra data. Explorer's SHALL be "The 11 sandwich" under Ūrdhva-Tiryagbhyām, Challenger's squares of numbers ending in 5 under Ekādhikena Pūrveṇa, and Pro's multiplying numbers near 100 under Nikhilaṃ Navataścaramaṃ Daśataḥ. A card's Try a trick SHALL pick that Mode as its card does, start the day and open `#/try`.

#### Scenario: Challenger from the picker
- **WHEN** a new visitor presses Try a trick under the Challenger card
- **THEN** the Mode is Challenger and the Try a trick for squares of numbers ending in 5 opens, naming Ekādhikena Pūrveṇa

#### Scenario: Pro from the picker
- **WHEN** a new visitor presses Try a trick under the Pro card
- **THEN** the Mode is Pro and the Try a trick for multiplying numbers near 100 opens, naming Nikhilaṃ Navataścaramaṃ Daśataḥ

#### Scenario: Explorer from the picker
- **WHEN** a new visitor presses Try a trick under the Explorer card
- **THEN** the Mode is Explorer and "The 11 sandwich" opens, naming Ūrdhva-Tiryagbhyām, with no Star, Belt or Star count anywhere in it

### Requirement: Try a trick on Home
Each Mode's Home SHALL show a Try a trick card, after the three doors in Challenger and Pro and after the picture tiles in Explorer, until the Player has finished that Mode's Try a trick on this device. Its button SHALL open `#/try` and SHALL NOT be a primary button.

#### Scenario: From Home
- **WHEN** a new Pro Player who picked the Pro card presses the Try a trick card's button on Home
- **THEN** the Pro Try a trick opens, and before that Home's only primary button was Play today's round

#### Scenario: Finished
- **WHEN** a Challenger who finished Try a trick opens Home
- **THEN** Home shows no Try a trick card, and after switching to Explorer, Explorer Home shows its own

### Requirement: Try a trick teaches its Sutra first
A Try a trick SHALL open on one card before any question: the Trick in the Mode's words, the Sutra's name with its Say it button and meaning, one line on why this Trick is that Sutra, and one worked example with every step shown at once, the last step giving the result. Its one button SHALL start the questions. The card SHALL credit Bharati Krishna Tirtha's 1965 book and SHALL NOT claim the Trick comes from the Vedas.

#### Scenario: Challenger's card
- **WHEN** a Challenger opens Try a trick
- **THEN** the card names Ekādhikena Pūrveṇa, "By one more than the one before", and works 35² in three steps ending in 1225, with a Your turn button and no answer box

#### Scenario: Pro's card
- **WHEN** a Pro opens Try a trick
- **THEN** the card names Nikhilaṃ Navataścaramaṃ Daśataḥ, "All from 9 and the last from 10", says the sutra gives each distance from 100, and works 97 × 96 ending in 9312

#### Scenario: Explorer's card
- **WHEN** an Explorer opens Try a trick
- **THEN** the card names Ūrdhva-Tiryagbhyām, says its name means straight down and across, and shows 23 split into 2 and 3 with 5 in the middle, ending in 253

### Requirement: Trying it
After the card, a Try a trick SHALL ask three questions of its Trick, one at a time, none of them the worked example: typed in Challenger and Pro, and in Explorer a tap on one of three big number buttons for the middle digit, with every sum under 10. A right answer SHALL earn 10 Sparks. A Challenger or Pro miss SHALL show the Trick's steps on that question's numbers, then Next; an Explorer's first miss SHALL ask for a second try, and a second miss SHALL show the sum and the answer, then Next.

#### Scenario: A right answer
- **WHEN** a Challenger types 625 for 25² and checks it
- **THEN** the round says it is right with +10 Sparks, the Player's Sparks go up by 10, and the next question opens

#### Scenario: A miss teaches
- **WHEN** a Pro types a wrong answer for 98 × 97
- **THEN** the steps of the near-100 Trick on 98 and 97 are shown, ending in 9506, with a Next button

#### Scenario: Explorer tries again
- **WHEN** an Explorer taps a wrong middle number
- **THEN** the round says "Not quite. Try again!", that button is turned off, and the other two stay

### Requirement: The end of a Try a trick
After the third question an end card SHALL show how many of 3 were right, a link to the Sutra's deep dive and the next step (Challenger and Pro: Play Star 1 of the same Trick, and Back home; Explorer: Back home and Do it again, with no Star), and SHALL mark that Mode's Try a trick finished on this device. A Try a trick SHALL NOT change a Rating, mastery, Keep going, a Star or a Belt.

#### Scenario: The end
- **WHEN** a Challenger answers the third question
- **THEN** the end card shows how many of 3 were right, a Play Star 1 link to `#/star/sq5/1`, Back home and a link to the Ekādhikena Pūrveṇa deep dive, and the Player's Ratings, Stars and Keep going are unchanged

#### Scenario: Explorer's end
- **WHEN** an Explorer answers the third question
- **THEN** the end card offers Back home and Do it again, and no Star

### Requirement: Try a trick is reachable by keyboard and screen reader
When the card opens, its start button SHALL take keyboard focus, so Enter or Space starts; Escape SHALL also start. Each question SHALL take focus when it opens (the answer box in Challenger and Pro, the question in Explorer). The card and each result SHALL be announced once through the polite live region.

#### Scenario: Keyboard
- **WHEN** a keyboard user presses Try a trick under the Pro card and then Enter
- **THEN** the first question opens with its answer box focused, and typing the answer and Enter checks it

#### Scenario: Screen reader
- **WHEN** a screen reader user lands on the card
- **THEN** the live region says "Try a trick" with the Trick's name, and the focused button is the start button

### Requirement: Try a trick holds still and says nothing new
Nothing in a Try a trick SHALL move or time out except a few sparkles after a right answer, which SHALL NOT appear under reduced motion, Pause motion or Calm. Nothing new SHALL be spoken: the Sutra name plays its name clip only after a tap on Say it, and an Explorer with Read aloud on hears only "You got it!" and "Not quite. Try again!".

#### Scenario: Calm
- **WHEN** a Player with Calm on opens Try a trick, waits, then answers a question right
- **THEN** every step of the worked example is shown at once, the card stays until its button is pressed, and no sparkles are drawn

#### Scenario: Nothing new spoken
- **WHEN** an Explorer with Read aloud on goes through Try a trick and misses once
- **THEN** the only lines spoken are "Not quite. Try again!" and "You got it!"
