# trophy-case Specification

## Purpose
Keep the always-on display to Sparks and the Belt, and gather every other reward in one place on Me.

## Requirements

### Requirement: The Player chip shows Sparks and the Belt only
The Player chip SHALL show the avatar, the bar of Sparks to the next Title and, for a Challenger or Pro Player who holds a Belt, a knot in the colour of the highest Belt held. It SHALL NOT show Stars, Medals or Badges. An Explorer Player's chip SHALL show no Belt.

#### Scenario: A Challenger with the green belt
- **WHEN** a Challenger Player who holds the white and green belts opens any page
- **THEN** the chip shows a green belt knot and the Sparks bar, and its accessible name ends with "Green belt"

#### Scenario: No Belt yet
- **WHEN** a Challenger Player with no Belt opens any page
- **THEN** the chip shows no belt knot

#### Scenario: Explorer
- **WHEN** an Explorer Player who earned the white belt in Challenger opens any page
- **THEN** the chip shows no belt knot

### Requirement: A Trophy case on Me
The Me page SHALL have a Trophy case section that shows the Belts (all seven, the ones held marked, with how many are held), the Stars lit out of all Stars, the Medals (gold, silver and bronze from game Levels and Challenge tower challenges), the Sutra cards collected, and the Badges. Each row except the Badges SHALL link to where it is earned. For an Explorer Player the Belts and Stars rows SHALL appear only once the Player holds a Belt or has lit a Star.

#### Scenario: A Challenger's Trophy case
- **WHEN** a Challenger Player with 4 Stars lit, one gold and one bronze Medal, opens Me
- **THEN** the Trophy case shows "0 of 7" Belts, "4 of 63 Stars lit", 1 gold, 0 silver and 1 bronze Medals, the Sutra cards collected, and the Badges

#### Scenario: Links
- **WHEN** a Player reads the Trophy case
- **THEN** the Stars row links to the Dojo, the Medals row to Games and the Challenge tower, and the Sutra cards row to the Sutras

#### Scenario: Explorer with nothing yet
- **WHEN** an Explorer Player with no Belt and no Star lit opens Me
- **THEN** the Trophy case has no Belts or Stars row

### Requirement: No reward is lost
Moving rewards into the Trophy case SHALL NOT remove, reset or rename any stored reward, and every page that showed a reward before SHALL still show it.

#### Scenario: Stored rewards
- **WHEN** a Player with Stars, Medals, Belts and Badges opens Me and then the Dojo and a game
- **THEN** the stored Stars, Medals, Belts and Badges are unchanged, the Dojo still shows each Trick's Stars and the game still shows its Medals
