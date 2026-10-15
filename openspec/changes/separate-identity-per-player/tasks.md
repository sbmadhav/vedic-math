# Tasks

Prerequisite: `add-age-answer-and-parent-step` is applied (its `bootRead()` / `bootWrite()` split and `canPost(player)` gate exist in `js/cloud.js`).

## 1. One Firebase app per Player

- [ ] 1.1 In `js/cloud.js`, make `bootWrite(player)` create or reuse a Firebase app named by `appNameFor(player)` (`'[DEFAULT]'` for `p1`, `'vm-' + id` otherwise), with its own Auth and Firestore, signing in anonymously only when that app has no saved user. Verify: node test in `test/cloud.test.mjs` with a stubbed SDK shows two Players get two app names and two `signInAnonymously` calls, the same Player twice gets one, and `p1` uses `'[DEFAULT]'`.
- [ ] 1.2 Change `submit(board, entry, player)` to write `boards/{board}/scores/{uid}` with that Player's uid, keeping the `canPost(player)` gate first. Verify: node test that a submit for Player B never reads or writes Player A's doc path.
- [ ] 1.3 Change `top(board, n, player)` to mark `me` only against an already-initialized app's current user for that Player, never initializing Auth. Verify: node test that `top()` for a Player with no app makes no Auth import and marks no row.
- [ ] 1.4 Add a rules emulator regression test in `cloud/test/rules.test.js`: two anonymous users each create an entry on the same Board, neither can update the other's, and both appear in a top-20 list. Verify: `cd cloud/test && npm test` passes with no change to `cloud/firestore.rules`.

## 2. Callers pass the right Player

- [ ] 2.1 In `js/app.js`, `postScore()` passes the Player who finished the round. Verify: Playwright spec in `e2e/tests/privacy.spec.ts` (fake SDK, `cloudLog(page)`): Player A finishes an Arena Daily challenge, the device adds Player B who finishes one too; the log shows writes under two different uids, each with its own Nickname.
- [ ] 2.2 In `queueXpPost()`, capture the Player id when XP is earned and post that Player's own weekly total under their identity when the timer fires; skip if the Player was removed. Verify: node test with a stubbed timer and SDK; Playwright spec that earns XP as A, switches to B before the timer, and asserts the XP write carries A's uid and A's total.
- [ ] 2.3 Board rows: pass the active Player to `top()` from `loadBoard()`. Verify: Playwright spec (fake SDK returning two rows with A's and B's uids) that the "me" row follows a Player switch.

## 3. Removing a Player

- [ ] 3.1 Add `cloud.forget(player)` (sign out and delete the app instance if loaded; otherwise record the id so the next boot clears its saved session) and call it from `store.removePlayer()`. Verify: node test with stubbed SDK for both branches; `e2e/tests/progress.spec.ts` removes a Player and asserts no write-shaped request and that a new Player's first post gets a new uid.
- [ ] 3.2 If `p1` no longer exists, sign out `'[DEFAULT]'` on the next `bootWrite` and never reuse it. Verify: node test.

## 4. Parent note and docs

- [ ] 4.1 Update `parentNote()` in `js/app.js` (today `js/app.js:598` says the ID is one "that Firebase gives this browser") to say each Player who posts has their own random ID and entries, and what removing a Player does, worded per Mode through `fx.t()`. Verify: `e2e/tests/privacy.spec.ts` checks the new statements in all three Modes and that "gives this browser" is gone.
- [ ] 4.2 Update `cloud/README.md` (Data model line "Each anonymous player has one entry per board", and the Privacy section) to describe one identity per Player and the legacy `p1` rule. Verify: a reviewer reads it side by side with `parentNote()` and `js/cloud.js`.
- [ ] 4.3 Update GLOSSARY.md only if a term shifts (for example, if "identity" gets its own entry). Verify: `git diff GLOSSARY.md` is empty or reviewed.

## 5. Release check

- [ ] 5.1 Unit, rules emulator and e2e runs pass against a built `_site` (`node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`), then live after deploy. Verify: CI and the post-deploy E2E workflow are green; on a phone with two Players, the World board shows two separate entries after each posts once (posted by hand, not by a test).

## Workflow follow-up

- Archive after `add-age-answer-and-parent-step` is archived, so the `board-identity` and `parent-note` main specs exist when these ADDED requirements merge in.
