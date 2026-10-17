# Cloudflare Durable Objects for real-time play

Online Duels need a server that holds two live connections, deals the same question to both at the same moment, and decides who answered right first, so a modified app cannot award itself points. The site already runs on a Cloudflare Worker (ADR 0004). We use Cloudflare Durable Objects on that same Worker: one object per match (`DuelRoom`) holding both WebSockets with the hibernation API, generating the questions from a seed only it knows, with the same question generators the app uses (one shared JS module), and acting as the referee; one object per League (`DuelQueue`) as the waiting line for Random Duels; and one object (`DuelSafety`) for reports. Every object uses the SQLite storage backend, the only one on the Free plan. The API lives at `/api/duel/` on learnvedicmath.com, so it is same-origin, cookie-free and covered by the existing CSP.

Status: proposed 2026-10-17 in the `duel-online` change (owner decision M2, accepted). Numbered after `learnvedicmath` (0004 to 0006) and `placement` (0007, 0008).

## Considered Options

- **Firebase (Firestore listeners or Realtime Database):** we already use Firebase for Boards, but a client-written game state needs rules to referee timing, which they cannot do well (no server clock per message, no "first of two writes within 100 ms"), and every Duel would create a Firebase identity, against ADR 0002 and ADR 0006 for under-13 Players.
- **Peer to peer (WebRTC data channels):** no server cost, but one browser would be the referee and could cheat; it needs a signalling server and TURN for many school and mobile networks anyway; and it shows each Player's IP address to the other.
- **A long-running server (Fly.io, a VM, Cloud Run with WebSockets):** full control, but a machine to patch and pay for whether anyone plays, and a second vendor with access to children's connections.
- **A managed real-time service (Ably, Pusher, PartyKit on another account):** fast to build, but the referee logic still needs our own server, a new processor sees every message, and free tiers have connection caps.

## Consequences

- One vendor and one deploy for the site and the game server; Duel API calls are the only requests that run Worker code, so static pages stay free.
- The Free plan covers about 600 matches a day (13,000 GB-s); Workers Paid ($5 a month) covers about 20,000 a month, and about 100,000 a month costs about $25 (design D19 in `duel-online`). Hitting a Free daily limit (requests, duration, SQLite rows read or written) refuses new Duels instead of billing; a match already running continues from memory if only storage writes fail, and otherwise ends with `end server` (`duel-online` D19).
- Rooms are placed near their first caller, so far-apart friends see more latency; the referee caps the latency allowance at 150 ms.
- Deploys drop WebSockets; rooms persist their state after every step and clients resume within a 20 s grace.
- The question generators, Nickname lists, protocol and referee rules must stay DOM-free shared modules (`js/questions.js`, `js/names.js`, `js/duel/`), used by both the app and the Worker.
- Leaving later means rewriting the room and queue objects for another runtime; the shared modules and the protocol carry over.
