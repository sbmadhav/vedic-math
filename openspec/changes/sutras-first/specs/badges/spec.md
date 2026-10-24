# Spec Delta

## MODIFIED Requirements

### Requirement: Badges listed per Mode
The Me page SHALL list a badge whose way to earn it is not offered in the Player's Mode (in Explorer: the White, Green and Black belt badges) only once the Player has earned it, and the badge count SHALL be the earned badges of the listed ones. Sutra scholar SHALL be listed in every Mode, since every Mode has Sutra cards. Challenger and Pro SHALL see every badge.

#### Scenario: Explorer Me page
- **WHEN** an Explorer Player with no belt opens the Me page
- **THEN** no belt badge is listed, the Sutra scholar badge is listed (earned or not), and the count reads the earned badges among those listed out of the number listed, Sutra scholar counted in that total whether or not it is earned

#### Scenario: A belt kept from Challenger
- **WHEN** a Player who earned the White belt in Challenger switches to Explorer and opens the Me page
- **THEN** the White belt badge is listed as earned, and the Green and Black belt badges are not listed
