# Talking with the Family: 13 and over, server side, capped; listening stays on the device

Status: proposed 2026-10-21 in the `family-helpers` change (owner decisions of 2026-10-21, D14 and D15). Built in its step 3, after react-typescript phase 2; accepted when the owner gives the go (task 3.6). Builds on ADR 0006 (under 13 posts nothing), ADR 0008 (the Grade answer stays on the device) and ADR 0014 (the server voice and its `VoiceLedger`).

The Nikhilam Family helpers are scripted: fixed lines plus the Skill's own data, said in the page, nothing sent. Two later layers would change what the site sends, so they are decided here.

**Talking with the Family (an AI conversation).** Opt-in, and only for a Player whose saved answers say 13 or over: an Age answer of 13 or over, or, with no Age answer, a Grade answer of grade 9 or above or Grown-up; an Age answer under 13 always rules it out. Nothing for any other Player reaches the endpoint. Each turn the browser sends our Worker the Skill id, the numbers of the question on screen and the words the Player typed or said for that turn, with the transient access proof the server voice uses (ADR 0014: a Firebase ID token if the Player has one, else a short-lived anonymous ticket); never the Nickname, a Player id, the Age or Grade answer or earlier visits. The Worker adds the Family's system prompt (their voices, and "a hint, the method or an example on other numbers, never the answer") and sends the model provider only that prompt and the turn. Nothing is logged or kept. Spend is capped on the server at $5 a day and $50 a month at list price, in its own limit inside the same `VoiceLedger` Durable Object; at the cap, on a refusal, a slow answer or offline the Family fall back to scripted help without an error.

**Listening.** Pro gets push-to-talk; any Player may turn on a listening mode with a visible mic badge that stops when the tab is hidden or after 2 minutes of silence. Speech recognition must run on the device (the browser's on-device mode); where it cannot, the listening mode is not offered, because a browser's default recognition sends audio to the browser maker. It only looks for help phrases, and a match is a help signal and nothing else. No audio, transcript or "a phrase was heard" is ever stored or sent. Push-to-talk for a 13 and over Player who has turned on the conversation sends the words of that turn (not the audio) as above.

## Considered Options

- **Scripted help only, forever:** free, offline and safe, but it cannot answer "why do we add one?" in the Player's own words. It stays the core and the fallback.
- **AI for every Player:** a child's own words are personal information under COPPA once an operator collects them, and the site is directed to children; without verifiable parental consent (ADR 0006) under-13 Players get scripted help only.
- **Call the model from the browser:** the key would ship to every visitor.
- **A self-asserted age sent with each turn:** it proves nothing and sends an age-like field (rejected in ADR 0006 for the same reason); the gate is in the client, on the device's answers, like World boards.
- **Always-on listening, or cloud recognition:** a microphone open on a children's site, and audio leaving the device; rejected.
- **A separate ledger for the conversation:** two places to keep caps consistent; one Durable Object with two limits is simpler and already strongly consistent.

## Consequences

- The privacy policy, the parent note and `cloud/README.md` say what a conversation turn sends, to whom, for 13 and over only, before it is switched on; the lawyer review of ADR 0006 covers it.
- Worst-case spend is bounded on the server ($5 a day, $50 a month) on top of the server voice's own caps; the provider's budget alerts stay the outer stop.
- An off switch on the Worker turns the conversation off without a deploy of the game, and the Family go back to scripted help.
- Reversing "never for under 13" would need verifiable parental consent and a new privacy notice, so it is treated as hard to reverse.
