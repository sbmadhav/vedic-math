# Design

## Context

This design was re-planned on 2026-10-21 onto the React and TypeScript stack (`react-typescript` task 12.3, owner N4, Q26 to Q28, ADR 0012). The approved rules (owner M1 to M3, decisions D1 to D19 and the D20 load test gate) are kept; only what the stack changes is revised, and "Re-plan for React and TypeScript" below lists every such change. When this change is built, `react-typescript` has shipped at least its phase 2 (the shell) and phase 3 (TypeScript logic):

- learnvedicmath.com is one Cloudflare Worker with static assets (`wrangler.jsonc`, `main` the built Worker, `run_worker_first: ["/_csp", "/api/*"]`, `react-typescript` D5). `workers/src/index.ts` sends `/api/*` to its handlers, `/_csp` to `csp.ts`, and page navigations under `/learn/` to React Router's server render (`render.ts`); every file that exists (hashed `/learn/assets/*`, the prerendered pages, the landing pages) is served without running Worker code.
- The game is a React Router v7 framework-mode app at `/learn/` with path routes (`/learn/arena`, `/learn/arena/party`), server-rendered on a cold load, with the hash shim that turns `#/<route>` fragments into paths and leaves every other fragment alone (`react-typescript` D5). Player data stays on the device: the server render never knows the Mode, the Age answer or any Player (D14 there), so whatever reads them renders in the browser inside `ClientOnly`.
- The account is on Workers Paid before `react-typescript` phase 2 reaches production (its Q30, task 0.8), so Durable Objects run on the Paid plan from the start.
- Boards use Firebase. Under-13 Players use Device boards only (ADR 0006); no identity exists until a first post (ADR 0002). The Age answer stays on the device.
- Server access follows `react-typescript` D17: `workers/src/auth/` verifies a Firebase ID token when the Player has one, and otherwise accepts a Worker-signed session ticket from `POST /api/session` whose scope (`voice` or `room`) names the one path it opens; a `room` ticket is issued only after a Turnstile check. No identity is ever created for access.
- After PR #47 the same-screen Duel is gone: Party Mode is the same-screen game at `/learn/arena/party`, `/learn/duel` (and an old `#/duel` link, through the hash shim) reaches Party Mode (`react-typescript` task 8.4), the Sky Landmark is "Party", and the Duelist badge became Party host (id `duel`, counter `duelsDone`).
- Question generation lives in `shared/src/questions.ts` (`react-typescript` task 3.1): `mulberry32`, `withSeed`, `makeSet(league, seedText, n)` over the League's skill pools (Explorer, Challenger) or the mental arithmetic families (Pro), and `levelFor`, moved out of `js/arena.js` and `js/adapt.js`. `shared/` has no DOM lib, so nothing in it can touch the page or storage. Question text and pictures are still HTML strings, rendered only through `app/src/components/Markup.tsx` on the allow-list parser in `shared/src/markup.ts` (`react-typescript` B1).
- Nicknames come from fixed word lists in `shared/src/names.ts` (16 adjectives, 16 nouns, a number from 10 to 99), mirrored in `cloud/firestore.rules`, with a test that the two match.

## Goals

- Two Players on two devices race the same question; a server decides fairly and cannot be fooled by a modified client into giving points.
- Every Player can duel a friend with no account and nothing kept; teens can also duel someone new.
- No way for one Player to send another any words or personal information.
- Free at launch traffic, and a few dollars a month at real traffic.
- One shared module for questions and protocol, so the app and the server can never disagree.

## Non-goals

- Chat, friend lists, accounts, Duel Ratings or Boards, more than two Players, spectators.
- Any change to Firebase, Boards, the Arena or Party Mode rules.
- Live sessions. They are a later change on the same room engine (`react-typescript` D18, task 12.4), proposed only after this one is approved.

## Re-plan for React and TypeScript (2026-10-21)

What stays: every rule a Player, a parent or an attacker can observe. The match rules, timers, referee, protocol messages, codes, Reactions, Report and Block, the Duel key, the automatic limits, rate limits, Turnstile on the three calls that make or enter a match, what is sent and kept and for how long, the logs, the off switch, the cost model and the load test gate are unchanged (D1 to D20).

What changes, and only because the stack changed:

| Before (2026-10-17 plan) | Now | Why |
|---|---|---|
| `worker/` (one TypeScript project) | `workers/src/rooms/`: a small room engine shared with Live sessions, with the Duel's objects in `workers/src/rooms/duel/` (D17) | `react-typescript` D11 and D18 |
| Shared `js/questions.js`, `js/names.js`, `js/duel/protocol.js`, `js/duel/rules.js` with `// @ts-check` | `shared/src/questions.ts`, `shared/src/names.ts`, `shared/src/duel/protocol.ts`, `shared/src/duel/rules.ts`, strict TypeScript with no DOM lib (D2) | ADR 0012 supersedes the JS-with-JSDoc part of ADR 0010 |
| `js/duel/safe-html.js` | `Markup` on `shared/src/markup.ts`, with the Duel's class rule (D4) | `react-typescript` B1 |
| `js/views/duel.js`, `js/duel/client.js`, `js/life.js` | React route modules in `app/src/views/duel/`, `app/src/logic/duel/client.ts`, hooks and the `no-bare-lifecycle` lint rule (D16) | `react-typescript` D2, D6, D8 |
| `#/arena/duel`, `#/arena/duel/<code>`, `#/duel`; link `/play/#/arena/duel/<code>` | `/learn/arena/duel`, link `/learn/arena/duel#<code>`, `/learn/duel` (D8, D16) | `react-typescript` D5, owner P2 |
| Turnstile alone in front of the three calls | Turnstile on the three calls as before, plus an access proof: a Firebase ID token the page already holds, or a `room`-scope session ticket (D21) | `react-typescript` D17, Q27 |
| The WebSocket "ticket" | Called the **seat ticket** here, to keep it apart from the session ticket; its shape and 60 s single use are unchanged (D3) | Two tickets now exist |
| `POST /api/duel/rooms/:code/join` and `/:code/resume` | `POST /api/duel/rooms/join` and `/rooms/resume` with the code in the body (D3) | Review of the re-plan: a code in the path contradicted the approved rule that the code is never in a URL a server sees (D14) |
| One plan, Friend and Random Duels together | Phase 1 Friend Duels for every Player, phase 2 Random Duels for 13 and over (D22) | Owner N4 |
| Free plan first (open question 4) | Workers Paid from the start; the Free-plan rows of D19 stay as the safety net they describe | `react-typescript` Q30 |
| `node --test`, `@cloudflare/vitest-pool-workers` | Vitest everywhere; Worker tests in the Workers runtime with `@cloudflare/vitest-plugin` (D17) | `react-typescript` D10, task 1.4 |
| `_headers` CSP and `build.py`'s third-party list | `shared/src/policy.json`, read by `build.py` for `_headers` and by the Worker for server-rendered pages (D12) | `react-typescript` D15 |

Added, because the owner decided it with the stack (Q28): Duel results of an under-13 Player stay on the device, with no grown-up override (D22).

## Decisions

### D1. Architecture

```text
Browser (/learn/arena/duel)                                  Cloudflare (learnvedicmath.com, one Worker)
  app/src/views/duel/     ── POST /api/session (room) ────────▶ workers/src/index.ts
  app/src/logic/duel/     ── POST /api/duel/rooms ────────────▶   auth/ (ID token or session ticket, D21)
     client.ts            ── POST /api/duel/rooms/:c/join ────▶   rooms/duel/http.ts ── Turnstile siteverify ─▶ challenges.cloudflare.com
                          ── POST /api/duel/queue ────────────▶      │ rate limit (hashed IP), seat ticket (HMAC, 60 s)
                          ══ WebSocket /api/duel/ws ══════════▶      ├─▶ DuelRoom  (Durable Object on the room engine, one per match, SQLite)
                     (seat ticket in Sec-WebSocket-Protocol)          │     seats, seed, questions, referee, timers
                                                                      ├─▶ DuelQueue (one per League, 13+ only, SQLite, phase 2)
                                                                      │     waiting sockets (hibernating), Block pairs (7 days)
                                                                      └─▶ DuelSafety (one, SQLite) reports (30 days)
  shared/src: questions.ts, names.ts, markup.ts, duel/protocol.ts, duel/rules.ts  (imported by the app and the Worker; Vite bundles both)
```

- Same origin, so no CORS, the CSP's `connect-src 'self'` covers the WebSocket (CSP Level 3 matches `wss:` for `'self'`; to verify on Safari, task 9.3, else add `wss://learnvedicmath.com`), and no cookies are involved anywhere.
- `run_worker_first` is already `["/_csp", "/api/*"]` (`react-typescript` D5). Static files stay free; the Duel adds API calls, and the lobby page itself is a page navigation the Worker renders like any other game path.
- Every Durable Object class uses the SQLite storage backend (the only one on the Free plan).

### D2. Shared modules (one source for app and server)

| Module | What | Used by |
|---|---|---|
| `shared/src/questions.ts` | `mulberry32`, `withSeed`, `makeSet(league, seed, n, { ramp })`, `item()`, `poolItem()`, the League pools, `levelFor()`. Moved there by `react-typescript` task 3.1; this change adds the `ramp` option if that task did not. | Arena, Practice, `DuelRoom` |
| `shared/src/names.ts` | `ADJ`, `NOUN`, `AVATARS`, `makeName()`, `isNickname(s)`, `isAvatar(s)`. Moved there by `react-typescript` task 3.1; this change adds `isNickname` and `isAvatar` if missing. A test checks `cloud/firestore.rules` lists the same words. | store, `DuelRoom`, `DuelQueue` |
| `shared/src/duel/protocol.ts` | Protocol version, message types (a discriminated union per direction), `parseClient(raw)` and `parseServer(raw)` (size cap, JSON in try, exact keys, types, ranges), constants (goal, time limits, Reactions, report reasons, close codes). | client, Worker, load bots |
| `shared/src/duel/rules.ts` | The pure referee: `start(league, seed)`, `step(state, event, now) -> { state, out }` for every event (seat joined, ready, answer, timeout, disconnect, resume, rematch, leave). No I/O and no clock of its own, so it is tested exhaustively in Vitest. | `DuelRoom`, Vitest |
| `shared/src/markup.ts` | The allow-list parser behind `Markup` (`react-typescript` B1), with the Duel's class rule (D4). | `Markup` in the app |

- All of them are strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `react-typescript` B5) in the `shared` workspace, with no DOM lib, so nothing in them can touch the page or storage. The app and the Worker import them from the `shared` package; Vite bundles them into the client and into the Worker. There is no second copy and no `// @ts-check` JavaScript.
- `withSeed` swaps `Math.random` only for the length of one synchronous `makeSet` call. A Durable Object runs one event at a time and `makeSet` never awaits, so no other code can observe the swap. A later refactor may pass the random function explicitly; it is not needed for correctness.
- The seed is `duel:<32 random hex>`, made by the room with `crypto.getRandomValues` and never sent to a client.

### D3. HTTP endpoints

All bodies are JSON, at most 1 KB; every response is `Cache-Control: no-store`; unknown fields are rejected. Every HTTP call except `GET /api/duel/status` (create, join, resume, queue) carries an access proof in `Authorization` (D21); a missing or invalid one, or a `voice`-scope ticket, gets `401`. The WebSocket upgrade carries no access proof (a browser `WebSocket` cannot set `Authorization`); its seat ticket is the proof. No Duel code is ever in a request path or query: the join and resume calls carry it in the body, so it never reaches a server log or the edge's request logs.

| Method and path | Body | Answer |
|---|---|---|
| `POST /api/duel/rooms` | `{ v, league, name, avatar, turnstile }` | `201 { code, ticket, expiresIn }`. Makes a Friend Duel room with a fresh code. |
| `POST /api/duel/rooms/join` | `{ v, code, name, avatar, turnstile }` | `200 { ticket, league, host: { name, avatar } }`, or `404 no-room`, `409 full`, `410 expired`. |
| `POST /api/duel/rooms/resume` | `{ v, room, seat, resume }` (`room` is the Duel code, or the room id a Random Duel's `matched` message named) | `200 { ticket }` or `410 gone`. No Turnstile (rate limited instead). |
| `POST /api/duel/queue` (phase 2) | `{ v, league, name, avatar, teen: true, key, prev?, turnstile }` | `200 { ticket }` for the League's queue. `key` is the hash of the Duel key, `prev` the hash of last week's key (D13). |
| `GET /api/duel/ws` with `Upgrade: websocket` | seat ticket in `Sec-WebSocket-Protocol: vm-duel.1, t.<ticket>` | `101`, echoing only `vm-duel.1`. Routed to the room or queue named in the seat ticket. Needs no access proof: the seat ticket is one, made by a call that had one. |
| `GET /api/duel/status` | | `200 { open: true, random, v: 1 }` or `503 { open: false, random: false, v: 1 }` (the off switch, D18; `random` is the Random Duel switch, D22). |

- `ticket` in these answers is the **seat ticket**. It travels in the WebSocket subprotocol header instead of the URL, so it never sits in a URL that a log or a browser history could keep.
- A **seat ticket** is `base64url(payload).base64url(HMAC-SHA256(payload, DUEL_TICKET_KEY))`, payload `{ k: 'room' | 'queue', v, id, seat, exp, n }`: 60 seconds of life, single use (the object records `n` until `exp`). `v` is the protocol version the HTTP call was made with; the WebSocket upgrade refuses a ticket whose `v` is not one the server accepts (D4, Version: the current one, and also the previous one during a deploy). It is a different thing from the 30-minute session ticket of D21, signed with a different secret, so neither can ever be used as the other.

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
| `matched` | `ticket` | Queue sockets only: a partner was found; the client connects to the room with this ticket, and the queue closes the socket (D9). |
| `end` | `winner` (seat or null), `scores`, `why` (`goal`, `left`, `limit`, `idle`, `report`, `server`) | The match is over. |
| `error` | `code` (`upgrade`, `bad-ticket`, `full`, `expired`, `rate`, `invalid`, `closed`), `retry?` | Followed by a close unless `retry`. |

- `deal.text` and `deal.viz` are the generators' HTML. The client renders them only through `Markup` (`app/src/components/Markup.tsx`), the one component that turns a content string into React elements, on the allow-list parser in `shared/src/markup.ts` (`react-typescript` B1). That shared list holds every element and attribute this plan allowed (`b`, `i`, `sup`, `sub`, `span`, `br`, and the SVG elements `svg`, `g`, `circle`, `rect`, `line`, `path`, `text`, `tspan` with geometry, `viewBox` and `class`) plus what the content needs elsewhere (for example `polygon` and `aria-label` from the pictures). One list for the whole game is the point of B1, so the Duel does not keep a narrower copy; it adds one rule, an option of `markup.ts` that the Duel client always passes: a `class` is kept only when it starts with `vz-`, `sc-` or `hl`. Anything else is dropped, and anything the parser cannot read is dropped as text (it fails closed). React never assigns `innerHTML`, and the CSP blocks inline script anyway; this keeps a compromised server from drawing UI that looks like ours.
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

The room engine (D17) runs these timers for every room. While a match runs, the room keeps its timers with `setTimeout` (it is busy anyway). Before the first seat arrives, between matches and for cleanup, it uses one Durable Object alarm, so an idle room hibernates. The room writes its state to its SQLite storage after every `step`, so a restarted object (deploy, eviction) continues the match.

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

- The client keeps `resume` (and the code or room id and seat) in `sessionStorage` (`vm.duel.session`, per tab, so it survives a reload of that tab and nothing else), and deletes it at `end`. It reads it only in the browser, after hydration (the server render never sees it, `react-typescript` D14).
- On an unexpected close, the client retries `POST .../resume` then the WebSocket after 0.5, 1, 2, 4 and 8 s (with jitter), within the 20 s grace. The view shows "Connection lost. Getting you back..." and, to the other Player, "Waiting for Swift Tiger 12 (18 s)". The question clock is frozen for both.
- Back in time: `sync` (scores, the current question if still live with its remaining time, whose turn is out), then `resumed`.
- A close with 1001 (server going away, a deploy) does not use up the seat's 45 s.
- A hidden tab on a phone often loses its socket; that is a drop like any other. The client also sends nothing while hidden and pings on `visibilitychange` when it returns.
- Offline (`navigator.onLine` false) the Duel lobby says "Online Duels need a connection" and links Party Mode. Offline, the lobby route comes from the service worker's offline shell like any other `/learn/` path (`react-typescript` D9), so this message shows instead of a failed page.

### D8. Friend Duels without accounts (every Player, including under 13)

1. The host taps "Duel a friend" (League = the host's Mode). Turnstile runs (D12) and the app has its access proof (D21). The app gets a code and shows it big ("B K T R M Z"), with Copy, Share (Web Share API where available) and the link `https://learnvedicmath.com/learn/arena/duel#BKTRMZ`. The code is in the fragment, so it never reaches a server log or a `Referer`. The fragment does not start with `#/`, so the hash shim (`react-typescript` D5) leaves it alone and the server renders the plain lobby path; the app reads the code from `location.hash` in an effect after hydration.
2. The friend opens the link (the code is filled in from the fragment) or taps "I have a code" and types it. The join screen shows the host's Nickname and color and the League ("This Duel is at Challenger level"), and asks "Duel Swift Tiger 12?" before joining. A Player who does not know that Nickname is told, in their Mode's words, to go back.
3. Codes use 20 consonants (`B C D F G H J K L M N P Q R S T V W X Z`): 64 million codes, no vowels so no real words, no 0/O or 1/I confusion. Each letter is drawn uniformly with `crypto.getRandomValues` (rejection sampling, no modulo bias), and a code already live is drawn again; the room engine's code allocator does this for every kind of room (D17). A code is live for 10 minutes or until a friend joins; the room refuses a third seat.
4. Nothing about either Player is kept more than 10 minutes after the match: the room's storage (Nicknames, colors, question log) is deleted by then (D5, D14). There is no friend list: next time, a new code.
5. Under-13 Players use exactly this flow. The server never knows anyone's age; the app decides who may use Random Duels.

### D9. Random Duels (13 and over, same League)

- Phase 2 (D22). Shown only when the active Player's Age answer is 13 or over (`canMatch(p)`: `'needs-age'`, `'friends-only'` or `'ok'`, next to `canPost` in `app/src/logic/cloud.ts`). The server cannot check the age (it never leaves the device, posting-consent); it only receives `teen: true`, which it requires and does not store. ADR 0006's reason for not sending a self-declared age to Firestore does not apply: nothing is stored or published here, and the boolean only opens a waiting line.
- `DuelQueue` is one object per League (`idFromName('queue:challenger')`). Waiting Players are hibernating WebSockets with an attachment `{ name, avatar, key, prev, since }` (both hashes, D13). A new arrival is paired with the longest-waiting Player who has not blocked it and whom it has not blocked, and never with a socket whose `key` or `prev` equals the arrival's `key` or `prev` (the same Player across a key rotation, say in a second tab); the queue makes a room id (`r-<random>`), sends each a `matched` message with a room ticket and closes their queue sockets.
- One waiting socket per Player: an arrival whose `key` or `prev` matches a waiting socket's `key` or `prev` replaces that socket instead of being paired with it.
- No match in 60 s: the app offers Try again or Duel a friend.
- The League is the only matching rule (owner M1). Matching by Rating or region is out of scope.

### D10. Anti-cheat

- **The server is the referee.** The answer is never in a `deal`; points, misses, the winner and every timer are decided in `DuelRoom` by `shared/src/duel/rules.ts`. A modified client can only send choice indices.
- **The seed never leaves the server**, so a client cannot compute the next questions.
- **Too-fast answers** count as misses (D6). Three or more in a match mark it as suspect in the room's log line and in any report about it.
- **One answer per seat per question**; later ones are ignored and counted as strikes.
- **Turnstile** before every code, join and queue entry slows bots that would farm matches, and every one of those calls also carries an access proof (D21).
- **Nothing to win:** Duels post nothing to Boards and Sparks stay on the device with a daily cap, so there is no score worth cheating for beyond the race itself.
- Bots that solve arithmetic instantly but wait 400 ms are possible; against those, Report, Block and the queue's automatic limits (D13) are the answer, not detection.

### D11. Rate limits and message rules

| Where | Limit | Over the limit |
|---|---|---|
| `POST /rooms` per hashed IP | 10 a minute | `429` |
| `POST /rooms/join` per hashed IP | 20 a minute (one IP is slow: about 200 tries in a code's 10 minutes; spread over many IPs it is not enough on its own, see open question 10) | `429` |
| `POST /rooms/resume` per hashed IP | 30 a minute | `429` |
| `POST /queue` per hashed IP | 10 a minute | `429` |
| WebSocket frames per seat | 10 a second, burst 20 | close 1008 |
| Frame size | 256 bytes in, server frames at most 4 KB | close 1008 |
| Invalid frames (bad JSON, unknown type, wrong field) | 5 strikes per match | close 1008; the seat counts as left |
| Reactions per seat | 1 every 3 s, 12 a match | dropped silently |
| Rooms per hashed IP at once | 15 in LOBBY (a classroom behind one school IP) | `429` |
| Zone rule (the free Cloudflare rate-limiting rule, extended) | `/api/duel/*` 120 requests a minute per IP | Cloudflare blocks for 10 s |

- The IP is read from `CF-Connecting-IP` inside the Worker and turned into `HMAC-SHA256(ip, IP_SALT)`, truncated to 16 bytes, before it is used as a rate-limit key. `IP_SALT` is a Worker secret rotated every month. The raw IP is never written, logged or passed to a Durable Object.
- Per-IP limits use the Workers Rate Limiting binding (`ratelimits` in `wrangler.jsonc`), the same binding and the same hashing helper the server voice and `POST /api/session` use (`react-typescript` D17), with Duel-specific limit names. The account is on Workers Paid (Q30), where the binding is available; if a limit cannot be expressed with it, the counters live in a small `DuelLimits` Durable Object keyed by the hash, with 60 s windows.
- Shared Wi-Fi in a school: a class shares one IP address. 10 new rooms a minute and 15 waiting at once let half a class make codes within two minutes; if schools hit this, a classroom room (out of scope here) is the fix, not a higher limit.

### D12. Turnstile, not App Check

- Turnstile (Cloudflare, free, unlimited) guards the three calls that make or enter a match, and the `room`-scope session ticket (D21). It is the same vendor as the host, so no new company receives data, and no Google request is made (the move's "Nothing to Google or YouTube on load" holds; App Check would load reCAPTCHA).
- The widget script (`https://challenges.cloudflare.com/turnstile/v0/api.js`) loads only when the Player taps Duel a friend, I have a code or Find a player, in "managed" mode with `appearance: interaction-only`, so most Players see nothing and a few see one checkbox. The token is sent in the body and verified by the Worker with `siteverify` (secret `TURNSTILE_SECRET`), checking `success`, `hostname` and `action` (`duel-create`, `duel-join`, `duel-queue`, and `room-session` for `POST /api/session`). The siteverify helper lives in `workers/src/auth/turnstile.ts`, next to the session tickets that need it.
- Tests and staging use Cloudflare's published test keys (always pass, always fail), never the production key.
- `challenges.cloudflare.com` goes into the third-party list in `shared/src/policy.json` (`react-typescript` D15) with its reason, as `script-src` and `frame-src`; `build.py` writes it into `_headers` and the Worker into the headers of server-rendered pages, from that one source. A host source works next to the per-request nonce (the policy has no `'strict-dynamic'`).
- Turnstile is a third party in the privacy notice (what it collects is Cloudflare's to state; lawyer question in D14).

### D13. Safety: Reactions, Nicknames, Report, Block, abuse handling

- **No chat, no text.** The protocol has no field that carries free text, and the server rejects any frame with unknown fields. Nicknames are checked with `isNickname()` and avatar colors with `isAvatar()` on every call.
- **Reactions:** six, fixed: `nice` ("Nice one!"), `gg` ("Good game"), `wow` ("Wow!"), `oops` ("Oops!"), `again` ("Rematch?"), `thanks` ("Thanks!"), shown as a small bubble by the sender's name and announced politely to screen readers. Explorer sees icons with the words read aloud on tap. A mute button on the match screen hides incoming Reactions for that match; "Show Reactions" on the Me page turns them off for every Duel on the device.
- **Report** (on the match and end screens, two taps): reasons "Answers too fast to be real", "Mean Reactions", "I don't know this player" (Friend Duels) and "Something else" (no text box). Reporting ends the match for the reporter, blocks, and sends `report` to the room, which writes one record to `DuelSafety`:
  `{ id, at, league, kind: 'friend' | 'random', reason, reportedKey?, summary: { questions, tooFast: [a, b], reactions: [a, b], medianMs: [a, b], why } }`. No Nickname, no IP, no code, no text. Kept 30 days, then deleted by an alarm.
- **Block:** in a Random Duel, the room asks the League's `DuelQueue` to store the pair `(blockerKey, blockedKey)` for 7 days, both ways, so those two keys are never paired again that week. This is best effort: the key is made and kept on the device and the server only sees its hash, so a blocked person who clears storage or edits the key arrives with a new hash and can be paired with the blocker again by chance. Turnstile and the IP limits slow that down, the blocker can Block again, and Random Duels carry no chat or typed text. A server-verifiable identity would need an account or a device fingerprint, which owner M1 and ADR 0006 rule out. Open question 11. In a Friend Duel, Block ends the match and closes the room (the code dies); there is nothing to remember because there is no friend list.
- **Duel key (13+ only, phase 2):** at a Player's first Random Duel the app makes a random 128-bit key, saved on the device as `vm.duelKey.<player id>` with its ISO week, and makes a new one each week. Only `SHA-256(key)` is sent. The replaced key is kept on the device for 7 more days and its hash is sent as `prev` with each queue join, and the queue checks Block pairs against both hashes, so a Block made just before the week changes still lasts its full 7 days. It lets Block and the automatic limits work across matches for up to a week, and then it is gone (the old key after 7 more days). Under-13 Players never get one.
- **Automatic limits (Random Duels):** a key reported by 3 different keys within 24 hours cannot join the queue until it changes (at most a week), and gets `error closed` with copy that does not say why. A key with too-fast answers in 3 matches in a day is treated the same. Clearing storage gets a new key; Turnstile and the IP limits make that slow.
- **Review:** the owner reviews a weekly digest (`pnpm --filter workers reports`, reading `DuelSafety` through an admin endpoint behind Cloudflare Access, which is free for one user). Counts by reason and League, and any key over a limit. No action needs anyone's identity, and there is none to look up.
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
| `SHA-256(Duel key)` and last week's (13+ only) | Queue | Block and limits for up to a week | In the queue only while waiting; Block pairs and automatic-limit records 7 days; in a report 30 days |
| Report reason and match summary | Report | Abuse handling | 30 days |
| Turnstile token | Make, join, queue, and a `room` session ticket | Bot check | Not stored (verified once) |
| Firebase ID token (only a Player who has posted to a World board and whose page already holds the token, so never an under-13 Player) | Make, join, queue, resume, as the access proof (D21) | Access check | Verified and dropped: never stored, logged, forwarded or put in a room's state, and no uid is kept |
| `room` session ticket (every other Player) | Make, join, queue, resume, as the access proof (D21) | Access check | Not stored; it holds only its scope, a random value and its expiry, and names no Player |
| IP address | Every request (the network needs it) | Delivering the connection; rate limits | Never stored or logged by us; only a salted hash is used as a counter key for up to a minute |

**Never sent:** the Player id, the Age answer (only the 13+ boolean, for the queue), Ratings, Sparks, progress, Duel results, the device's other Players, anything typed, the Duel code in any URL a server sees. A Firebase ID token is sent only as the access proof above; a Duel never loads Firebase to get one, never refreshes one and never creates one (D21).

**Logs.** Workers Logs: invocation logs off for this Worker (`observability.logs.invocation_logs: false`, to verify the setting, task 3.5); the code logs one structured line per match end (`league`, `kind`, `why`, `questions`, `durationS`, `suspect`, `protocol`) and per error code, with no Nickname, code, key, seat or session ticket, ID token or IP. Cloudflare's own edge and security logs exist under its terms as our processor (named in the privacy policy).

**COPPA view.**
- Friend Duels for under-13 Players collect no personal information as the Rule defines it, except the IP address, which the connection itself needs. It is used only to deliver the real-time feature the child asked for and to protect it (rate limits), never to contact, profile or advertise, and is not kept: the "support for internal operations" exception (§312.5(c)(7)), which the privacy notice must now describe (§312.4(d)(3)). Generated Nicknames are not chosen by the child and contain nothing about them.
- No feature lets a child make personal information public or send it to another user: there is no text field anywhere in the Duel.
- No persistent identifier is created for under-13 Players: no Duel key, no Firebase identity; their access proof is a `room` session ticket that names no one and lasts 30 minutes; the resume secret lives in one tab for one match. Their Duel results stay on the device, with no grown-up override (D22).
- Turnstile is a third party that processes device signals for security, also internal operations, and is disclosed.
- Teens (13 to 17): the weekly Duel key is a short-lived pseudonymous identifier for safety; state minors' laws (for example New York's Child Data Protection Act) and the UK Children's Code favour exactly this: high-privacy defaults, no profiling, data minimisation. A short DPIA (`docs/legal/duel-dpia.md`) records it.
- A Firebase ID token names a Player's anonymous Firebase account, so it is personal data in the GDPR sense even though it says nothing else about the Player. Only Players who have posted to a World board have one (never under 13, ADR 0006), the Worker verifies and discards it (`react-typescript` D17), and the privacy notice says so in the words `react-typescript` task 11.6 uses for the server voice.
- Lawyer questions: (1) the internal-operations basis for under-13 Friend Duels; (2) Turnstile as a third party for children; (3) the notice and retention text; (4) whether the 13+ boolean from a neutral Age answer is a fair gate for Random Duels. The server voice relies on the same basis (`react-typescript` D16), so one answer covers both.

### D15. How it fits with Boards, the Arena, Party Mode, Sparks and badges

- **Boards and Firebase:** untouched. A Duel never loads Firebase, never posts, never creates an anonymous identity (ADR 0002 holds). The Duel server and Firebase share nothing: when the page already holds a Firebase ID token (a Player who posted to a World board in this session), the Worker verifies it as the access proof and drops it, keeping no uid (D21); otherwise nothing from Firebase reaches the Worker.
- **Arena:** the daily round, Practice, Ratings and Boards are unchanged. Duels use the Arena Practice pools through `shared/src/questions.ts`, which `react-typescript` task 3.1 moved there with a test that `dailySet()` gives the same items as before for a fixed list of dates and Leagues; this change only adds what the Duel needs (the `ramp` option) under the same test.
- **Party Mode** stays the same-screen game at `/learn/arena/party`. `/learn/arena/duel` is the Online Duel lobby, and `/learn/duel` (with an old `#/duel` link, through the hash shim) now goes there instead of to Party Mode; the lobby links Party Mode ("Same screen? Play Party Mode"). The Sky Landmark returns to "Duel" and opens the lobby; the Arena shelf keeps the Party Mode card.
- **Sparks:** a finished Duel pays 10 Sparks, a win 10 more, at most 100 a day from Duels per Player, none for a match that ended idle or where the Player answered fewer than 5 questions. They stay on the device and count toward the weekly Sparks total like any Practice.
- **Badges:** Party host stays as PR #47 left it. No new badge in this change.
- **Analytics:** fixed-word events only (spec delta), counted on the device's analytics as today; nothing from the server.

### D16. The app side

- Routes (React Router, `app/src/routes.ts`): `/learn/arena/duel` (the lobby; with a `#<code>` fragment, the join confirmation with the code filled in), and `/learn/duel`, which now lands on the lobby instead of Party Mode, by the same mechanism `react-typescript` task 8.4 gave it. They are listed before the Play experience route pattern. Route views are counted from the matched route only (`react-typescript` B4), so the fragment and the code never reach analytics.
- `app/src/views/duel/`: one route module with a component per screen: `Lobby` (Duel a friend, I have a code, Find a player for 13+ in phase 2, Party Mode link, the Calm note, offline and resting states), `Waiting` (code, Copy, Share, cancel), `Join` (the confirmation with the stranger line), `Match`, `End` (result, Rematch, Report, Block, Back). Plain CSS files with design-system tokens (`react-typescript` D7).
- **Server-safe (`react-typescript` D14).** The server renders the lobby's frame (title, the Party Mode link, the timed-race note); everything that reads the Player (Mode wording, the Age answer for `canMatch`, Calm, the Duel key), the fragment, `sessionStorage` or the network sits inside `ClientOnly` with a fallback that keeps the space. Nothing about a Duel renders on the server, and the route has no `loader` or `action`.
- Match screen: the Player's own side full size (question and picture through `Markup`, four big choices, keys 1 to 4), an opponent strip on top (Nickname, color, points, "answered", "out", "away"), the question clock as a bar and a number, Reactions tray, mute, Report.
- `app/src/logic/duel/client.ts`: framework-free, one WebSocket per match, taking an `AbortSignal` and tying every listener, timer and retry to it; `app/src/hooks/useDuel.ts` gives it the round's signal (`useRound`, `react-typescript` D8) and exposes its state through `useSyncExternalStore`. Leaving the route aborts the signal, which sends `leave` and closes. Reconnect as in D7. The `no-bare-lifecycle` lint rule covers `app/src/views/duel/` as it covers every view, and its scope is extended to `app/src/logic/duel/`.
- Read aloud: Explorer's question is spoken on its own device as soon as it is dealt, through the same voice order as the Arena (`react-typescript` D16).
- Accessibility: answers, points, misses and Reactions are announced politely (`role="status"`), focus stays on the choices, nothing is shown by color alone. The question clock is a real-time race, which WCAG 2.2.1 exempts; the lobby says the Duel is timed, and Calm Players are pointed to Party Mode or Practice.
- Copy for every Mode through the app's Mode wording helper (today's `fx.t()`, `react-typescript` D6), no em dashes.

### D17. The room engine and the Duel in `workers/` (ADR 0010, `react-typescript` D11 and D18)

```text
workers/src/
  index.ts              routing (react-typescript): /_csp, /api/session, /api/voice/*, /api/duel/* -> rooms/duel/http.ts, page renders, assets
  auth/                 react-typescript D17: firebase.ts (ID token check), session.ts (scoped session tickets, POST /api/session),
                        turnstile.ts (siteverify with hostname and action), ip.ts (salted IP hash, rate limit helper)
  rooms/
    engine/             shared by Duels now and Live sessions later; knows nothing about Duels
      room.ts           RoomObject base class (Durable Object): hibernating WebSockets (acceptWebSocket, seat attachments),
                        the seat-ticket check on upgrade, step() then persist to SQLite after every event, timers (setTimeout
                        while busy, one alarm otherwise), the cleanup alarm 10 minutes after close, fail-closed storage (D19)
      codes.ts          code allocator: 20 consonants, rejection sampling, claim through the room named by the code, redraw if live
      seat-ticket.ts    60 s single-use seat tickets (HMAC with DUEL_TICKET_KEY, nonce kept until exp)
      clock.ts          server clock, ping and round-trip median, the latency cap
      log.ts            one structured line per room end and per error code, fields from an allow-list
    duel/
      http.ts           /api/duel/* endpoints (D3): body checks, access proof (D21), Turnstile, rate limits, the off switch
      room.ts           DuelRoom extends RoomObject: calls shared/src/duel/rules.ts for every event
      queue.ts          DuelQueue (phase 2)
      safety.ts         DuelSafety (+ the Access-protected admin read)
      limits.ts         the D11 limits on the shared rate limit helper
    *.test.ts           Vitest in the Workers runtime (@cloudflare/vitest-plugin): endpoints, tickets, two-socket matches, alarms, limits
workers/test/load/*.ts  load bots (D20), reusing shared/src/duel/protocol.ts, run with Node's TypeScript type stripping
```

- **The engine is the reusable part** (`react-typescript` D18): a Durable Object per room with WebSocket hibernation, a code allocator, seats, a server clock, persistence after each step and the 10-minute deletion. It takes a pure `step(state, event, now)` function and a state codec from the room kind, so a Live session (a later change) is another subclass with its own rules module in `shared/`, not a second engine. Every rule a Player can see (timers, referee, limits) stays in the Duel's own modules; the engine holds only mechanics, and its tests use a tiny test room kind.
- `workers/` is the existing workspace (`react-typescript` D11): strict TypeScript (`react-typescript` B5), `@cloudflare/workers-types`, Vitest with `@cloudflare/vitest-plugin`. It imports `shared` as a workspace package; no `allowJs` or `checkJs` is involved.
- `wrangler.jsonc` (the repo's one file, extended): `durable_objects.bindings` `DUEL_ROOM`, `DUEL_QUEUE`, `DUEL_SAFETY`, next to whatever bindings exist then (the server voice's ledger); a migration `{ tag: 'duel-v1', new_sqlite_classes: ['DuelRoom', 'DuelSafety'] }` in phase 1 and `{ tag: 'duel-v2', new_sqlite_classes: ['DuelQueue'] }` in phase 2, after the migrations already there; `ratelimits` bindings; `vars` `TURNSTILE_SITEKEY`, `DUEL_OPEN`; secrets `DUEL_TICKET_KEY`, `TURNSTILE_SECRET`, `IP_SALT` (and `TICKET_KEY` from `react-typescript` D17 for session tickets); an `env.staging` with its own Worker name, a `workers.dev` route only and the Turnstile test keys.
- CI: the existing `pnpm` typecheck, lint and Vitest jobs cover `shared` and `workers` (`react-typescript` tasks 1.4 to 1.8); the deploy is the one Worker for assets, the server render and the API.
- `workers/` and `shared/` are repo-only sources; what ships is the built Worker, outside `_site` (`react-typescript` B2).

### D18. Deploys, the off switch and monitoring

- Deploys drop WebSockets; rooms restore from storage and clients resume (D7). Deploy outside 15:00 to 21:00 in the main time zones when possible.
- **Off switch:** `DUEL_OPEN = "0"` (a variable, changed in the dashboard or by a one-line deploy) makes every Duel endpoint answer `503 closed`; running matches finish. The app then shows "Online Duels are resting. Try Party Mode." On the Free plan, hitting a daily Durable Object limit also fails closed with the same message, so there is never a surprise bill. The account is on Workers Paid before this ships (`react-typescript` Q30), so in practice the usage notifications below are the guard, and the fail-closed path stays for any limit error.
- **Monitoring:** the daily `e2e.yml` calls `/api/duel/status`; Workers Logs alerts (or a scheduled check) when `server` ends or 5xx errors pass 1% of matches in a day; Cloudflare usage notifications on the Paid plan at 50% and 90% of the included Durable Object duration.

### D19. Cost estimate (prices checked 2026-10-17)

Re-plan note (2026-10-21): the account moves to Workers Paid before `react-typescript` phase 2 reaches production (Q30), so Duels launch on the Paid rows of the table; the $5 a month is already paid for the server render and the voice, and Duels add only their usage beyond the included amounts. The Free-plan rows and the fail-closed behavior are kept as they were approved.

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

**When a daily Free quota runs out.** New Duels fail closed: a room or queue call that fails with a limit error answers `503 closed` (D18). A match already running cannot be kept safely once its state stops being saved (hibernation or a restart would reload an older state), so a failed storage write ends the match at once with `end server` (no winner, no rematch; Sparks follow the D15 rules for what was played), the room closes its sockets and refuses resume, and the app shows the resting message. The same happens if the request or duration quota stops the room. The owner moves to Paid before D19's thresholds, so this is a safety net, not the plan. Load tests (D20) at full size need the Paid plan or must run before launch, because staging shares the account's daily Free quota.

### D20. Load test plan

- **Tool:** Node bots in `workers/test/load/` (TypeScript, run with Node's type stripping, the `ws` package), reusing `shared/src/duel/protocol.ts`. Each bot makes or joins a room or queues, plays with a human-like answer delay (900 to 4,000 ms, 85% right) and records timings.
- **Where:** correctness runs against `wrangler dev` locally (Miniflare, Durable Objects included); load runs against the staging Worker on `workers.dev` (Turnstile test keys; a `LOAD_TEST_KEY` secret, set only in staging, lifts the per-IP limits for the bot runner's requests that carry it). Never against production.
- **When:** before each phase launches (no production traffic shares the quota), and again before any change to `shared/src/duel/rules.ts`, `workers/src/rooms/duel/room.ts`, the engine's `room.ts` or the protocol version.

| Run | Shape | Pass when |
|---|---|---|
| L1 steady | 100 concurrent matches for 10 minutes (about 400 matches) | No match lost or stuck; deal fan-out skew between the two seats p95 under 50 ms; answer-to-`point` p95 under 150 ms within one region; CPU per message p99 under 2 ms |
| L2 burst | 500 queue joins in 30 s in one League | Every bot matched or told to retry within 60 s; nobody paired with themselves or a blocked key |
| L3 deploy | Drop every socket (deploy staging) in the middle of L1 | 99% of seats resume within 20 s; the 1001 drop does not use up grace |
| L4 abuse | 50 bad clients: 100 frames a second, 1 KB frames, bad JSON, 1,000 code guesses a minute from 3 IPs | Limits close or refuse them; L1 matches running at the same time are unaffected |
| L5 soak | 20 matches back to back for an hour | Storage is empty 10 minutes after the last match; no alarm left behind; memory flat |
| L6 distance | Bots in two regions (a GitHub runner in the US and one in Europe) | Matches complete; the 150 ms cap keeps either side from winning more than 60% with equal bots |

L1 to L6 cost about 15,000 GB-s, more than one day of the Free quota (13,000 GB-s), so on Free they run over two days (L1 to L3, then L4 to L6, each well under the quota), or in one day on Paid, which the account has (Q30). Phase 1 runs L1, L3, L4 (without its queue rows), L5 and L6 with Friend Duels; phase 2 adds L2 and the queue parts of L4. Results go in `workers/test/load/RESULTS.md`.

### D21. Access: an ID token the page holds, or a `room` session ticket (`react-typescript` D17, Q27)

Added by the re-plan. It sits in front of the approved rules and changes none of them.

- **Every call that makes, enters or resumes a match** (`POST /api/duel/rooms`, `/rooms/join`, `/rooms/resume`, `/queue`) carries one access proof in `Authorization`, checked by `workers/src/auth/` before anything else runs:
  - `Bearer <Firebase ID token>`: accepted after the D17 checks (RS256 against Google's published keys, `aud`, `iss`, `exp`, `iat`, `auth_time`, `sub`). The app sends one only when the page already holds it: Firebase auth is already loaded in this page (the Player posted to a World board in this session) and its cached token has at least 5 minutes left. A Duel never loads the Firebase SDK, never asks for a refresh and never creates an identity, so "a Duel sends no request to Firebase" still holds. An under-13 Player never has one (ADR 0006).
  - `Ticket <room session ticket>`, for every other Player: a 30-minute HMAC (`TICKET_KEY`) over the scope `room`, a random value and the expiry, issued by `POST /api/session { scope: 'room', turnstile }` only after a Turnstile check with action `room-session`. The app asks for a fresh one for each Duel (a new code, a join or a queue entry) and forgets it when that Duel ends, so one ticket never links two Duels and an under-13 Player gets nothing that outlasts a Duel (D14). While the match runs it is kept in memory and in the tab's `vm.duel.session`, so a reload can resume. It names no Player and is never stored by the server. The header form is the one the server voice uses for its `voice` tickets, whichever of the two ships first.
- **Scopes never cross.** A `voice` ticket, an unscoped ticket or a ticket for any other scope gets `401` on every Duel path, and a `room` ticket gets `401` on the voice path (`react-typescript` task 11.3 tests the second; this change tests the first).
- **Turnstile on the three calls stays** (D12): create, join and queue each still carry a fresh Turnstile token for their action, whatever the access proof. A Player with no ID token therefore passes two Turnstile checks before each Duel (`room-session`, then the action), both from the one widget in managed, interaction-only mode, so most Players see neither. A rematch stays in the same room and needs neither. Open question 12 asks whether a session ticket may stand in for the per-call check; the default keeps the approved rule.
- **Resume** needs the access proof and no Turnstile (D3), so a reload in the middle of a match still gets back within the 20 s grace. The WebSocket needs only its seat ticket (D3), which a call with an access proof made.
- **No identity, nothing kept.** The Worker checks the proof and drops it. It keeps no uid, no ticket and no link between a proof and a room, never logs either, and never passes either to a Durable Object. Session tickets share `react-typescript`'s per-IP-hash limit on `POST /api/session`; D11's limits apply on top.
- **Where it is built.** `workers/src/auth/` belongs to `react-typescript` (D17). If its phase 8 (server voice) has not built it when this change starts, this change builds `auth/` to that shape (ID token check, `POST /api/session` with both scopes, Turnstile helper) and the voice task reuses it.

### D22. Phases, and results that stay on the device (owner N4, Q28)

Added by the re-plan.

- **Phase 1: Friend Duels, for every Player.** Rooms, codes and links, join, resume, the WebSocket, `DuelRoom`, `DuelSafety`, Reactions, Report and Block (Block closes the room, D13), Sparks, the lobby with Duel a friend and I have a code, the parent note and privacy text for Friend Duels. No Duel key, no `teen` boolean, no queue: nothing in phase 1 depends on the Age answer except that the app asks for one before a first online Duel (as before a first post). Phase 1 launches on its own, behind the off switch, after its owner tasks (approval, the lawyer's note, the code-guessing answer, the secrets).
- **Phase 2: Random Duels, for Players whose Age answer is 13 or over.** `DuelQueue`, `canMatch`, Find a player, the Duel key with `prev`, Block pairs, the automatic limits, the `teen: true` boolean and the parent note's Random Duel sentences. A second variable, `DUEL_RANDOM` (`"0"` or `"1"`), turns the queue off on its own: while it is `"0"`, `POST /api/duel/queue` answers `503 closed`, `GET /api/duel/status` answers `{ open, random: false, v }`, and no Player sees Find a player. Phase 2 needs the owner's answer to open question 11 (best-effort Block) before `DUEL_RANDOM` becomes `"1"`.
- **Duel results stay on the device, for every Player.** Wins, Sparks and the Duel count are written only to the device's store; the server forgets the match 10 minutes after it ends (D5). For a Player whose Age answer is under 13 there is no grown-up override: no setting on the device or the server lets a grown-up send their results anywhere or open Random Duels for them. ADR 0006 removed the device Parent step because a switch on the device is not verifiable parental consent; an override would need a real verifiable consent method (a parent account, after the lawyer's opinion), in its own change and its own ADR (Q28).

## Risks and trade-offs

- **Undetectable bots that wait a human time.** Accepted: nothing is posted, Turnstile slows them, and Report and Block plus the queue limits handle the rest.
- **Under-13 age is self-declared.** The same as for Boards; Random Duels carry no text, so the harm from a child in the teen queue is small.
- **Durable Object location:** a room is created near its first caller, so two far-apart friends play with more latency. The 150 ms cap keeps it fair enough.
- **Deploys interrupt matches** for a few seconds. Resume handles it.
- **A Free-plan limit hit closes Duels for the rest of the day.** That is the safe failure; the account is on Paid from the start (Q30), so this applies only if that ever changes.
- **Two Turnstile checks per Duel without an ID token** (D21). Both are normally invisible; the cost is a second or two before the code appears. Open question 12.
- **The room engine is shared with a feature not yet designed** (Live sessions). Mitigation: the engine holds only mechanics, every Duel rule lives in the Duel's modules, and Live sessions extend the engine in their own change with their own tests.
- **Shared module drift:** the app and the Worker could ship different versions of `shared/src/duel/rules.ts` for a few minutes during a deploy (the one Worker deploys both, but open tabs keep the old client). The protocol version, not the rules, is what the two must agree on, and the rules run only on the server.

## Migration plan

Build each phase behind the off switch (`DUEL_OPEN = "0"` in production, then `DUEL_RANDOM = "0"` for phase 2) and an app flag that shows the lobby's actions only when `/api/duel/status` says open. Run the load tests on staging, turn it on for the owner's own devices (a `?duel=1` local override), then open it; phase 2 repeats the same steps for the queue. Rollback: `DUEL_OPEN = "0"`; the lobby then links Party Mode. Removing it entirely is a revert plus a Durable Object migration with `deleted_classes`.

## Open questions (defaults used in this change)

1. Duel key for 13+ Random Duels, rotated weekly, hash only: default yes. Without it, Block and the automatic limits only last one match.
2. Friend Duels play at the host's League: default yes. Alternative: each Player at their own Mode with a handicap, like Party Mode.
3. Turnstile rather than App Check: default Turnstile.
4. Start on Workers Free; move to Paid ($5 a month) when matches pass 400 a day for 7 days: default yes. Answered by `react-typescript` Q30 (2026-10-20): the account is on Workers Paid before that change's phase 2 reaches production, so Duels start on Paid.
5. Duel Sparks (10 a finish, 10 more a win, 100 a day): default yes.
6. Launch waits for the lawyer's note on under-13 Friend Duels and Turnstile: default yes.
7. `/learn/duel` (and an old `#/duel` link) and the Sky Landmark open the Online Duel; Party Mode stays on the Arena shelf: default yes.
8. Report review: a weekly digest through an Access-protected admin read: default yes.
9. The word Duel: `main` retired it with the same-screen game (`GLOSSARY.md`: Party Mode, "Avoid: Duel (retired)"), and there is no `duel` spec any more. This change brings the word back for the online game. Open for the owner: keep Duel for the online game, or pick a new name. No default is assumed here; the glossary marks both entries as pending.
10. Guessing Duel codes from many IP addresses. The per-IP limit bounds one address, not a spread attack: with L live codes, each guess succeeds with chance L / 64 million, so 100 addresses that each pass Turnstile and try 20 a minute for 10 minutes (20,000 guesses) against 1,000 live codes have about a 27% chance of at least one hit. A hit shows the host's Nickname and color and lets the guesser take the free seat; the host still sees who joined and can Block. Default used in this change: a service-wide count of failed joins (a code that is not live), kept for one minute in one small Durable Object; while it is above 100 a minute, every join needs a fresh Turnstile token and the per-IP join limit drops to 5 a minute (realtime-service spec). At 100 failed tries a minute for a code's 10 minutes against 1,000 live codes, the chance of any hit is about 1.6%. Open for the owner: the admission target and whether this control is enough, or whether to add a longer code or have the host confirm the guest before the room admits them. Launch waits for the owner's answer.
11. Block in Random Duels follows the Duel key, which the device makes, so it is best effort against someone who resets their key (D13). Default used in this change: accept that, say so honestly wherever the app or the privacy notice describes Block, and rely on Turnstile, the IP limits, no chat and Block again. Open for the owner before launch: accept best-effort Block, or keep Random Duels out of launch until a stronger control exists. With the phases (D22), the second choice means phase 2 waits; phase 1 does not depend on it.
12. A `room` session ticket and the per-call Turnstile (D21, added by the re-plan). Default used in this change: keep the approved rule, so create, join and queue each need a fresh Turnstile token even with a valid session ticket. Alternative for the owner: let the `room-session` check stand in for the action's check (the Worker issues the session ticket and makes or joins the room in one call, one Turnstile check per Duel), which is as strong against match farming but changes the API shape D3 and `react-typescript` D17 describe; or let one session ticket serve 30 minutes of Duels, which is weaker and would link Duels of one tab, so it is not offered for under-13 Players. The service-wide failed-join rule demands a fresh token on every join while it is on, whatever the answer.
