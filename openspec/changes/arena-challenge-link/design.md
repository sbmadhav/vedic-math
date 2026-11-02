# Design

## What exists today

- `dailySet(league, day)` (`js/arena.js`) seeds the daily round by `daily-<day>-<league>` (Pro from 2026-10-19: `v2:daily-<day>-pro`), so the date and the League are the whole recipe for the round. `cloud.dayId()` gives the local date as `YYYY-MM-DD`.
- `arenaView()` (`js/app.js`) draws the result in the full-screen shell after `onEnd`, with `type` one of `daily`, `practice`, `untimed`, `words`. Only `daily` posts (`postScore`, through the Age answer rules) and sets the day's best.
- `share({ title, text, url })` in `js/play/kit.js`: `navigator.share` first, then the clipboard with the toast "Copied. Paste it anywhere.", returning `shared`, `cancelled`, `copied` or `failed`. Play experiences already use it (Daily Number, Ghost Races, Mandala Studio, Tala Lab, Party Mode).
- `metrics.shareClick(surface)` accepts `result` and `challenge-link` and is called by nothing yet.

## Decisions (owner-delegated, 2026-10-30)

### D1. No new seed: the link carries the date and the League

Owner-delegated, 2026-10-30. The daily round is already identical for a League on a date (arena spec), so the date and the League in a challenge link reproduce it exactly with `dailySet(league, day)`. The one canonical form is `#/arena/day/<YYYY-MM-DD>/<league>/<score>`: the app always writes all three parts; when parsing, the Score part is optional, and a link without it (or with a bad one, D3) shows "A friend's challenge" with no number. A new "shared daily seed" for every League together was considered and rejected: the Leagues have different question pools on purpose (Explorer taps choices, Pro is mental arithmetic), and one shared round would change the arena spec's pools and split today's Boards.

### D2. Ranked only on the same date and in the same League

Owner-delegated, 2026-10-30. A challenge link opens a Ranked round only when its date is the recipient's local today and its League is the recipient's Mode's League; then it is simply today's daily challenge, posted as any daily round is. Otherwise the friend's round is offered as Practice, never posted: playing yesterday's questions today must not reach today's Board (the questions would be known in advance), and a Challenger must not post to the Pro Board. Today's own daily challenge is offered beside it, so nobody is stuck with a Practice round they did not want. This keeps the glossary's "challenge-link round" a Ranked round in the only case where it is fair, and the glossary entry is reworded to say so. The check runs again when Start is tapped, not only when the link opens: a lobby opened at 23:58 and started after midnight no longer names today, so the round plays the link's set as Practice and posts nothing. The friend's Practice round follows the Practice contract: its Score never leaves the device, and the Sparks it earns count as any Practice's do (so an eligible Player's weekly Sparks total may still be posted, as today).

### D3. The link holds the Score to beat, nothing else

Owner-delegated, 2026-10-30. `#/arena/day/2026-10-30/challenger/240`: the last part is the sharer's Score, shown as "Score 240 to beat". No Nickname (PLAN.md section 10 allows "the Nickname and a Score" in share text; this is stricter, because a share goes to people outside the Boards and a Nickname on a World board ties the two together), no Rating, no Player id. The fragment after `#` is never sent in any request, so the Score in it does not reach the site, Cloudflare or analytics; a test checks that no request carries it. A Score that is not a whole number from 0 to 9999 is dropped and the line reads "A friend's challenge" without a number.

### D4. Words only, no emoji grid

Owner-delegated, 2026-10-30. The feedback's grid of green squares reads to a screen reader as "green square, green square, ..." and says nothing a sentence does not. The Arena round is up to 80 questions in 60 seconds, so a grid would be long and uneven. The text is three short lines plus the link (proposal), in GLOSSARY words (Arena, daily challenge, League, Score), no em dash, and the date in ISO form so it reads the same in every locale. Daily Number keeps its own emoji grid; changing it is out of scope (noted as a follow-up in tasks).

### D5. No Sutra or Trick names in the text

Owner-delegated, 2026-10-30. The honest-framing spec says share text that mentions the Sutras credits Bharati Krishna Tirtha's 1965 book. A round mixes Tricks, so naming one would be wrong and naming several would make the text long; leaving them out keeps the text short and the framing rule trivially met. The result screen keeps its "Sutras in this round" review.

### D6. Every Player gets the button, under 13 included

Owner-delegated, 2026-10-30. The button hands words to the device's own share sheet or clipboard; the site sends nothing new (the one analytics event is anonymous and fixed, as every share action's is, analytics spec), and the text holds nothing about the Player. An under-13 Player still posts nothing to any Board (ADR 0006): a challenge link they open plays to the Device board only. Explorer's label is "Send to family", since a 4 to 7 year old shares through a grown-up. The question "may an under-13 Player's device offer a share sheet at all" is added to the lawyer's list (task 5.1, owner) but does not block building: no personal information is collected or disclosed by the site.

### D7. One tap, no autoplay

Owner-delegated, 2026-10-30. The link opens the lobby ready to Start, not the countdown: a round that starts by itself would surprise a parent opening a link in a chat, and browsers block sound before a tap. "Opens straight into the round" in the feedback becomes "one tap on Start". On a device with no Mode the Mode picker comes first, as for every game route, and the challenge opens after it. That needs a hand-off: `afterPick()` in `js/app.js` only returns to a pending hash that `buildIndex()` lists, and a dynamic challenge hash is never listed, so it would fall back to `#/`. `afterPick()` gains an explicit case: a pending hash that `parseChallenge()` accepts is returned as it is (task 2.2).

Amended while building (owner-delegated, 2026-10-31): `afterPick()` is synchronous and `parseChallenge()` lives in the on-demand Arena module, so the case is by shape, any pending hash under `#/arena/day/`. The Arena view then parses the link for real, and one that does not parse opens the plain lobby, which is exactly what `#/arena` does after the picker (the Arena is a Find entry in every Mode). A broken link therefore behaves like `#/arena` with or without a Mode, as the spec's "A broken link" scenario asks.

### D8. The share helper loads on the first tap

Owner-delegated, 2026-10-30. `js/play/kit.js` is not in `js/app.js`'s static imports today; the button imports it on the first tap (it is already precached, so this works offline), so the first-load bytes grow only by the button and its text builder. Built: `share()` gains a `notify` option, because its "Copied. Paste it anywhere." toast is the play experiences' `.px-toast`, styled only by `css/play/base.css`, which the Arena page does not load; the Arena passes the app's own `fx.toast`. The text builder itself is in the on-demand Arena module (D12), so `js/app.js` grows only by the button, its handler and the lobby line.

### D9. Route placement

Owner-delegated, 2026-10-30. `#/arena/day/...` matches the play experience pattern `#/(?:dojo|arena|games|sutras)/[a-z-]+(?:/.*)?$`, which would look for an experience named `day` and fall back to Home. The new route goes before that pattern in the route table, and `js/play/catalog.js` must never use the id `day` (a unit test says so). The route matches `#/arena/day` and anything under it, so a broken link reaches the Arena (its parser rejects it and the plain lobby draws) instead of Home; the analytics route `arena/day` matches the same way and never counts a broken link as `play/unknown`.

### D10. The friend's Practice round leaves the Arena Rating alone

Owner-delegated, 2026-10-31. A daily round records its answers in the Dial and saves the Arena Rating, because its questions are at this Player's League. A friend's round from another League or day is a fixed set at someone else's level (a Pro opening a Challenger link plays Challenger questions), so it is dealt with no Dial, like the Word problems round (word-problems-more design D5): the Rating neither rises nor falls from it. Sparks, the Arena badge counts and `arenaBest` count as for any Arena round.

### D11. The friend's round keeps its clock, Calm included

Owner-delegated, 2026-10-31. The Score to beat was made in a 60-second race, so a friend's round is comparable only under the same clock: it plays timed in every Mode and with Calm on, as the daily challenge does. The lobby's Calm note says so ("Your friend's round keeps its clock too: the Score to beat was made in 60 seconds"). Practice rounds the Player picks themselves keep Calm's no-clock rule.

### D12. The link's grammar lives in `shared/src`, and the base path in one constant

Owner-delegated, 2026-10-31. PR #127 moved the League pools and `dailySet()` to `shared/src/questions.ts`, so the link's parser, text and URL (`parseChallenge()`, `challengeShare()`, `challengeText()`, `challengeUrl()`) are `shared/src/challenge.ts`, pure and without DOM, with their tests beside them (`shared/src/challenge.test.ts`); `js/arena.js` re-exports them for the Arena view, which loads it on demand, and a Duel's server can check the same link later. The link always names the live site (`SITE`) and the game's base path (`APP_BASE`), both in `shared/src/site.ts`: a share from a preview or localhost must open the real site, and the move from `/play/` to `/learn/` (indexable-routes design D2, whose URL inventory lists this link as a share link rewritten to the Arena page) changes that one constant. `js/play/kit.js` builds the play experiences' `shareUrl()` from the same `APP_BASE`. The share text is the same in every Mode (the reader is the friend, and the League name says which Mode), so `challengeText()` takes no Mode; Explorer differs only in the button's label.

### D13. The result answers the Score to beat

Owner-delegated, 2026-10-31. A challenge round's result (Ranked or the friend's Practice round) says in one line how it went against the link's Score: "You beat your friend's Score of 240!", "You matched your friend's Score of 240." or "Your friend's Score of 240 stands.", before the usual note. A link with no Score part gets no such line. The share loop is "can you beat it?", so the result answers the question; nothing is stored or sent for it.

## Claims from the feedback, checked

| Claim | On `main`, 2026-10-30 |
| --- | --- |
| "Daily Arena" | The lobby calls it "Daily challenge"; the Arena is "60 seconds. Same questions for everyone." in each League. |
| "5/5 in 11.4s" | Wrong shape: the daily challenge is a 60-second race scored by Score, up to 80 questions. |
| "Trick: Nikhilam (Near 100)" | A round mixes Tricks; the result lists "Sutras in this round". |
| "the link opens straight into the round" | Needs this change: `#/arena` alone opens the recipient's own Mode and date. |
| A share action exists | Not on the Arena. Daily Number and Ghost Races already share (emoji grid, ghost link). |

## Risks

- **Score bragging and cheating.** The Score in the link is the sharer's word; nothing checks it. It is a prompt to play, not a Board entry, and the line says "to beat", not "verified".
- **Time zones.** A friend a day ahead gets the Practice offer (D2). The line says why: "This challenge is from 2026-10-29. Play it as Practice, or today's challenge."
