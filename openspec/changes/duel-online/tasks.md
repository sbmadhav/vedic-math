# Tasks

Second change after the learnvedicmath.com move (owner M6), after `render-performance`. Tasks marked **[OWNER]** need the owner. "Verify:" says how a task is checked. No test ever talks to the production Duel service or production Firebase; end-to-end Duel tests run two browser contexts against a local `wrangler dev`.

## 0. Before building

- [ ] 0.0 **[OWNER]** Approve this change for implementation (merging the plan is not approval), and decide its order against `react-typescript`.
- [ ] 0.1 Confirm `learnvedicmath`, `render-performance` and PR #47 (`play-experiences`) are archived; merge `main` in; update paths in `design.md` (the move's `worker/csp.js`, `js/views/`).
- [ ] 0.2 Verify: `openspec validate duel-online --strict` reports no "Archive would refuse" notice. If `play-experiences`' "Party Mode replaces the Duel" text changed, copy the new text into the delta first.
- [ ] 0.3 **[OWNER]** Answer the open questions in `design.md` (Duel key, host's League, Turnstile, Free then Paid, Duel Sparks, lawyer before launch, `#/duel` and the Landmark, report review). Fold a different answer in with `/opsx:update`.
- [ ] 0.4 **[OWNER]** Lawyer review of D14 together with the move's privacy policy: the internal-operations basis for under-13 Friend Duels, Turnstile as a third party, the notice and retention text, the 13+ gate for Random Duels. Launch (tasks 10.3 and 10.4) waits for the answer.

## 1. Owner setup

- [ ] 1.1 **[OWNER]** Cloudflare dashboard > Turnstile: add a widget for `learnvedicmath.com` (managed mode). Give the site key to the builder (public); save the secret with `npx wrangler secret put TURNSTILE_SECRET` in `worker/` (never in chat).
- [ ] 1.2 **[OWNER]** `npx wrangler secret put DUEL_TICKET_KEY` and `IP_SALT` (32 random bytes each, `openssl rand -base64 32`), for production and `--env staging`. Calendar a monthly `IP_SALT` rotation.
- [ ] 1.3 **[OWNER]** Cloudflare Access (free, one user): protect `/api/duel/admin/*` with your own email login. Steps in `worker/README.md`.
- [ ] 1.4 **[OWNER]** Extend the zone's one rate-limiting rule to also match `/api/duel/*` (120 requests a minute per IP, block 10 s).
- [ ] 1.5 **[OWNER]** Decide Free or Paid at launch (design open question 4). If Paid: Workers Paid ($5 a month) and usage notifications at 50% and 90%.

## 2. Shared modules (D2)

- [ ] 2.1 `js/questions.js`: move `mulberry32`, `hash`, `withSeed`, `item`, `poolItem`, `mentalItem`, `makeSet`, the pools and `levelFor` out of `js/arena.js` and `js/adapt.js`; `arena.js` and `adapt.js` re-export. Verify: `test/questions.test.mjs` checks `dailySet()` for 30 fixed dates and every League gives the same items as before the move (golden file made before the change); `test/arena.test.mjs` unchanged and green.
- [ ] 2.2 `js/names.js` from `js/store.js`, with `isNickname` and `isAvatar`. Verify: `test/store.test.mjs` green; a new test checks the words equal the lists in `cloud/firestore.rules`.
- [ ] 2.3 `js/duel/protocol.js`: version, constants (goal 10, time limits, Reactions, report reasons, close codes), `parseClient` and `parseServer` with exact keys and ranges (every D4 message, `matched` included). Verify: `test/duel-protocol.test.mjs` with valid frames of every type, every invalid shape (extra field, wrong type, over 256 bytes, bad JSON, unknown Reaction), and a property test of 10,000 random frames that never throws.
- [ ] 2.4 `js/duel/rules.js`: the pure referee (`start`, `step`) for D5 and D6: seating, ready, countdown, deal, answer, miss, too fast, resolution window, point, reveal, timeout, pause, resume, grace accounting (1001 drops excluded), idle, limit, goal, rematch, leave, report, block. Verify: `test/duel-rules.test.mjs` covers every row of the D5 table and each spec scenario of `online-duel` that the server decides, with an injected clock.
- [ ] 2.5 `// @ts-check` and JSDoc types on all four; `build.py` publishes them like any module. Verify: `worker` typecheck (task 3.2) passes over them.

## 3. Worker project (D17)

- [ ] 3.1 `worker/` with `package.json` (pinned versions), `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `allowJs`, `checkJs` over the shared modules), `src/index.ts` routing `/_csp`, `/api/duel/*` and assets. Port `worker/csp.js` to `src/csp.ts` with its tests. Verify: `npm run typecheck` and `npm test` in `worker/`.
- [ ] 3.2 `wrangler.jsonc`: `run_worker_first: ["/_csp", "/api/*"]`, Durable Object bindings and the `v1` migration with `new_sqlite_classes`, `ratelimits`, `vars`, `env.staging`, `observability` with invocation logs off. Verify: `npx wrangler deploy --dry-run` and `--env staging --dry-run`.
- [ ] 3.3 `ci.yml`: a `worker` job (`npm ci`, typecheck, tests) on every push and pull request; the move's deploy job deploys the one Worker. Pin actions by SHA. Verify: the job runs on a pull request.
- [ ] 3.4 `src/duel/ticket.ts` (HMAC tickets, 60 s, single use) and `turnstile.ts` (siteverify with hostname and action checks; test keys in tests). Verify: worker tests for good, expired, reused, tampered and wrong-kind tickets; Turnstile pass, fail, wrong hostname, wrong action.
- [ ] 3.5 `src/duel/limits.ts`: hashed IP keys, the Rate Limiting binding (check it is available on the Free plan; if not, the `DuelLimits` fallback object in D11). Verify: worker tests for each D11 row.
- [ ] 3.6 `src/duel/log.ts`: one line per match end and per error code, fields from D14 only. Check the dashboard's observability settings match (invocation logs off). Verify: a worker test captures every log line in a full match and finds no IP, hash, Nickname, code, ticket or key.

## 4. Durable Objects

- [ ] 4.1 `DuelRoom`: hibernating WebSockets (`acceptWebSocket`, attachments for seat and resume hash), the ticket check on upgrade, `rules.js` for every event, state written to SQLite after each step, `setTimeout` timers in play and one alarm otherwise, cleanup 10 minutes after close. Verify: worker tests with two sockets for a full match, a timeout, both missed, a too-fast bot, a drop and resume, a 1001 drop, a leave, a rematch, and "storage empty 11 minutes after the end" (alarm run in the test).
- [ ] 4.2 Endpoints `POST /rooms`, `/rooms/:code/join`, `/rooms/:code/resume`, `GET /status`, the WebSocket route. Codes from the 20-consonant alphabet, collision retry, 15 LOBBY rooms per hashed IP. Verify: worker tests for each answer code in D3, case and space handling of codes.
- [ ] 4.3 `DuelQueue`: per League, hibernating waiting sockets, pairing the longest waiting compatible Player, one socket per key, 60 s wait, Block pairs for 7 days both ways, checked against `key` and `prev`, the automatic limits from D13. Verify: worker tests: pairing order, blocked pair never paired (also after one Player's key changes week), same key replaced, 60 s expiry, limit after three reports from distinct keys.
- [ ] 4.4 `DuelSafety`: report records (D13 shape), 30-day deletion by alarm, the Access-protected `GET /api/duel/admin/digest` (counts only), `npm run reports` script. Verify: worker tests for the record shape (no Nickname, IP, code or text), deletion at 30 days, and the admin route refusing a request without the Access header.
- [ ] 4.5 The off switch (`DUEL_OPEN`) and fail-closed on plan limits (a Durable Object call that errors with a limit returns `503 closed`), for every Free quota in D19 (requests, duration, rows read, rows written). A running room whose storage write fails ends the match with `end server`, offers no rematch and refuses resume. Verify: worker tests for the off switch, a limit error on room creation, and a failing storage write in the middle of a match (`end server`, then resume refused).

## 5. App (D16)

- [ ] 5.1 Routes `#/arena/duel`, `#/arena/duel/<code>`, `#/duel` redirect, before PR #47's experience pattern; the route view counts only `duel`. Update the Sky Landmark to "Duel" and the Guide's Duel and Party Mode sections. Verify: `routes.spec.ts`; `sky.spec.ts`; `guide.spec.ts`; analytics scenario from the spec delta.
- [ ] 5.2 `js/duel/client.js`: one socket per match, subprotocol ticket, reconnect with backoff inside the grace, `sessionStorage` session deleted at the end, everything on the round's `child(signal)`; leaving the route sends `leave`. Verify: unit tests with a fake WebSocket; `lifecycle-scan.test.mjs` covers `js/duel/`.
- [ ] 5.3 `js/duel/safe-html.js` allow-list sanitizer. Verify: unit tests with every generator's output for each League (all pass unchanged) and with hostile input (script, event attributes, `style`, `href`, foreign classes: all removed).
- [ ] 5.4 `js/views/duel.js`: lobby (with Calm note, offline and resting states, Find a player only for 13+), waiting room (code, Copy, Share), join confirmation with the stranger line, match screen, end screen with Rematch, Report and Block, Reactions tray and mute, keys 1 to 4, announcements. Copy for every Mode via `fx.t()`, no em dashes. Verify: `e2e/tests/duel.spec.ts` (below) and `a11y.spec.ts` axe run on lobby, waiting room, match and end screens.
- [ ] 5.5 `canMatch(p)` next to `cloud.canPost`; the Age answer prompt before a first online Duel when missing; the weekly Duel key for 13+ (`vm.duelKey.<player id>`), the replaced key kept 7 more days for `prev`, both removed with the Player. Verify: unit tests; `store.test.mjs` checks removing a Player removes their key.
- [ ] 5.6 Duel Sparks (10, 10 more for a win, 100 a day, none for idle or under 5 answers). Verify: unit tests in `test/gamify.test.mjs`.
- [ ] 5.7 "Show Reactions" switch on Me. Verify: `duel.spec.ts` muted scenario.
- [ ] 5.8 Turnstile loader: only on the three taps, managed mode, interaction-only, tokens per action. Add `challenges.cloudflare.com` to `build.py`'s third-party list (script and frame) with its reason; `_headers` CSP updated; `sw.js` never handles `/api/`. Verify: `third-party.spec.ts` scenarios from the spec delta; `csp.spec.ts` sees no violation in a full Duel.

## 6. End-to-end tests

- [ ] 6.1 `e2e/local-server.mjs` (or the move's `wrangler dev` setup) runs the Worker locally with the Turnstile always-pass test key; `e2e/tests/fixtures.ts` gains a tripwire that fails any test sending a request to the production `/api/duel/` or `challenges.cloudflare.com` with a non-test key.
- [ ] 6.2 `e2e/tests/duel.spec.ts` (two browser contexts, chromium and mobile; WebKit for the UI only where the worker setup allows): every `online-duel` and `duel-safety` scenario a browser can show: code and link join, expired code, full room, under-13 lobby, nobody waiting (queue with one Player, wait shortened by a test-only variable in `wrangler dev`), the same question on both, wrong then right, timeout, reaching 10, rematch, connection drop and return (context offline for 8 s), gone for good, Sparks and no Firebase request, offline lobby, resting lobby, keyboard 1 to 4, screen reader status, mute, Reaction rate limit, Report and Block, the join confirmation's stranger line.
- [ ] 6.3 `privacy.spec.ts`: a full Friend Duel sends no Player id, Age answer, Rating or Firebase request, and no analytics request contains the code.

## 7. Docs and copy

- [ ] 7.1 `parentNote()` in `js/app.js` and `cloud/README.md` (a "Duels" section: what is sent, kept and for how long; no Firebase involved). Verify: `test/copy.test.mjs` checks the parent-note scenario; e2e reads it on the Me page.
- [ ] 7.2 Privacy policy and retention drafts in `docs/legal/` (from the move): add Duels (D14 table), Turnstile and Cloudflare as processors, the internal-operations disclosure for Duels; new `docs/legal/duel-dpia.md`. **[OWNER]** lawyer review (task 0.4).
- [ ] 7.3 `worker/README.md`: architecture, protocol summary, local runs, secrets, the off switch, the report digest, load tests, the deploy rule (protocol version window).
- [ ] 7.4 `CLAUDE.md`: the Worker project, TypeScript rules, the shared modules, "never test against the production Duel service", the off switch. `GLOSSARY.md` entries are already in this change.

## 8. Load tests (D20)

- [ ] 8.1 Bots in `worker/test/load/` reusing `js/duel/protocol.js`; `LOAD_TEST_KEY` honoured only when `env.ENVIRONMENT === 'staging'`. Verify: a worker test proves production config ignores the key.
- [ ] 8.2 Run L1 to L6 against staging before launch (over two days on Free, D20); write `worker/test/load/RESULTS.md` with the numbers and pass or fail per run. Fix and re-run until all pass.
- [ ] 8.3 Keep the gate: every later pull request that changes `js/duel/rules.js`, `worker/src/duel/room.ts` or the protocol version re-runs L1 to L6 and updates `RESULTS.md` in the same pull request (a note in `worker/README.md` and the pull request template). Verify: the realtime-service scenario "Before a protocol change ships".

## 9. Checks before launch

- [ ] 9.1 Security review of `worker/` (the `security-review` skill or a manual pass): input validation, ticket handling, no secrets in logs, Access on admin, the CSP.
- [ ] 9.2 Measure the byte budget from `render-performance`: the Duel view and client stay out of JS before play (lazy route), and the route's own graph is under 80 KB.
- [ ] 9.3 Safari and Firefox: the WebSocket under `connect-src 'self'` (add `wss://learnvedicmath.com` only if needed); Turnstile managed mode on an older iPad; reconnect after a locked phone. Verify: notes in `worker/README.md`.
- [ ] 9.4 Release check: two real phones on different networks play a Friend Duel to 10; a teen test Player finds a match on a second device; Report and Block work; 11 minutes later the admin digest shows the report and no room data.

## 10. Launch

- [ ] 10.1 Deploy with `DUEL_OPEN = "0"`; the app hides the lobby's actions while closed. Verify: production `/api/duel/status` says closed; the lobby says resting.
- [ ] 10.2 **[OWNER]** Owner's own devices with the local `?duel=1` override: one Friend Duel and one Random Duel.
- [ ] 10.3 **[OWNER]** Lawyer's answer from task 0.4 received and folded into the privacy policy.
- [ ] 10.4 **[OWNER]** Set `DUEL_OPEN = "1"`.

## 11. After launch

- [ ] 11.1 Weekly: the report digest and the match-end log counts; usage against D19's thresholds.
- [ ] 11.2 After two weeks with no protocol change and no incident, archive with `/opsx:archive`.
