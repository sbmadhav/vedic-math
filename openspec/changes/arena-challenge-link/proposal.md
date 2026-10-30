# Proposal

> **Approval.** On 2026-10-30 the owner shared outside feedback (`_handoff/feedback/2026-10-30-growth-playbook.md`, "the 4-engine playbook") and asked to "analyze this and create several todo tasks", under the standing delegation of 2026-10-29 ("Make executive decisions. Merge things quickly"). Once merged, this change counts as approved for building. The calls are in design.md, each marked "owner-delegated, 2026-10-30".

## Why

The feedback's first engine is a Wordle-style share loop: a "Challenge a Friend" button on the Arena result that copies a short text and a link, and "the link opens straight into the round". Checked against `main` and the live site on 2026-10-30:

- **The Arena result has no share action.** `arenaView()` in `js/app.js` ends a round with the Score, right, missed, best combo, the Arena Rating line, Sparks and the Sutras in this round, and one button, Back to the Arena. `metrics.shareClick()` exists with the surfaces `result` and `challenge-link`, and its own comment says "none yet; Phase 2 share buttons call this". `docs/PLAN.md` Gate C measures the share rate as `share_click` over `round_end`, so today that number is always zero.
- **The daily round is already the same for everyone in a League, so no new seed is needed.** `dailySet(league, day)` in `js/arena.js` deals the same 80 questions in the same order to every Player of a League on a local date (arena spec, "Daily rounds are identical for a League"). A link only has to carry the date and the League.
- **A bare `#/arena` link would not reproduce the round.** It opens the lobby in the recipient's own Mode and today's local date: a friend in another Mode, or in a time zone already on the next day, would get different questions, so "beat my score" would be meaningless.
- **The feedback's example text is not what the Arena is.** The Arena daily challenge is a 60-second race scored by Score (with a combo bonus), not "5/5 in 11.4s"; it mixes Tricks, so there is no single "Trick: Nikhilam (Near 100)"; and it is named "Daily challenge" in the lobby, not "Daily Arena". The share text below says what the round really is.
- **A spoiler-free emoji grid already exists elsewhere.** Daily Number (`js/play/exp/daily-core.js`, `shareText()`) shares a Wordle-style grid, and Ghost Races already sends a seeded challenge link (`#/arena/ghosts/r/<code>`). This change adds the same loop to the Arena itself, with words rather than emoji.

## What Changes

- **Challenge a friend on the daily result.** After an Arena daily challenge round, the result shows a "Challenge a friend" button (Explorer: "Send to family"). It opens the device's share sheet with a short text and a challenge link, or copies them when there is no share sheet, and says "Copied. Paste it anywhere." Practice, untimed and Word problem rounds have no button: they are not the shared round.
- **The share text is words only.** For example:
  `Learn Vedic Math: Arena daily challenge, Challenger League, 2026-10-30`
  `Score 240: 14 right, 2 missed, best combo 9x`
  `The same questions for every Challenger today, 60 seconds, no sign-in. Can you beat it?`
  followed by the challenge link. It carries no Nickname, avatar, Player id, Age answer or Rating, no emoji and no Sutra or Trick names.
- **The challenge link opens the same round.** `https://learnvedicmath.com/play/#/arena/day/<YYYY-MM-DD>/<league>/<score>`, for example `/play/#/arena/day/2026-10-30/challenger/240`. On the date it names, in that League, it opens the Arena lobby with Daily challenge picked and a line "A friend's challenge: Score 240 to beat" (the Score comes from the link), so Start plays exactly the friend's round as a Ranked round. On another date or in another League it offers the friend's round as Practice, "Play your friend's round (Practice, not on the Boards)", with today's own daily challenge beside it. A link whose date or League does not parse opens the Arena lobby as `#/arena` does.
- **Counted, with no identifiers.** The button sends `math/share_click/result`; opening a link is the route view `math/view/arena/day`, with no date, League or Score in it.

Unchanged: who may post (the Age answer, ADR 0006), the questions of every round, the Boards, Calm (the daily challenge keeps its clock), every other result screen.

Modes and Players affected: every Player who finishes an Arena daily challenge, in every Mode, under 13 included (nothing new leaves the device: see design D6); anyone who opens a challenge link.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `arena`: new requirements "Challenge a friend from the daily result", "The share text says what the round was and nothing personal", "A challenge link on its day and League is the daily challenge", "A challenge link survives the Mode picker", "A challenge link on another day or League is Practice" and "A challenge link is checked and never starts by itself".
- `analytics`: new requirement "Challenge links are counted without identifiers".

## Impact

- `js/app.js` (`arenaView()`: the button on the daily result, the lobby line; a route `#/arena/day/<date>/<league>` placed before the play experience pattern, which would otherwise read `day` as an experience name), `js/arena.js` (a pure `challengeText()` and `parseChallenge()`), `js/metrics.js` (the route view name), `math.css` (a small block for the button row and the lobby line), `GLOSSARY.md` (Challenge link; Ranked round's "challenge-link round" wording).
- The share helper: `share()` in `js/play/kit.js` already does share sheet, then clipboard, then "Copied". The Arena imports it lazily on the first tap so `js/app.js` grows only by the button and its handler.
- First load: a few hundred bytes in `js/app.js`; `docs/perf/baseline.json` gets a `firstLoad.changes` entry if the total moves.
- No spoken line changes (the button and the lobby line are not read aloud).
- Tests: `test/arena.test.mjs` (text and parse), new `e2e/tests/cov/arena-8.spec.ts` to `arena-11.spec.ts` (`arena-1` to `arena-7` exist), `e2e/tests/cov/analytics-15-challenge-link.spec.ts`; `e2e/tests/arena.spec.ts` gains the button.
