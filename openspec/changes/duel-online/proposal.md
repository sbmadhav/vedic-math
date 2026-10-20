# Proposal

Status: plan only, not yet approved for implementation. The owner decisions it cites answer design questions; they do not approve this change, and merging this plan is not that approval.

Kept (owner, 2026-10-19): the owner approved keeping this change in scope, so true online multiplayer Duels between any two Players or two friends are still planned; that keeps the plan, it does not approve implementation (see Status), and the 2026-10 retirement of the same-screen Duel (now Party Mode) does not change that. Superseded in part: the game moves to React and TypeScript first (`react-typescript`, ADR 0012), so this change is re-planned before it is built (`react-typescript` task 12.3), fourth of the follow-on changes: `worker/` becomes `workers/`, the shared modules become TypeScript in `shared/` (not JS with `// @ts-check`), `js/duel/safe-html.js` becomes the `Markup` component, and the views are React. Owner, 2026-10-20 (N4): the approved rules stay and the re-plan targets React Router on Cloudflare Workers with a Durable Object room engine shared with the later Live sessions change; Friend Duels by room code first, Random Duels for 13 and over only, under-13 results on the device with no grown-up override until a verifiable consent method exists (Q28, ADR 0006). Access (Q27): a verified Firebase ID token when the Player has one, otherwise a short-lived anonymous ticket the Worker signs, plus Turnstile; a Duel still never creates an identity. The join link becomes `/play/arena/duel#<code>` (the code stays in a fragment the hash shim leaves alone, so it never reaches a server log), replacing `/play/#/arena/duel/<code>` below. The `#/arena/duel` and `#/duel` route declarations below are historical too: task 12.3 replaces them with the paths `/play/arena/duel` and `/play/duel` (`react-typescript` design D5, D17, D18). This text is not revised for that yet.

## Why

The Duel was two Players on one screen. PR #47 replaced it with Party Mode (archived as `play-experiences`; `GLOSSARY.md` on `main` now lists Duel as retired) (two to four Players on one screen, each at their own Mode). Children and teens also want to race a friend who is not in the same room, and teens want a quick race against someone new. The owner decided (2026-10-17, decisions M1 to M3, all accepted) that the Duel comes back as true online multiplayer:

- **M1:** friends by invite link or 6-letter code for everyone; random matchmaking for Players 13 and over only, in the same League; no chat at all, only preset Reactions; generated Nicknames only; Report and Block.
- **M2:** Cloudflare Durable Objects: one object per match holding both WebSockets and generating the questions from a seed with the same question generators the app uses (one shared JS module), acting as the authoritative referee (first right answer, scoring, anti-cheat), plus a matchmaking queue object; free or low cost.
- **M3:** the backend is TypeScript on Cloudflare Workers, strictly typed and small. Rust only later, as WASM for one isolated CPU-heavy module, and only if a measurement shows the need.

This is the second change after the learnvedicmath.com move (M6), built after `render-performance`.

## What Changes

- **Online Duel** at `#/arena/duel` (and `#/duel`): two Players on two devices get the same question at the same moment; the server decides who answered right first; first to 10 points wins. Choices are tapped (or keys 1 to 4), as in the old Duel.
- **Friend Duel, for every Player:** a Player taps "Duel a friend", gets a 6-letter Duel code and a link (`/play/#/arena/duel/<code>`), and shares it in person, by phone or through the share sheet. The friend types the code or opens the link. No account, no friend list, and nothing about either Player kept more than 10 minutes after the match. The host's League is the Duel's League.
- **Random Duel, for Players whose Age answer is 13 or over:** "Find a player" waits up to 60 seconds for another Player in the same League. Under-13 Players never see it.
- **Safety by design:** no chat and no typed text of any kind; six preset Reactions with a rate limit and a mute; the Players' own generated Nicknames and avatar colors, checked against the word lists by the server; Report (four fixed reasons, no text) and Block on every match screen; automatic limits on reported devices in Random Duels.
- **Server (new, TypeScript):** the move's Worker gains `/api/duel/*`. Durable Objects: `DuelRoom` (one per match: seats, WebSockets with hibernation, questions from a server-only seed, referee, timeouts, reconnection), `DuelQueue` (one per League: the 13+ waiting line and its Block list) and `DuelSafety` (reports, kept 30 days). The protocol, the question generators and the Nickname lists are shared JS modules used by the app and the Worker.
- **Abuse resistance:** Cloudflare Turnstile before a Duel code is made, joined or a Random Duel is started; signed one-minute tickets for the WebSocket; rate limits per connection and per (hashed, never stored) IP address; message size and type checks; the server never sends an answer before the question is resolved; answers faster than a human can tap count as misses.
- **Privacy:** no direct identifier (name, email, account, IP address, age) is sent or kept. The one pseudonymous value is the hash of a 13+ Player's weekly Duel key, sent only for Random Duels so Block and the automatic limits work across matches; it is kept at most 7 days, or 30 days inside a report (design D14). The server holds a match only while it runs and deletes it 10 minutes after it ends; reports keep no Nickname, no IP and no text. Under-13 Players get no lasting identifier of any kind. `parentNote()`, `cloud/README.md` and the privacy policy drafts describe exactly this.
- **Unchanged:** Arena daily rounds, Ranked rounds, Boards and Firebase. A Duel never posts to a Board and never creates a Firebase identity. Sparks from Duels stay on the device like any Practice and count toward the weekly Sparks total, capped at 100 a day. Party Mode stays as the same-screen game.

## Out of scope

- Chat, typed names, friend lists, accounts, profiles, avatars beyond the five colors.
- More than two Players online, spectators, tournaments, classroom rooms, QR codes (possible later changes).
- A Duel Rating, Duel Boards or any World board for Duels.
- Matching by Rating or by region (League only).
- Playing the computer when no one is waiting (a later change could add a ghost from Ghost Races).
- Rust or WASM (ADR 0010: only after a measured need).
- Paid plans, and anything that needs verifiable parental consent.

## Modes and Players affected

- **Explorer, Challenger, Pro:** every Mode gets Friend Duels, worded for the Mode (Explorer hears the question read aloud on its own device and taps big choices).
- **Players whose Age answer is under 13:** Friend Duels only, with no lasting identifier; no Random Duel and no Duel key.
- **Players 13 and over:** Friend Duels and Random Duels; a Duel key that changes every week (only its hash is sent) lets Block and Report work across matches.
- **Players with no Age answer yet:** asked the Age answer before their first online Duel, as before a first post.
- **Calm Players:** a Duel is a timed race; the lobby says so and offers Party Mode or Arena Practice.

## Capabilities

### New Capabilities

- `online-duel`: Friend and Random Duels, the match rules, the referee, timeouts, leaving and coming back, the end, Sparks, offline.
- `duel-safety`: no chat, preset Reactions, generated Nicknames, Report, Block, the under-13 rules and abuse handling.
- `realtime-service`: the Worker and Durable Objects, the protocol version, tickets, Turnstile, rate limits, what is stored and for how long, IP handling, logs, the off switch and the load test gate.

### Modified Capabilities

- `play-experiences` (added by PR #47): RENAMED "Party Mode replaces the Duel" to "Party Mode is the same-screen game", and MODIFIED so `#/duel` opens the Online Duel and Party Mode stays at `#/arena/party`.
- `analytics`: ADDED "Duel events".
- `parent-note`: ADDED "The note describes online Duels".
- `third-party-requests` (added by the `learnvedicmath` change): ADDED "Turnstile only when a Duel is started".

## Order and dependencies

Built after `learnvedicmath` (Cloudflare hosting, the Worker, `third-party-requests`, the privacy drafts, ADR 0006) and `render-performance` (`js/views/`, the route loader) are archived, and after PR #47 is archived (`play-experiences`). The RENAMED and MODIFIED delta on `play-experiences`, which does not exist on `main` yet, shows an "Archive would refuse" notice in `openspec validate --strict` until then.

ADRs: 0009 (Cloudflare Durable Objects for real-time play) and 0010 (TypeScript, not Rust, for the backend now). Numbers follow `learnvedicmath` (0004 to 0006) and `placement` (0007, 0008).

## Impact

- New `worker/` TypeScript project (`src/index.ts`, `src/csp.ts` replacing the move's `worker/csp.js`, `src/duel/*.ts`, tests with `@cloudflare/vitest-pool-workers`, load bots); `wrangler.jsonc` (Durable Object bindings and migrations, `/api/*` in `run_worker_first`, rate limit bindings, a staging environment, logs settings).
- New shared modules: `js/questions.js` (seeded question sets, moved out of `js/arena.js`), `js/names.js` (Nickname word lists, moved out of `js/store.js`), `js/duel/protocol.js`, `js/duel/rules.js`.
- App: `js/views/duel.js`, `js/duel/client.js`, `js/duel/safe-html.js`, `js/arena.js` (imports `questions.js`), `js/store.js` (imports `names.js`; Duel key per 13+ Player), `js/app.js` (routes, `#/duel`), `js/sky.js` (the Landmark), `js/guide.js` (Duel section), `js/metrics.js` (Duel events), `js/cloud.js` untouched.
- Build and CSP: `build.py` third-party list (Turnstile), `_headers` CSP (`connect-src`, `script-src`, `frame-src`), `sw.js` (never touches `/api/`).
- Docs: `docs/adr/0009`, `docs/adr/0010`, `GLOSSARY.md`, `cloud/README.md`, `parentNote()` in `js/app.js`, `docs/legal/` privacy policy and retention drafts, new `docs/legal/duel-dpia.md`, new `worker/README.md`, `CLAUDE.md`.
- Tests: `test/questions.test.mjs`, `test/duel-rules.test.mjs`, `test/duel-protocol.test.mjs`, worker tests, Playwright `e2e/tests/duel.spec.ts` (two browser contexts against a local `wrangler dev`, never production), `routes.spec.ts`, `a11y.spec.ts`, `third-party.spec.ts`.
