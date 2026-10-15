# Design

## Context

- After `add-age-answer-and-parent-step`, `js/cloud.js` has `bootRead()` (app and Firestore, no Auth) for `top()` and `bootWrite()` (adds Auth and anonymous sign-in) reached only through a permitted `submit()`. Both use the default Firebase app today (`initializeApp(FIREBASE)`, `js/cloud.js:22`).
- Firebase Auth keeps one signed-in user per app instance. Its saved session is stored under a key that includes the app name (`firebase:authUser:<apiKey>:<appName>` in IndexedDB), so two app instances with different names keep two independent anonymous users in the same browser.
- Players are `{ id, name, avatar, mode, ... }` records in `vm.players` (`js/store.js:4`, `:21-36`). Ids are `p1` for the first Player and `p<base36 time>` for later ones (`:34`). `removePlayer()` (`:36`) drops the record and the progress key.
- Rules key entries by `request.auth.uid` (`cloud/firestore.rules:16`, `:23-25`); nothing in them assumes one uid per browser.
- The weekly XP post is a debounced timer (`js/app.js:627-634`) that reads `store.player()` when it fires, which may be a different Player from the one who earned the XP.

## Goals / Non-Goals

**Goals:**
- One anonymous uid per Player who posts, created lazily at that Player's first post.
- No rules change, no new collection, no server code.
- Single-Player devices keep their existing identity and entries.

**Non-Goals:**
- Linking a Player across devices or browsers.
- Cleaning up entries posted under the shared identity before the change.

## Decisions

**1. One named Firebase app per Player, created in `bootWrite(player)`.**
`bootWrite(player)` calls `initializeApp(FIREBASE, appNameFor(player))` once per Player (cached in a `Map`), then `getAuth(app)`, waits for `authStateReady()`, and signs in anonymously only if that app has no saved user. Firestore writes go through `getFirestore(thatApp)` so the request carries that Player's token. `bootRead()` keeps using the default app with no Auth.
- Rejected: one identity per device plus a Player id inside the entry (`scores/{uid}_{pid}`). It needs a rules change (doc id no longer equals uid, so `signedInAs()` and the one-entry rule change shape), and it still links all of a family's entries to one persistent identifier, which is what ADR 0001 tries to avoid for under-13 Players.
- Rejected: `signOut()` and a fresh `signInAnonymously()` on every Player switch. It loses each Player's uid after one switch, so a Player's next post creates a duplicate entry instead of raising their own.
- Rejected: custom tokens from a Cloud Function. Needs server code and the Blaze plan for no privacy gain.

**2. App names.** `appNameFor(p)` is `'[DEFAULT]'` for the Player with id `p1` (the legacy shared identity lives there; see decision 4) and `'vm-' + p.id` for every other Player. Player ids are generated, contain no personal data, and never leave the device (the app name is only a local storage key).

**3. Posts carry their Player.** `cloud.submit(board, entry, player)` takes the Player explicitly. `postScore()` passes `store.player()` at the end of the round. `queueXpPost()` captures the Player id when XP is earned and, when the timer fires, posts that Player's own weekly total (read from that Player's progress) under that Player's identity, or skips if the Player was removed. This prevents one Player's XP going out under another Player's uid after a switch.

**4. Legacy identity goes to `p1`.** Every device that ever posted did so through `'[DEFAULT]'`. Keeping `p1` on `'[DEFAULT]'` means single-Player devices are untouched and their current-week entries keep rising instead of being duplicated. On a multi-Player device, earlier shared entries may carry another Player's Nickname until `p1` next posts a higher Score; that is accepted (see Risks). If `p1` was removed, the `'[DEFAULT]'` identity is signed out on the next boot and never reused.

**5. Forget on remove.** `removePlayer(id)` calls `cloud.forget(player)`, which (if Firebase was ever loaded for that Player) signs out that app's Auth and deletes the app instance; the saved session then no longer exists in the browser. It does not call `user.delete()`: deleting the anonymous account would orphan entries the grown-up may later ask us to remove by Nickname, and adds a network call for no benefit. If Firebase was never loaded, `forget` also clears the persisted key lazily on the next boot (a remembered list of removed Player ids in `vm.players`).

**6. "Me" marking.** `top(board, n, player)` reads with `bootRead()` and compares row ids with the uid of that Player's app only if that app has already been initialized and has a current user. It never initializes Auth just to mark a row.

## Risks / Trade-offs

- [More anonymous accounts in Firebase Auth, one per posting Player] → Expected and small. Anonymous sign-up has a per-IP limit (100 per hour), far above a family's use.
- [Shared entries from before the change keep the last poster's Nickname] → They expire with their Board (daily and weekly). The note in `cloud/README.md` explains it; removal on request still works.
- [Several Firebase app instances in memory] → Only Players who post on this visit get one; each is a few KB.
- [IndexedDB unavailable (private mode in some browsers)] → Auth falls back to in-memory persistence per app, as today; a Player then gets a new uid per visit, the same behavior as the current shared identity in that situation.

## Migration Plan

1. Ship after `add-age-answer-and-parent-step` is live. No rules deploy is needed.
2. Existing devices: `p1` keeps the old identity; other Players get theirs at their next post.
3. Rollback: revert the client. Named apps' saved sessions stay in IndexedDB unused; `'[DEFAULT]'` is still `p1`'s, so nothing breaks.

## Open Questions

- Whether the Me page should show a small "Posts to World boards as its own player" line per Player. Copy only; it does not change the specs.

## Decisions made during implementation

Made while the owner was away; each is reversible in the client only.

- **"Me" marking uses a saved copy of each Player's uid, not a live Auth instance.** Decision 6 says `top()` compares against an already-initialized app's current user. Since `add-age-answer-and-parent-step`, the client keeps a copy of the posting uid in localStorage so a board can mark "me" on a fresh page load without loading Auth (ADR 0002). That copy is now per Player: `vm.cloudUids` = `{ [player id]: uid }`, written after a Player's sign-in. The old single `vm.cloudUid` is read as `p1`'s (the approved "legacy identity stays with p1"). `top(board, n, player)` marks a row only when that Player has a saved uid, so a Player who never posted marks nothing and Auth is never loaded to mark a row.
- **Removing a Player is wired through a store event.** `store.removePlayer()` emits `'removed'` with the removed Player, and `cloud.js` (which already imports `store.js`) listens and calls `cloud.forget(player)`. This avoids a circular import from `store.js` to `cloud.js`; the effect is the one in decision 5.
- **`forget()` signs the Player out right away when they had posted.** Decision 5 allowed clearing the saved session lazily "on the next boot". So that the parent note can truthfully say removing a Player forgets their ID on this device, `forget()` loads the SDK (app, Firestore, App Check, Auth; no sign-in, no write) when the removed Player has a saved uid, waits for their saved session, signs it out and deletes their named app. Only if that fails (offline) is the id remembered in `vm.cloudForget`, and the next `bootWrite` on the device clears it. A Player who never posted loads nothing. The removed-ids list lives in its own key in `cloud.js` rather than inside `vm.players`, so `store.js` stays unaware of identities.
- **`p1` removed:** every `bootWrite` on a device without `p1` signs out the default app's session (once per page) before posting, so the shared identity is never reused; `p1`'s saved uid copies (`vm.cloudUids.p1`, `vm.cloudUid`) are deleted at removal.
- **App Check on every named app.** App Check is per Firebase app, so each Player's named app gets the same App Check provider as the default app; otherwise their writes would fail once Firestore enforcement is turned on.
- **Weekly XP queue keeps a set of Player ids.** `queueXpPost()` adds the active Player's id to a pending set each time XP is earned; when the timer fires it posts, for each pending Player still on the device, that Player's own weekly total (`store.weekXPOf(id)`) to that Player's own League (from their Mode), under their own identity. A Player removed before the timer fires is skipped. A switch therefore never drops A's pending total or sends it as B.
- **Unique Player ids.** `addPlayer()` used `'p' + Date.now().toString(36)`, which repeats if two Players are added in the same millisecond. Since a Player id now names an identity, `addPlayer()` bumps the time until the id is unused on the device.
- **Score posts carry the Player captured at the end of the round** (`postScore()` passes `store.player()` at that moment to `sendScore()`), and the Age answer retry after the age sheet re-reads that same Player by id.
- **Queue test is a Playwright spec, not a node test.** `queueXpPost()` lives in `js/app.js`, which needs the DOM; task 2.2 is verified by the Playwright spec (earn XP as A, switch to B before the timer, the write carries A's uid, A's League and A's total, and B gets no identity). The node tests cover `postWeekXP(league, xp, player)` posting under the given Player.
- **Fake SDK in `e2e/tests/fixtures.ts`** now keeps one fake Auth session per app name in localStorage (`e2e.fakeAuth`), surviving reloads like the real SDK; the default app signs in as `e2e-fake-uid`, a named app as `e2e-fake-<app name>`. It records `signOuts` and `apps`, and returns rows from `window.__e2eRows` so the "me" spec can check highlighting.
- **Real SDK check on the Auth emulator** (not production): with Firebase JS 10.12.2 in Chromium, the default app and a `vm-b` app signed in anonymously got two different uids, both survived a reload, and signing out `vm-b` and deleting its app left the default app's session intact.
- **No rules change and no rules deploy.** The emulator regression test passes against the unchanged `cloud/firestore.rules`.
- **GLOSSARY.md unchanged.** "Identity" is used in its plain sense (as in ADR 0002); no term shifted.
