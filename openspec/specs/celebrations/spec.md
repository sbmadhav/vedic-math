# celebrations Specification

## Purpose
Keep the big confetti for true wins, so a win feels like one, and give everyday moments (picking a Mode, a right answer, a streak, Sparks earned) a small, cheap animation from one shared set, all of which hold still under reduced motion, Pause motion and Calm.

## Requirements

### Requirement: Big confetti only for true wins
The big confetti SHALL fire only for a true win: a Star lit, a kata cleared, a Medal, a Belt, a badge (except First step), a new Title, a mastered skill, a first Sutra card, a personal best, a game won, a lock cracked or a puzzle solved. Everyday moments SHALL NOT fire it: picking a Mode, starting a round, a right answer, a streak, a wrong answer, saving or opening something. At most one burst SHALL be on screen at a time.

#### Scenario: Picking a Mode is not a win
- **WHEN** a new visitor picks a Mode on the app home
- **THEN** no big confetti is drawn, and Home opens

#### Scenario: Lighting a Star is a win
- **WHEN** a Player answers enough questions right to light a Star
- **THEN** the big confetti is drawn once with the end screen, and it removes itself when it ends

#### Scenario: A right answer is not a win
- **WHEN** a Player answers a Star's first question right
- **THEN** a few sparkles fly and no big confetti is drawn

### Requirement: Small animations for everyday moments
Everyday moments SHALL get a small animation from the one shared set in `js/celebrate.js`: a Mode pick pops the card, flies a few sparkles and makes the Nikhilam Family cheer; a right answer bounces or twinkles; a streak ticks; a wrong answer wiggles; earned Sparks count up; buttons squish while pressed.

#### Scenario: Picking a Mode
- **WHEN** a new visitor with motion allowed picks Challenger
- **THEN** the card pops, a few sparkles fly and the family cheers, then Challenger Home opens and the sparkles are gone

#### Scenario: Sparks count up for sight only
- **WHEN** a result screen shows "+40 Sparks" with motion allowed
- **THEN** the number counts up from 0 on screen, while a screen reader reads "+40 Sparks" at once

### Requirement: Small animations stay cheap
Each small animation SHALL use only transforms and opacity, with no layout shift, token colours, and `js/life.js` for any timer or frame loop, and SHALL end on its own within a second.

#### Scenario: Nothing beside it moves
- **WHEN** a result screen counts "+40 Sparks" up
- **THEN** the text around it keeps its place while the number counts

### Requirement: Celebrations hold still under no motion
Under reduced motion, Pause motion or Calm, no celebration SHALL move or draw: no confetti, sparkles, pops, bounces, wiggles, ticks, counting or squish. The screen that follows SHALL still come, at once. Turning any of the three on SHALL stop a celebration that is running at once.

#### Scenario: Picking a Mode with no motion
- **WHEN** a new visitor with reduced motion, Pause motion or Calm on picks Pro
- **THEN** Pro Home opens at once, with no sparkles and no confetti

#### Scenario: Lighting a Star with no motion
- **WHEN** a Player with reduced motion, Pause motion or Calm on lights a Star
- **THEN** the end screen shows "Star 1 is lit!" and its Sparks, with no confetti and no sparkles

#### Scenario: Pause motion during a burst
- **WHEN** a Player turns on Pause motion while the big confetti is falling
- **THEN** the confetti is gone at once

### Requirement: The big confetti lasts the same time on every screen
The big confetti SHALL end and remove itself 1,833 ms after it starts (110 frames of a 60 Hz screen, its length before this change), whatever frame rate the device or browser draws at. It SHALL NOT end earlier, and a busy device or a hidden tab that still runs code SHALL remove it no later than 3,000 ms after it starts. A browser that draws few animation frames or none SHALL still remove the burst within those bounds, so the next true win draws its own.

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

#### Scenario: A hidden tab the browser suspends
- **WHEN** the browser stops running a hidden tab's code while the big confetti is falling
- **THEN** the burst is removed as soon as the tab runs again or becomes visible

### Requirement: The big confetti moves at the same speed on every screen
Each piece of the big confetti SHALL be drawn where it would be at that moment on a 60 Hz screen, so a slow device draws fewer frames of the same path and a fast screen draws more, at the same speed.

#### Scenario: The same path at any frame rate
- **WHEN** the same pieces (the same start positions, speeds, angles and spins) have been falling for 1 s, once on a screen that draws 60 frames a second and once in a browser that draws 21
- **THEN** each piece is at the same place on both
