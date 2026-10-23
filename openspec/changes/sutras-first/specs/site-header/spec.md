# Spec Delta

## MODIFIED Requirements

### Requirement: The header matches the rest of sbmadhav.com
The Vedic Math header SHALL be the same sticky bar as the home page of sbmadhav.com, with the brand, the Vedic Math nav, Explore, the round color scheme button and the music control in the home page's order. The Player chip SHALL come last, where the home page has its kid mode switch, and the page SHALL NOT show a kid mode switch. The nav SHALL end with Find, and every nav link SHALL carry its section's one-line plain description as its tooltip.

#### Scenario: Same parts in the same order
- **WHEN** a Player opens Vedic Math on a 1280px wide screen
- **THEN** the header shows, in one row, the brand, Home, Sutras, Learn, Dojo (not in Explorer), Arena, Games, Watch, Guide and Find, Explore, the color scheme button, Music and the Player chip, in that order, matching the order of the home page's header

#### Scenario: Same look
- **WHEN** the home page and Vedic Math are opened at 1280px in the same scheme
- **THEN** the two headers have the same height, background, blur, bottom border, brand icon size, Explore size and color scheme button size and shape

#### Scenario: Stays on top
- **WHEN** a Player scrolls down a long view
- **THEN** the header stays at the top of the screen

#### Scenario: One line per menu item
- **WHEN** a Player hovers the Dojo link
- **THEN** its tooltip is the Dojo's one-line description, the same line Find's browse list shows

## ADDED Requirements

### Requirement: Sutras come first in the menu
The game's menu SHALL list, in this order: Home, Sutras, Learn, Dojo (not in Explorer), Arena, Games, Watch, Guide and Find. Sutras SHALL be in the menu in every Mode, Explorer included, and its tooltip SHALL be its section line in the Mode's words. Find's browse list SHALL follow the same order.

#### Scenario: Challenger menu
- **WHEN** a Challenger Player opens Home
- **THEN** the menu links read Home, Sutras, Learn, Dojo, Arena, Games, Watch, Guide, Find

#### Scenario: Explorer menu
- **WHEN** an Explorer Player opens Home
- **THEN** the menu links read Home, Sutras, Learn, Arena, Games, Watch, Guide, Find, and Sutras opens the Sutras page with Explorer meanings on its cards
