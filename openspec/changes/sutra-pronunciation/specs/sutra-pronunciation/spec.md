# Spec Delta

## ADDED Requirements

### Requirement: Say it button
The system SHALL show a Say it button next to a Sutra name on each Sutra card, in the Sutra deep dive, on each Trick page (the Sutra line) and beside each Constellation name in All places. A tap SHALL play the name clip for that Sutra. The button SHALL NOT be placed inside another button or a link, and a tap on it SHALL NOT flip a Sutra card.

#### Scenario: Deep dive
- **WHEN** a Player opens `#/sutras/s1` and taps Say it
- **THEN** the clip for Ekādhikena Pūrveṇa plays and the button shows it is playing (`aria-pressed="true"`) until the clip ends

#### Scenario: Card does not flip
- **WHEN** a Player taps the Say it button on a Sutra card that is not flipped
- **THEN** the clip plays and the card stays unflipped

#### Scenario: Trick page with a bracketed Sutra
- **WHEN** a Player taps Say it on the Trick page of `div9`, whose Sutra line reads "Nikhilaṃ (division by 9)"
- **THEN** the clip for Sutra 2, Nikhilaṃ Navataścaramaṃ Daśataḥ, plays

#### Scenario: All places
- **WHEN** a Player opens `#/places`
- **THEN** each of the 17 Constellation headings has one Say it button for its Sutra

### Requirement: Speech only follows a tap
A name clip SHALL play only in response to a tap or key press on its Say it button, whether read aloud is on or off. Starting a clip SHALL stop anything being read aloud and any other clip. A second tap on a playing button SHALL stop it. Leaving the page SHALL stop it.

#### Scenario: Read aloud off
- **WHEN** a Player with read aloud off taps Say it
- **THEN** the clip plays

#### Scenario: No speech on load
- **WHEN** a Player opens `#/sutras/s3` and does nothing
- **THEN** no name clip plays and none is downloaded

#### Scenario: Tap while read aloud speaks
- **WHEN** read aloud is reading a question and the Player taps Say it on the Trick page
- **THEN** the reading stops and the clip plays

#### Scenario: Leaving stops the clip
- **WHEN** a clip is playing and the Player goes to another route
- **THEN** the clip stops

### Requirement: Respelling under the name
Wherever a Say it button is shown, the system SHALL show the name's respelling under the name: syllables joined by hyphens, compound parts separated by spaces, long vowels spelled to be held (ah, ee, oo, ay, oh), and one beat syllable per part in capitals by the classical rule. The deep dive SHALL also show the name in Devanagari. The respelling SHALL have a visually hidden prefix "Say it like: ".

#### Scenario: Deep dive text
- **WHEN** a Player opens `#/sutras/s1`
- **THEN** the dialog shows "Ekādhikena Pūrveṇa", "ay-kah-dhi-KAY-nuh poor-VAY-nuh" and "एकाधिकेन पूर्वेण"

#### Scenario: Stored text matches the generator
- **WHEN** the node tests run
- **THEN** every `say` and `deva` in `js/sutras.js` equals what `tools/sutra-voice/sanskrit.mjs` makes from that entry's IAST

### Requirement: Name clips
The system SHALL ship one clip per name (29), made with the Kokoro voice the owner chose (the Alpha kid blend: Hindi Alpha 70%, Japanese Alpha 30%), from phonemes generated from the IAST, as AAC `.m4a` (mono, 24 kHz, 32 kbps) under `sounds/sutras/`.

#### Scenario: Size
- **WHEN** the clips are built
- **THEN** there are 29, each under 30 KB, and all together under 500 KB

### Requirement: Clips load on use and stay for offline
The system SHALL keep name clips out of the service worker's install precache and fetch a clip on the first tap that needs it. After the first Say it tap on a device, it SHALL fetch the remaining clips one at a time while the browser is idle, unless Save-Data is on. The service worker SHALL serve clips cache first.

#### Scenario: First tap
- **WHEN** a Player on a new device taps Say it for Sutra 3
- **THEN** only the Sutra 3 clip is fetched before it plays, and the other 28 follow while idle

#### Scenario: Save-Data
- **WHEN** a device with Save-Data on taps Say it for Sutra 3
- **THEN** only that clip is fetched

#### Scenario: Offline after first use
- **WHEN** a Player has tapped Say it once with the service worker active, goes offline and taps Say it on another name
- **THEN** that name's clip plays from the cache

### Requirement: Fallback when a clip cannot play
When a clip cannot be fetched, decoded or played, the system SHALL have the device's English built-in voice read the respelling (hyphens as spaces, lower case) and show a polite status saying the device's voice was used. When no built-in voice exists, it SHALL show a status with the respelling to read. The button SHALL return to not pressed in every case.

#### Scenario: Offline before any clip is cached
- **WHEN** a Player who never tapped Say it is offline and taps it
- **THEN** the built-in voice reads "ay kah dhi kay nuh poor vay nuh" for Sutra 1 and the status says "Played with this device's voice, which may not be exact."

#### Scenario: No audio at all
- **WHEN** neither Web Audio nor speech synthesis is available and the Player taps Say it
- **THEN** the status shows "Sound is not available here. Say it like this:" followed by the respelling, and no error is thrown
