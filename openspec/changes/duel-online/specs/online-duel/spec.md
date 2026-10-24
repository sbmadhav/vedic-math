# Spec Delta

## Purpose

Let two Players on two devices race the same questions online: a friend by Duel code for everyone, or someone new in the same League for Players 13 and over, with a server that decides every point.

## ADDED Requirements

### Requirement: Friend Duels by code or link
Any Player with an Age answer SHALL be able to start a Friend Duel, which gives a 6-letter Duel code and a link to the Duel lobby holding the code in its fragment (`/learn/arena/duel#<code>`), so the code never reaches the server. A friend SHALL join by typing the code or opening the link, and SHALL see the host's Nickname, color and League and confirm before joining. A code SHALL work for 10 minutes or until a friend joins, whichever is first, and a room SHALL never take a third Player.

#### Scenario: The code stays out of the request
- **WHEN** a friend opens `https://learnvedicmath.com/learn/arena/duel#BKTRMZ`
- **THEN** the page request the server receives is for `/learn/arena/duel` with no code in it, the address bar keeps `#BKTRMZ`, and the join screen for that Duel is shown

#### Scenario: Two friends on two phones
- **WHEN** a Player starts a Friend Duel and a friend opens the link on another phone and confirms
- **THEN** both see each other's Nickname and color and the same countdown

#### Scenario: A code after 10 minutes
- **WHEN** someone enters a code 11 minutes after it was made with no friend having joined
- **THEN** the app says the code has expired and offers to start a new Duel

#### Scenario: A third Player
- **WHEN** a third Player enters a code whose room already has two Players
- **THEN** the app says the Duel is full and nothing changes for the two Players

### Requirement: Duel codes are hard to misread and guess
Duel codes SHALL use six letters from the 20 consonants `BCDFGHJKLMNPQRSTVWXZ`, so they never spell a word and never mix up 0 and O or 1 and I, and SHALL be accepted in any case and with spaces.

#### Scenario: Typed in lower case with spaces
- **WHEN** a friend types "bkt rmz" for the code BKTRMZ
- **THEN** the join screen for that Duel is shown

### Requirement: Random Duels are for 13 and over, in the same League
Only a Player whose Age answer is 13 or over SHALL be offered Find a player, and only while the service says Random Duels are open; it pairs them with another waiting Player in the same League. A Player under 13, or without an Age answer, SHALL NOT see it. If no one is found within 60 seconds, the app SHALL offer to try again or to start a Friend Duel.

#### Scenario: Random Duels not open yet
- **WHEN** a Player aged 15 opens the Duel lobby while the status endpoint says Random Duels are closed
- **THEN** Duel a friend and I have a code are offered, and Find a player is not shown

#### Scenario: A Player aged 10
- **WHEN** a Player whose Age answer is 10 opens the Duel lobby
- **THEN** Duel a friend and I have a code are offered, and Find a player is not shown

#### Scenario: Nobody waiting
- **WHEN** a Player aged 15 taps Find a player and nobody else in their League is waiting for 60 seconds
- **THEN** the app offers Try again and Duel a friend

### Requirement: The same question at the same time
Both Players SHALL get the same question with the same four choices at the same moment, from the first question to the last, drawn from the Arena Practice pools of the Duel's League. A Friend Duel's League SHALL be the host's League.

#### Scenario: A question is dealt
- **WHEN** a question is dealt in a Challenger Duel
- **THEN** both Players see the same question text, picture and choices

### Requirement: The server decides who was first
The server SHALL decide every point. The first right answer, allowing for each Player's connection delay up to 150 ms, SHALL win the point. A wrong answer SHALL take that Player out of the question while the other can still answer. When both are out or the time runs out, the right answer SHALL be shown to both and the next question dealt.

#### Scenario: One wrong, one right
- **WHEN** Player A taps a wrong choice and Player B then taps the right one
- **THEN** Player A is out of that question, Player B gains the point, and both get the next question

#### Scenario: Time runs out
- **WHEN** neither Player answers a Pro question within 12 seconds
- **THEN** both see the right answer and the next question follows

### Requirement: Time allowed per question
Each question SHALL allow 20 seconds in Explorer, 15 in Challenger and 12 in Pro, shown as a bar and a number. The lobby SHALL say that a Duel is timed, and SHALL point Calm Players to Party Mode or Arena Practice.

#### Scenario: Calm on
- **WHEN** a Player with Calm on opens the Duel lobby
- **THEN** it says Duels have a clock and links Party Mode and Arena Practice

### Requirement: How a Duel ends
The first Player to 10 points SHALL win. A Duel SHALL also end after 40 questions or 10 minutes of play, the higher score winning and equal scores a draw; after three questions in a row that nobody answers, with no winner; or when a Player leaves, the other winning. After the end, both SHALL be offered a Rematch for 30 seconds, which starts only if both accept.

#### Scenario: Reaching 10
- **WHEN** a Player's right answer brings them to 10 points
- **THEN** the Duel ends with that Player as the winner, and later taps change nothing

#### Scenario: Both want a rematch
- **WHEN** both Players tap Rematch within 30 seconds of the end
- **THEN** a new Duel starts between them with new questions

### Requirement: Losing the connection and coming back
If a Player's connection drops during a Duel, the question clock SHALL stop for both, the other Player SHALL see that they are waiting and for how long, and the Player SHALL be put back into the same Duel if they return within 20 seconds, up to 45 seconds in all per Duel. A drop caused by a server update SHALL NOT count toward that limit. If they do not return in time, the other Player SHALL win.

#### Scenario: A phone loses signal for 8 seconds
- **WHEN** a Player's phone loses its connection for 8 seconds in the middle of a question
- **THEN** the other Player sees a waiting message, and when the connection returns both continue the same question with the time that was left

#### Scenario: Gone for good
- **WHEN** a Player closes the app in the middle of a Duel and does not return for 20 seconds
- **THEN** the other Player is told they left and wins

### Requirement: Sparks from Duels stay on the device
A finished Duel SHALL earn 10 Sparks, and a win 10 more, at most 100 Sparks a day from Duels per Player, and none for a Duel that ended with nobody answering or in which the Player answered fewer than 5 questions. Duel results SHALL stay on the device and SHALL NOT be posted to any Board, and a Duel SHALL NOT load Firebase or create a Board identity.

#### Scenario: A won Duel
- **WHEN** a Player wins a Duel after answering 14 questions
- **THEN** they earn 20 Sparks on this device and no request goes to Firebase

#### Scenario: The daily cap
- **WHEN** a Player who has earned 100 Sparks from Duels today wins another
- **THEN** that Duel earns no Sparks

### Requirement: Online Duels need a connection
When the device is offline, or the service is switched off, the Duel lobby SHALL say that online Duels are not available right now and link Party Mode, instead of failing.

#### Scenario: Offline
- **WHEN** a Player opens the Duel lobby with no connection
- **THEN** it says online Duels need a connection and links Party Mode

#### Scenario: Service resting
- **WHEN** the status endpoint says Duels are closed
- **THEN** the lobby says online Duels are resting and links Party Mode

### Requirement: Duels can be played without a mouse and with a screen reader
Choices SHALL be selectable with the keys 1 to 4 and with Tab and Enter. Points, misses, the other Player's answers and Reactions SHALL be announced politely, focus SHALL stay on the choices after each answer, and nothing SHALL be shown by color alone. In Explorer, each question SHALL be read aloud on the Player's own device when it is dealt.

#### Scenario: Keyboard
- **WHEN** a Player presses 3 during a question
- **THEN** the third choice is sent as their answer

#### Scenario: Screen reader hears a point
- **WHEN** the other Player wins a point
- **THEN** a polite status message names them and the new score
