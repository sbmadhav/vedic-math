# Spec Delta

## MODIFIED Requirements

### Requirement: Three doors first on Home
Challenger and Pro Home SHALL show three doors after the Keep going card (when there is one), with the Sutra door first in both Modes: the next Star of Bolt's path shown as its Sutra's tag, its Trick and number, Play this Star, Learn the sutra (to the Sutra's Deep dive), and Open the Dojo with the belts in its foot. Then the Arena door and the Skill map door. The Sutra door SHALL carry one plain line saying what a Sutra and a Star are, each other door one plain line introducing its term, and only the Sutra door SHALL have a primary button. The Player strip (Sparks, streak, badges) SHALL come after the doors and "Your sutras", not before them.

#### Scenario: A new Challenger
- **WHEN** a new Challenger Player opens Home on a 390 px wide screen
- **THEN** the first actions in the view are Play this Star, Learn the sutra and Open the Dojo, then the Arena door, the Sutra door names Nikhilaṃ Navataścaramaṃ Daśataḥ, and its line says what a Sutra and a Star are

#### Scenario: Pro
- **WHEN** a new Pro Player opens Home
- **THEN** the Sutra door with Play this Star comes first, then the Arena door and the Skill map door, all before the leaderboard card

#### Scenario: Sparks follow the Sutras
- **WHEN** a Challenger or Pro Player opens Home
- **THEN** the Player strip with Sparks comes after the doors and "Your sutras"

### Requirement: Explorer Home keeps its pictures
Explorer Home SHALL keep its eight picture tiles, the read-aloud switch and the Watch and sing link, with no disclosure. Above the tiles it SHALL show one "A sutra to say" card: one Sutra a day from a short list of those with a plain-number idea, its name with Say it, its Explorer meaning, and a link to its Deep dive.

#### Scenario: Explorer
- **WHEN** an Explorer Player opens Home
- **THEN** eight picture tiles are shown with nothing folded away, and above them a Sutra card with its name, a Say it button, an Explorer meaning and a link to its Deep dive
