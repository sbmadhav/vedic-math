# Spec Delta

## Purpose

Run online Duels on a small, strictly typed Cloudflare Worker with Durable Objects that keeps the game fair, resists abuse, keeps almost nothing and costs little.

## ADDED Requirements

### Requirement: One object per match, on the same site
Duels SHALL be served from `/api/duel/` on learnvedicmath.com by the site's one Worker, written in TypeScript with strict type checking. Each match SHALL be one Durable Object, built on the room engine that later live rooms share, holding both connections, the question seed and the referee; each League's waiting line SHALL be one Durable Object. Static files SHALL still be served without running the Worker.

#### Scenario: A static page
- **WHEN** a visitor opens `/parents/`
- **THEN** the response comes from static assets and no Worker code runs

### Requirement: One rule book for app and server
Question sets, Nickname lists, protocol messages, the referee rules and the markup allow-list SHALL each live in one shared TypeScript module used by both the app and the Worker, with no browser APIs. The strict type check SHALL cover the shared modules.

#### Scenario: A pool changes
- **WHEN** a skill is added to the Challenger Arena pool
- **THEN** Arena Practice and Challenger Duels both draw from it with no second copy to update

### Requirement: The answer is never sent early
The server SHALL NOT send a question's right answer, the seed or any later question before the current question is resolved.

#### Scenario: Inspecting a deal
- **WHEN** the messages a client receives during a question are inspected
- **THEN** none of them contains the right answer or the seed until the point or reveal message

### Requirement: Impossibly fast answers count as misses
An answer arriving sooner after the deal than a person could read and tap (350 ms, 500 ms in Explorer, after allowing for connection delay) SHALL count as a miss, and a Duel with three of them from one Player SHALL be marked suspect in the server's log and in any report about it.

#### Scenario: A bot answers in 80 ms
- **WHEN** a client answers right 80 ms after each question is dealt
- **THEN** each of those answers counts as a miss

### Requirement: Bot checks before a match is made
Making a Duel code, joining one and joining the Random Duel line SHALL each need a Turnstile token that the Worker verifies for this site and that action. Connecting to a match SHALL need a signed seat ticket that lasts 60 seconds and works once, carried in the WebSocket subprotocol header and never in a URL.

#### Scenario: No token
- **WHEN** a request to make a Duel code has no Turnstile token
- **THEN** it is refused and no room is made

#### Scenario: A reused ticket
- **WHEN** a client connects with a ticket that was already used
- **THEN** the connection is refused

### Requirement: Every match call carries an access proof
Every call that makes, joins or resumes a Duel, or joins the Random Duel line, SHALL carry one access proof: a Firebase ID token that the page already holds, which the Worker verifies, or a `room` session ticket that the Worker signed after a Turnstile check. A ticket of any other scope, a voice ticket included, SHALL be refused.

#### Scenario: A voice ticket at the Duel door
- **WHEN** a client asks to make a Duel code with a valid `voice` session ticket and a valid Turnstile token
- **THEN** the request is refused and no room is made

### Requirement: Access never creates or keeps an identity
The Worker SHALL NOT create any identity for a Duel, SHALL NOT keep an ID token, a session ticket or a uid, and SHALL NOT pass either to a match. A Duel SHALL NOT load Firebase to get a token.

#### Scenario: A Player with no Firebase identity
- **WHEN** a Player aged 9, who has never posted to a World board, starts a Friend Duel
- **THEN** the app gets a `room` session ticket after a Turnstile check, the Duel code is shown, no request goes to Firebase and no identity is created

#### Scenario: A Player who posted to a World board
- **WHEN** a Player aged 15 who posted to a World board earlier in this visit starts a Friend Duel
- **THEN** the Worker accepts the ID token the page already holds, and neither the token nor a uid appears in the room's storage or any log

### Requirement: Rate and size limits
The Worker SHALL limit, per hashed IP address, how often codes are made (10 a minute), joined (20 a minute) and the queue is entered (10 a minute), and per connection, frames to 10 a second and 256 bytes. A connection that sends five invalid frames in a Duel SHALL be closed and counted as having left.

#### Scenario: Guessing codes
- **WHEN** one IP address tries 30 codes in a minute
- **THEN** the tries after the twentieth are refused until the minute is over

### Requirement: A service-wide limit on failed joins
The Worker SHALL count failed joins (a code that is not live) across all addresses for one minute. While that count is above 100 a minute, every join SHALL need a fresh Turnstile token and the per-IP join limit SHALL be 5 a minute.

#### Scenario: Guessing codes from many addresses
- **WHEN** more than 100 joins in one minute, from any number of addresses, name codes that are not live
- **THEN** every join needs a fresh Turnstile token and each address may try at most 5 codes a minute until the count falls back

### Requirement: The IP address is never kept
The Worker SHALL use a Player's IP address only to deliver the connection and, as a salted hash, as a rate-limit key for at most a minute. It SHALL NOT write the IP address, its hash, a Duel code, a seat ticket, a session ticket, a Firebase ID token or a raw Duel key to any log or storage, and SHALL NOT write a Nickname or a hashed Duel key to any log.

#### Scenario: A day of logs
- **WHEN** a day of the Worker's logs is searched for IP addresses and Nicknames
- **THEN** none is found

### Requirement: Where Nicknames and Duel key hashes may be stored
A Nickname SHALL be stored only in a match's state and in a waiting-line entry. A hashed Duel key SHALL be stored only in waiting-line entries, Block pairs, automatic-limit records and reports. Each SHALL be kept no longer than "What is kept, and for how long" allows.

#### Scenario: Searching storage after a Random Duel
- **WHEN** a Random Duel ended 11 minutes ago and its storage, the waiting line, the Block pairs and the reports are searched
- **THEN** the Players' Nicknames are found nowhere, and their hashed Duel keys only in Block pairs, automatic-limit records or reports that the Duel led to

### Requirement: What is kept, and for how long
A match's state SHALL be deleted 10 minutes after it ends. Waiting-line entries SHALL exist only while a Player waits. Block pairs and automatic-limit records SHALL be deleted after 7 days and reports after 30 days, each by the server without anyone acting.

#### Scenario: Ten minutes after a Duel
- **WHEN** a Duel ended 11 minutes ago
- **THEN** its Durable Object holds no stored data

#### Scenario: An old report
- **WHEN** a report is 31 days old
- **THEN** it has been deleted

### Requirement: Versioned protocol
Every call and connection SHALL carry the protocol version, except the status call that says whether Duels are open, which takes none and answers with the server's current version. During a deploy the server SHALL accept the current and the previous version, and an older app SHALL be asked to reload instead of failing in play.

#### Scenario: An old tab after a deploy
- **WHEN** a tab running protocol version 1 calls a server that accepts only 2 and 3
- **THEN** the app says to reload to play online

### Requirement: An off switch that fails closed
A Worker setting SHALL turn Duels off, letting running Duels finish and refusing new ones. A second setting SHALL turn Random Duels off on their own, refusing queue joins while Friend Duels go on. Reaching a plan limit SHALL also refuse new Duels, never run up a charge on the Free plan, and show the same message in the app.

#### Scenario: Switched off
- **WHEN** the owner sets Duels off
- **THEN** new codes and queue joins are refused and the lobby says Duels are resting

#### Scenario: Random Duels switched off
- **WHEN** Duels are on and Random Duels are off
- **THEN** new codes work, queue joins are refused, and the status endpoint says Random Duels are closed

### Requirement: A Duel that cannot be saved ends
A running Duel whose state can no longer be saved SHALL end at once with no winner and no Rematch, close both connections and refuse any return, so it never continues from an older state.

#### Scenario: Saving fails in the middle of a Duel
- **WHEN** a running Duel's state cannot be written because a plan limit was reached
- **THEN** both Players are told the Duel ended with no winner, no Rematch is offered, and a Player who tries to come back is refused

### Requirement: Load tested before launch
Before launch, and before any change to the referee, the room or the protocol version, the service SHALL pass the load tests in `workers/test/load/` against a staging Worker, never production, and the results SHALL be recorded in the repo.

#### Scenario: Before a protocol change ships
- **WHEN** a pull request changes the protocol version
- **THEN** it includes an updated `workers/test/load/RESULTS.md` showing every run passed
