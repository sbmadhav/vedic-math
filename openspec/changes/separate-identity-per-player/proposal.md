# Proposal

## Why

A device can hold several Players (`js/store.js:21-36`, "one record per player so a family can share a device"), but the World board identity is one per browser. `boot()` in `js/cloud.js:16-36` initializes the default Firebase app, and `getAuth(app)` plus `signInAnonymously` (`js/cloud.js:29-31`) reuse the one saved anonymous user for every Player. Entries are keyed by that uid (`js/cloud.js:52`, `boards/{board}/scores/{uid}` in `cloud/firestore.rules:16`, owner check `signedInAs()` at `:23-25`). So when a sibling and a parent play on one tablet, they share one entry per Board: the second post overwrites the first one's Nickname and avatar whenever its Score is higher (`js/cloud.js:54-56`), the lower Score is silently dropped, and "me" highlighting (`js/cloud.js:62`) marks the same row for every Player. Verified against the current code: the behavior is as described in the plan and in the out-of-scope note of `add-age-answer-and-parent-step`.

## What Changes

- Each Player on a device gets their **own** anonymous identity, created only at that Player's first actual post (ADR 0002), after their own Age answer and, when needed, their own Parent step (ADR 0001).
- On every Board, each Player who posts has their own entry. One Player's post never changes another Player's entry.
- "Me" on a World board marks only the active Player's own entry, and only if that Player already has an identity. Switching Player switches which row is "me".
- Removing a Player from the device signs out and forgets that Player's identity on this device. Their entries already on World boards stay until removed on request (unchanged policy).
- The legacy shared identity (created before this change) is kept by the device's first Player, so single-Player devices, the large majority, see no change at all. Other Players get a new identity at their next post.
- The parent note and `cloud/README.md` say the random ID belongs to one Player on this browser, not to the browser.

Out of scope:

- Firestore rules: unchanged. One entry per uid per Board is already the rule; this change only gives each Player a uid.
- Merging or deleting old shared entries on World boards. Entries posted under the shared identity before this change stay as they are.
- Any account, sign-in or sync across devices. A Player on two devices is two identities, as today.
- Device boards (`js/store.js:107-114`), which are already per Player.
- The Age answer, the Parent step and signed-out reads themselves (owned by `add-age-answer-and-parent-step`).
- App Check enforcement (Phase 3).

Affected: all three Modes (Explorer, Challenger, Pro) and every League. Players who share a device and post to World boards, in particular families with an under-13 Player and a grown-up on the same tablet. Single-Player devices see no change.

## Capabilities

### New Capabilities

(none: this change adds requirements to capabilities introduced by `add-age-answer-and-parent-step`)

### Modified Capabilities

- `board-identity`: ADDED requirements "One identity per Player", "Me marks only the active Player's own entry", "Removing a Player forgets their identity" and "Existing shared identity stays with the first Player". Requirement names are distinct from the ones `add-age-answer-and-parent-step` adds, so the two deltas merge cleanly at archive.
- `parent-note`: ADDED requirement "The note says the ID belongs to one Player".

## Impact

- **Depends on `add-age-answer-and-parent-step`** (not archived yet). That change introduces `board-identity` and `parent-note`, the `bootRead()` / `bootWrite()` split and the `canPost(player)` gate in `cloud.submit`. This change builds on `bootWrite()` and must be applied and archived after it. If it is applied first, the spec deltas still validate, but the code tasks assume the split exists.
- `js/cloud.js`: `bootWrite()` takes the active Player and uses a Firebase app instance (and so an Auth persistence) per Player. `top()` compares rows with the active Player's uid only if that Player already has one.
- `js/store.js`: `removePlayer()` asks `cloud` to forget that Player's identity.
- `js/app.js`: `postScore()` and `queueXpPost()` pass the Player whose Score or XP it is (the weekly XP timer must not post one Player's XP under another Player's identity after a switch); `parentNote()` wording.
- `cloud/README.md`: Data model and Privacy wording. `cloud/firestore.rules`: no change; a rules emulator regression test is added.
- Tests: node tests (`test/cloud.test.mjs` with a stubbed SDK), rules emulator tests in `cloud/test/rules.test.js`, Playwright specs `e2e/tests/privacy.spec.ts` and `e2e/tests/progress.spec.ts` with the fake SDK from `e2e/tests/fixtures.ts`.
- Independent of the other Phase 0 changes (`view-cleanup-contract`, `answer-checking-fixes`, `quests-and-badges-fixes`, `fair-duel`, `copy-and-honest-framing`, `analytics-events`, `pro-arena-mental-arithmetic`). It touches `postScore()` in `js/app.js`, which `pro-arena-mental-arithmetic` also touches; rebase whichever lands second.
