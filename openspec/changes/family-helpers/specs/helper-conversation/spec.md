# Spec Delta

Planned for step 3 (after react-typescript phase 2 and its Phase 8 ledger); not built in step 2. ADR 0015; design D15 and D18 (owner decisions of 2026-10-24).

## ADDED Requirements

### Requirement: Talking with the Family is for 13 and over, opt-in
An AI conversation with the Family SHALL be offered only to a Player whose saved answers say 13 or over: an Age answer of 13 or over, or, with no Age answer, a Grade answer of grade 9 or above or Grown-up (grade 8 starts at 12 or 13, so it does not count). An Age answer under 13 SHALL always rule it out, whatever the Grade answer says. It SHALL be off until the Player turns it on. A Player it is not offered to SHALL have nothing reach the conversation endpoint.

#### Scenario: An under-13 Player
- **WHEN** a Player whose Age answer is 11 opens Me with the Family helpers on
- **THEN** there is no option to talk with the Family, and no request is made to the conversation endpoint during their session

#### Scenario: A Pro Player of 15
- **WHEN** a Player whose Age answer is 15 turns on talking with the Family and types "why do we add 1?"
- **THEN** a friend or Bolt answers in the bubble about the method, without the answer to the question on screen

### Requirement: Bolt and the three friends speak, two replies at most
The conversation's speakers SHALL be Bolt, Shunya, Nava and Eka. Each turn SHALL make one model call, which SHALL return at most two short replies, each with a speaker from those four and a line; the bubble SHALL show them one at a time, each pointing at its speaker. Bolt SHALL answer every why or how question.

#### Scenario: A why question
- **WHEN** a Player asks "why does this trick work?"
- **THEN** one model call is made, Bolt gives the first reply, and at most one more reply follows from Shunya, Nava or Eka

#### Scenario: A third reply
- **WHEN** a model response holds three replies
- **THEN** only the first two are shown

### Requirement: What the conversation sends
A conversation turn SHALL send only the Skill id, the question's own numbers and this Visit's words (the Player's messages and the replies so far in the open Visit, which belongs to one question), with the session ticket. It SHALL NOT send the Nickname, a Player id, the Age or Grade answer, or words from an earlier Visit or question, and the server SHALL keep nothing after answering beyond the per-address count of the bot protection requirement.

#### Scenario: A turn's request
- **WHEN** a Player sends one message to the Family
- **THEN** the request body holds the Skill id, the numbers and this Visit's words only

#### Scenario: The next question
- **WHEN** the Player moves to the next question and sends a message
- **THEN** the request holds none of the words said about the previous question

### Requirement: Our own endpoint and a small model
The conversation SHALL be served by our own Worker route, which SHALL call Claude Haiku 4.5 with the reply capped at about 300 tokens. No chat framework or hosted chat service SHALL sit between the game and that route, and the model provider's key SHALL exist only as a server secret.

#### Scenario: Where a turn goes
- **WHEN** a Player sends a message
- **THEN** the browser contacts only our own conversation route, and no file the browser can download holds the provider's key

### Requirement: Never the answer, checked on the server
Every reply SHALL give a hint, the method or an example on other numbers, never the answer. The server SHALL check each reply before returning it, and SHALL replace with a scripted line for the same speaker any reply that contains the question's answer, names a speaker outside the four, holds a link, an email address or a phone number, runs past the length limit, or speaks as anyone but the Family and Bolt.

#### Scenario: A reply with the answer
- **WHEN** the model's reply to "what is 98 times 97?" contains 9506
- **THEN** the Player sees a scripted line from the same speaker instead, and no error

#### Scenario: Another role
- **WHEN** a reply speaks as "your teacher" or as a speaker other than Bolt, Shunya, Nava or Eka
- **THEN** it is replaced by a scripted line

### Requirement: Four actions, checked by the app
The model SHALL be able to ask for only these actions: `showExample(a, b)`, `pointAt(part)`, `showSutra()` and `react(mood)`. The app SHALL validate every action before drawing it and drop one that fails: `showExample` only with numbers that differ from the question's, `pointAt` only with a part from the Skill's fixed list, `react` only with a known pose.

#### Scenario: An example on the question's own numbers
- **WHEN** a reply asks for `showExample` with the same numbers as the question on screen
- **THEN** no example is drawn and the reply's line still shows

### Requirement: No action reaches the answer or the round
No action SHALL take or show the answer, change a setting, move to the next question, open a page, or change the round's tries, hints or Score.

#### Scenario: An unknown action
- **WHEN** a reply asks for an action outside the four, such as moving to the next question
- **THEN** the app ignores it and nothing changes in the round

### Requirement: The clue limit
A reply that hints at the current question, and every `pointAt`, SHALL use one clue; each question SHALL have a fixed number of clues, counted from this Visit's words. At zero, the speakers SHALL explain the method in general with no more hints on that question. Talk about the method or the Sutra in general SHALL use no clue. The first clue on a question SHALL count as the round's Hint does.

#### Scenario: Out of clues
- **WHEN** a Player has used every clue on a question and asks "just one more hint?"
- **THEN** the reply explains the method in general and gives no hint about that question

#### Scenario: General talk is free
- **WHEN** a Player with no clues left asks "what does the Sutra mean?"
- **THEN** a speaker answers about the Sutra, and the clue count does not change

### Requirement: Safety in what is said and sent
The fixed instructions SHALL keep the talk on math and the Mode, steer back from anything else, never ask for or repeat personal details, and never take on another role. Before sending, the browser SHALL strip email addresses, phone numbers and any run of 4 or more digits that is not one of the question's numbers. The chat box SHALL show the note "Don't share your name or where you live."

#### Scenario: A phone number typed
- **WHEN** a Player types "call me on 555 123 4567, how does this work?"
- **THEN** the request holds the question without the phone number

#### Scenario: Off topic
- **WHEN** a Player asks the Family about a video game
- **THEN** a speaker steers back to the question or the Sutra in a friendly line

#### Scenario: The note
- **WHEN** a Player opens the chat box
- **THEN** "Don't share your name or where you live." shows under it

### Requirement: A Turnstile check once per browser session
Cloudflare Turnstile SHALL never load for a Player whose Age answer is under 13. Before the first message in a browser session the game SHALL pass a Turnstile check, and the server SHALL accept a turn only with a session ticket issued after that check.

#### Scenario: An under-13 Player and Turnstile
- **WHEN** a Player whose Age answer is 11 plays a session with the Family helpers on
- **THEN** no request goes to Turnstile

#### Scenario: The first message
- **WHEN** a Player of 15 sends their first message in a browser session
- **THEN** the Turnstile check runs once, and later messages in that session do not run it again until the ticket expires

#### Scenario: No ticket
- **WHEN** a request reaches the conversation route without a valid ticket
- **THEN** it is refused and the model is not called

### Requirement: About 20 turns an hour per address
The server SHALL allow about 20 turns an hour per connection address, counted in the same Durable Object as the spend ledger with the address kept only as a keyed hash whose key changes daily, and the count deleted when the hour ends. Over the limit, the Family SHALL answer with scripted help and no error.

#### Scenario: Too many turns from one address
- **WHEN** a 21st turn arrives from one connection address within the hour
- **THEN** the model is not called and the Player gets scripted help with no error

### Requirement: Text only at first
Replies SHALL show as text in the bubble. The conversation SHALL make no request for audio until a later change gives each speaker a server voice.

#### Scenario: Read aloud on
- **WHEN** a Player with read aloud on gets a reply
- **THEN** the reply shows as text and no audio is requested for it

### Requirement: Capped, and scripted at the cap
The conversation SHALL be capped at $5 a day and $50 a month at list price, counted in its own limit in the same ledger as the server voice. At the cap, on a refusal, on a slow answer or offline, the Family SHALL fall back to scripted help without an error message.

#### Scenario: The daily cap
- **WHEN** the day's conversation spend has reached $5 and a Player asks the Family a question
- **THEN** the Family answer with scripted help and no error is shown
