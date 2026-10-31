# Spec Delta

## MODIFIED Requirements

### Requirement: Returning Players go straight into the game
When the landing page is opened on a device that already has Players on learnvedicmath.com, it SHALL replace itself with `/play/` before it paints, unless the URL carries `?home`. Every link from the game to the landing page SHALL carry `?home`. With `?home` on such a device the landing page SHALL show its welcome back version (landing-pages, "Welcome back"). The landing page SHALL write nothing to storage.

#### Scenario: A returning Player
- **WHEN** a Player who has played on this device opens `https://learnvedicmath.com/`
- **THEN** `/play/` opens and the landing page is not shown

#### Scenario: The brand link from the game
- **WHEN** that Player taps the brand in the game's header
- **THEN** the landing page opens and stays, in its welcome back version

#### Scenario: A first visit
- **WHEN** a visitor with no saved Players opens `/`
- **THEN** the landing page is shown in its first-visit version, and localStorage is unchanged
