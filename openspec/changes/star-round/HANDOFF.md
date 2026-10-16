# Handoff: star-round

Built. Tasks 1.1 to 5.4 are done and ticked; the PR to main is open (not merged).

## Left

- 6.1: after deploy, the live E2E run, and the owner's manual phone check (a Star round playable with the on-screen
  keypad, both color schemes). On a Pixel 7 sized screen the site header, nav and crumbs push the bottom keypad rows
  below the fold; full-screen play (`game-shell-and-calm`) removes that chrome.
- When `watch-shelf` merges: pass its `videoForTrick` as `findVideo` in `starView()` (`js/app.js`). `runStar` expects
  a Promise of `{ title, src }` (an embeddable URL) or null.
- Archive the change after release.

## Decisions made while building

- The kind of question is stored as `qkind` on pool problems: `kind` already means the answer kind (num, fields, choice).
- Pools hold one entry per distinct question (the same numbers can come from two Katas). The last round's keys are
  turned back into their numbers (`sigOfKey`), so a round avoids the last round's questions even when the Rating moved
  the band.
- Task 2.2 asked that "with a pool of 5, the second round reuses at most 1". A 4-question round from 5 questions must
  reuse 3, so the test checks a pool of 7 reuses at most 1 and a pool of 5 reuses the minimum (every unused one first).
- The video offer comes after the first replay once misses reach 2 (`>= 2`), so a second miss on a rematch (which has
  no replay) still leads to the offer after the next replay. Still once a round.
- A missed rematch shows its answer and waits for "Next question"; right answers move on after about a second.
- 14 Stars sometimes rematch with another kind when every question of a round is missed (their third has few distinct
  questions of one kind); they are listed in `ALLOWED_FALLBACK` in `test/star.test.mjs`.
- `S.sky` is created on first use, not in `blank()`, so loading and saving an older record stays a no-op.
