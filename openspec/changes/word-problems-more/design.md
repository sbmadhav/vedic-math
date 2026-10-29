# Design

## Context

- `word-problems` (#151) mixes Word problems into Practice by Mode (`storyPlan()` in `js/story-plan.js`, used by `practice()` in `js/app.js`), after a Player's first 20 saved answers, and makes one Star question a Word problem. `js/stories.js` loads after the first paint and registers `{ hasStory, storyFor, skillStory, trickStory }`; `storyFor(skill, mode, { bare })` returns a Word problem for a Skill in the Mode's style, or the closest style the Skill has.
- Its design left two "Open questions for the owner": Word problems in the Arena and games, and an "only Word problems" choice in Practice.
- Endless practice (`#/mix/<level>`, `mixView()`) runs `practice()` over every Skill of a level; an Endless run (`#/run/<level>`) is the same with 3 lives.
- The Arena (`arenaView()`) offers three round types in one choice group: Daily challenge (a Ranked round, always timed, posted to the day's and week's Boards), Practice round (timed, adapting to the Arena Rating) and Practice, no clock (`runArena(..., { untimed: true })`, 20 questions, Finish at any time). Practice rounds never post and save the Arena Rating. Items are `{ q, answer, choices, viz, skill | family }`; Explorer taps choices, other Leagues type on the keypad (whole numbers up to 7 characters).
- Games (`js/games.js`) are speed formats, each with its own question kind and clock or lives; their ranked rounds post to game Boards.

## Goals / Non-Goals

**Goals:** a Player can practise only Word problems from their level, in every Mode; Word problems have a place in the Arena; nothing a Board compares changes.

**Non-Goals:** a ranked Word problem round or Board; anything new sent to Firestore; Word problems in games; a change to the mixed-in share, the 20-answer wait for it, Ratings, mastery, Sparks rules or tries; new recordings.

## Decisions (owner-delegated, 2026-10-29)

The owner wrote on 2026-10-29: "Make executive decisions." These decisions answer `word-problems` design "Open questions for the owner" and are taken under that delegation.

**D1. Only Word problems lives on the Endless practice page.** The page for a level (`#/mix/<level>`) shows a choice under its lede: "Mixed" (today's mix, the default) and "Only Word problems" (Explorer: "Only stories"). Picking it opens `#/mix/<level>/words`, a page of its own, so Back returns to the mix and the page can be linked. It is on Endless practice, not on a Skill page or an Endless run: a level's Practice is where the mix lives, a Skill page is one Skill (and the two Word problem Skills already ask only stories), and an Endless run keeps its mix so its best stays comparable from run to run.

**D2. What Only Word problems asks.** Every question is a Word problem from the level's Skills that have one (`hasStory`), picked the way Endless practice picks (Skills in progress favored, never the same Skill twice in a row), made by `storyFor(skill, mode, { bare })`: the Mode's style, or the closest the Skill has, as `word-problems` D5 says. This is "age-appropriate as the change already does". The 20-answer wait does not apply: like opening a Word problem Skill (`word-problems` D3), the Player chose stories. Everything else is Practice as today: three tries, the two hints (read, then plan), Show me, mastery and the Skill's Rating, and `math/story/practice/<right|miss>`. A level with no Skill that has a story (grades 10 to 12) shows no choice, and its `/words` page opens the mix. The choice appears once `js/stories.js` has loaded (it knows which Skills have stories); the `/words` page waits for it as a Word problem Skill's page does.

**D3. Word problems join the Arena as a Practice round, and games stay as they are.** The smallest fitting place is the Arena's round choice, which already holds an untimed Practice round: a fourth option, "Word problems" ("Story time" for Explorer). The daily challenge is Ranked and keeps bare questions. Games are not changed: each is a speed format with its own question kind (a falling number, a race, a grid), a story needs reading time that a game's clock or lives would punish, and a game's question source change would reach its ranked rounds too.

**D4. The Arena Word problems round.** 10 Word problems with no clock and a Finish button (`runArena(..., { deal, count })`), in every League, whatever Calm is set to. The questions are of the League's Mode style: Explorer one-step picture stories (tapped, picture drawn, spoken when Read aloud is on, as Explorer Arena questions are), Challenger one and two step stories, Pro multi-step real life with the hand-written stories mixed in as in Pro Practice (`roundStory(mode)` in `js/stories.js`). The "Word problem" or "Story time" label shows over each question and the unit beside the entry. Scoring is the Arena's (10 a right answer plus the combo bonus), and Sparks follow the Score as in every Arena round.

**D5. Fair and comparable: nothing a Board compares changes.** The Word problems round is Practice: its Score never leaves the device and is not a day's best, nothing is sent to Firestore (no new path, no new field), and it has no Board. It leaves the Arena Rating as it was: the Rating measures the League's pool on a 1 to 20 dial, and a story's difficulty is reading as much as arithmetic, so mixing the two would make the Rating mean less. Pro's mental arithmetic rule ("Pro Arena and Practice are mental arithmetic") excepts this round by name. The daily sets, their seeds and the Boards are unchanged.

**D6. No new spoken line.** The round speaks a Word problem through the same path as Practice (`speakQuestion`), so it says the same lines `word-problems` already lists for the owner's re-record (its task 4.2); the new chip labels and lede are not spoken. `tools/voice/lines.mjs` and `test/voice-coverage.test.mjs` do not change, and that test's todo for the Word problem lines stays honest: it already draws every template these rounds use.

**D7. Counted with existing fixed words.** Only Word problems sends what Practice sends (`math/q_answered/practice/...`, `math/story/practice/...`, `math/story/asking`). The Arena round sends `arena/<league>/words` when it starts (the Arena already sends its round type there) and the round events every Arena round sends (`metrics.roundStart` and `roundEnd`), and no per-answer event, as every Arena round. No story, Skill, name, number or anything typed is sent.

## Risks / Trade-offs

- **Bytes.** A few hundred bytes in `js/app.js`, `js/arena.js` and `js/stories.js`; `js/stories.js` still loads after the first paint. The build's first-load budget decides; `docs/perf/baseline.json` grows with its reason if it must.
- **A story round in a racing place.** The Arena's heading says "60 seconds. Same questions for everyone." The Word problems round says on its chip and its result that it is Practice; the lede is unchanged.
- **Explorer story answers as choices.** The Arena builds four choices around the answer; a picture story's answer is small, so they stay whole and non-negative as for every Explorer item.

## Open questions for the owner

None: both of `word-problems`' questions are answered here. The owner may still change any decision after the phone check (task 4.2).
