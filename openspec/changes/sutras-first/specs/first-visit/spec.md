# Spec Delta

## MODIFIED Requirements

### Requirement: Three doors first on Home
Challenger and Pro Home SHALL show three doors after the Keep going card (if any), the Sutra door first (the next Star of Bolt's path as its Sutra's tag, Trick and number; Play this Star, Learn the sutra, Open the Dojo with the belts in its foot), then the Arena door and the Skill map door. The Sutra door SHALL carry one plain line on Sutras and Stars, the others one line each, and only the Sutra door a primary button. The Player strip SHALL follow the doors and "Your sutras".

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
