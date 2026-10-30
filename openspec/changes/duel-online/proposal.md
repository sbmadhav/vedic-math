# Proposal

Status: plan only, not yet approved for implementation. The owner decisions it cites answer design questions; they do not approve this change, and merging this plan is not that approval.

Kept (owner, 2026-10-19, Q26): true online multiplayer Duels between any two Players or two friends stay in scope; the 2026-10 retirement of the same-screen Duel (now Party Mode) does not change that. Re-planned 2026-10-21 onto the React and TypeScript stack (`react-typescript` task 12.3, ADR 0012), as the owner decided on 2026-10-20 (N4, Q27, Q28): the approved rules stay (M1 to M3, design D1 to D19 and the D20 load test gate), and only what the stack changes is revised. `worker/` becomes `workers/src/rooms/` on a small room engine that Live sessions will share later (`react-typescript` D18); the shared modules are strict TypeScript in `shared/src/`; `js/duel/safe-html.js` becomes the `Markup` component with the shared allow-list; the views are React route modules under `/learn/`; the join link is `/learn/arena/duel#<code>`; and access follows `react-typescript` D17 (a verified Firebase ID token when the Player already has one, otherwise a Worker-signed `room` session ticket issued after Turnstile, never creating an identity). It is built fourth of the follow-on changes (`react-typescript` D3), in two phases: Friend Duels for every Player, then Random Duels for 13 and over. Design "Re-plan for React and TypeScript" lists each change.

## Why

The Duel was two Players on one screen. PR #47 replaced it with Party Mode (archived as `play-experiences`; `GLOSSARY.md` on `main` lists Duel as retired for the same-screen game) (two to four Players on one screen, each at their own Mode). Children and teens also want to race a friend who is not in the same room, and teens want a quick race against someone new. The owner decided (2026-10-17, decisions M1 to M3, all accepted) that the Duel comes back as true online multiplayer:

- **M1:** friends by invite link or 6-letter code for everyone; random matchmaking for Players 13 and over only, in the same League; no chat at all, only preset Reactions; generated Nicknames only; Report and Block.
- **M2:** Cloudflare Durable Objects: one object per match holding both WebSockets and generating the questions from a seed with the same question generators the app uses (one shared module), acting as the authoritative referee (first right answer, scoring, anti-cheat), plus a matchmaking queue object; free or low cost.
- **M3:** the backend is TypeScript on Cloudflare Workers, strictly typed and small. Rust only later, as WASM for one isolated CPU-heavy module, and only if a measurement shows the need.

The owner confirmed on 2026-10-20 (N4) that these rules stay on the new stack: Friend Duels by room code first, Random Duels for 13 and over only, and under-13 results on the device with no grown-up override until a verifiable consent method exists (Q28, ADR 0006).

## What Changes

- **Online Duel** at `/learn/arena/duel` (and `/learn/duel`, which until now opened Party Mode): two Players on two devices get the same question at the same moment; the server decides who answered right first; first to 10 points wins. Choices are tapped (or keys 1 to 4), as in the old Duel.
- **Phase 1, Friend Duel, for every Player:** a Player taps "Duel a friend", gets a 6-letter Duel code and a link (`/learn/arena/duel#<code>`; the code is in the fragment, which the hash shim leaves alone and the server never sees), and shares it in person, by phone or through the share sheet. The friend types the code or opens the link. No account, no friend list, and nothing about either Player kept more than 10 minutes after the match. The host's League is the Duel's League.
- **Phase 2, Random Duel, for Players whose Age answer is 13 or over:** "Find a player" waits up to 60 seconds for another Player in the same League. Under-13 Players never see it. It has its own switch, so it can open after Friend Duels.
- **Safety by design:** no chat and no typed text of any kind; six preset Reactions with a rate limit and a mute; the Players' own generated Nicknames and avatar colors, checked against the word lists by the server; Report (four fixed reasons, no text) and Block on every match screen; automatic limits on reported devices in Random Duels.
- **Server (TypeScript, in the existing `workers/` workspace):** the site's one Worker gains `/api/duel/*`. A room engine in `workers/src/rooms/engine/` (a Durable Object per room with WebSocket hibernation, a code allocator, seats, a server clock, persistence after each step, the 10-minute deletion), and on it `DuelRoom` (one per match: seats, questions from a server-only seed, the referee, timeouts, reconnection), `DuelQueue` (one per League: the 13+ waiting line and its Block list, phase 2) and `DuelSafety` (reports, kept 30 days). The protocol, the referee rules, the question generators, the Nickname lists and the markup allow-list are shared TypeScript modules in `shared/src/` used by the app and the Worker.
- **Access without an identity:** every call that makes, enters or resumes a match carries a Firebase ID token the page already holds (verified, then dropped) or a `room` session ticket the Worker signs after Turnstile, asked for each Duel; a `voice` ticket never opens a room, and a Duel never loads Firebase or creates an identity.
- **Abuse resistance:** Cloudflare Turnstile before a Duel code is made, joined or a Random Duel is started; signed one-minute seat tickets for the WebSocket; rate limits per connection and per (hashed, never stored) IP address; message size and type checks; the server never sends an answer before the question is resolved; answers faster than a human can tap count as misses.
- **Privacy:** no direct identifier (name, email, account, IP address, age) is kept. The one pseudonymous value kept is the hash of a 13+ Player's weekly Duel key, sent only for Random Duels so Block and the automatic limits work across matches; it is kept at most 7 days, or 30 days inside a report (design D14). A Firebase ID token, sent only by a Player who already has one, is checked and thrown away. The server holds a match only while it runs and deletes it 10 minutes after it ends; reports keep no Nickname, no IP and no text. Under-13 Players get no lasting identifier of any kind, and their Duel results stay on the device with no grown-up override. The parent note, `cloud/README.md` and the privacy policy drafts describe exactly this.
- **Unchanged:** Arena daily rounds, Ranked rounds, Boards and Firebase. A Duel never posts to a Board and never creates a Firebase identity. Sparks from Duels stay on the device like any Practice and count toward the weekly Sparks total, capped at 100 a day. Party Mode stays as the same-screen game at `/learn/arena/party`.

## Out of scope

- Chat, typed names, friend lists, accounts, profiles, avatars beyond the five colors.
- More than two Players online, spectators, tournaments, classroom rooms, QR codes (possible later changes).
- Live sessions: a later change on the same room engine, proposed after this one is approved (`react-typescript` task 12.4).
- A Duel Rating, Duel Boards or any World board for Duels.
- Matching by Rating or by region (League only).
- Playing the computer when no one is waiting (a later change could add a ghost from Ghost Races).
- Rust or WASM (ADR 0010: only after a measured need).
- A grown-up override for under-13 results, paid plans, and anything that needs verifiable parental consent (its own change and ADR, Q28).

## Modes and Players affected

- **Explorer, Challenger, Pro:** every Mode gets Friend Duels, worded for the Mode (Explorer hears the question read aloud on its own device and taps big choices).
- **Players whose Age answer is under 13:** Friend Duels only, with no lasting identifier; no Random Duel, no Duel key, no Firebase token; results stay on the device.
- **Players 13 and over:** Friend Duels and, from phase 2, Random Duels; a Duel key that changes every week (only its hash is sent) lets Block and Report work across matches.
- **Players with no Age answer yet:** asked the Age answer before their first online Duel, as before a first post.
- **Calm Players:** a Duel is a timed race; the lobby says so and offers Party Mode or Arena Practice.

## Capabilities

### New Capabilities

- `online-duel`: Friend and Random Duels, the match rules, the referee, timeouts, leaving and coming back, the end, Sparks, offline.
- `duel-safety`: no chat, preset Reactions, generated Nicknames, Report, Block, the under-13 rules (no lasting identifier, results on the device) and abuse handling.
- `realtime-service`: the Worker and Durable Objects on the room engine, the protocol version, access proofs, seat tickets, Turnstile, rate limits, what is stored and for how long, IP handling, logs, the off switches and the load test gate.

### Modified Capabilities

- `play-experiences` (added by PR #47): RENAMED "Party Mode replaces the Duel" to "Party Mode is the same-screen game", and MODIFIED so `/learn/duel` (and an old `#/duel` link) opens the Online Duel and Party Mode stays at `/learn/arena/party`.
- `analytics`: ADDED "Duel events".
- `parent-note`: ADDED "The note describes online Duels", "The note says what keeps Duels safe" and "The note says how long Duel data is kept".
- `third-party-requests` (added by the `learnvedicmath` change): ADDED "Turnstile only when a Duel is started".

## Order and dependencies

Built fourth of the follow-on changes after `react-typescript` (D3 there: `placement`, `age-bands`, `render-performance`, then this, then Live sessions, then `gpu-effects`). It needs `react-typescript` phases 2 and 3 on `main` (the React Router shell on Workers, `/learn/` paths with the hash shim, `shared/src/questions.ts`, `names.ts`, `markup.ts` and `Markup`), and `learnvedicmath` and PR #47 archived. `workers/src/auth/` (`react-typescript` D17) is built by that change's phase 8 or by this one, whichever comes first, to the same shape. The account is on Workers Paid by then (`react-typescript` Q30).

ADRs: 0009 (Cloudflare Durable Objects for real-time play) and 0010 (TypeScript, not Rust, for the backend now), both updated for the re-plan; 0012 (React and TypeScript for the game) is the reason for it.

## Impact

- `workers/`: `src/rooms/engine/` (room base, codes, seat tickets, clock, logs), `src/rooms/duel/` (`http.ts`, `room.ts`, `queue.ts`, `safety.ts`, `limits.ts`), `src/auth/` if not built yet, Vitest in the Workers runtime, load bots in `test/load/`; `wrangler.jsonc` (Durable Object bindings and migrations, rate limit bindings, `DUEL_OPEN` and `DUEL_RANDOM`, a staging environment, logs settings).
- `shared/src/`: `duel/protocol.ts` and `duel/rules.ts` (new); `questions.ts` (the `ramp` option), `names.ts` (`isNickname`, `isAvatar`), `markup.ts` (the Duel's class rule), `policy.json` (Turnstile).
- `app/src/`: `views/duel/` (route module with Lobby, Waiting, Join, Match and End), `logic/duel/client.ts`, `hooks/useDuel.ts`, `routes.ts` (`/learn/arena/duel`, `/learn/duel`), `logic/cloud.ts` (`canMatch`), `logic/store.ts` (Duel key per 13+ Player, phase 2), the Sky Landmark, the Guide's Duel section, metrics (Duel events), the parent note, `sw/sw.ts` (never touches `/api/duel/`).
- Docs: `docs/adr/0009`, `docs/adr/0010`, `GLOSSARY.md`, `cloud/README.md`, `docs/legal/` privacy policy and retention drafts, new `docs/legal/duel-dpia.md`, new `docs/agent/rooms.md`, `AGENTS.md`.
- Tests: Vitest for the shared modules, the engine and the Duel objects; Playwright `e2e/tests/duel.spec.ts` (two browser contexts against the Worker running locally, never production), `routes.spec.ts`, `old-routes.spec.ts`, `a11y.spec.ts`, `third-party.spec.ts`, `privacy.spec.ts`, `csp.spec.ts`, and coverage specs in `e2e/tests/cov/`.
