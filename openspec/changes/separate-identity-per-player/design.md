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
