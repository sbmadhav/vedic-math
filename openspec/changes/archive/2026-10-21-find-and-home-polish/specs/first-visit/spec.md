# Spec Delta

## ADDED Requirements

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
