# Spec Delta

## ADDED Requirements

### Requirement: The Mode picker asks one question
The Mode picker's lede SHALL be one plain sentence, and the three Mode cards (Explorer, Challenger, Pro) SHALL be the one choice under the heading "Pick who is playing" and the picker's only buttons. Each card SHALL end in its call to action, "Start as <Mode>". The picker SHALL have no Try a trick button and no link to Find; one line SHALL link to the guide. Pressing a card SHALL open that Mode's Home as before.

#### Scenario: The cards still work
- **WHEN** a new visitor presses the Explorer card
- **THEN** Explorer Home opens, exactly as before this change, and no Try a trick opens and no guess is recorded

#### Scenario: Above the fold on a phone
- **WHEN** a new visitor opens the Mode picker on a 390 by 844 screen
- **THEN** the Explorer card and its "Start as Explorer" are on screen without scrolling, and the lede has at most 25 words

#### Scenario: One choice
- **WHEN** a new visitor opens the Mode picker
- **THEN** its only buttons are the three Mode cards, ending in "Start as Explorer", "Start as Challenger" and "Start as Pro", there is no Try a trick button, and the one other link opens the guide

### Requirement: The hero says little and the cards work every way
The Mode picker's hero SHALL say as little as it can: the headline "Fast, fun math for every brain", the one line "One trick, two minutes, no sign-up." and the Nikhilam Family beside them as the mascot, with no Bolt and no button. The family SHALL move gently and hold still under reduced motion, Pause motion and Calm. Each Mode card SHALL be at least 44 px tall and work by click, tap and Enter.

#### Scenario: The hero says little
- **WHEN** a new visitor opens the app
- **THEN** the hero shows "Fast, fun math for every brain" and "One trick, two minutes, no sign-up.", at most 14 words, with the Nikhilam Family beside them and no button

#### Scenario: The cards draw the eye and work every way
- **WHEN** a new visitor opens the app at 320, 375, 768 or 1280 px wide
- **THEN** nothing scrolls sideways, every Mode card is at least 44 px tall and opens its Mode's Home by click, tap and Enter, and the family holds still with reduced motion, Pause motion or Calm

### Requirement: Try a trick inside each Mode, from Home
Each Mode SHALL have its own Try a trick at `#/try`, which opens the one of the Player's Mode: a short lesson on one Trick under the Sutra that Trick belongs to in the app's Sutra data. Explorer's SHALL be "The 11 sandwich" under Ūrdhva-Tiryagbhyām, Challenger's squares of numbers ending in 5 under Ekādhikena Pūrveṇa, and Pro's multiplying numbers near 100 under Nikhilaṃ Navataścaramaṃ Daśataḥ. It SHALL be reached from the Try a trick card on the Mode's Home (and Find), not from the Mode picker.

#### Scenario: Challenger from Home
- **WHEN** a new visitor picks Challenger and presses the Try a trick card's button on Home
- **THEN** the Mode is Challenger and the Try a trick for squares of numbers ending in 5 opens, naming Ekādhikena Pūrveṇa

#### Scenario: Pro from Home
- **WHEN** a new visitor picks Pro and presses the Try a trick card's button on Home
- **THEN** the Try a trick for multiplying numbers near 100 opens, naming Nikhilaṃ Navataścaramaṃ Daśataḥ

#### Scenario: Explorer from Home
- **WHEN** a new visitor picks Explorer and presses the Try a trick card's button on Home
- **THEN** "The 11 sandwich" opens, naming Ūrdhva-Tiryagbhyām, with no Star, Belt or Star count anywhere in it

## MODIFIED Requirements

### Requirement: A guessed Mode is shown and easy to change
Nothing in the app SHALL set a Mode guess any more. When a Player record still holds a Mode guess written by the earlier Try a trick, Home's mode line SHALL say so (for example "Mode: Challenger, our guess for a first try") beside the Change link. Picking a Mode by hand, on the Mode picker's cards, a Mode link or Me, SHALL clear the guess. The guess SHALL be kept on the Player record on this device only and SHALL never be sent.

#### Scenario: Home after the trial
- **WHEN** a Player whose record holds a Challenger Mode guess opens Home
- **THEN** Home shows the Challenger doors and the mode line says the Mode is a guess, with Change beside it

#### Scenario: Picking clears the guess
- **WHEN** that Player opens Me and picks Pro
- **THEN** the mode line on Home no longer says the Mode is a guess

#### Scenario: Try a trick sets no guess
- **WHEN** a new visitor presses the Challenger card and then the Try a trick card on Home
- **THEN** the Player's Mode is Challenger with no guess, and `math/mode/challenger` was sent once, for the card

### Requirement: Explorer Home keeps its pictures
Explorer Home SHALL keep its eight picture tiles, the read-aloud switch and the Watch and sing link, with no disclosure. Above the tiles it SHALL show one "A sutra to say" card: one Sutra a day from a short list of those with a plain-number idea, its name with Say it, its Explorer meaning, and a link to its Deep dive. After the tiles it SHALL add one row of "More places": All games, The sutras, How to play (the guide) and Find.

#### Scenario: Explorer
- **WHEN** an Explorer Player opens Home
- **THEN** eight picture tiles are shown with nothing folded away, above them a Sutra card with its name, a Say it button, an Explorer meaning and a link to its Deep dive, and More places links to `#/games`, `#/sutras`, `#/guide` and `#/find`

### Requirement: Home fits a phone
On a screen up to 600 px wide, Home SHALL show the Player strip compactly (the avatar, nickname, Title and bar on one row, the Sparks, day streak and badge numbers on one short line), and a new Challenger Player's first primary action (Play this Star) SHALL be on screen without scrolling at 390 by 844, whether they picked the Challenger card or came Home from its Try a trick. Nothing on Home SHALL be removed for this.

#### Scenario: After Try a trick
- **WHEN** a new visitor presses the Challenger card, opens Try a trick from Home, finishes it and opens Home on a 390 by 844 screen
- **THEN** Play this Star is on screen without scrolling, the Player strip is at most 130 px tall, and the page does not scroll sideways

### Requirement: Try a trick is reachable by keyboard and screen reader
When the card opens, its start button SHALL take keyboard focus, so Enter or Space starts; Escape SHALL also start. Each question SHALL take focus when it opens (the answer box in Challenger and Pro, the question in Explorer). The card and each result SHALL be announced once through the polite live region.

#### Scenario: Keyboard
- **WHEN** a keyboard user opens Try a trick from Pro Home and presses Enter
- **THEN** the first question opens with its answer box focused, and typing the answer and Enter checks it

#### Scenario: Screen reader
- **WHEN** a screen reader user lands on the card
- **THEN** the live region says "Try a trick" with the Trick's name, and the focused button is the start button

## REMOVED Requirements

### Requirement: One plain lede, and the Mode cards stay
**Reason**: The picker's Try a trick buttons competed with its Mode cards (openspec change play-nav-by-mode, design D6).
**Migration**: Replaced by "The Mode picker asks one question"; each Mode's Try a trick is on its Home.

### Requirement: The app's hero says little
**Reason**: Its second scenario was about the picker's Try a trick buttons, which are gone.
**Migration**: Replaced by "The hero says little and the cards work every way", with the same hero rules.

### Requirement: Try a trick inside each Mode
**Reason**: Try a trick is no longer opened from the Mode picker.
**Migration**: Replaced by "Try a trick inside each Mode, from Home", with the same three lessons.
