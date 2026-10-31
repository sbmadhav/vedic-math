# Proposal

## Why

An outside review of the live game (the Muse review, 2026-10-31; audit in `_handoff/feedback/2026-10-31-muse-review.md`, outside the repo) found the game correct and complete, and named a few places where a Player cannot tell what the game is doing:

- Input is held during feedback and teaching moments (a wrong answer's worked method steps every 2.5 s in a Star, `js/star.js:317`; a Discovery Locks miss holds 2.3 s, `js/play/exp/locks.js:222`) with nothing that says "wait", so a long hold can feel frozen (review item 6).
- Daily quests change at local midnight (`startDay()` in `js/gamify.js`), but only the first-visit tour says so; Home does not (item 7).
- Sparks from watching a trick (`js/app.js:1905`), a sutra card's first flip (`js/app.js:1057`) and the experiences (`onPlay()`, `js/app.js:1376`, capped at 150 a day) are added with no message, and there is no record of what paid what, so the Guide's payout lines cannot be checked by the Player (item 8).
- After a Mode change, a quest of the new Mode that today's earlier play already met completes at the next answer, in whatever the Player is doing then: the reviewer saw "Quest complete: Finish an Arena round" in Balloon Pop (item 3; the wording half is fixed in the `muse-review-fixes` pull request).
- A new Player's first-visit tour opens 300 ms after Home draws (`homeTour()`, `js/app.js:1657`); a press that lands as it opens goes to the tour's modal instead of the button pressed (item 10).
- At 360 px wide nothing overflows (a Playwright pass over 32 routes), but breadcrumb links are 22 px tall, under the 24 px WCAG 2.2 target size (2.5.8), and the deep dive's Previous and Next buttons cut the sutra names.

## What Changes

- **A wait indicator.** When the game holds input for feedback for more than 1.2 s, the held keypad shows a thin bar that fills until input returns, and screen readers hear "Next question in a moment". In untimed rounds a hold of 2 s or more also offers **Next** (Enter), which ends the hold early.
- **Quest refresh line.** The quest card on Home says when quests change: "New quests at midnight, your time. Everyone in your Mode gets the same three." The Guide's quest section says the same.
- **Quests met earlier today complete at the Mode switch**, with their toast on the page where the Mode was changed, instead of at the next answer somewhere else.
- **A Sparks history** on the Me page: the last 50 Sparks awards (amount, what for, when), kept on this device per Player. Every Sparks award shows a "+N Sparks" message once, and reaching the 150-a-day cap for experiences says so once a day.
- **The tour waits for a Player who is already acting:** if the Player presses or types on Home before the tour opens, the tour does not open this time and stays due for the next Home visit.
- **Narrow screens:** breadcrumb links, the play pages' back link and Home's Quick tour get a target at least 24 px tall; the deep dive's Previous and Next show the whole sutra name on two lines at 360 px.

Out of scope: a Sparks cap for anything other than experiences; a server-side history; changing which activities pay Sparks or how much.

Affected: every Player (Home, Me, Practice, Stars, Katas, Discovery Locks). Nothing is sent anywhere: the history stays on the device and is never posted (ADR 0006 unchanged, no Firebase).

## Capabilities

### New Capabilities

- `feedback-wait`: the wait indicator and Next during held feedback.

### Modified Capabilities

- `quests`: the refresh line; quests met earlier today complete at the Mode switch.
- `sparks`: the Sparks history and a message for every award.
- `accessibility`: 24 px targets for breadcrumbs and back links.
- `guide`: the first-visit tour does not open under a press.

## Impact

- `js/fx.js` (a `hold(el, ms, { skippable })` helper used by every round's feedback), `js/star.js`, `js/app.js` (Practice, Katas, `onPlay`, Home's quest card, Me, `homeTour`), `js/play/exp/locks.js`, `js/gamify.js` (`checkQuests()` on the `player` event), `js/store.js` (a capped `sparksLog` per Player, included in backup and restore), `math.css` (the bar, breadcrumb targets), the deep dive footer CSS.
- PR #127 edits `js/store.js`, `js/app.js` and `js/star.js`'s neighbours: apply after it lands.
- New spoken lines (the quest refresh line, the hold announcement) need a studio re-record.

## Decisions

The owner delegated these product calls to the agent (2026-10-31, Muse review follow-up); each is recorded in `design.md`.
