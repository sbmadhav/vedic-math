# Spec Delta

## ADDED Requirements

### Requirement: The big confetti lasts the same time on every screen
The big confetti SHALL end and remove itself 1,833 ms after it starts (110 frames of a 60 Hz screen, its length before this change), whatever frame rate the device or browser draws at. A tab that draws few frames or none SHALL still remove the burst on time, so the next true win draws its own.

#### Scenario: A 60 Hz screen
- **WHEN** a Player with motion allowed lights a Star on a screen that draws 60 frames a second
- **THEN** the big confetti falls for about 1.8 s and removes itself, as before

#### Scenario: A slow browser
- **WHEN** a Player with motion allowed lights a Star in a browser that draws about 21 frames a second
- **THEN** the big confetti removes itself about 1.8 s after it starts, not after 5 s

#### Scenario: A 120 Hz screen
- **WHEN** a Player with motion allowed lights a Star on a screen that draws 120 frames a second
- **THEN** the big confetti falls for about 1.8 s, not 0.9 s, and removes itself

#### Scenario: A tab that draws no frames
- **WHEN** the browser draws no frame while the big confetti is falling, as in a hidden tab
- **THEN** the burst is removed about 1.8 s after it started, and the next true win draws its own burst

### Requirement: The big confetti moves at the same speed on every screen
Each piece of the big confetti SHALL be drawn where it would be at that moment on a 60 Hz screen, so a slow device draws fewer frames of the same path and a fast screen draws more, at the same speed.

#### Scenario: The same path at any frame rate
- **WHEN** the big confetti has been falling for 1 s, once on a screen that draws 60 frames a second and once in a browser that draws 21
- **THEN** each piece is at the same place on both
