# Spec Delta

## Purpose

Run online Duels on a small, strictly typed Cloudflare Worker with Durable Objects that keeps the game fair, resists abuse, keeps almost nothing and costs little.

## ADDED Requirements

### Requirement: One object per match, on the same site
Duels SHALL be served from `/api/duel/` on learnvedicmath.com by the site's Worker, written in TypeScript with strict type checking. Each match SHALL be one Durable Object holding both connections, the question seed and the referee; each League's waiting line SHALL be one Durable Object. Static pages SHALL still be served without running the Worker.

#### Scenario: A static page
- **WHEN** a visitor opens `/parents/`
- **THEN** the response comes from static assets and no Worker code runs

### Requirement: One rule book for app and server
Question sets, Nickname lists, protocol messages and the referee rules SHALL each live in one shared module used by both the app and the Worker. The Worker's type check SHALL cover the shared modules.

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
Making a Duel code, joining one and joining the Random Duel line SHALL each need a Turnstile token that the Worker verifies for this site and that action. Connecting to a match SHALL need a signed ticket that lasts 60 seconds and works once, carried in the WebSocket subprotocol header and never in a URL.

#### Scenario: No token
- **WHEN** a request to make a Duel code has no Turnstile token
- **THEN** it is refused and no room is made

#### Scenario: A reused ticket
- **WHEN** a client connects with a ticket that was already used
- **THEN** the connection is refused

### Requirement: Rate and size limits
The Worker SHALL limit, per hashed IP address, how often codes are made (10 a minute), joined (20 a minute) and the queue is entered (10 a minute), and per connection, frames to 10 a second and 256 bytes. A connection that sends five invalid frames in a Duel SHALL be closed and counted as having left.

#### Scenario: Guessing codes
- **WHEN** one IP address tries 30 codes in a minute
- **THEN** the tries after the twentieth are refused until the minute is over

### Requirement: The IP address is never kept
The Worker SHALL use a Player's IP address only to deliver the connection and, as a salted hash, as a rate-limit key for at most a minute. It SHALL NOT write the IP address, its hash, a Duel code, a ticket or a raw Duel key to any log or storage, and SHALL NOT write a Nickname or a hashed Duel key to any log.

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
A Worker setting SHALL turn Duels off, letting running Duels finish and refusing new ones. Reaching a plan limit SHALL also refuse new Duels, never run up a charge on the Free plan, and show the same message in the app.

#### Scenario: Switched off
- **WHEN** the owner sets Duels off
- **THEN** new codes and queue joins are refused and the lobby says Duels are resting

### Requirement: Load tested before launch
Before launch, and before any change to the referee, the room or the protocol version, the service SHALL pass the load tests in `worker/test/load/` against a staging Worker, never production, and the results SHALL be recorded in the repo.

#### Scenario: Before a protocol change ships
- **WHEN** a pull request changes the protocol version
- **THEN** it includes an updated `worker/test/load/RESULTS.md` showing every run passed
