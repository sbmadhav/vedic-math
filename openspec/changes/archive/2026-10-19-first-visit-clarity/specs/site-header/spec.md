# Spec Delta

## MODIFIED Requirements

### Requirement: The header matches the rest of sbmadhav.com
The Vedic Math header SHALL be the same sticky bar as the home page of sbmadhav.com, with the brand, the Vedic Math nav, Explore, the round color scheme button and the music control in the home page's order. The Player chip SHALL come last, where the home page has its kid mode switch, and the page SHALL NOT show a kid mode switch. The nav SHALL end with Find, and every nav link SHALL carry its section's one-line plain description as its tooltip.

#### Scenario: Same parts in the same order
- **WHEN** a Player opens Vedic Math on a 1280px wide screen
- **THEN** the header shows, in one row, the brand, Home, Learn, Dojo (not in Explorer), Arena, Games, Sutras (not in Explorer), Watch, Guide and Find, Explore, the color scheme button, Music and the Player chip, in that order, matching the order of the home page's header

#### Scenario: Same look
- **WHEN** the home page and Vedic Math are opened at 1280px in the same scheme
- **THEN** the two headers have the same height, background, blur, bottom border, brand icon size, Explore size and color scheme button size and shape

#### Scenario: Stays on top
- **WHEN** a Player scrolls down a long view
- **THEN** the header stays at the top of the screen

#### Scenario: One line per menu item
- **WHEN** a Player hovers the Dojo link
- **THEN** its tooltip is the Dojo's one-line description, the same line Find's browse list shows

### Requirement: Tabs appear after a Mode is picked
Before a Player has picked a Mode, the Vedic Math tabs SHALL be hidden, because every route that depends on a Mode shows the mode picker until then (Watch, the Sutras, the guide and Find open without one). They SHALL appear as soon as a Mode is picked or guessed by Try a trick.

#### Scenario: First visit
- **WHEN** a new Player opens Vedic Math and has not picked a Mode
- **THEN** the mode picker shows and no Vedic Math tabs are visible

#### Scenario: After picking
- **WHEN** the Player picks Challenger
- **THEN** the tabs appear and Learn opens the Learn page

#### Scenario: Find without a Mode
- **WHEN** a new Player opens `#/find` before picking a Mode
- **THEN** the Find page shows, not the mode picker
