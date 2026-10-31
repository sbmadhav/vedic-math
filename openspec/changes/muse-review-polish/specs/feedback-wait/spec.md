# Spec Delta

## Purpose

Show the Player that the game is waiting on purpose while it holds input for feedback, and let them move on early when nothing is timed.

## ADDED Requirements

### Requirement: Held feedback shows a wait indicator
When a round holds input for feedback or a teaching moment for more than 1.2 seconds, the system SHALL show an indicator on the held input that shows the time left, and SHALL announce once, politely, that the next question is coming. Holds of 1.2 seconds or less SHALL show no indicator. With reduced motion, Pause motion or Calm on, the indicator SHALL show the time left without animating.

#### Scenario: A wrong answer in Practice
- **WHEN** a Player answers a Practice question wrong and the worked answer is shown
- **THEN** after 1.2 seconds the keypad shows the wait indicator until the next question appears

#### Scenario: A right answer
- **WHEN** a Player answers right and the next question follows within a second
- **THEN** no wait indicator appears

### Requirement: Untimed holds can be ended early
In untimed rounds (Practice, Stars, Katas, Discovery Locks, and rounds played with Calm on), a hold of 2 seconds or more SHALL offer a Next control, also reached by Enter, that ends the hold at once. Timed rounds SHALL NOT offer Next.

#### Scenario: Next in a Star
- **WHEN** a Player misses a Star question and the worked method starts stepping
- **THEN** a Next control appears, and pressing Enter shows the next question at once

#### Scenario: No Next in the Arena
- **WHEN** a Player misses a question in the daily Arena round
- **THEN** the wait indicator shows and no Next control appears
