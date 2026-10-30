# Tasks

Re-planned 2026-10-21 onto the React and TypeScript stack (`react-typescript` task 12.3; design "Re-plan for React and TypeScript"). Built fourth of the follow-on changes, after `placement`, `age-bands` and `render-performance` (`react-typescript` D3), in two phases: Friend Duels for every Player, then Random Duels for 13 and over (design D22). Tasks marked **[OWNER]** need the owner. "Verify:" says how a task is checked. No test ever talks to the production Duel service or production Firebase; end-to-end Duel tests run two browser contexts against the Worker running locally.

## 0. Before building

- [ ] 0.0 **[OWNER]** Approve this change for implementation (merging the plan is not approval). Its order is set by `react-typescript` D3.
- [ ] 0.1 Confirm the prerequisites: `react-typescript` phases 2 and 3 are on `main` (the React Router shell on Workers with `/learn/` paths and the hash shim, `shared/src/questions.ts`, `names.ts` and `markup.ts`, task 3.1) and `Markup` (task 4.5); `learnvedicmath` is archived (`third-party-requests`); PR #47 is archived (`play-experiences`, done). Merge `main` in and update any path in `design.md` that moved since 2026-10-21.
- [ ] 0.2 Verify: `openspec validate duel-online --strict` reports no "Archive would refuse" notice. If `play-experiences`' "Party Mode replaces the Duel" text changed (for example to path URLs), copy the new text into the delta first.
- [ ] 0.3 **[OWNER]** Answer the open questions in `design.md` (Duel key, host's League, Turnstile, Duel Sparks, lawyer before launch, `/learn/duel` and the Landmark, report review, the word Duel, the code-guessing target and control, best-effort Block, the session ticket and the per-call Turnstile). Question 4 is answered by `react-typescript` Q30. Fold a different answer in with `/opsx:update`.
- [ ] 0.4 **[OWNER]** Lawyer review of D14 together with the move's privacy policy: the internal-operations basis for under-13 Friend Duels (the server voice relies on the same basis), Turnstile as a third party, the Firebase ID token as an access proof, the notice and retention text, the 13+ gate for Random Duels. Phase 1 launch (task 10.3) waits for the answer on Friend Duels; phase 2 (task 15.3) for the rest.
- [x] 0.5 Re-plan onto `react-typescript` (its task 12.3): `workers/src/rooms/` on a shared room engine, `shared/src/*.ts`, `Markup`, React route modules, `/learn/arena/duel#<code>`, access by design D17 there, the two phases, under-13 results on the device with no grown-up override; ADR 0009 and ADR 0010 updated. Done 2026-10-21 (PR #124): proposal, design (Context, "Re-plan for React and TypeScript", D1 to D4, D7 to D20 where the stack changed, new D21 and D22, open question 12), every spec delta and these tasks revised; approved rules unchanged. Verify: `openspec validate duel-online --strict` passes.

## 1. Owner setup

- [ ] 1.1 **[OWNER]** Cloudflare dashboard > Turnstile: add a widget for `learnvedicmath.com` (managed mode). Give the site key to the builder (public); save the secret with `npx wrangler secret put TURNSTILE_SECRET` at the repo root (never in chat).
- [ ] 1.2 **[OWNER]** `npx wrangler secret put DUEL_TICKET_KEY` and `IP_SALT` (32 random bytes each, `openssl rand -base64 32`), for production and `--env staging`; `TICKET_KEY` too if `react-typescript` task 11.7 has not set it. Calendar a monthly `IP_SALT` rotation.
- [ ] 1.3 **[OWNER]** Cloudflare Access (free, one user): protect `/api/duel/admin/*` with your own email login. Steps in `docs/agent/rooms.md`.
- [ ] 1.4 **[OWNER]** Extend the zone's one rate-limiting rule to also match `/api/duel/*` (120 requests a minute per IP, block 10 s).
- [ ] 1.5 **[OWNER]** Usage notifications on Workers Paid (the account moves there in `react-typescript` task 0.8) at 50% and 90% of the included Durable Object duration.

## Phase 1: Friend Duels, for every Player

## 2. Shared modules (D2)

- [ ] 2.1 `shared/src/questions.ts`: add the `ramp` option to `makeSet` (Pro from level 6 to 14 over the first 20 questions) if `react-typescript` task 3.1 did not. Verify: the golden `dailySet()` test from that task (fixed dates, every League) is unchanged and green; a Vitest case for the ramp.
- [ ] 2.2 `shared/src/names.ts`: `isNickname` and `isAvatar` if missing. Verify: Vitest cases; the existing test that `cloud/firestore.rules` lists the same words stays green.
- [ ] 2.3 `shared/src/duel/protocol.ts`: version, constants (goal 10, time limits, Reactions, report reasons, close codes), message types as discriminated unions, `parseClient` and `parseServer` with exact keys and ranges (every D4 message, `matched` included). Verify: Vitest with valid frames of every type, every invalid shape (extra field, wrong type, over 256 bytes, bad JSON, unknown Reaction), and a property test of 10,000 random frames that never throws.
- [ ] 2.4 `shared/src/duel/rules.ts`: the pure referee (`start`, `step`) for D5 and D6: seating, ready, countdown, deal, answer, miss, too fast, resolution window, point, reveal, timeout, pause, resume, grace accounting (1001 drops excluded), idle, limit, goal, rematch, leave, report, block. Verify: Vitest covers every row of the D5 table and each `online-duel` scenario the server decides, with an injected clock.
- [ ] 2.5 The Duel's class rule in `shared/src/markup.ts` (D4): an option that keeps a `class` only when it starts with `vz-`, `sc-` or `hl`. Verify: Vitest and React Testing Library: every generator's output for each League renders unchanged with the option, and hostile input (script, event attributes, `style`, `href`, foreign classes) is removed; the same output in the browser and the Workers runtime.
- [ ] 2.6 Verify: `pnpm --filter shared typecheck` (strict, no DOM lib) and `pnpm lint` pass over all of them.

## 3. Worker: access and the room engine (D17, D21)

- [ ] 3.1 `workers/src/auth/` if `react-typescript` phase 8 has not built it: `firebase.ts` (ID token check, D17 there), `session.ts` (`POST /api/session` for `voice` and `room` scopes, 30-minute HMAC with `TICKET_KEY`, a `room` ticket only after Turnstile action `room-session`), `turnstile.ts` (siteverify with hostname and action checks; Cloudflare's test keys in tests), `ip.ts` (salted IP hash, rate limit helper). Verify: Vitest in the Workers runtime: a fixture-JWKS token accepted and wrong `aud`, `iss`, expiry and signature refused; good, expired, tampered and wrong-scope session tickets; a `voice` ticket refused on every Duel path; Turnstile pass, fail, wrong hostname, wrong action.
- [ ] 3.2 `wrangler.jsonc`: Durable Object bindings `DUEL_ROOM` and `DUEL_SAFETY`, migration `duel-v1` with `new_sqlite_classes`, `ratelimits`, `vars` (`TURNSTILE_SITEKEY`, `DUEL_OPEN`, `DUEL_RANDOM`), `env.staging`, `observability` with invocation logs off. Verify: `pnpm --filter workers check` (wrangler dry run) for production and `--env staging`.
- [ ] 3.3 The room engine in `workers/src/rooms/engine/`: `room.ts` (hibernating WebSockets with seat attachments, the seat-ticket check on upgrade, a pure `step` from the room kind, state written to SQLite after each step, `setTimeout` timers in play and one alarm otherwise, cleanup 10 minutes after close, a failed storage write closes the room), `codes.ts` (20 consonants, rejection sampling, claim and redraw), `seat-ticket.ts` (60 s, single use), `clock.ts` (ping median, the 150 ms cap), `log.ts` (allow-listed fields). Nothing in it names a Duel. Verify: Vitest with a tiny test room kind: hibernation and wake, persistence across a restarted object, cleanup alarm, good, expired, reused, tampered and wrong-kind seat tickets, codes uniform over the alphabet and redrawn when live.
- [ ] 3.4 `workers/src/rooms/duel/limits.ts`: the D11 limits on the shared helper (the `DuelLimits` fallback object only if a limit cannot use the binding). Verify: Vitest for each D11 row.
- [ ] 3.5 Logs: one line per match end and per error code, fields from D14 only. Check the dashboard's observability settings match (invocation logs off). Verify: a Vitest run captures every log line in a full match and finds no IP, hash, Nickname, code, seat ticket, session ticket, ID token or key.

## 4. Durable Objects and endpoints for Friend Duels

- [ ] 4.1 `DuelRoom` on the engine, calling `shared/src/duel/rules.ts` for every event. Verify: Vitest with two sockets for a full match, a timeout, both missed, a too-fast bot, a drop and resume, a 1001 drop, a leave, a rematch, and "storage empty 11 minutes after the end" (alarm run in the test).
- [ ] 4.2 `workers/src/rooms/duel/http.ts`: `POST /rooms`, `/rooms/join`, `/rooms/resume` (the code in the body, never in the path), `GET /status`, the WebSocket route, each with the access proof (D21) and, for create and join, Turnstile; 15 LOBBY rooms per hashed IP; codes in any case and with spaces. Verify: Vitest for each answer code in D3, `401` without a proof or with a `voice` ticket, an ID token and a `room` ticket both accepted, case and space handling of codes.
- [ ] 4.3 The service-wide failed-join count (one small Durable Object, one-minute window): above 100 a minute, every join needs a fresh Turnstile token and the per-IP join limit is 5 a minute (open question 10). Verify: Vitest for the `realtime-service` scenario "Guessing codes from many addresses".
- [ ] 4.4 `DuelSafety`: report records (D13 shape), 30-day deletion by alarm, the Access-protected `GET /api/duel/admin/digest` (counts only), `pnpm --filter workers reports`. Verify: Vitest for the record shape (no Nickname, IP, code or text), deletion at 30 days, and the admin route refusing a request without the Access header.
- [ ] 4.5 The off switch (`DUEL_OPEN`) and fail-closed on plan limits (a Durable Object call that errors with a limit returns `503 closed`). A running room whose storage write fails ends the match with `end server`, offers no rematch and refuses resume. Verify: Vitest for the off switch, a limit error on room creation, and a failing storage write in the middle of a match (`end server`, then resume refused).

## 5. App for Friend Duels (D16)

- [ ] 5.1 Routes in `app/src/routes.ts`: `/learn/arena/duel` (the lobby, and the join confirmation for a `#<code>` fragment) and `/learn/duel` landing on the lobby instead of Party Mode, before the Play experience pattern; route views counted from the matched route only. The Sky Landmark returns to "Duel"; the Guide's Duel and Party Mode sections. Verify: `routes.spec.ts` and `old-routes.spec.ts` (`/learn/duel`, `/play/#/duel` and `#/duel` reach the lobby; `/learn/arena/duel#BKTRMZ` keeps its fragment through the hash shim); `sky.spec.ts`; `guide.spec.ts`; the analytics scenario from the spec delta.
- [ ] 5.2 `app/src/logic/duel/client.ts` and `app/src/hooks/useDuel.ts`: one socket per match, seat ticket in the subprotocol, reconnect with backoff inside the grace, the `sessionStorage` session deleted at the end, every listener, timer and retry tied to the round's signal; leaving the route sends `leave`. The `no-bare-lifecycle` rule's scope extended to `app/src/logic/duel/`. Verify: Vitest with a fake WebSocket and fake timers; the lint rule's fixture for the new scope.
- [ ] 5.3 `app/src/views/duel/`: `Lobby` (Calm note, offline and resting states, no Find a player in phase 1), `Waiting` (code, Copy, Share), `Join` with the stranger line, `Match` (deals through `Markup` with the Duel option), `End` with Rematch, Report and Block, the Reactions tray and mute, keys 1 to 4, announcements. Server-safe: the frame renders on the server, everything that reads the Player, the fragment or the network inside `ClientOnly`. Copy for every Mode, no em dashes. Verify: `e2e/tests/duel.spec.ts` (task 6.2); `a11y.spec.ts` axe run on the lobby, waiting room, match and end screens; no hydration warning on a cold load of `/learn/arena/duel` and `/learn/arena/duel#BKTRMZ`; lint passes (server-safety rule).
- [ ] 5.4 The Age answer prompt before a first online Duel when it is missing (as before a first post); the access proof chooser (an ID token only when the page already holds one with 5 minutes left, else a `room` session ticket; never loading Firebase). Verify: Vitest for the chooser; `duel.spec.ts` sees no request to any Firebase host in a full Duel, with and without a World board post earlier in the session.
- [ ] 5.5 Duel Sparks (10, 10 more for a win, 100 a day, none for idle or under 5 answers), on the device only. Verify: Vitest in the gamify suite.
- [ ] 5.6 "Show Reactions" switch on Me. Verify: `duel.spec.ts` muted scenario.
- [ ] 5.7 Turnstile loader: only on the taps that need it, managed mode, interaction-only, tokens per action (`duel-create`, `duel-join`, `room-session`). Add `challenges.cloudflare.com` to `shared/src/policy.json` (`script-src`, `frame-src`) with its reason, so `_headers` and the Worker's headers both carry it; `sw.ts` never handles `/api/duel/`. Verify: `third-party.spec.ts` scenarios from the spec delta; `csp.spec.ts` sees no violation in a full Duel on a server-rendered and a prerendered entry; the test that compares the Worker's headers with `_headers` stays green.

## 6. End-to-end tests for phase 1

- [ ] 6.1 The e2e server runs the built Worker locally (`wrangler dev`, or the app's Vite dev server with the Cloudflare plugin, whichever `docs/agent/e2e.md` names then) with the Turnstile always-pass test key; `e2e/tests/fixtures.ts` gains a tripwire that fails any test sending a request to the production `/api/duel/` or to production Firebase (`firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`), whatever key it carries; `challenges.cloudflare.com` is allowed only with the Turnstile always-pass test site key.
- [ ] 6.2 `e2e/tests/duel.spec.ts` (two browser contexts, chromium and mobile; WebKit for the UI where the local Worker allows): every phase 1 `online-duel` and `duel-safety` scenario a browser can show: code and link join, expired code, full room, under-13 lobby, the same question on both, wrong then right, timeout, reaching 10, rematch, connection drop and return (context offline for 8 s), gone for good, Sparks and no Firebase request, offline lobby, resting lobby, keyboard 1 to 4, screen reader status, mute, Reaction rate limit, Report and Block in a Friend Duel, the join confirmation's stranger line.
- [ ] 6.3 `privacy.spec.ts`: a full Friend Duel sends no Player id, Age answer, Rating or Firebase request, no analytics request contains the code, and no request URL a server sees contains the code.
- [ ] 6.4 One coverage spec per phase 1 scenario in `e2e/tests/cov/` (`<spec>-<n>.spec.ts`), added when the scenarios go live, as `docs/agent/e2e.md` describes.

## 7. Docs and copy for phase 1

- [ ] 7.1 The parent note (its React view) and `cloud/README.md` (a "Duels" section: what is sent, kept and for how long; no Firebase involved beyond a token the page already holds, checked and dropped). Verify: the copy test checks the parent-note scenarios word for word; e2e reads it on the Me page.
- [ ] 7.2 Privacy policy and retention drafts in `docs/legal/`: add Friend Duels (D14 table), Turnstile and Cloudflare as processors, the access proof, the internal-operations disclosure; new `docs/legal/duel-dpia.md`. **[OWNER]** lawyer review (task 0.4).
- [ ] 7.3 `docs/agent/rooms.md`: the room engine and the Duel (architecture, protocol summary, local runs, secrets, the off switches, the report digest, load tests, the deploy rule for the protocol version window, Cloudflare Access steps), listed in `AGENTS.md`'s index.
- [ ] 7.4 `AGENTS.md` Guardrails: "never test against the production Duel service" and the off switches in one or two lines; a rule for how room code is written goes in `CODING_STANDARDS.md`; details in `docs/agent/rooms.md`. `GLOSSARY.md`: the Duel entries lose "proposed" for Friend Duels when phase 1 ships.

## 8. Load tests for phase 1 (D20)

- [ ] 8.1 Bots in `workers/test/load/` reusing `shared/src/duel/protocol.ts`; `LOAD_TEST_KEY` honoured only when `env.ENVIRONMENT === 'staging'`. Verify: a Vitest case proves production config ignores the key.
- [ ] 8.2 Run L1, L3, L4 (without its queue rows), L5 and L6 with Friend Duels against staging before launch; write `workers/test/load/RESULTS.md` with the numbers and pass or fail per run. Fix and re-run until all pass.
- [ ] 8.3 Keep the gate: every later pull request that changes `shared/src/duel/rules.ts`, `workers/src/rooms/duel/room.ts`, `workers/src/rooms/engine/room.ts` or the protocol version re-runs the load tests and updates `RESULTS.md` in the same pull request (a note in `docs/agent/rooms.md` and the pull request template). Verify: the `realtime-service` scenario "Before a protocol change ships".

## 9. Checks before phase 1 launch

- [ ] 9.1 Security review of `workers/src/rooms/` and `workers/src/auth/` (the `security-review` skill or a manual pass): input validation, ticket and token handling, no secrets or tokens in logs, Access on admin, the CSP.
- [ ] 9.2 The byte budget (`performance-budget`, as `react-typescript` and the re-planned `render-performance` define it): the Duel route's chunks are not in the first load of any other route, and the Duel route's own graph is under 80 KB Brotli.
- [ ] 9.3 Safari and Firefox: the WebSocket under `connect-src 'self'` (add `wss://learnvedicmath.com` to `policy.json` only if needed); Turnstile managed mode on an older iPad; reconnect after a locked phone. Verify: notes in `docs/agent/rooms.md`.
- [ ] 9.4 Release check: two real phones on different networks play a Friend Duel to 10; Report and Block work; 11 minutes later the admin digest shows the report and no room data.

## 10. Phase 1 launch

- [ ] 10.1 Deploy with `DUEL_OPEN = "0"` and `DUEL_RANDOM = "0"`; the app hides the lobby's actions while closed. Verify: production `/api/duel/status` says closed; the lobby says resting.
- [ ] 10.2 **[OWNER]** Owner's own devices with the local `?duel=1` override: one Friend Duel.
- [ ] 10.3 **[OWNER]** Lawyer's answer on Friend Duels from task 0.4 received and folded into the privacy policy; open question 10 answered.
- [ ] 10.4 **[OWNER]** Set `DUEL_OPEN = "1"`.

## Phase 2: Random Duels, for Players 13 and over (D9, D13, D22)

## 11. Queue and Duel key on the server

- [ ] 11.1 `DuelQueue` in `workers/src/rooms/duel/queue.ts`, binding `DUEL_QUEUE`, migration `duel-v2`: per League, hibernating waiting sockets, pairing the longest waiting compatible Player, one socket per key, 60 s wait, Block pairs for 7 days both ways checked against `key` and `prev`, the automatic limits from D13. Verify: Vitest: pairing order, blocked pair never paired (also after one Player's key changes week), same key replaced, 60 s expiry, limit after three reports from distinct keys, limit after too-fast answers in three Duels.
- [ ] 11.2 `POST /api/duel/queue` with the access proof, Turnstile action `duel-queue`, `teen: true` required and not stored, and `DUEL_RANDOM`: while `"0"` it answers `503 closed` and the status says `random: false`. Block in a Random Duel stores the pair through the queue. Verify: Vitest for each answer, the switch, and Block pairs from a room.

## 12. App for Random Duels

- [ ] 12.1 `canMatch(p)` next to `canPost` in `app/src/logic/cloud.ts`; the weekly Duel key for 13+ (`vm.duelKey.<player id>`), the replaced key kept 7 more days for `prev`, both removed with the Player. Verify: Vitest; the store suite checks removing a Player removes their keys.
- [ ] 12.2 The lobby's Find a player for 13+ only while the status says `random: true`, the 60 s wait with Try again and Duel a friend, the "not available right now" copy for a limited key, and the Report reasons for Random Duels. Verify: `duel.spec.ts` phase 2 scenarios: under-13 and no-Age lobby without Find a player, nobody waiting (wait shortened by a test-only variable in the local Worker), matched, Blocked in a Random Duel, a Block across the week change, three reports.
- [ ] 12.3 Parent note and privacy drafts gain the Random Duel sentences (the 13+ yes, the scrambled weekly Duel key, Block pairs and limits for 7 days). Verify: the copy test for the parent-note scenarios.
- [ ] 12.4 Coverage specs for the phase 2 scenarios in `e2e/tests/cov/`.

## 13. Load tests for phase 2

- [ ] 13.1 Run L2 and the queue parts of L4 against staging; update `RESULTS.md`. Fix and re-run until all pass.

## 14. Checks before phase 2 launch

- [ ] 14.1 Security review of `queue.ts` and the Duel key handling.
- [ ] 14.2 Release check: a teen test Player finds a match on a second device; Block holds when both queue again; the automatic limit blocks a key after three reports from test keys.

## 15. Phase 2 launch

- [ ] 15.1 Deploy with `DUEL_RANDOM = "0"`. Verify: the status says `random: false`; no Player sees Find a player.
- [ ] 15.2 **[OWNER]** Owner's own devices with the `?duel=1` override and a 13+ test Player: one Random Duel.
- [ ] 15.3 **[OWNER]** Lawyer's answer on the 13+ gate and the Duel key from task 0.4 folded in; open question 11 answered (best-effort Block accepted, or phase 2 waits).
- [ ] 15.4 **[OWNER]** Set `DUEL_RANDOM = "1"`.

## 16. After launch

- [ ] 16.1 Weekly: the report digest and the match-end log counts; usage against D19's thresholds.
- [ ] 16.2 After two weeks of phase 2 with no protocol change and no incident, archive with `/opsx:archive`. If phase 2 is held back (open question 11), archive phase 1 first by moving the phase 2 requirements into a new change.
