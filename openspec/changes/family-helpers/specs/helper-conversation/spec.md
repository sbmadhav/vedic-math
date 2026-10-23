# Spec Delta

Planned for step 3 (after react-typescript phase 2 and its Phase 8 ledger); not built in step 2. ADR 0015.

## ADDED Requirements

### Requirement: Talking with the Family is for 13 and over, opt-in
An AI conversation with the Family SHALL be offered only to a Player whose saved answers say 13 or over: an Age answer of 13 or over, or, with no Age answer, a Grade answer of grade 9 or above or Grown-up (grade 8 starts at 12 or 13, so it does not count). An Age answer under 13 SHALL always rule it out, whatever the Grade answer says. It SHALL be off until the Player turns it on. A Player it is not offered to SHALL have nothing reach the conversation endpoint.

#### Scenario: An under-13 Player
- **WHEN** a Player whose Age answer is 11 opens Me with the Family helpers on
- **THEN** there is no option to talk with the Family, and no request is made to the conversation endpoint during their session

#### Scenario: A Pro Player of 15
- **WHEN** a Player whose Age answer is 15 turns on talking with the Family and types "why do we add 1?"
- **THEN** a friend answers in the bubble about the method, without the answer to the question on screen

### Requirement: What the conversation sends
A conversation turn SHALL send only the Skill id, the question's own numbers and the words the Player typed or said for that turn, with a transient access proof as the server voice uses. It SHALL NOT send the Nickname, a Player id, the Age or Grade answer, or earlier turns beyond the current visit, and the server SHALL keep nothing after answering. The reply SHALL follow the scripted rules: a hint, the method or an example on different numbers, never the answer.

#### Scenario: A turn's request
- **WHEN** a Player sends one message to the Family
- **THEN** the request body holds the Skill id, numbers and that message only

### Requirement: Capped, and scripted at the cap
The conversation SHALL be capped at $5 a day and $50 a month at list price, counted in its own limit in the same ledger as the server voice. At the cap, on a refusal, on a slow answer or offline, the Family SHALL fall back to scripted help without an error message.

#### Scenario: The daily cap
- **WHEN** the day's conversation spend has reached $5 and a Player asks the Family a question
- **THEN** the Family answer with scripted help and no error is shown
