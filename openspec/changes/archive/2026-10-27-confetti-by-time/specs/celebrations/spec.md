# Spec Delta

## ADDED Requirements

### Requirement: The big confetti lasts the same time on every screen
The big confetti SHALL end and remove itself 1,833 ms after it starts (110 frames of a 60 Hz screen, its length before this change), whatever frame rate the device or browser draws at. It SHALL NOT end earlier, and a busy device or a hidden tab, which can run the timer late, SHALL still remove it no later than 3,000 ms after it starts. A browser that draws few animation frames or none SHALL still remove the burst within those bounds, so the next true win draws its own.

#### Scenario: A 60 Hz screen
- **WHEN** a Player with motion allowed lights a Star on a screen that draws 60 frames a second
- **THEN** the big confetti falls for about 1.8 s and removes itself, as before

#### Scenario: A slow browser
- **WHEN** a Player with motion allowed lights a Star in a browser that draws about 21 frames a second
- **THEN** the big confetti removes itself between 1,833 and 3,000 ms after it starts, not after 5 s

#### Scenario: A 120 Hz screen
- **WHEN** a Player with motion allowed lights a Star on a screen that draws 120 frames a second
- **THEN** the big confetti falls for about 1.8 s, not 0.9 s, and removes itself

#### Scenario: A tab that draws no frames
- **WHEN** the browser draws no animation frame while the big confetti is falling
- **THEN** the burst is removed between 1,833 and 3,000 ms after it started, and the next true win draws its own burst

### Requirement: The big confetti moves at the same speed on every screen
Each piece of the big confetti SHALL be drawn where it would be at that moment on a 60 Hz screen, so a slow device draws fewer frames of the same path and a fast screen draws more, at the same speed.

#### Scenario: The same path at any frame rate
- **WHEN** the same pieces (the same start positions, speeds, angles and spins) have been falling for 1 s, once on a screen that draws 60 frames a second and once in a browser that draws 21
- **THEN** each piece is at the same place on both
