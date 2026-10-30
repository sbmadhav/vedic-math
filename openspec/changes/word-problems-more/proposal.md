# Proposal

Status: the owner (Madhav) delegated both calls on 2026-10-29 ("Make executive decisions"); the decisions are recorded in `design.md` as owner-delegated (D1 to D7). This change answers the two questions `word-problems` left in its design ("Open questions for the owner").

## Why

`word-problems` (shipped in #151) mixes a share of Word problems into Practice and Star rounds, and left two questions open:

- A Player who wants to practise reading stories can only open one of the two Word problem Skills (`3-twostep`, `8-reallife`), each a single grade and a single style. There is no way to say "give me stories from my level".
- Timed and ranked play (the Arena, games) keeps bare questions so a Score means the same for everyone. That is right for Boards, but it leaves the Arena, where many Players spend their time, with no place for a Word problem at all.

## What Changes

- **Only Word problems in Practice.** The Endless practice page of a level gets a choice next to today's mix: "Mixed" (as today) or "Only Word problems" ("Only stories" for Explorer). With it, every question is a Word problem from that level's Skills that have stories, in the Mode's style (picture stories for Explorer, one and two steps for Challenger, multi-step real life for Pro), from the first question. Levels with no story offer no choice. The choice is a page of its own (`#/mix/<level>/words`), so Back returns to the mix.
- **A Word problems round in the Arena, as Practice.** The Arena's round choice gets a fourth option, "Word problems" ("Story time" for Explorer): 10 Word problems of the Mode's style with no clock, finished at any time. It is Practice: its Score never leaves the device, nothing is sent to Firestore, it has no Board, and it leaves the Arena Rating as it was. The daily challenge, its Boards and the other Practice rounds do not change.
- **Games stay as they are.** A game is a speed format with its own kind of question; a story needs reading time its clock would punish. The Arena's untimed Practice round already has the shape a story round needs, so it is the one place Word problems join (design D3).

Modes and Players affected: every Mode, on the Endless practice page and in the Arena. Players under 13 are affected exactly like others: nothing new is sent or kept, and nothing loads Firebase.

## Out of scope

- A ranked Word problem round, a Word problem Board or anything new sent to Firestore. Ranked Boards stay fair and comparable.
- Word problems in games, the challenge tower, Katas, Party Mode, Try a trick or Placement.
- Any change to the share mixed into Practice, the 20-answer wait for that share, Ratings, mastery, Sparks rules or what counts as a try.
- New recordings or a paid voice. No new spoken line is added (design D6).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `word-problems` (added by the `word-problems` change, not yet archived): the Only Word problems choice in Practice; the first-answers rule names it.
- `arena`: the Word problems round, and its exceptions to "Arena Practice rounds adapt" and "Pro Arena and Practice are mental arithmetic".

## Affected

`mixView()` and `practice()` in `js/app.js` (the choice and the only-stories plan), `arenaView()` in `js/app.js` and `runArena()` in `js/arena.js` (the round), `js/stories.js` (`roundStory()`, a Word problem of a Mode's style for any round), `js/story-plan.js` (the choice's words), `math.css` (the Arena story question). No Locked view is touched (no open `Locks:` pull request moves these views). Nothing new is sent, so `parentNote()` and `cloud/README.md` do not change.
