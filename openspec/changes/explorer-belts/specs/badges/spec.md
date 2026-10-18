# Spec Delta

## ADDED Requirements

### Requirement: Badges listed per Mode
The Me page SHALL list a badge whose way to earn it is not offered in the Player's Mode (in Explorer: the White, Green and Black belt badges and Sutra scholar) only once the Player has earned it, and the badge count SHALL be the earned badges of the listed ones. Challenger and Pro SHALL see every badge.

#### Scenario: Explorer Me page
- **WHEN** an Explorer Player with no belt opens the Me page
- **THEN** no belt badge and no Sutra scholar badge is listed, and the count's total is the number of badges listed

#### Scenario: A belt kept from Challenger
- **WHEN** a Player who earned the White belt in Challenger switches to Explorer and opens the Me page
- **THEN** the White belt badge is listed as earned, and the Green and Black belt badges are not listed
