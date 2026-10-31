# Spec Delta

## Purpose

How the game reads aloud: the Studio voice recorded ahead of time and served as files from this site, the device's built-in voice tuned and ranked as the fallback, and the natural voice only after opting in; nothing spoken is sent to a speech provider at play time.

## ADDED Requirements

### Requirement: Voice order
When read aloud says a line, the system SHALL use the first voice that can say all of it: the natural voice when the Player turned it on and it is loaded, then a whole studio line, then studio clips when every clip for the line is in a loaded pack, then the built-in voice. One line SHALL always be said by one voice, never a mix. A whole studio line that has not arrived within 600 ms SHALL be said by studio clips or the built-in voice instead.

#### Scenario: Explorer question from a whole line
- **WHEN** an Explorer Player with read aloud on gets the question "7 + 5 = ?"
- **THEN** the line plays from its whole studio file under `/vedic-math/voice/` and the built-in voice says nothing

#### Scenario: A line said from clips
- **WHEN** a Challenger Player with read aloud on and the needed pack loaded gets "4368 ÷ 16 = ?"
- **THEN** the line plays from studio clips

#### Scenario: A line the studio voice cannot say
- **WHEN** read aloud gets a line with a word frame that has no clip and no whole file
- **THEN** the built-in voice reads the whole line and no studio audio plays

#### Scenario: Natural voice keeps priority
- **WHEN** a Player has turned on the natural voice and it is loaded
- **THEN** lines are read by the natural voice, as today

### Requirement: A slow studio index
When the studio voice is next in the voice order for a line and its index (the line set and clip directory) has not loaded within 1 s, the built-in voice SHALL say the line, and the index SHALL keep loading so later lines can use the studio voice. A loaded natural voice the Player turned on keeps its priority.

#### Scenario: A slow studio index
- **WHEN** read aloud gives a line to the studio voice and the studio index takes longer than 1 s to load
- **THEN** the built-in voice reads the line, and once the index has loaded a later line plays in the studio voice when its whole recording or all its clips are ready (otherwise the built-in voice reads it)

### Requirement: Studio audio is files on this site
Studio audio SHALL be prerecorded files on this site's origin under `/vedic-math/voice/`: one AAC `.m4a` per whole line, named by a hash of the voice and the words, and content-hashed clip packs. No text SHALL be sent anywhere to say a line.

#### Scenario: Nothing sent
- **WHEN** an Explorer Player hears ten questions
- **THEN** every voice request is a GET under `https://sbmadhav.com/vedic-math/voice/` with no query text, and no request goes to a speech provider

### Requirement: No speech provider at play time
The published site SHALL contain no speech provider key, token or endpoint, and the game SHALL make no request to a speech provider. When studio audio cannot play a line for any reason, the built-in voice SHALL read it.

#### Scenario: Built site
- **WHEN** the site is built with `build.py --out`
- **THEN** no published file contains `texttospeech.googleapis.com` or a string shaped like a Google API key or OAuth token

#### Scenario: Audio fails
- **WHEN** a studio file returns an error or cannot be decoded
- **THEN** the built-in voice reads the line

### Requirement: Studio audio loads lazily
No studio file SHALL be fetched until read aloud is on. The core clip pack SHALL load while the page is idle once read aloud is on, and other files SHALL load the first time a line needs them.

#### Scenario: Read aloud off
- **WHEN** a Challenger Player with read aloud off plays a whole Practice round
- **THEN** no request is made for `/vedic-math/voice/`

### Requirement: Studio audio plays offline once saved
Studio files, once fetched, SHALL play offline, including after the next deploy.

#### Scenario: Offline after one visit
- **WHEN** an Explorer Player heard lines online, then goes offline and reloads
- **THEN** a line heard before plays from its saved file, and a new line plays from the saved core pack or the built-in voice

### Requirement: Studio audio covers the Explorer lines
Every line read aloud on an Explorer surface (praise and feedback, Explorer Arena, Balloon pop and Which has more, K to 2 Practice questions and hints, the read-aloud toggles) SHALL have studio audio: a whole file, except for three-digit adding and subtracting and comparing numbers, which SHALL have clips. Across all generated lines, studio audio SHALL cover at least 99%.

#### Scenario: New Explorer wording
- **WHEN** a change adds an Explorer line that has no whole file and no clips
- **THEN** the node test suite fails and names the line

### Requirement: The built-in voice is tuned
The built-in voice SHALL speak at pitch 1 in every Mode, at rate 0.9 for Explorer and 0.95 otherwise. Each English voice SHALL be rated good (neural, natural, Microsoft online, Siri, Premium, Enhanced, Google), poor (novelty, eSpeak, Apple compact, Windows desktop) or ok (any other). Best available SHALL pick the highest rated voice, and SHALL NOT pick a poor voice when a good or ok one exists. A voice the Player picked by name in Me SHALL be used as before.

#### Scenario: A compact and an Enhanced voice
- **WHEN** the device has "Samantha" (compact) and "Ava (Enhanced)"
- **THEN** best available speaks with Ava (Enhanced) at pitch 1

#### Scenario: Explorer pitch
- **WHEN** an Explorer question is read by the built-in voice
- **THEN** the utterance pitch is 1 and its rate is 0.9

### Requirement: Poor voices are explained once
When every English voice on the device is rated poor, Me settings SHALL show a note that the voices on this device sound robotic, the studio voice is used where it can be, and how to add a better system voice on iPhone or iPad, Mac, Windows and Android. Dismissing it SHALL hide it for that Player on this device.

#### Scenario: Only compact voices
- **WHEN** a Player opens `#/me` on a device whose only English voices are compact
- **THEN** the note shows with the steps, and after "Got it" it does not show again for that Player

#### Scenario: A good voice exists
- **WHEN** the device has a good or ok English voice
- **THEN** no note shows

### Requirement: Stop stops every voice
Stopping speech (a new line, leaving the view, turning read aloud off) SHALL stop studio audio, the built-in voice and the natural voice at once, and SHALL NOT let a studio line that was still loading start later.

#### Scenario: Leaving during a studio line
- **WHEN** a studio line is playing or loading and the Player leaves the round
- **THEN** no studio audio plays after the route changes
