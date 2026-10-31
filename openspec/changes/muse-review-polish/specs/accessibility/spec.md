# Spec Delta

## ADDED Requirements

### Requirement: Small links have 24 pixel targets
Breadcrumb links, the play pages' back link and Home's Quick tour SHALL each have a target at least 24 CSS pixels tall at every width, and the sutra deep dive's Previous and Next SHALL show the whole sutra name at 360 pixels wide.

#### Scenario: Breadcrumbs on a phone
- **WHEN** a Player opens a Star, a Kata list, a game or a tower chapter at 360 by 740 pixels
- **THEN** every breadcrumb link's target is at least 24 pixels tall

#### Scenario: Deep dive footer on a phone
- **WHEN** a Player opens a sutra's deep dive at 360 pixels wide
- **THEN** the Previous and Next buttons show the full sutra names, wrapping if needed
