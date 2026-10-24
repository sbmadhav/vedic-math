# Spec Delta

## MODIFIED Requirements

### Requirement: Where Stars are offered
A Trick's three Stars SHALL be offered on its Trick page and in the Dojo (and, once it ships, on the Sky), each showing whether it is lit, skipped or open, to Challenger and Pro Players. Explorer SHALL NOT be offered Stars; an Explorer Player who opens a Star by link SHALL get the Challenger layout. In Explorer the Dojo SHALL show the Tricks grouped by belt with no Star counts and no belt progress, SHALL say that belts and Stars come with Challenger and Pro, and SHALL NOT link to the Sutras page; a Belt the Player already holds SHALL still show as earned.

#### Scenario: Trick page in Pro
- **WHEN** a Pro Player opens the Trick page for Square numbers ending in 5
- **THEN** its three Stars are shown with their state and each opens its round

#### Scenario: Dojo in Explorer
- **WHEN** an Explorer Player opens the Dojo
- **THEN** the Tricks are listed in their seven belt groups, no Star count or "belts earned" line is shown, the page says belts and Stars come with Challenger and Pro, and there is no link to the Sutras page
