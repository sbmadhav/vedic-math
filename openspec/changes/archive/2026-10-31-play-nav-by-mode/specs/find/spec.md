# Spec Delta

## MODIFIED Requirements

### Requirement: A Find page
There SHALL be a Find page at `#/find`: a search box focused on open, a one-line hint of what it searches, and results that update as the Player types. For Challenger and Pro it SHALL be the Find trigger ending the menu, current on `#/find` and the guide; for Explorer it SHALL sit under More places on Home. It SHALL open from the landing, by `/` outside a text field, and by Ctrl K or Cmd K anywhere, but never over a dialog, a menu or a round, and before a Mode is picked (Challenger wording).

#### Scenario: From the menu bar
- **WHEN** a Challenger Player presses Find in the menu bar
- **THEN** the Find page opens with the search box focused and Find marked as the current page, its shortcut shown beside it on a wide screen

#### Scenario: The slash key
- **WHEN** a Player on the Dojo page presses `/` with no text field focused
- **THEN** the Find page opens with the search box focused

#### Scenario: Ctrl K
- **WHEN** a Player typing in a Practice answer box presses Ctrl K (Cmd K on a Mac)
- **THEN** the Find page opens with the search box focused

#### Scenario: Not during a round
- **WHEN** a Player in a Star round presses Ctrl K
- **THEN** the round stays open

#### Scenario: Before a Mode
- **WHEN** a new visitor follows the landing's Find link
- **THEN** the Find page opens, not the mode picker

### Requirement: The browse list
With nothing typed, the Find page SHALL first offer help, a link to the guide and (once a Mode is picked) Take the tour, then show the browse list: every section the Mode has, each with its one-line plain description, each zone of the menu with the places in it (Home; the Sutras and Learn; the Arcade, the Dojo, the Arena and Games; Watch; Me and the Guide). When nothing matches, the page SHALL say so and offer the browse list and the guide.

#### Scenario: Empty box
- **WHEN** a Challenger opens Find and types nothing
- **THEN** Read the guide and Take the tour come first, then Home, Sutras, Learn, Arcade, Dojo, Arena, Games, Watch, Me and Guide are listed, each with one line saying what is there

#### Scenario: The tour from Find
- **WHEN** a Challenger presses Take the tour on Find
- **THEN** Home opens with the tour's first step

#### Scenario: No match
- **WHEN** a Player types "zzzz"
- **THEN** the page says nothing matched and shows the browse list
