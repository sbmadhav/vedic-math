# Spec Delta

## ADDED Requirements

### Requirement: Voice order
When read aloud says a line, the system SHALL use the first voice that can say all of it: the natural voice when the Player turned it on and it is loaded, then the clip voice when every clip for the line is in a loaded pack, then the built-in voice. One line SHALL always be said by one voice, never a mix.

#### Scenario: Clip voice by default
- **WHEN** an Explorer Player with read aloud on and the core pack loaded gets the question "7 + 5 = ?"
- **THEN** the line plays from the core pack and the built-in voice says nothing

#### Scenario: A line the clips cannot say
- **WHEN** read aloud gets a line with a word frame that has no clip
- **THEN** the built-in voice reads the whole line and no clip plays

#### Scenario: Natural voice keeps priority
- **WHEN** a Player has turned on the natural voice and it is loaded
- **THEN** lines are read by the natural voice, as today

### Requirement: Clip packs load lazily and stay offline
The clip voice SHALL be made of prerecorded Kokoro clips (AAC in `.m4a`) in content-hashed packs under `/vedic-math/voice/`. No pack SHALL be fetched until read aloud is on. The core pack SHALL load while the page is idle once read aloud is on; any other pack SHALL load the first time a line needs it. While a needed pack is still loading, the line SHALL be read by the built-in voice. A pack, once loaded, SHALL play offline, including after the next deploy when its hash is unchanged.

#### Scenario: Read aloud off
- **WHEN** a Challenger Player with read aloud off plays a whole Practice round
- **THEN** no request is made for `/vedic-math/voice/`

#### Scenario: First line before the pack is ready
- **WHEN** read aloud is on and the first question appears before the core pack has loaded
- **THEN** the built-in voice reads it, and the next question after the pack loads plays from the clips

#### Scenario: Offline after one visit
- **WHEN** an Explorer Player heard clip lines online, then goes offline and reloads
- **THEN** the next Explorer question plays from the clips

### Requirement: Clips cover the Explorer lines
Every line read aloud on an Explorer surface (praise and feedback, Explorer Arena, Balloon pop and Which has more, K to 2 Practice questions and hints, the read-aloud toggles) SHALL have clips. Across all generated lines, clips SHALL cover at least 99%.

#### Scenario: New Explorer wording
- **WHEN** a change adds an Explorer question whose word frame has no clip
- **THEN** the node test suite fails and names the frame

### Requirement: The built-in voice is tuned
The built-in voice SHALL speak at pitch 1 in every Mode, at rate 0.9 for Explorer and 0.95 otherwise. Each English voice SHALL be rated good (neural, natural, Microsoft online, Siri, Premium, Enhanced, Google), poor (novelty, eSpeak, Apple compact, Windows desktop) or ok (any other). Best available SHALL pick the highest rated voice, and SHALL NOT pick a poor voice when a good or ok one exists. A voice the Player picked by name in Me SHALL be used as before.

#### Scenario: A compact and an Enhanced voice
- **WHEN** the device has "Samantha" (compact) and "Ava (Enhanced)"
- **THEN** best available speaks with Ava (Enhanced) at pitch 1

#### Scenario: Explorer pitch
- **WHEN** an Explorer question is read by the built-in voice
- **THEN** the utterance pitch is 1 and its rate is 0.9

### Requirement: Explorer hears the kid voice
Clip lines for Explorer surfaces SHALL use the Explorer clip voice (the kid blend the owner chose), and clip lines for Challenger and Pro SHALL use the Heart voice. No voice SHALL be pitch shifted. When the built-in voice reads an Explorer line and the device has a child voice (Microsoft Ana or Maisie online voices), best available SHALL use it; Challenger and Pro lines SHALL NOT get a child voice by default.

#### Scenario: Explorer praise
- **WHEN** an Explorer Player gets a first-try right answer with the core pack loaded
- **THEN** the praise plays from the Explorer clip voice

#### Scenario: Child voice in Edge
- **WHEN** the device's voices include "Microsoft Ana Online (Natural) - English (United States)" and "Microsoft Aria Online (Natural) - English (United States)"
- **THEN** best available reads an Explorer line with Ana and a Pro line with Aria, both at pitch 1

### Requirement: Poor voices are explained once
When every English voice on the device is rated poor, Me settings SHALL show a note that the voices on this device sound robotic, the clip voice is used where it can be, and how to add a better system voice on iPhone or iPad, Mac, Windows and Android. Dismissing it SHALL hide it for that Player on this device.

#### Scenario: Only compact voices
- **WHEN** a Player opens `#/me` on a device whose only English voices are compact
- **THEN** the note shows with the steps, and after "Got it" it does not show again for that Player

#### Scenario: A good voice exists
- **WHEN** the device has a good or ok English voice
- **THEN** no note shows

### Requirement: Stop stops every voice
Stopping speech (a new line, leaving the view, turning read aloud off) SHALL stop the clip voice, the built-in voice and the natural voice at once, and SHALL NOT let a clip line that was still loading start later.

#### Scenario: Leaving during a clip line
- **WHEN** a clip line is playing and the Player leaves the round
- **THEN** no clip plays after the route changes
