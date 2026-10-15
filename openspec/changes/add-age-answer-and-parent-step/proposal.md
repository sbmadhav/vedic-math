# Proposal

## Why

Today a Player's Scores and XP go to World boards from every Mode with no grown-up involved. Just opening a World board creates an anonymous identity that persists, even if nothing is ever posted. Many Players are under 13, and a persistent identifier can count as personal information under COPPA. Mode is self-chosen, so it cannot be the gate (ADR 0001). The parent note also undersells what is sent: XP from Practice adds up to the posted weekly total.

## What Changes

- Every Player gives one neutral **Age answer** the first time a Score or XP total would be posted. It is stored only on the device, per Player.
- A Player whose Age answer is under 13 posts nothing to World boards, in any Mode, until a grown-up gives the **Parent step** on this device. Their Scores and XP keep working on Device boards.
- **BREAKING (for under-13 Players already posting):** Explorer, Challenger and Pro Players under 13 stop posting until the Parent step is given. Existing World board entries stay until removed on request.
- **No identity until the first post** (ADR 0002): viewing World boards no longer signs in. The anonymous identity is created only when something is actually posted. The database rules allow capped, read-only list queries on Boards without sign-in. Writes still require the identity.
- The parent note states exactly what is sent and when: which Ranked rounds post a Score, that XP from all play (Practice included) adds up to one posted weekly total, that nothing is posted before the Age answer (and the Parent step for under-13s), and that no identity exists until the first post.
- A grown-up can withdraw the Parent step on the device. Posting stops again; entries already on World boards are not deleted by this.

Out of scope:

- Placement and the Hook (Phase 1). Until then the Age answer is asked at the first would-be post.
- Several Players on one device share one anonymous identity, so on a given Board they share one entry. This existing behavior is unchanged here and is a candidate for its own change.
- Deleting World board entries automatically (TTL needs the Blaze plan) or from the browser.
- App Check enforcement (Phase 3).
- Any legal sign-off. A legal read is still required before promoting to schools.

Affected: all three Modes. Every Player who would post, in particular Players under 13 in any Mode, and the grown-ups who give the Parent step.

## Capabilities

### New Capabilities
- `posting-consent`: when a Player's Scores and XP may leave the device for World boards (the Age answer and the Parent step), and what happens instead when they may not.
- `board-identity`: when the anonymous identity behind World board entries is created, and what viewing a World board requires.
- `parent-note`: what the note for grown-ups must say about what is sent, kept and when.

### Modified Capabilities

(none: no specs exist yet)

## Impact

- `js/app.js`: `postScore()`, the weekly XP post, `loadBoard()` and `parentNote()`. New Age answer and Parent step views, with wording for every Mode.
- `js/cloud.js`: split read access (no sign-in) from posting (sign in on first post).
- `js/store.js`: per-Player Age answer and Parent step flags (device only).
- `cloud/firestore.rules` and `cloud/test/`: allow signed-out, capped, read-only list queries; writes unchanged. Rules must be redeployed.
- `cloud/README.md` Privacy section, GLOSSARY.md if a term shifts.
- Tests: node tests in `test/`, rules emulator tests, and Playwright specs in `e2e/` (privacy and leaderboard specs).
