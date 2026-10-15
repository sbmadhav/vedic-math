# Design

## Context

- Every post goes through `cloud.submit(board, entry)`. It is called from `postScore()` (Arena daily rounds and ranked game rounds) and from a debounced weekly XP post in `js/app.js`.
- Every World board view goes through `loadBoard()` → `cloud.top()`.
- Both call `boot()`, which loads the Firebase SDK and immediately signs in anonymously. That is why simply viewing a Board creates an identity today.
- Players live in `js/store.js`, several per device, each with its own saved progress. The anonymous Firebase identity is one per browser, shared by all Players on the device (see proposal: out of scope).
- The rules (`cloud/firestore.rules`) require `request.auth != null` for list queries.

## Goals / Non-Goals

**Goals:**
- One choke point decides whether anything may be posted, so no call site can forget the check.
- Reading World boards never loads Firebase Auth.

**Non-Goals:**
- Verifying a grown-up's identity. The Parent step is a simple presence check, as the plan says, not age verification.
- Migrating existing World board entries.

## Decisions

**1. `canPost(player)` gate inside `cloud.submit`, not at call sites.**
`submit` returns early, with nothing loaded and nothing sent, unless the active Player has an Age answer, and either 13+ or the Parent step. Callers get a result telling them why (`needs-age`, `needs-parent`), so `postScore()` can prompt.
- Rejected: checks in each caller. Easy to miss one; the XP post already lives in a separate timer.

**2. Two boot paths: `bootRead()` without Auth, `bootWrite()` with Auth.**
`bootRead()` loads only firebase-app and firestore (plus App Check when configured) and runs list queries unauthenticated. `bootWrite()` adds Auth and signs in, and is only reached through a permitted `submit`.
- Rejected: signing in lazily inside one boot. It is harder to prove in tests that viewing never touches Auth.
- With App Check enforced later, unauthenticated reads still carry App Check tokens, so this stays compatible.

**3. Rules: `allow list` without `request.auth`, everything else unchanged.**
List queries still require a valid Board id and `limit <= 20`. Entries only hold Nickname, avatar, Score, `ts` and `exp`. `get` of a single entry keeps `signedInAs(uid)`.
- Rejected: a public read-only mirror collection. It doubles writes for no privacy gain.

**4. Where the age question appears.**
A small sheet over the round's result, shown when `submit` returns `needs-age`. It asks "How old is this player?" with neutral choices (an ordered list of ages, plus "Grown-up"), worded per Mode through `fx.t()`, and is dismissible. Answer < 13 and no Parent step: the sheet ends with "Ask a grown-up to turn on World boards", which links to the Parent step. Once Placement ships (Phase 1), it asks the same question, and the sheet then only covers older Players.

**5. Parent step = adult check + explicit toggle, on the Me page.**
The adult check reuses a simple arithmetic or reading prompt that young children cannot pass at a glance. For example "Type the year written in words: two thousand and nine", not an answer stored anywhere. Then a per-Player "Allow World boards" switch, which can be switched off (withdrawal).
- Rejected: an email to parents. It collects personal data, which defeats the purpose.

**6. Storage.**
`player.age` (a number, or 'adult') and `player.parentOk` (a timestamp or null) live in the existing per-device players record. Nothing new is sent. Removing a Player removes both.

## Risks / Trade-offs

- [A child answers 13+ to skip the step] → Neutral question with no hint of what each answer unlocks (the standard COPPA approach); the legal read before school outreach covers residual risk.
- [Fewer World board entries] → Expected. Device boards keep the competition local, and the Parent step message explains how to turn World boards on.
- [Public list reads expose Boards to scraping] → Already public through the app. Capped at 20 per query; App Check enforcement (Phase 3) narrows clients.
- [Shared identity across Players on a device] → Unchanged here; noted as a follow-up change.

## Migration Plan

1. Deploy the rules first. Signed-out lists start working; existing signed-in clients are unaffected.
2. Ship the client. Existing Players have no Age answer, so their next would-be post asks it. Their old entries stay.
3. Rollback: revert the client; the relaxed list rule is harmless on its own.

## Open Questions

- The exact age choices in the sheet (ranges versus single years) can be settled in copy review without changing the specs.

## Decisions made during implementation

The owner approved the proposal, including that a grown-up can withdraw the Parent step. These choices were made while building it, without further review:

- **Age choices** (the open question above): single years, "5 or under", 6 to 17, then "Grown-up". "5 or under" is stored as 5 and "Grown-up" as `'adult'`. Every choice looks the same, and the question step never mentions World boards, posting or 13.
- **Where the question appears**: after a Ranked round whose Score would be posted (an Arena Daily challenge or a ranked game round), and from an "Answer the question" button in the World boards card on the Me page. XP alone never opens it, because it would interrupt Practice; the weekly XP total is simply not posted until the Age answer allows it.
- **The Age answer cannot be changed** once given, short of removing the Player. Letting a child re-answer would defeat the neutral question. A grown-up who needs to fix it can remove and re-add the Player. Candidate follow-up: a change behind the adult check.
- **Adult check**: a random four-digit number written in words ("six thousand and forty-two"), to be typed in digits. A new number is drawn each time the card is drawn, and nothing about it is stored. It is a presence check, not age verification.
- **Withdrawal** needs no adult check (switching posting off is always safe); turning World boards back on needs the check again.
- **`submit` result**: `{ posted, reason }`, with `reason` one of `needs-age`, `needs-parent`, `low` (the board takes no such score) or `not-higher`. Only the nickname and color of the entry passed in are sent, so the Player record (which now holds `age`) is never spread into a write.
- **Marking "me" on a World board**: after the first post the device keeps a copy of the anonymous id in `localStorage` (`vm.cloudUid`), so `top()` can mark the device's own row without loading Auth. Firebase already keeps that id in the same browser, so nothing new leaves the device. Before the first post no row is marked.
- **Weekly XP post** moved into `cloud.postWeekXP()`, so the node tests can check it goes through the same gate; `queueXpPost()` in `js/app.js` also skips its timer when the active Player may not post.
- **Late Auth registration**: `bootWrite()` loads Auth after `bootRead()` has already started Firestore without it. A one-off check on the Firestore and Auth emulators confirmed a signed-out list, then anonymous sign-in, then a get and a write of the own entry all succeed in that order.
- **Parent note**: also added beside the World boards on each game page (the spec requires it next to every World board). It also says that every Player on a device posts under one id and so shares one entry per Board, which was true before but unstated.
- **Rules deployed first** (task 1.2) through the Firebase Rules REST API, as the migration plan says; the release was read back and matched the file.
- **Tests**: e2e fixtures gained a `seedConsent` option (default: no Age answer) and the fake SDK records whether Auth was loaded. Write-path specs now seed a grown-up. `leaderboard.live.spec.ts` asserts no request to identitytoolkit or securetoken and no Auth file. It cannot run from localhost, because App Check rejects the debug token there and Firestore falls back to an empty offline result. The round-driven consent flows skip WebKit, whose faked clock does not advance the Arena's `requestAnimationFrame` timer evenly. Their UI still runs on WebKit through the keyboard, reduced-motion and 13-and-over tests.
