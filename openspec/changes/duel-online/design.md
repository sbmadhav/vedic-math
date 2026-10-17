# Design

## Context

- After the move, learnvedicmath.com is served by one Cloudflare Worker with static assets (`wrangler.jsonc`, `run_worker_first: ["/_csp"]`). Its script handles only `/_csp`; every other path is a free static asset request. The zone has one free rate-limiting rule (on `/_csp` and `/import/`).
- Boards use Firebase (a new project for the new site). Under-13 Players use Device boards only (ADR 0006); no identity exists until a first post (ADR 0002). The Age answer stays on the device.
- After PR #47 the same-screen Duel is gone: `js/arena.js` no longer has `runDuel`, `#/duel` redirects to Party Mode, the Sky Landmark is "Party", and the Duelist badge became Party host (id `duel`, counter `duelsDone`).
- Question generation lives in `js/arena.js`: `makeSet(league, seedText, n)` draws from the League's skill pools (Explorer, Challenger) or the mental arithmetic families (Pro) under a seeded `Math.random` (`mulberry32`). It imports `fx.js`, `life.js` and `shell.js` (DOM), and `adapt.js`, which imports `store.js` (localStorage). The generators themselves (`js/skills/*.js`, `js/mental.js`, `js/lib.js`, `js/viz.js`) are DOM-free. Question text and pictures are HTML strings.
- Nicknames come from fixed word lists in `js/store.js` (16 adjectives, 16 nouns, a number from 10 to 99), mirrored in `cloud/firestore.rules`.

## Goals

- Two Players on two devices race the same question; a server decides fairly and cannot be fooled by a modified client into giving points.
- Every Player can duel a friend with no account and nothing kept; teens can also duel someone new.
- No way for one Player to send another any words or personal information.
- Free at launch traffic, and a few dollars a month at real traffic.
- One shared module for questions and protocol, so the app and the server can never disagree.

## Non-goals

- Chat, friend lists, accounts, Duel Ratings or Boards, more than two Players, spectators.
- Any change to Firebase, Boards, the Arena or Party Mode rules.

## Decisions

### D1. Architecture

```text
Browser (/play/)                                    Cloudflare (learnvedicmath.com, one Worker)
  js/views/duel.js  ── POST /api/duel/rooms ────────▶ src/index.ts ── Turnstile siteverify ─▶ challenges.cloudflare.com
  js/duel/client.js ── POST /api/duel/rooms/:c/join ─▶      │   rate limit (hashed IP), ticket (HMAC, 60 s)
                    ── POST /api/duel/queue ─────────▶      │
                    ══ WebSocket /api/duel/ws ═══════▶      ├─▶ DuelRoom  (Durable Object, one per match, SQLite)
                         (ticket in Sec-WebSocket-Protocol)  │     seats, seed, questions, referee, timers
                                                             ├─▶ DuelQueue (one per League, 13+ only, SQLite)
                                                             │     waiting sockets (hibernating), Block pairs (7 days)
                                                             └─▶ DuelSafety (one, SQLite) reports (30 days)
  shared: js/questions.js, js/names.js, js/duel/protocol.js, js/duel/rules.js  (bundled into the Worker by wrangler)
```

- Same origin, so no CORS, the CSP's `connect-src 'self'` covers the WebSocket (CSP Level 3 matches `wss:` for `'self'`; to verify on Safari, task 9.3, else add `wss://learnvedicmath.com`), and no cookies are involved anywhere.
- `run_worker_first` becomes `["/_csp", "/api/*"]`. Static assets stay free; only Duel API calls run the script.
- Every Durable Object class uses the SQLite storage backend (the only one on the Free plan).

### D2. Shared modules (one source for app and server)

| Module | What | Used by |
|---|---|---|
| `js/questions.js` | `mulberry32`, `withSeed`, `makeSet(league, seed, n, { ramp })`, `item()`, `poolItem()`, the League pools, `levelFor()` (moved from `adapt.js` so nothing here touches storage). `js/arena.js` re-exports what it used to define. | Arena, Practice, `DuelRoom` |
| `js/names.js` | `ADJ`, `NOUN`, `AVATARS`, `makeName()`, `isNickname(s)`, `isAvatar(s)`. `js/store.js` imports it; a test checks `cloud/firestore.rules` lists the same words. | store, `DuelRoom`, `DuelQueue` |
| `js/duel/protocol.js` | Protocol version, message types, `parseClient(raw)` and `parseServer(raw)` (size cap, JSON in try, exact keys, types, ranges), constants (goal, time limits, Reactions, report reasons, close codes). | client, Worker |
| `js/duel/rules.js` | The pure referee: `start(league, seed)`, `step(state, event, now) -> { state, out }` for every event (seat joined, ready, answer, timeout, disconnect, resume, rematch, leave). No I/O and no clock of its own, so it is tested exhaustively in node. | `DuelRoom`, node tests |

- All four are plain ES modules with `// @ts-check` and JSDoc types, so the browser runs them as they are and the Worker's `tsc --noEmit` type-checks them (`allowJs`, `checkJs`). `build.py` already publishes and stamps them like any module.
- The Worker imports them by relative path (`../../js/duel/rules.js`); wrangler's bundler packs them into the Worker.
- `withSeed` swaps `Math.random` only for the length of one synchronous `makeSet` call. A Durable Object runs one event at a time and `makeSet` never awaits, so no other code can observe the swap. A later refactor may pass the random function explicitly; it is not needed for correctness.
- The seed is `duel:<32 random hex>`, made by the room with `crypto.getRandomValues` and never sent to a client.

### D3. HTTP endpoints

All bodies are JSON, at most 1 KB; every response is `Cache-Control: no-store`; unknown fields are rejected.

| Method and path | Body | Answer |
|---|---|---|
| `POST /api/duel/rooms` | `{ v, league, name, avatar, turnstile }` | `201 { code, ticket, expiresIn }`. Makes a Friend Duel room with a fresh code. |
| `POST /api/duel/rooms/:code/join` | `{ v, name, avatar, turnstile }` | `200 { ticket, league, host: { name, avatar } }`, or `404 no-room`, `409 full`, `410 expired`. |
| `POST /api/duel/rooms/:code/resume` | `{ v, seat, resume }` | `200 { ticket }` or `410 gone`. No Turnstile (rate limited instead). |
| `POST /api/duel/queue` | `{ v, league, name, avatar, teen: true, key, turnstile }` | `200 { ticket }` for the League's queue. `key` is the hash of the Duel key (D13). |
| `GET /api/duel/ws` with `Upgrade: websocket` | ticket in `Sec-WebSocket-Protocol: vm-duel.1, t.<ticket>` | `101`, echoing only `vm-duel.1`. Routed to the room or queue named in the ticket. |
| `GET /api/duel/status` | | `200 { open: true, v: 1 }` or `503 { open: false }` (the off switch, D18). |

- The ticket travels in the WebSocket subprotocol header instead of the URL, so it never sits in a URL that a log or a browser history could keep.
- A **ticket** is `base64url(payload).base64url(HMAC-SHA256(payload, DUEL_TICKET_KEY))`, payload `{ k: 'room' | 'queue', id, seat, exp, n }`: 60 seconds of life, single use (the object records `n` until `exp`).

### D4. Protocol (version 1)

JSON text frames. Every message has `t` (type). Client frames are at most 256 bytes; anything else closes the socket (D11).

**Client to server**

| `t` | Fields | When |
|---|---|---|
| `ready` | | The Player has seen the opponent and pressed Start (or the rematch). |
| `answer` | `q` (question number), `c` (choice index 0 to 3) | One per question; a second one is ignored. |
| `react` | `r` (one of the six Reaction ids) | Rate limited (D11). |
| `pong` | `n` | Reply to `ping` (round-trip time for the referee). |
| `rematch` | | On the end screen, within 30 s. |
| `leave` | | The Player quits. |
| `report` | `reason` (`too-fast`, `mean-reactions`, `stranger`, `other`) | Ends the match for the reporter and blocks (D13). |
| `block` | | Ends the match for the blocker and blocks without a report. |

**Server to client**

| `t` | Fields | Meaning |
|---|---|---|
| `welcome` | `v`, `seat`, `resume`, `league`, `goal`, `you`, `opp?`, `code?` | Seated. `resume` is a 128-bit secret for coming back (D7). |
| `opp` | `state` (`joined`, `away`, `back`, `left`), `name?`, `avatar?`, `graceMs?` | The other Player's presence. |
| `ping` | `n` | Round-trip probe (three at the start, then every tenth question). |
| `count` | `ms` | Countdown before the first question (3000). |
| `deal` | `q`, `text`, `say?`, `viz?`, `choices` (4 strings), `ms` (time allowed) | A question. Never carries the answer. |
| `miss` | `q`, `seat` | That seat answered wrong (or too fast) and is out of this question. |
| `point` | `q`, `seat`, `answer` (choice index), `scores` | The seat answered right first. |
| `reveal` | `q`, `answer`, `scores`, `why` (`both-missed`, `timeout`) | Nobody scored. |
| `react` | `seat`, `r` | A Reaction (not echoed to a Player who muted Reactions; muting is local, D12). |
| `paused` / `resumed` | `ms` | A seat dropped; the question clock is frozen / runs again with `ms` left. |
| `sync` | the full visible state | After a resume. |
| `end` | `winner` (seat or null), `scores`, `why` (`goal`, `left`, `limit`, `idle`, `report`, `server`) | The match is over. |
| `error` | `code` (`upgrade`, `bad-ticket`, `full`, `expired`, `rate`, `invalid`, `closed`), `retry?` | Followed by a close unless `retry`. |

- `deal.text` and `deal.viz` are the generators' HTML. The client renders them only through `js/duel/safe-html.js`: a parser-based allow-list (`b`, `i`, `sup`, `sub`, `span`, `br`, and the SVG elements `svg`, `g`, `circle`, `rect`, `line`, `path`, `text`, `tspan` with only `class`, geometry and `viewBox` attributes; classes must start with `vz-`, `sc-` or `hl`). Anything else is dropped. The CSP blocks inline script anyway; this keeps a compromised server from drawing UI that looks like ours.
- WebSocket close codes: 1000 normal end, 1001 server going away (deploy; clients resume), 1008 policy (rate or invalid), 4001 bad ticket, 4002 room full, 4003 expired, 4009 upgrade needed.
- **Version.** `v` is checked on every HTTP call except `GET /api/duel/status`, and in the ticket. The status call takes no version: it only tells the app whether Duels are open, and its answer carries the server's current `v` so the app can ask for a reload before trying to play. During a deploy the Worker accepts `v` and `v - 1`; an older client gets `error upgrade` and the app says "Reload to play online".

### D5. Match states and timeouts

```text
LOBBY ──second seat──▶ SEATED ──both ready──▶ COUNTDOWN (3 s) ──▶ QUESTION ──right──▶ RESOLVING (100 to 250 ms) ──▶ (point) ──▶ QUESTION ... ──goal──▶ ENDED
  │ 10 min, no friend   │ 30 s, not ready          ▲                 │ both missed / time up ──▶ REVEAL (1.2 s) ──▶ QUESTION
  ▼                     ▼                          │                 │ a seat drops
 CLOSED               ENDED (idle)              PAUSED (≤20 s each, ≤45 s per seat in all) ──not back──▶ ENDED (left)
ENDED ──both rematch within 30 s──▶ SEATED (new seed) ; else CLOSED ──10 min──▶ storage deleted
```

| Timer | Value | On expiry |
|---|---|---|
| Duel code (room in LOBBY) | 10 minutes from creation | Room closes; the code is free again; joiners get `410 expired`. |
| Ticket | 60 s | WebSocket refused (4003). |
| Ready | 30 s after both are seated | `end idle`, no winner. |
| Countdown | 3 s | First `deal`. |
| Question | Explorer 20 s, Challenger 15 s, Pro 12 s | `reveal timeout`. |
| Resolution window | From the first right answer until no answer from the other seat could still have an earlier effective time: at least 100 ms, at most 250 ms (D6) | `point` to the earliest effective time (D6). |
| Reveal | 1.2 s | Next `deal`. |
| Disconnect grace | 20 s each time, 45 s per seat per match | `end left`, the other seat wins. |
| Idle | 3 questions in a row that nobody answers | `end idle`, no winner. |
| Match limit | 40 questions or 10 minutes of play | `end limit`: higher score wins, equal is a draw. |
| Rematch | 30 s on the end screen | Room closes. |
| Cleanup | 10 minutes after CLOSED | Alarm deletes all of the room's storage. |
| Queue wait | 60 s | Server sends `error expired retry`; the app offers "Try again" or "Duel a friend". |

While a match runs, the room keeps its timers with `setTimeout` (it is busy anyway). Before the first seat arrives, between matches and for cleanup, it uses one Durable Object alarm, so an idle room hibernates. The room writes its state to its SQLite storage after every `step`, so a restarted object (deploy, eviction) continues the match.

### D6. The referee (first right answer)

- Both seats get the same `deal` in the same event, so they are sent together. Each seat's send time `ts[seat]` is recorded.
- Latency per seat, `L[seat]`: half the median of the last five ping round trips, capped at 150 ms.
- An answer's **effective time** is `received - ts[seat] - L[seat]`.
- Wrong choice: `miss` for that seat; it is out of this question (the old Duel's freeze). Both out: `reveal both-missed`.
- **Too fast:** an effective time under 350 ms (500 ms in Explorer) counts as a miss, and the seat's too-fast count rises. Nobody reads and taps that fast; a bot does.
- Right choice: the room opens a resolution window. With the first right answer's effective time `e`, an answer from the other seat could still beat it until `ts[other] + L[other] + e`; the window stays open until then, and for at least 100 ms. Because `L` is capped at 150 ms and both deals are sent in the same event, that is never more than 250 ms. Any right answer from the other seat arriving within it competes; the smaller effective time wins, and an exact tie goes to the earlier arrival. Then `point`. The cap on `L` limits how much a Player can gain by faking a slow connection to 150 ms, while keeping play fair between a phone on 4G and a laptop on Wi-Fi.
- First to 10 points wins (`end goal`). Every right answer is 1 point; there are no combos (the Duel is about the race, as before).
- The question set: `makeSet(league, seed, 60)` with Explorer at generator level 1, Challenger at 2 and Pro on a ramp from 6 to 14 over the first 20 questions, the same pools as Arena Practice. A rematch gets a new seed.

### D7. Leaving and coming back

- The client keeps `resume` (and the code or room id and seat) in `sessionStorage` (`vm.duel.session`, per tab, so it survives a reload of that tab and nothing else), and deletes it at `end`.
- On an unexpected close, the client retries `POST .../resume` then the WebSocket after 0.5, 1, 2, 4 and 8 s (with jitter), within the 20 s grace. The view shows "Connection lost. Getting you back..." and, to the other Player, "Waiting for Swift Tiger 12 (18 s)". The question clock is frozen for both.
- Back in time: `sync` (scores, the current question if still live with its remaining time, whose turn is out), then `resumed`.
- A close with 1001 (server going away, a deploy) does not use up the seat's 45 s.
- A hidden tab on a phone often loses its socket; that is a drop like any other. The client also sends nothing while hidden and pings on `visibilitychange` when it returns.
- Offline (`navigator.onLine` false) the Duel lobby says "Online Duels need a connection" and links Party Mode.

### D8. Friend Duels without accounts (every Player, including under 13)

1. The host taps "Duel a friend" (League = the host's Mode). Turnstile runs (D12). The app gets a code and shows it big ("B K T R M Z"), with Copy, Share (Web Share API where available) and the link `https://learnvedicmath.com/play/#/arena/duel/BKTRMZ`. The code is in the fragment, so it never reaches a server log or a `Referer`.
2. The friend opens the link (the code is filled in) or taps "I have a code" and types it. The join screen shows the host's Nickname and color and the League ("This Duel is at Challenger level"), and asks "Duel Swift Tiger 12?" before joining. A Player who does not know that Nickname is told, in their Mode's words, to go back.
3. Codes use 20 consonants (`B C D F G H J K L M N P Q R S T V W X Z`): 64 million codes, no vowels so no real words, no 0/O or 1/I confusion. A code is live for 10 minutes or until a friend joins; the room refuses a third seat.
4. Nothing about either Player is kept more than 10 minutes after the match: the room's storage (Nicknames, colors, question log) is deleted by then (D5, D14). There is no friend list: next time, a new code.
5. Under-13 Players use exactly this flow. The server never knows anyone's age; the app decides who may use Random Duels.

### D9. Random Duels (13 and over, same League)

- Shown only when the active Player's Age answer is 13 or over (`canMatch(p)`: `'needs-age'`, `'friends-only'` or `'ok'`, next to `cloud.canPost`). The server cannot check the age (it never leaves the device, posting-consent); it only receives `teen: true`, which it requires and does not store. ADR 0006's reason for not sending a self-declared age to Firestore does not apply: nothing is stored or published here, and the boolean only opens a waiting line.
- `DuelQueue` is one object per League (`idFromName('queue:challenger')`). Waiting Players are hibernating WebSockets with an attachment `{ name, avatar, key, since }`. A new arrival is paired with the longest-waiting Player who has not blocked it and whom it has not blocked; the queue makes a room id (`r-<random>`), sends each a `matched` message with a room ticket and closes their queue sockets.
- One waiting socket per key; a second from the same key replaces the first.
- No match in 60 s: the app offers Try again or Duel a friend.
- The League is the only matching rule (owner M1). Matching by Rating or region is out of scope.

### D10. Anti-cheat

- **The server is the referee.** The answer is never in a `deal`; points, misses, the winner and every timer are decided in `DuelRoom` by `rules.js`. A modified client can only send choice indices.
- **The seed never leaves the server**, so a client cannot compute the next questions.
- **Too-fast answers** count as misses (D6). Three or more in a match mark it as suspect in the room's log line and in any report about it.
- **One answer per seat per question**; later ones are ignored and counted as strikes.
- **Turnstile** before every code, join and queue entry slows bots that would farm matches.
- **Nothing to win:** Duels post nothing to Boards and Sparks stay on the device with a daily cap, so there is no score worth cheating for beyond the race itself.
- Bots that solve arithmetic instantly but wait 400 ms are possible; against those, Report, Block and the queue's automatic limits (D13) are the answer, not detection.

### D11. Rate limits and message rules

| Where | Limit | Over the limit |
|---|---|---|
| `POST /rooms` per hashed IP | 10 a minute | `429` |
| `POST /rooms/:code/join` per hashed IP | 20 a minute (a 64-million code space makes guessing hopeless at this rate) | `429` |
| `POST /rooms/:code/resume` per hashed IP | 30 a minute | `429` |
| `POST /queue` per hashed IP | 10 a minute | `429` |
| WebSocket frames per seat | 10 a second, burst 20 | close 1008 |
| Frame size | 256 bytes in, server frames at most 4 KB | close 1008 |
| Invalid frames (bad JSON, unknown type, wrong field) | 5 strikes per match | close 1008; the seat counts as left |
| Reactions per seat | 1 every 3 s, 12 a match | dropped silently |
| Rooms per hashed IP at once | 15 in LOBBY (a classroom behind one school IP) | `429` |
| Zone rule (the free Cloudflare rate-limiting rule, extended) | `/api/duel/*` 120 requests a minute per IP | Cloudflare blocks for 10 s |

- The IP is read from `CF-Connecting-IP` inside the Worker and turned into `HMAC-SHA256(ip, IP_SALT)`, truncated to 16 bytes, before it is used as a rate-limit key. `IP_SALT` is a Worker secret rotated every month. The raw IP is never written, logged or passed to a Durable Object.
- Per-IP limits use the Workers Rate Limiting binding (`ratelimits` in `wrangler.jsonc`; to verify it is on the Free plan, task 3.5; if not, the counters live in a small `DuelLimits` Durable Object keyed by the hash, with 60 s windows).
- Shared Wi-Fi in a school: a class shares one IP address. 10 new rooms a minute and 15 waiting at once let half a class make codes within two minutes; if schools hit this, a classroom room (out of scope here) is the fix, not a higher limit.

### D12. Turnstile, not App Check

- Turnstile (Cloudflare, free, unlimited) guards the three calls that make or enter a match. It is the same vendor as the host, so no new company receives data, and no Google request is made (the move's "Nothing to Google or YouTube on load" holds; App Check would load reCAPTCHA).
- The widget script (`https://challenges.cloudflare.com/turnstile/v0/api.js`) loads only when the Player taps Duel a friend, I have a code or Find a player, in "managed" mode with `appearance: interaction-only`, so most Players see nothing and a few see one checkbox. The token is sent in the body and verified by the Worker with `siteverify` (secret `TURNSTILE_SECRET`), checking `success`, `hostname` and `action` (`duel-create`, `duel-join`, `duel-queue`).
- Tests and staging use Cloudflare's published test keys (always pass, always fail), never the production key.
- Turnstile is a third party in the privacy notice (what it collects is Cloudflare's to state; lawyer question in D14).

### D13. Safety: Reactions, Nicknames, Report, Block, abuse handling

- **No chat, no text.** The protocol has no field that carries free text, and the server rejects any frame with unknown fields. Nicknames are checked with `isNickname()` and avatar colors with `isAvatar()` on every call.
- **Reactions:** six, fixed: `nice` ("Nice one!"), `gg` ("Good game"), `wow` ("Wow!"), `oops` ("Oops!"), `again` ("Rematch?"), `thanks` ("Thanks!"), shown as a small bubble by the sender's name and announced politely to screen readers. Explorer sees icons with the words read aloud on tap. A mute button on the match screen hides incoming Reactions for that match; "Show Reactions" on the Me page turns them off for every Duel on the device.
- **Report** (on the match and end screens, two taps): reasons "Answers too fast to be real", "Mean Reactions", "I don't know this player" (Friend Duels) and "Something else" (no text box). Reporting ends the match for the reporter, blocks, and sends `report` to the room, which writes one record to `DuelSafety`:
  `{ id, at, league, kind: 'friend' | 'random', reason, reportedKey?, summary: { questions, tooFast: [a, b], reactions: [a, b], medianMs: [a, b], why } }`. No Nickname, no IP, no code, no text. Kept 30 days, then deleted by an alarm.
- **Block:** in a Random Duel, the room asks the League's `DuelQueue` to store the pair `(blockerKey, blockedKey)` for 7 days, both ways, so they are never paired again that week. In a Friend Duel, Block ends the match and closes the room (the code dies); there is nothing to remember because there is no friend list.
- **Duel key (13+ only):** at a Player's first Random Duel the app makes a random 128-bit key, saved on the device as `vm.duelKey.<player id>` with its ISO week, and makes a new one each week. Only `SHA-256(key)` is sent. It lets Block and the automatic limits work across matches for up to a week, and then it is gone. Under-13 Players never get one.
- **Automatic limits (Random Duels):** a key reported by 3 different keys within 24 hours cannot join the queue until it changes (at most a week), and gets `error closed` with copy that does not say why. A key with too-fast answers in 3 matches in a day is treated the same. Clearing storage gets a new key; Turnstile and the IP limits make that slow.
- **Review:** the owner reviews a weekly digest (`npm run reports` in `worker/`, reading `DuelSafety` through an admin endpoint behind Cloudflare Access, which is free for one user). Counts by reason and League, and any key over a limit. No action needs anyone's identity, and there is none to look up.
- **Nicknames on the screen:** a Player's own generated Nickname and color, as on Boards. Teens who post to World boards could be recognised from a Board, which holds only the same Nickname and color; nothing else can be learned.

### D14. Privacy and COPPA analysis

Not legal advice; the owner's lawyer reviews it with the move's privacy policy before this change launches (task 0.4).

**What is sent, and why**

| Data | Sent when | Purpose | Kept |
|---|---|---|---|
| Nickname, avatar color | Make, join, queue | Show the opponent who they are racing | In the room's storage until 10 minutes after the match; in the queue only while waiting |
| League | Make, queue | Pick questions and the waiting line | As above |
| Choice indices, Reactions, ready, rematch, leave | During the match | Play | Question log in the room's storage until 10 minutes after the match |
| `teen: true` | Queue | Open the 13+ waiting line | Not stored |
| `SHA-256(Duel key)` (13+ only) | Queue | Block and limits for up to a week | In the queue only while waiting; Block pairs and automatic-limit records 7 days; in a report 30 days |
| Report reason and match summary | Report | Abuse handling | 30 days |
| Turnstile token | Make, join, queue | Bot check | Not stored (verified once) |
| IP address | Every request (the network needs it) | Delivering the connection; rate limits | Never stored or logged by us; only a salted hash is used as a counter key for up to a minute |

**Never sent:** the Player id, the Age answer (only the 13+ boolean, for the queue), Ratings, Sparks, progress, the Firebase identity, the device's other Players, anything typed, the Duel code in any URL a server sees.

**Logs.** Workers Logs: invocation logs off for this Worker (`observability.logs.invocation_logs: false`, to verify the setting, task 3.6); the code logs one structured line per match end (`league`, `kind`, `why`, `questions`, `durationS`, `suspect`, `protocol`) and per error code, with no Nickname, code, key, ticket or IP. Cloudflare's own edge and security logs exist under its terms as our processor (named in the privacy policy).

**COPPA view.**
- Friend Duels for under-13 Players collect no personal information as the Rule defines it, except the IP address, which the connection itself needs. It is used only to deliver the real-time feature the child asked for and to protect it (rate limits), never to contact, profile or advertise, and is not kept: the "support for internal operations" exception (§312.5(c)(7)), which the privacy notice must now describe (§312.4(d)(3)). Generated Nicknames are not chosen by the child and contain nothing about them.
- No feature lets a child make personal information public or send it to another user: there is no text field anywhere in the Duel.
- No persistent identifier is created for under-13 Players: no Duel key, no Firebase identity; the resume secret lives in one tab for one match.
- Turnstile is a third party that processes device signals for security, also internal operations, and is disclosed.
- Teens (13 to 17): the weekly Duel key is a short-lived pseudonymous identifier for safety; state minors' laws (for example New York's Child Data Protection Act) and the UK Children's Code favour exactly this: high-privacy defaults, no profiling, data minimisation. A short DPIA (`docs/legal/duel-dpia.md`) records it.
- Lawyer questions: (1) the internal-operations basis for under-13 Friend Duels; (2) Turnstile as a third party for children; (3) the notice and retention text; (4) whether the 13+ boolean from a neutral Age answer is a fair gate for Random Duels.

### D15. How it fits with Boards, the Arena, Party Mode, Sparks and badges

- **Boards and Firebase:** untouched. A Duel never loads Firebase, never posts, never creates an anonymous identity (ADR 0002 holds). The Duel server and Firebase share nothing; the Firebase UID is never sent to the Worker.
- **Arena:** the daily round, Practice, Ratings and Boards are unchanged. Duels use the Arena Practice pools through `js/questions.js`, so the Arena's own code path is refactored, not changed: a node test checks `dailySet()` returns the same items before and after the move to `questions.js` for a fixed list of dates and Leagues.
- **Party Mode** stays the same-screen game at `#/arena/party`. `#/duel` and `#/arena/duel` open the Online Duel lobby, which links Party Mode ("Same screen? Play Party Mode"). The Sky Landmark returns to "Duel" and opens the lobby; the Arena shelf keeps the Party Mode card.
- **Sparks:** a finished Duel pays 10 Sparks, a win 10 more, at most 100 a day from Duels per Player, none for a match that ended idle or where the Player answered fewer than 5 questions. They stay on the device and count toward the weekly Sparks total like any Practice.
- **Badges:** Party host stays as PR #47 left it. No new badge in this change.
- **Analytics:** fixed-word events only (spec delta), counted on the device's analytics as today; nothing from the server.

### D16. The app side

- Routes: `#/arena/duel` (lobby), `#/arena/duel/<code>` (join with the code filled in; the route view counts only `duel`), `#/duel` (redirects to the lobby). They are matched before PR #47's experience route pattern.
- `js/views/duel.js`: lobby (Duel a friend, I have a code, Find a player for 13+, Party Mode link, the Calm note), waiting room (code, Copy, Share, cancel), join confirmation, match screen, end screen (result, Rematch, Report, Block, Back).
- Match screen: the Player's own side full size (question, picture, four big choices, keys 1 to 4), an opponent strip on top (Nickname, color, points, "answered", "out", "away"), the question clock as a bar and a number, Reactions tray, mute, Report.
- `js/duel/client.js`: one WebSocket per match, every listener and timer through `js/life.js` on the round's `child(signal)`; leaving the route sends `leave` and closes. Reconnect as in D7.
- Read aloud: Explorer's question is spoken on its own device as soon as it is dealt (same `speakQuestion` as the Arena).
- Accessibility: answers, points, misses and Reactions are announced politely (`role="status"`), focus stays on the choices, nothing is shown by color alone. The question clock is a real-time race, which WCAG 2.2.1 exempts; the lobby says the Duel is timed, and Calm Players are pointed to Party Mode or Practice.
- Copy for every Mode via `fx.t()`, no em dashes.

### D17. The TypeScript Worker (ADR 0010)

```text
worker/
  package.json        wrangler, typescript, vitest, @cloudflare/vitest-pool-workers, @cloudflare/workers-types (pinned)
  tsconfig.json       strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, allowJs + checkJs for ../js/duel, ../js/questions.js, ../js/names.js
  src/index.ts        fetch: /_csp -> csp.ts, /api/duel/* -> duel/http.ts, else env.ASSETS.fetch
  src/csp.ts          the move's CSP report endpoint, ported from worker/csp.js
  src/duel/http.ts    endpoints, Turnstile, tickets, rate limits
  src/duel/room.ts    DuelRoom (Durable Object): sockets, timers, storage, calls rules.js
  src/duel/queue.ts   DuelQueue
  src/duel/safety.ts  DuelSafety (+ the Access-protected admin read)
  src/duel/ticket.ts, turnstile.ts, limits.ts, log.ts
  test/*.test.ts      workerd tests: endpoints, tickets, rooms end to end with two sockets, alarms, limits
  test/load/*.mjs     load bots (D20), reusing js/duel/protocol.js
```

- `wrangler.jsonc` (the move's, extended): `durable_objects.bindings` `DUEL_ROOM`, `DUEL_QUEUE`, `DUEL_SAFETY`; `migrations: [{ tag: 'v1', new_sqlite_classes: ['DuelRoom', 'DuelQueue', 'DuelSafety'] }]`; `ratelimits` bindings; `vars` `TURNSTILE_SITEKEY`, `DUEL_OPEN`; secrets `DUEL_TICKET_KEY`, `TURNSTILE_SECRET`, `IP_SALT`; an `env.staging` with its own Worker name, a `workers.dev` route only and the Turnstile test keys.
- CI: `npm ci && npm run typecheck && npm test` in `worker/` on every push; the deploy is the move's `wrangler deploy` job (one Worker for assets and API).
- `worker/` is repo-only (`_config.yml` `exclude:` already lists it from the move).

### D18. Deploys, the off switch and monitoring

- Deploys drop WebSockets; rooms restore from storage and clients resume (D7). Deploy outside 15:00 to 21:00 in the main time zones when possible.
- **Off switch:** `DUEL_OPEN = "0"` (a variable, changed in the dashboard or by a one-line deploy) makes every Duel endpoint answer `503 closed`; running matches finish. The app then shows "Online Duels are resting. Try Party Mode." On the Free plan, hitting a daily Durable Object limit also fails closed with the same message, so there is never a surprise bill.
- **Monitoring:** the daily `e2e.yml` calls `/api/duel/status`; Workers Logs alerts (or a scheduled check) when `server` ends or 5xx errors pass 1% of matches in a day; Cloudflare usage notifications on the Paid plan at 50% and 90% of the included Durable Object duration.

### D19. Cost estimate (prices checked 2026-10-17)

Durable Objects (SQLite backend): **Free** 100,000 requests, 13,000 GB-s, 5 million SQLite rows read and 100,000 rows written a day (reset at 00:00 UTC), 5 GB stored for the account. On Free, an operation of a type whose daily quota is used up fails until the reset; there is no charge. **Workers Paid** ($5 a month): 1 million requests and 400,000 GB-s a month included, then $0.15 a million requests and $12.50 a million GB-s. Incoming WebSocket messages count as requests at 20 to 1; duration is wall-clock time in memory at 128 MB, and stops while an object hibernates. Turnstile is free and unlimited. Rate Limiting bindings add no cost.

A typical match: about 18 questions at about 4 s each plus lobby, countdown and end screen: about 2.5 minutes in memory, so 150 s x 0.128 GB = **about 20 GB-s**. Requests: 1 to 2 HTTP calls per Player, 2 WebSocket upgrades, about 60 incoming frames (3 at 20 to 1), a few alarms: **about 10 requests**. Storage: a few KB per match, deleted after 10 minutes, far below any per-object size cap. The state is one row rewritten after each `step` (about 60 steps a match, plus the cleanup delete): **about 70 rows written** and a handful read (only when a restarted object reloads).

| Matches | Duration | Requests | Plan and cost a month |
|---|---|---|---|
| 300 a day (9,000 a month) | 6,000 GB-s a day | 3,000 a day (21,000 rows written) | Free, $0 |
| 600 a day (18,000 a month) | 12,000 GB-s a day (92% of Free) | 6,000 a day (42,000 rows written, 42% of Free) | Free at the limit; move to Paid |
| 20,000 a month | 400,000 GB-s | 200,000 | Paid, $5 |
| 100,000 a month | 2,000,000 GB-s | 1,000,000 | Paid, $5 + 1.6M GB-s x $12.50/M = **about $25** |
| 500,000 a month | 10,000,000 GB-s | 5,000,000 | Paid, $5 + $120 + $0.60 = **about $126** |

Duration is the Free quota that runs out first: at 600 matches a day requests are at 6% and rows written at 42%. The waiting line hibernates between arrivals, so it adds little.

**When a daily Free quota runs out.** New Duels fail closed: a room or queue call that fails with a limit error answers `503 closed` (D18). A match already running keeps its state in memory, so a failed storage write does not stop it; it only loses the ability to continue after a restart until the reset. If the request or duration quota stops the running room itself, the match ends with `end server` (no winner; Sparks follow the D15 rules for what was played) and the app shows the resting message. The owner moves to Paid before D19's thresholds, so this is a safety net, not the plan. Load tests (D20) at full size need the Paid plan or must run before launch, because staging shares the account's daily Free quota.

### D20. Load test plan

- **Tool:** Node bots in `worker/test/load/` (the `ws` package), reusing `js/duel/protocol.js`. Each bot makes or joins a room or queues, plays with a human-like answer delay (900 to 4,000 ms, 85% right) and records timings.
- **Where:** correctness runs against `wrangler dev` locally (Miniflare, Durable Objects included); load runs against the staging Worker on `workers.dev` (Turnstile test keys; a `LOAD_TEST_KEY` secret, set only in staging, lifts the per-IP limits for the bot runner's requests that carry it). Never against production.
- **When:** before launch (no production traffic shares the quota), and again before any change to `rules.js`, `room.ts` or the protocol version.

| Run | Shape | Pass when |
|---|---|---|
| L1 steady | 100 concurrent matches for 10 minutes (about 400 matches) | No match lost or stuck; deal fan-out skew between the two seats p95 under 50 ms; answer-to-`point` p95 under 150 ms within one region; CPU per message p99 under 2 ms |
| L2 burst | 500 queue joins in 30 s in one League | Every bot matched or told to retry within 60 s; nobody paired with themselves or a blocked key |
| L3 deploy | Drop every socket (deploy staging) in the middle of L1 | 99% of seats resume within 20 s; the 1001 drop does not use up grace |
| L4 abuse | 50 bad clients: 100 frames a second, 1 KB frames, bad JSON, 1,000 code guesses a minute from 3 IPs | Limits close or refuse them; L1 matches running at the same time are unaffected |
| L5 soak | 20 matches back to back for an hour | Storage is empty 10 minutes after the last match; no alarm left behind; memory flat |
| L6 distance | Bots in two regions (a GitHub runner in the US and one in Europe) | Matches complete; the 150 ms cap keeps either side from winning more than 60% with equal bots |

L1 to L6 cost about 15,000 GB-s, which fits one day of the Free quota before launch. Results go in `worker/test/load/RESULTS.md`.

## Risks and trade-offs

- **Undetectable bots that wait a human time.** Accepted: nothing is posted, Turnstile slows them, and Report and Block plus the queue limits handle the rest.
- **Under-13 age is self-declared.** The same as for Boards; Random Duels carry no text, so the harm from a child in the teen queue is small.
- **Durable Object location:** a room is created near its first caller, so two far-apart friends play with more latency. The 150 ms cap keeps it fair enough.
- **Deploys interrupt matches** for a few seconds. Resume handles it.
- **A Free-plan limit hit closes Duels for the rest of the day.** That is the safe failure; the owner moves to Paid when D19's threshold is near.
- **Shared module drift:** the app and the Worker could ship different versions of `rules.js` for a few minutes during a deploy. The protocol version, not the rules, is what the two must agree on, and the rules run only on the server.

## Migration plan

Build behind the off switch (`DUEL_OPEN = "0"` in production) and an app flag that shows the lobby only when `/api/duel/status` says open. Run the load tests on staging, turn it on for the owner's own devices (a `?duel=1` local override), then open it. Rollback: `DUEL_OPEN = "0"`; the lobby then links Party Mode. Removing it entirely is a revert plus a Durable Object migration with `deleted_classes`.

## Open questions (defaults used in this change)

1. Duel key for 13+ Random Duels, rotated weekly, hash only: default yes. Without it, Block and the automatic limits only last one match.
2. Friend Duels play at the host's League: default yes. Alternative: each Player at their own Mode with a handicap, like Party Mode.
3. Turnstile rather than App Check: default Turnstile.
4. Start on Workers Free; move to Paid ($5 a month) when matches pass 400 a day for 7 days: default yes.
5. Duel Sparks (10 a finish, 10 more a win, 100 a day): default yes.
6. Launch waits for the lawyer's note on under-13 Friend Duels and Turnstile: default yes.
7. `#/duel` and the Sky Landmark open the Online Duel; Party Mode stays on the Arena shelf: default yes.
8. Report review: a weekly digest through an Access-protected admin read: default yes.
