# Spec Delta

## Purpose

Let read aloud say nearly every line in the studio voice: fixed words from recordings, and sentences with a question's own numbers voiced once by the server and kept for everyone, within a hard daily spend limit, with the device's voice whenever the server cannot help, and with nothing about the Player ever sent.

## ADDED Requirements

### Requirement: Fixed words come from recordings
Lines whose words never change (explanations, Sutra names, lessons, praise, feedback, digit-free questions and hints) SHALL be played from recordings made ahead of time with the studio voice and served from the voice host, and SHALL never be voiced by the server at play time.

#### Scenario: An explanation
- **WHEN** an Explorer Player taps Listen on a Skill's idea
- **THEN** the recorded line is played and no request is sent to the server voice

### Requirement: Sentences with numbers are voiced once by the server
A sentence that holds a question's own numbers (a Server line) SHALL be normalized the same way in the game and on the server and named by the full SHA-256 of its text and voice profile (a profile fixes the voice name, rate and format). The game SHALL first ask the voice host for that name; if it is not there, the server SHALL voice the sentence with the studio voice at most once, keep the audio in R2 under that name for every later request from any Player, and return it.

#### Scenario: A new sentence
- **WHEN** an Explorer Player with read aloud on is asked "What is 47 plus 38?" and no Player has heard it before
- **THEN** the server asks the speech provider once, stores the audio, and the Player hears the studio voice

#### Scenario: The same sentence again
- **WHEN** another Player is asked the same sentence later
- **THEN** the audio comes from the voice host and the speech provider is not asked

#### Scenario: Two requests at once
- **WHEN** two Players ask for the same new sentence at the same moment
- **THEN** the speech provider is asked once, and the Player whose request was second hears the clips or the device's voice for that play

### Requirement: Only the game's own sentences are accepted
The server SHALL voice a sentence only if it can be built from the recorded word frames and numbers the game uses, and only up to 240 characters. It SHALL refuse anything else without asking the speech provider.

#### Scenario: Arbitrary text
- **WHEN** a request asks the server to voice "Hello Sam, meet me after school"
- **THEN** the answer is a refusal, the speech provider is not asked, and nothing is stored

#### Scenario: A Nickname
- **WHEN** a request holds a sentence with a generated Nickname in it
- **THEN** the answer is a refusal

### Requirement: A daily spend cap on the server
The server SHALL count what every request to the speech provider costs at list price, without the provider's free tier, per UTC day and per month, and SHALL refuse to ask the provider once a request would take the day past the daily cap ($5) or the month past the monthly ceiling ($150). Both SHALL be settings of the server, never of the game. A failed request SHALL not be counted.

#### Scenario: The cap is reached
- **WHEN** the day's spend has reached the daily cap and a Player is asked a sentence no one has heard
- **THEN** the server refuses without asking the provider, and the Player hears the clips or the device's voice

#### Scenario: The next day
- **WHEN** the UTC day changes after a capped day
- **THEN** new sentences are voiced again

#### Scenario: Many requests at once near the cap
- **WHEN** 10,000 different sentences are requested at the same time with $1 left before the cap
- **THEN** the day's counted spend never passes the cap

### Requirement: The device's voice is the fallback
Read aloud SHALL say a line with studio clips when every clip is loaded, or else with the device's voice, whenever the server refuses, the cap is reached, the server voice is switched off, the network is down, or the Server line has not started playing within 600 ms of the tap. One line SHALL always be said by one voice. A Server line a Player has heard SHALL play again offline.

#### Scenario: Offline
- **WHEN** a Player who is offline is asked a sentence they have never heard
- **THEN** the line is said by the clips or the device's voice, with no error shown

#### Scenario: A heard sentence offline
- **WHEN** a Player who heard a Server line online hears the same sentence offline
- **THEN** the studio voice plays it from the device

#### Scenario: A slow server
- **WHEN** the server takes 2 seconds to voice a new sentence
- **THEN** the Player hears the clips or the device's voice at once, and the next Player to hear that sentence gets the studio voice

### Requirement: No Player content is sent
A request to the server voice SHALL carry only the protocol version, the voice profile, the sentence text and the access proof, and no Player content (no Player id, Nickname, Age answer, progress or setting) and no cookie. The speech provider SHALL receive only the sentence text and the voice name, from the server, never with the Player's IP address. The server SHALL keep nothing about the Player and log no IP address or access proof. The provider's key SHALL exist only as a server secret.

#### Scenario: What the browser sends
- **WHEN** a Player is asked a new sentence and the game asks the server to voice it
- **THEN** the request body holds only `v`, `voice` and `text`, the access proof is in the `Authorization` header, and the request carries no cookie

#### Scenario: A Player under 13
- **WHEN** an Explorer Player whose Age answer is under 13 is asked a new sentence
- **THEN** the same request is sent with no Player data, no Firebase identity is created, and no lasting identifier is sent

### Requirement: The access proof is transient
The access proof SHALL be either a Firebase ID token, which a Player has only after their first World board post and which names that Player's anonymous Firebase account, or an anonymous ticket the server signed. The server SHALL check it, then discard it: it SHALL never log, store or forward it, and SHALL never link it to a sentence. The parent note and privacy notice SHALL say so.

#### Scenario: A Player who has posted
- **WHEN** a Player with a Firebase identity is asked a new sentence
- **THEN** the token is checked and discarded, the speech provider receives only the sentence and the voice, and no record joins the token to the sentence

### Requirement: Access is checked before a new recording
The server SHALL check access before voicing a new sentence: a Firebase ID token when the Player has one, verified for signature, audience, issuer and expiry, or a short-lived session ticket the server signed when the Player has no Firebase identity. It SHALL never create an identity for this. Audio already stored SHALL be served without a check, like any recorded line. Requests SHALL be rate limited per connection address without keeping the address.

#### Scenario: A Player with no Firebase identity
- **WHEN** an Explorer Player whose Age answer is under 13 is asked a new sentence
- **THEN** the game gets a short-lived ticket the server signed, the server accepts it, and no Firebase identity is created

#### Scenario: A bad token
- **WHEN** a request to voice a new sentence carries an expired or forged token
- **THEN** the server refuses it without asking the provider, and the Player hears the clips or the device's voice

### Requirement: The server voice can be switched off
The server SHALL have one setting that switches the server voice off. Off, it SHALL voice nothing, and every Server line SHALL be said by the clips or the device's voice. A build without the voice host SHALL also have the server voice off.

#### Scenario: Switched off
- **WHEN** the owner switches the server voice off
- **THEN** no request reaches the speech provider and read aloud keeps working with the clips and the device's voice

### Requirement: The parent note says what is sent
`parentNote()`, `cloud/README.md` and the privacy notice SHALL say that sentences from the game, with no names and nothing about the Player, are sent to our server, which may ask Google to voice them, and that nothing about the Player is kept.

#### Scenario: Reading the parent note
- **WHEN** a grown-up opens the parent note in any Mode once the server voice is on
- **THEN** it describes the Server lines exactly as above
