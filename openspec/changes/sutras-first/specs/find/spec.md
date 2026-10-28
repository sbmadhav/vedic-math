# Spec Delta

## MODIFIED Requirements

### Requirement: Results are filtered to the Mode
Entries the Player's Mode cannot open SHALL NOT be listed: the Dojo section in Explorer (its menu hides it), experiences, games and videos not listed for the Mode, and guide sections the Mode does not have. The Sutras section SHALL be listed in every Mode, Explorer included, since the Sutras are in every Mode's menu. Tricks and Sutras SHALL stay listed for Explorer with their Explorer titles and Explorer meanings, as the Explorer guide explains them and their pages open for it.

#### Scenario: Explorer sees only its own experiences and games
- **WHEN** an Explorer types "spell" and then "sprint"
- **THEN** Sutra Spellbook (a Dojo experience) and Times sprint (a Challenger and Pro game) are not listed

#### Scenario: Explorer titles
- **WHEN** an Explorer types "fives"
- **THEN** the Trick is listed as "Fives squared in one breath"

### Requirement: The browse list
With nothing typed, the Find page SHALL show the browse list: every section the Mode has, each with its one-line plain description, in menu order (Home, Sutras, Learn, Dojo, Arena, Games, Watch, Me, Guide). When nothing matches, the page SHALL say so and offer the browse list and the guide.

#### Scenario: Empty box
- **WHEN** a Challenger opens Find and types nothing
- **THEN** Home, Sutras, Learn, Dojo, Arena, Games, Watch, Me and Guide are listed, each with one line saying what is there

#### Scenario: No match
- **WHEN** a Player types "zzzz"
- **THEN** the page says nothing matched and shows the browse list
