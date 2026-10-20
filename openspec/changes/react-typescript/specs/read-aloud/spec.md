# Spec Delta

## MODIFIED Requirements

### Requirement: Voice order
When read aloud says a line, the system SHALL use the first voice that can say all of it: the natural voice when the Player turned it on and it is loaded, then a whole studio line, then a Server line (server-voice spec), then studio clips when every clip for the line is in a loaded pack, then the built-in voice. One line SHALL always be said by one voice, never a mix. A whole studio line, or a Server line, that has not started within 600 ms SHALL be said by the next voice in this order that can say it at once.

#### Scenario: Explorer question from a whole line
- **WHEN** an Explorer Player with read aloud on gets the question "7 + 5 = ?"
- **THEN** the line plays from its whole studio recording and the built-in voice says nothing

#### Scenario: A sentence with the question's own numbers
- **WHEN** an Explorer Player with read aloud on gets "What is 47 plus 38?", which has no whole recording, and the server voice is on and under its cap
- **THEN** the line plays as a Server line in the studio voice

#### Scenario: A line said from clips
- **WHEN** a Challenger Player with read aloud on and the needed pack loaded gets "4368 ÷ 16 = ?" while the server voice is capped for the day
- **THEN** the line plays from studio clips

#### Scenario: A line the studio voice cannot say
- **WHEN** read aloud gets a line with a word frame that has no clip, no whole recording and no Server line
- **THEN** the built-in voice reads the whole line and no studio audio plays

#### Scenario: Natural voice keeps priority
- **WHEN** a Player has turned on the natural voice and it is loaded
- **THEN** lines are read by the natural voice, as today
