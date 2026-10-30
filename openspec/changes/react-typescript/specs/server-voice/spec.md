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
A Server line (a sentence with a question's own numbers) SHALL be built from a sentence template and its numbers, normalized alike in the game and on the server, and named by the SHA-256 of its text and voice profile. The game SHALL first ask the voice host for that name; if it is not there, the server SHALL have at most one provider call in flight for that name, and once one succeeds SHALL keep the audio in R2 under that name and never call the provider for it again.

#### Scenario: A new sentence
- **WHEN** an Explorer Player with read aloud on is asked "What is 47 plus 38?" and no Player has heard it before
- **THEN** the server asks the speech provider once, stores the audio, and the Player hears the studio voice

#### Scenario: The same sentence again
- **WHEN** another Player is asked the same sentence later
- **THEN** the audio comes from the voice host and the speech provider is not asked

#### Scenario: Two requests at once
- **WHEN** two Players ask for the same new sentence at the same moment
- **THEN** the speech provider is asked once, the second request is told the line is pending without waiting, and that Player hears the clips or the device's voice for that play

#### Scenario: A request whose server stopped
- **WHEN** the server stopped while asking the provider for a sentence, and after its in-flight mark expired another Player asks for it
- **THEN** the provider may be asked again, and the first reservation stays counted against the cap

#### Scenario: The Player's request is abandoned
- **WHEN** the game stops waiting for a new Server line after 600 ms
- **THEN** the server still asks the provider once, counts the charge and stores the audio

### Requirement: Only the game's own sentences are accepted
The game SHALL ask for a Server line by a sentence template id and its numbers, never by free text. The server SHALL build the sentence from the same template table, and SHALL voice it only for a known template, with exactly its number slots, each number inside its range, and at most 240 characters. Every template SHALL have at least one number slot. Anything else SHALL be refused without asking the speech provider.

#### Scenario: Arbitrary text
- **WHEN** a request asks the server to voice "Hello Sam, meet me after school" as free text
- **THEN** the answer is a refusal, the speech provider is not asked, and nothing is stored

#### Scenario: A fixed line
- **WHEN** a request asks for a digit-free line that has a recording, such as "Great job!"
- **THEN** no template matches it, the answer is a refusal, and the provider is not asked

#### Scenario: A number out of range
- **WHEN** a request uses a real template with a number outside that slot's range
- **THEN** the answer is a refusal

### Requirement: A daily spend cap on the server
The server SHALL count what every request to the speech provider costs at list price, without the provider's free tier, per UTC day and per month, and SHALL refuse to ask the provider once a request would take the day past the daily cap ($5) or the month past the monthly ceiling ($150). Both SHALL be settings of the server, never of the game. Only a failed provider request SHALL be refunded; a provider request that returned audio SHALL stay counted even if storing it fails.

#### Scenario: The cap is reached
- **WHEN** the day's spend has reached the daily cap and a Player is asked a sentence no one has heard
- **THEN** the server refuses without asking the provider, and the Player hears the clips or the device's voice

#### Scenario: The next day
- **WHEN** the UTC day changes after a day capped by the daily cap
- **THEN** new sentences are voiced again

#### Scenario: The monthly ceiling
- **WHEN** the month's spend has reached the monthly ceiling
- **THEN** new sentences are refused until 00:00 UTC on the first of the next month, whatever the day

#### Scenario: Storing the audio fails
- **WHEN** the provider returns audio but writing it to R2 fails
- **THEN** the charge stays counted, the audio is kept by the server until it is stored, the Player hears it, and the next request for that sentence does not ask the provider again

#### Scenario: The server stops after the provider answers
- **WHEN** the server stops after the provider returned audio and before the audio reached R2
- **THEN** the charge and the audio were already kept together, the audio reaches R2 later, and no later request asks the provider for that sentence

#### Scenario: Many requests at once near the cap
- **WHEN** 10,000 different sentences are requested at the same time with $1 left before the cap
- **THEN** the day's counted spend never passes the cap

### Requirement: The device's voice is the fallback
Read aloud SHALL say a line with studio clips when every clip is loaded, or else with the device's voice, whenever the server refuses, the cap or the per-address limit is reached, the Player's Age answer is under 13 and the Server line is not on the voice host yet, the server voice is switched off, the network is down, or the Server line has not started playing within 600 ms of the tap. One line SHALL always be said by one voice. A Server line a Player has heard SHALL play again offline.

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
A request to the server voice SHALL carry only the protocol version, the voice profile, the template id and its numbers, and the access proof, and no Player content (no Player id, Nickname, Age answer, progress or setting) and no cookie. The speech provider SHALL receive only the sentence text and the profile's synthesis settings, from the server, never with the Player's IP address. The server SHALL keep nothing about the Player and log no IP address or access proof.

#### Scenario: What the browser sends
- **WHEN** a Player is asked a new sentence and the game asks the server to voice it
- **THEN** the request body holds only `v`, `voice`, `template` and `nums`, the access proof is in the `Authorization` header, and the request carries no cookie

#### Scenario: A Player under 13
- **WHEN** an Explorer Player whose Age answer is under 13 is asked a sentence
- **THEN** the game asks only the voice host for it, Turnstile does not load, no request reaches the server voice, no Firebase identity is created, and the line is said by the Server line already on the voice host, the clips or the device's voice

### Requirement: The provider's key stays on the server
The speech provider's key SHALL exist only as a server secret.

#### Scenario: Looking for the key
- **WHEN** any file the browser can download is searched for the key
- **THEN** it is not found

### Requirement: The access proof is transient
The access proof SHALL be a `voice`-scope session ticket the server signed after a Cloudflare Turnstile check, naming no Player. The game SHALL NOT send a Firebase ID token to the server voice. The server SHALL check the ticket, then discard it: it SHALL never log, store or forward it, and SHALL never link it to a sentence. The parent note and privacy notice SHALL say so.

#### Scenario: A Player who has posted
- **WHEN** a Player with a Firebase identity is asked a new sentence
- **THEN** the request carries the `voice` ticket and no Firebase ID token, the ticket is checked and discarded, the speech provider receives only the sentence and the profile's settings, and no record joins the ticket to the sentence

### Requirement: Access is checked before a new recording
The server SHALL voice a new sentence only for a request with a valid `voice`-scope session ticket, issued after a Cloudflare Turnstile check the game runs once per browser session (and again when the ticket expires), as the Family conversation does; a ticket made for another use SHALL be refused. Turnstile SHALL never load for a Player whose Age answer is under 13, so such a Player SHALL ask the server voice for nothing. The server SHALL never create an identity for this.

#### Scenario: A Player of 13 or over with no Firebase identity
- **WHEN** a Challenger Player whose Age answer is 14 is asked a new sentence for the first time in a browser session
- **THEN** the Turnstile check runs once, the game gets a short-lived `voice` ticket the server signed, the server accepts it, and no Firebase identity is created

#### Scenario: No ticket
- **WHEN** a request to voice a new sentence carries no ticket, or an expired or forged one
- **THEN** the server refuses it without asking the provider, and the Player hears the clips or the device's voice

#### Scenario: Later sentences in the same browser session
- **WHEN** that Player is asked a second new sentence in the same browser session, before the ticket expires
- **THEN** the Turnstile check does not run again, and the request carries the same `voice` ticket

#### Scenario: A ticket made for another use
- **WHEN** a request to voice a new sentence carries a `family` or `room` ticket the server signed
- **THEN** the server refuses it without asking the provider, and the Player hears the clips or the device's voice

### Requirement: A per-address limit on new recordings
The server SHALL limit requests to voice a new sentence per connection address (about 20 an hour, a server setting), counted in the same Durable Object as the spend ledger with the address kept only as a keyed hash whose key changes daily, and the count deleted when its hour ends. Over the limit it SHALL refuse without asking the provider.

#### Scenario: Too many from one address
- **WHEN** requests to voice new sentences from one connection address pass the hourly limit
- **THEN** the next one is refused without asking the provider, the Player hears the clips or the device's voice, and no address is stored, only its keyed hash until the hour ends

#### Scenario: The hour ends
- **WHEN** an address that passed the hourly limit asks to voice a new sentence after its hour has ended
- **THEN** the count for that hour has been deleted, the request is counted afresh, and the sentence is voiced if the spend caps allow

#### Scenario: A sentence already on the voice host
- **WHEN** a Player is asked a Server line that is already on the voice host
- **THEN** the game plays it from the voice host, no request reaches the server, and nothing is counted against the address

#### Scenario: The next day's key
- **WHEN** the UTC day changes
- **THEN** the key for the address hash is a new one, and no hash made with the old key is kept

### Requirement: The server voice can be switched off
The server SHALL have one setting that switches the server voice off. Off, it SHALL voice nothing, and within 5 minutes the game SHALL stop playing Server lines, cached or new, and say them with the clips or the device's voice. A build without the voice host SHALL also have the server voice off.

#### Scenario: Switched off
- **WHEN** the owner switches the server voice off
- **THEN** no request reaches the speech provider and read aloud keeps working with the clips and the device's voice

#### Scenario: A cached line after switching off
- **WHEN** the server voice has been off for 5 minutes and a Player is asked a sentence already cached under `live/`
- **THEN** the game does not request it, and the line is said by the clips or the device's voice

### Requirement: The parent note says what is sent
`parentNote()`, `cloud/README.md` and the privacy notice SHALL say that sentences from the game, with no names and nothing about the Player, are sent to our server, which may ask Google to voice them, and that nothing about the Player is kept.

#### Scenario: Reading the parent note
- **WHEN** a grown-up opens the parent note in any Mode once the server voice is on
- **THEN** it describes the Server lines exactly as above
