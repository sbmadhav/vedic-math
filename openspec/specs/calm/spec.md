# calm Specification

## Purpose
Let any Player play without clocks or motion: a Calm setting that removes time limits from Practice and stops all movement, while Ranked rounds keep the clock that makes them fair races.

## Requirements

### Requirement: A Calm switch
The system SHALL offer a Calm switch in the Calm and sound panel of the header on every page of the game, in the header of every play screen and in the Me page settings. It SHALL be off by default, remembered on this device, and the same switch in all three places: turning it on or off in one SHALL show at once in the others.

#### Scenario: Turning Calm on in a game
- **WHEN** a Player turns on Calm in the header of a game's play screen
- **THEN** the Me page shows Calm on, and it is still on after a reload

#### Scenario: Turning Calm on from the header
- **WHEN** a Player on the Dojo page opens Calm in the header and turns the Calm switch on
- **THEN** the page has no motion, the Me page shows Calm on, and nothing else in the panel changed

### Requirement: Calm removes clocks from Practice
With Calm on, every timed Practice round (Arena Practice rounds, game Levels and practice rounds, tower challenges) SHALL run with no clock and no countdown sound, ending when its questions are done or the Player finishes. Medals measured against the clock (tower Sprint and Time attack, and Levels of timed games) SHALL NOT be awarded in a round played without the clock, and the result SHALL say so; Sparks SHALL still be earned.

#### Scenario: Tower Sprint in Calm
- **WHEN** a Player with Calm on plays a Sprint challenge
- **THEN** no clock is shown or enforced, the result shows their right answers and Sparks, and says Medals for Sprint need the clock

#### Scenario: Game Level in Calm
- **WHEN** a Player with Calm on plays Level 4 of Times sprint
- **THEN** the round has no timer bar and ends after its questions

### Requirement: Ranked rounds keep their clock
With Calm on, Ranked rounds (the Arena daily challenge and ranked game rounds) SHALL keep their clock, since they are races on a shared Board, and SHALL say so before they start. They SHALL still run with no motion and no countdown ticks.

#### Scenario: Daily challenge with Calm on
- **WHEN** a Player with Calm on picks the Arena daily challenge
- **THEN** the lobby says the daily challenge is timed and points to the untimed Practice option

### Requirement: Calm stops motion
With Calm on, nothing in the app SHALL move: no animations, transitions, confetti, particles, parallax or moving background; Bolt's poses and every result SHALL still appear, in place. The same no-motion behavior SHALL apply when the device asks for reduced motion or the site-wide "Pause motion" control is on, without turning Calm itself on.

#### Scenario: Comeback in Calm
- **WHEN** a Player with Calm on makes a Comeback in a Star
- **THEN** the Comeback message and Sparks appear with no burst or movement

#### Scenario: Pause motion from the Explore menu
- **WHEN** a Player turns on Pause motion in the site's Explore menu while a game is open
- **THEN** motion in the app stops at once, the game's clock keeps running, and the Calm switch stays off

### Requirement: The moving background with Calm and Pause motion
The "Moving background" switch SHALL keep deciding whether the decorative background is drawn. When Calm is on, motion is reduced or paused, the background SHALL be drawn still.

#### Scenario: Calm on, background on
- **WHEN** a Player has the moving background on and turns on Calm
- **THEN** the background stays visible and stops moving

### Requirement: Calm is announced and labelled
The Calm switch SHALL be a labelled switch with its state exposed to assistive technology, and turning it on or off SHALL be announced once.

#### Scenario: Screen reader toggles Calm
- **WHEN** a screen reader user turns Calm on
- **THEN** they hear that Calm is on, with no clocks in Practice and no motion
