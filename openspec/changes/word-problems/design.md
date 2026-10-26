# Design

## Context

- Practice (`practice()` in `js/app.js`) asks `pickSkill()` for a Skill and its generator for a question (`s.gen(level)`, the level from the Skill's Dial). Up to three tries; the Hint button shows `hints[0]`, then `hints[1]`; the second miss shows a hint on its own; the third try or Show me reveals `steps` and the answer. Explorer gets whole-number answers as big buttons, and with Read aloud on hears the question (`fx.speakQuestion`) and each hint.
- A Star round (`js/star.js`) deals 4 main questions from the Star's band of Katas; each problem keeps its numbers (`vals`), which the replay after a miss works with `trick.steps(vals)`, and a rematch asks a problem of the same kind. A pure engine (`starRound`, `starAnswer`, `starNext`, `starDare`) holds every rule; `runStar` draws it. The round has no Hint button: its help is the replay.
- Word problems today: `3-twostep` (one template), one in three `3-div` questions, some K to 2 sums. Names come from `PEOPLE` in `js/lib.js`.
- Read aloud uses the Studio voice when a line is recorded, else the Built-in voice (`js/voice.js`). `test/voice-coverage.test.mjs` requires studio audio for every line the K to 2 Skill generators make and 99% of all generator lines.
- Every module is precached by the service worker, so every new byte counts toward first load (`docs/perf/baseline.md`), whether it is imported at once or later.
- Reading bands (`age-bands`) are not built; `bandFor()` in `js/family-helpers.js` reads `player.reading` when it exists.

## Goals / Non-Goals

**Goals:** Word problems in every Mode's everyday rounds, more of them and longer ones as the Mode grows; the Trick as the fast way through the story; help that teaches reading before arithmetic and never gives the answer; no network, no cost, offline.

**Non-Goals:** Ranked rounds, Katas, games and play experiences; new recordings; any change to Ratings, Sparks, mastery or tries.

## Decisions (approved by the owner on 2026-10-26)

**D1. Where Word problems appear.** In Practice (a Skill page, Endless practice, an Endless run) in every Mode, and in Star rounds for Challenger and Pro (Explorer is not offered Stars). Not in Ranked rounds, Katas, games, the challenge tower, Party Mode, Try a trick or Placement: a timed or ranked round keeps bare questions so a Score means the same for everyone, and a Kata is a fixed, numbered drill.

**D2. How many, by Mode.** A round's questions are counted from 1. Explorer: questions 5, 15, 25 and so on (1 in 10). Challenger: 3, 8, 13 (1 in 5). Pro: 2, 5, 8 (1 in 3). The first comes early in a round so a short session still meets one. In a Star round the same positions apply to the 4 main questions: question 3 for Challenger, question 2 for Pro. Reading bands are not on `main`; when `age-bands` lands, a Player with the Early band gets Explorer's share and picture stories in any Mode (a follow-up task there, not here).

**D3. A new Player's first answers stay bare.** Word problems join once the Player has 20 answers saved (their answer count, the one the Daily quests use). The Hook and a new Player's first minutes are quick wins on bare numbers; reading comes once the Trick is known. A due Word problem waits, it is not lost. The wait is for the share mixed into other Skills: a Player who opens a Word problem Skill (`3-twostep`, `8-reallife`) chose stories, so those ask them from the first question, as `3-twostep` always has.

**D4. A due slot waits for a Skill that has stories.** Not every Skill has a story (counting dots, factoring, limits). When a slot comes on such a Skill, the next question whose Skill has one is the Word problem; a session on a Skill with none never shows one. In a Star round the Trick decides once: Tricks whose answer is not one number or whose numbers do not make a natural story (dividing by 9, digit sums, decimals of 1/19, divisibility, the equation Tricks) keep bare questions.

**D5. Styles by Mode.** Explorer: one step, small numbers (within 20, within 100 in grade 2 Skills), the story's things drawn (a ten frame or an array), short sentences with no pronouns. Challenger: one or two steps. Pro: two or three steps from real life: budgets, travel times, recipes, sports stats, savings, sale prices, growth. A Mode's style is used when the Skill has one; otherwise the closest style the Skill has (a Pro on a grade 1 Skill gets the picture story).

**D6. The Sutra is the shortcut inside the story.** Each story template names the Trick its numbers suit and draws numbers it makes fast: tickets near 100 (Nikhilaṃ), a square garden 85 m on a side (Ekādhikena Pūrveṇa), 11 players a team (the 11 sandwich), crates of 99 (Ekanyūnena Pūrveṇa), change from 1,000 (all from 9 and the last from 10), rows of 43 by 47 chairs (Antyayordaśake'pi), a square courtyard of 2,809 square metres (Vilokanam). The plan hint says which Trick fits in plain words; the steps work it and name the Sutra. A Star's Word problem is always on the Star's own numbers, so its answer and its replay are the Trick's.

**D7. Read, plan, solve.** A Word problem has two hints in order: the first starts "What is it asking?" and says the unknown in plain words ("How many birds there are now."), the second is the plan: which numbers, which operation, which Trick ("Start at 3 and count on 2."). For a multi-step story the plan names the steps, never their results. No hint holds the answer: generators keep the answer different from every number in the story, and a unit test draws thousands of stories per template and checks that no hint contains it. Show me and the third try reveal the worked steps, as for every question. In a Star the help is the replay: on a Word problem its first step says what the story asks and the plain question it turns into ("The area of the garden: 85 × 85."), then the Trick's own steps.

**D8. Settings that travel.** Shops, cooking, sport, trips, school, gardens, parks. Money in rupees or dollars, written as words ("97 rupees", never a symbol), chosen per story. Metric units only (m, km, g, kg, L, minutes, hours). First names from a fixed list from many cultures (`NAMES` in `js/stories.js`), and never the Player's Nickname or anything typed. No holidays, no local sports rules, no prices that need a country.

**D9. Generated templates first, a few written by hand.** One pure module, `js/stories.js`, with no DOM and no network: each template is a function of a random source (tests pass a seeded one) returning a problem in the shape every round already uses (`q`, `answer`, `unit`, `hints`, `steps`, `viz`) plus `story` (`{ id, mode, trick }`). Eight hand-written stories, each with fixed numbers and its own wording, give Pro depth; `8-reallife` mixes them in, and one in four of Pro's Practice slots on a Skill a written story fits uses one. The templates stay off the first paint: `js/story-plan.js` (the slot plan and labels, no imports) is in the static graph, and `js/stories.js` loads after the page has painted and registers there. Until it is here no Word problem is mixed in (a due one waits), a Star fills its story slot when that question comes, and a Word problem Skill's page waits the few milliseconds before its first question.

**D10. Word problem Skills.** `3-twostep` keeps its id and draws from the Challenger two-step stories. A new Skill `8-reallife`, "Real-life problems" (kid name "Real-life puzzles"), grade 8, strand Ratios and percents, asks only Pro's multi-step and hand-written stories. Grade 8 is in both Challenger's and Pro's grade range. The Skill map grows to 136.

**D11. Read aloud through the existing voice.** A Word problem is spoken like any question (`fx.speakQuestion`), and Explorer hears its hints as today. No line is recorded in this change and no paid voice is called: the Studio voice has no recording of the new lines, so the Built-in voice speaks them. `tools/voice/lines.mjs` lists the new lines (Explorer stories whole, the rest as clips) for the owner's next re-record; until then `test/voice-coverage.test.mjs` leaves Word problems out of the Explorer gate, with a todo test that names the re-record.

**D12. Counted with fixed words.** `math/story/<practice|run|star>/<right|miss>` when a Word problem is finished (right is a right answer on any try), and `math/story/asking` when "What is it asking?" is shown. Never the template, the Skill, the name in the story, the numbers or anything typed. Under-13 Players send exactly what they sent before plus these counts, which carry nothing about them.

**D13. Answer entry.** Every Word problem has one number as its answer. Practice shows the unit beside the box (`m²`, `rupees`, `minutes`); a Star's wording names the unit. Explorer's answers become big buttons as before.

**D14. The Family.** The scripted Family helpers press the round's Hint as today, so on a Word problem their first hint is "What is it asking?". The 13 and over conversation (`family-helpers` step 3) may help read a Word problem (what it asks, which numbers matter), never the answer; the server check there covers a Word problem's answer like any other. A task in `family-helpers/tasks.md`, no code here.

## Risks / Trade-offs

- **Bytes.** `js/stories.js` is precached like every module, 10,070 bytes Brotli, plus 1,723 for `js/story-plan.js` (first load 807,349 to 820,904 bytes, measured on `main` after #126). Only `story-plan.js` is in the first paint's import graph; `stories.js` loads after the paint; the baseline grows with the reason (`docs/perf/baseline.json` `firstLoad.changes`).
- **Built-in voice for new lines.** Explorer stories sound different from recorded questions until the re-record. Accepted by the owner's rule for this change (no new recordings, no paid voice); task 4.2 is the owner's.
- **Tests that read questions.** Specs that answer by reading the question on screen keep working because a new Player's first 20 answers are bare (D3); specs about Word problems seed 20 answers.
- **The 20-answer wait** delays the first Word problem for a brand new Player by a few minutes. Tunable (`RULES.after` in `js/stories.js`).

## Open questions for the owner

- Word problems in the Arena and games (a separate Board, or a round type)? Not in this change.
- Should a Player be able to ask for "only Word problems" in Practice? `8-reallife` and `3-twostep` serve that today.
