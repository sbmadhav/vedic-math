# Spec Delta

## ADDED Requirements

### Requirement: Sutras come first in the menu
The game's menu SHALL list, in this order: Home, Sutras, Learn, Dojo (not in Explorer), Arena, Games, Watch, Guide and Find. Sutras SHALL be in the menu in every Mode, Explorer included, and its tooltip SHALL be its section line in the Mode's words. Find's browse list SHALL follow the same order.

#### Scenario: Challenger menu
- **WHEN** a Challenger Player opens Home
- **THEN** the menu links read Home, Sutras, Learn, Dojo, Arena, Games, Watch, Guide, Find

#### Scenario: Explorer menu
- **WHEN** an Explorer Player opens Home
- **THEN** the menu links read Home, Sutras, Learn, Arena, Games, Watch, Guide, Find, and Sutras opens the Sutras page with Explorer meanings on its cards
