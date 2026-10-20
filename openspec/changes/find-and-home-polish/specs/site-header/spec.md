# Spec Delta

## MODIFIED Requirements

### Requirement: Small screens
Below 1180px the nav SHALL move below the controls and wrap onto as many rows as it needs, so every nav link is on screen without scrolling. At 320, 375 and 768px wide no part of the page SHALL scroll sideways and every header control SHALL be on screen. Under 600px Explore and Music SHALL show icons only and keep their accessible names, and the header's rows SHALL be packed tightly: at 390px wide the header SHALL be at most 132px tall.

#### Scenario: A 320px phone
- **WHEN** a Player opens Vedic Math on a 320px wide screen in either scheme
- **THEN** the brand, Explore, the color scheme button, Music and the Player chip are on the first row, the nav is below them, the page does not scroll sideways, every nav link is on screen without scrolling, and the Player chip shows the avatar and the bar to the next Title

#### Scenario: Accessible header
- **WHEN** axe checks the header at 1280px and 320px in both schemes, with the music panel closed and open
- **THEN** it finds no serious or critical violation

#### Scenario: A 390px phone
- **WHEN** a Challenger Player opens Home on a 390px wide screen
- **THEN** the header is at most 132px tall, every nav link and header control is on screen, and each nav link is at least 24px tall
