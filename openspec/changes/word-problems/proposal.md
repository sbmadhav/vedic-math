# Proposal

Status: approved by the owner (Madhav) on 2026-10-26. On 2026-10-25 the owner wrote: "One thing I see missing is practical word problems. We need a lot of that as the age of the user goes up. But it should be there for all ages." On 2026-10-26 they approved the direction recorded in `design.md` (D1 to D14): every age with more as they grow, the Sutra as the shortcut inside the story, read, plan and solve with a first hint that asks what the question is asking, everyday settings that travel, a share of each round rising with the Mode, generated templates first with a few hand-written stories, and a note for the 13 and over Family chat.

## Why

Today almost every question is bare arithmetic ("98 × 97 = ?"). A handful of Skills dress a question in a sentence (`3-twostep`, one in three `3-div` questions, some K to 2 sums), and nothing else asks a Player to read a situation, decide what it asks and pick the numbers that matter. That is the step school tests and real life ask for most, and it grows with age: a 6 year old hears "3 birds sit, 2 more come", a 15 year old plans a trip budget.

The Vedic Tricks are at their best inside such a story. "98 tickets at 97 rupees each" is a Nikhilam problem the moment a Player sees that both numbers are near 100; "a square garden 85 m on a side" is Ekādhikena Pūrveṇa. A word problem is where a Player chooses the Trick, which is the Magic moment the product exists for.

## What Changes

- **A Word problem inside every Mode's rounds**, not a separate corner. In Practice (Skill pages, Endless practice and Endless runs) a share of the questions are Word problems: about 1 in 10 for Explorer, 1 in 5 for Challenger and 1 in 3 for Pro. In Star rounds (Challenger and Pro; Explorer has no Stars) one of the four main questions is a Word problem on the Star's own numbers. A new Player's first 20 answers stay bare, so the Hook and the first minutes stay quick wins.
- **Every age, more as they grow.** Explorer gets short picture stories (one step, a picture of the things in the story, read aloud when Read aloud is on). Challenger gets one and two step stories. Pro gets multi-step real-life problems: budgets, travel times, recipes, sports stats, savings.
- **The Sutra is the shortcut inside the story.** Stories pick numbers a Trick makes fast (near 100, ending in 5, times 11 or 99, change from 1,000, last digits that add to 10, perfect squares and cubes). The plan hint points at the Trick and the steps work it.
- **Read, plan, solve.** The same help ladder as today, with a new first step: the first hint on a Word problem is "What is it asking?" in plain words, the second is the plan. No hint ever holds the answer. In a Star the replay after a miss starts with what the story asks.
- **Everyday settings that travel.** Shops, cooking, sport, trips, school and gardens; money in rupees or dollars (as words); metric units; first names from many cultures from a fixed list (never the Player's Nickname); nothing that needs local knowledge.
- **Generated first, a few written by hand.** Templates make fresh numbers every time, on the device and offline, at no cost. A small set of hand-written stories adds depth for Pro.
- **Skills.** `3-twostep` (Two-step word problems) draws from the new two-step stories. A new Skill, `8-reallife` (Real-life problems, grade 8), holds Pro's multi-step stories and the hand-written ones. The map grows from 135 to 136 Skills.
- **Counted anonymously.** `math/story/<practice|run|star>/<right|miss>` for each answered Word problem, and `math/story/asking` when "What is it asking?" is shown. Fixed words only.
- **The Family chat note.** The 13 and over conversation planned in `family-helpers` step 3 may help a Player read a Word problem ("what is it asking?"), never give the answer. Recorded there as a task, no code.

Modes and Players affected: every Mode (Explorer, Challenger, Pro) and every Player in Practice; Challenger and Pro Players in Star rounds. Players under 13 are affected exactly like others: nothing new is sent or kept, and nothing loads Firebase.

## Out of scope

- Ranked rounds (the Arena, ranked game rounds, the Daily Sutra, challenge links), Katas, games, the challenge tower, Party Mode, Try a trick, Placement and the play experiences. A timed or ranked round keeps bare questions so Scores stay comparable; a follow-up can add Word problems there.
- Any change to Ratings, mastery, Sparks, Scores or what counts as a try.
- New recordings or a paid voice. The new lines are spoken by the Built-in voice until the owner's next re-record.
- Reading bands. `age-bands` is not on `main`; when it lands, the share and the picture stories can follow the Reading band (design D2).
- Typed answers other than numbers. Every Word problem has a number answer.

## Capabilities

### New Capabilities

- `word-problems`: where Word problems appear and how often, the styles by Mode, the Sutra inside the story, the read-plan-solve help ladder, the settings and names, the Word problem Skills, generated and hand-written stories, read aloud.

### Modified Capabilities

- `analytics`: anonymous Word problem counts.

## Affected

Practice in `js/app.js`, the Star round in `js/star.js`, a new `js/stories.js`, `js/skills/middle.js` (`3-twostep`) and `js/skills/upper.js` (`8-reallife`), `math.css`, `js/metrics.js`, the recording list in `tools/voice/lines.mjs`. No Locked view is touched (no open `Locks:` pull request moves these views). Nothing new is sent except the fixed-word counts, so `parentNote()` and `cloud/README.md` do not change.
