# Design

## Context

- Owner answers Q17 (b), Q18 and Q19 (`_handoff/RESUME.md`, 2026-10-17). Q18 overrides Placement's Q2 ("no age question"): the Mode picker still is the age group for Leagues, and the grade question now tunes presentation only.
- Mode (`js/fx.js` `MODES`) sets wording through `t({ explorer, challenger, pro })`, read aloud's default (`voiceOn()`: on for Explorer, stored device-wide in `vm.voice`), Explorer's tap answers (`practice()`, `arena.js` `tapMode`), Star digit boxes (`star-round`) and the League.
- The Age answer (`store.setAge`, ADR 0001) is asked at the first would-be post; after the move it only decides World board versus Device board (under 13 is device-only, `learnvedicmath`).
- `S.grade` in the progress record is the last Skill map grade page opened (`gradeView()`), not the Player's grade; the new field has a different name.
- Calm (`game-shell-and-calm`) already removes Practice clocks with an `untimed` flag in games, the Arena and the tower; Ranked rounds keep theirs.
- The Studio voice (`better-voice` Part B) records fixed lines whole and stitches the rest from clips.

## Goals / Non-Goals

**Goals:**
- A 4-year-old, a 7-year-old and a 12-year-old in the same Mode each get words, answers and pace they can manage.
- One place where copy and its variants live, with checks a reviewer can trust.
- The Grade answer never leaves the device.

**Non-Goals:**
- Any effect on math difficulty, Leagues, Boards or Ranked rounds.
- Rewriting question text from the Skill generators.
- Band variants for every screen at once (the map below is the scope; the rest follows later through the same table).

## Decisions

**1. The question and its answers (Q18).** One screen, "What grade are you in?", with big buttons: Pre-K, K, 1 to 12, Grown-up. "Tell my age instead" swaps the buttons for 3 to 17 and Grown-up. "Skip" leaves no answer. A speaker button reads the question and, on a second tap, the buttons (no speech before a tap: browsers block it on a first load, and the glossary rule stands). Bolt's line under it: "A grown-up can help." No answer hints at what it changes.
- Stored as `player.reading = { grade: 'pre-k' | 'k' | '1' ... '12' | 'adult', at }` or `{ age: 3..17 | 'adult', at }` on the Player record in `vm.players`, next to `age`. Never in a request, never in analytics, never on a Board.
- Rejected: inferring the band from Placement (it measures math, not reading); using Mode as the band (a Challenger can be 7 or 12); a birthday (more than needed).

**2. When it is asked.** First visit: the grade question, then the Mode pick (with the suggestion, decision 7), then the Placement offer, then home. A new Player added in Me gets the same order. Existing Players see one home card, "Help Bolt talk your way", which opens the question; answering or Not now retires it (`S.readingCard = 'done'`). Me always has it under "For grown-ups: Reading help", with Change and Clear. No adult check guards it: changing it only changes presentation.

**3. Bands.** `bandOf(reading)` in `js/bands.js`:

| Band | Grades | Ages |
|---|---|---|
| `early` (about 4 to 6) | Pre-K, K, 1 | 3 to 6 |
| `growing` (about 7 to 9) | 2, 3, 4 | 7, 8, 9 |
| `fluent` (10 and up) | 5 to 12, Grown-up | 10 to 17, Grown-up |
| none | no answer | no answer |

Band names are internal. Grown-ups see "Reading help: lots / some / a little" in Me; children never see a band name.

**4. What each band changes (`RULES` in `js/bands.js`).**

| | Early | Growing | Fluent | No band |
|---|---|---|---|---|
| Read aloud default | on: automatic after each tap, replay button | off: Hear it on every question | off: Hear it | Explorer on, others off (today) |
| Wording | `early` variant (8 words or fewer per sentence, 2 sentences or fewer) | `growing` variant if any (14 words or fewer), else Mode copy | Mode copy | Mode copy |
| Answers | tap big buttons for every whole-number or choice answer, Skill picture shown when it has one; typed only when the answer cannot be a button (an expression, a set) | Mode's entry | Mode's entry | Mode's entry |
| Choices shown | 3 | 4 | 4 | Mode's (Explorer 4 today) |
| Practice clocks | none (the existing `untimed` path, without Calm's motion change) | kept, no tick sound, shown as a bar | as today | as today |
| Hook dare | no race: states the calculator's time, as in Calm | races | races | races |
| Ranked rounds | the League's clock, input and choices; no tick sound; clock as a bar | the League's; no tick sound | as today | as today |
| Bolt's tone | 1 to 4 warm, literal words; no idioms ("Boom", "Nailed it"), no sarcasm | short friendly coach (up to 8 words) | today's lines | today's lines |

Read aloud becomes **per Player**: `player.voice` true, false or unset; unset uses the band default (or the Mode default with no band). A device that already has `vm.voice` set copies it once to every existing Player, then stops reading `vm.voice` (the Studio voice and natural-voice choices stay per device). Rejected: keeping it per device; a family sharing a tablet would fight over it.

Ranked rounds keep the League's rules because a Board compares everyone in a League on the same round: tapping 3 choices instead of 4, or having no clock, would change Scores.

**5. Never math difficulty.** `js/bands.js` and `js/copy.js` are imported only by presentation modules. `test/bands-no-difficulty.test.mjs` fails if `js/adapt.js`, `js/levels.js`, `js/skills/*`, `js/check.js`, `js/placement.js` (the engine), or `dailySet()` in `js/arena.js` import either, or read `player.reading`, and checks behaviorally that for each band the same seed gives the same Dial moves, the same `starPool`, the same daily set and the same Placement questions and start step.

**6. The copy table (`band-copy`).** Copy that varies lives in `js/copy.js`:

```js
export const COPY = {
  'home.heading': { explorer: 'What do you want to play?', challenger: 'Ready to get faster?', pro: 'Train your mental math', early: 'What do you want to play?' },
  'practice.retry': { default: 'Not quite. Try once more.', early: 'Try again!' },
  'bolt.right': { default: ['Yes!', 'Nailed it.', 'Smooth.', 'Boom.', 'Right!'], early: ['You did it!', 'Yes!', 'Great job!'], growing: ['Yes!', 'Good thinking.', 'Right!'] },
  'placement.result': { default: 'You climbed {n} steps! Bolt will start you there.', early: 'You climbed {n} steps!' }
};
```

- **Choosing a line:** `fx.copy(key, vars)` picks the Player's band variant (`early` or `growing`) if the entry has one, else the Mode variant, else `default`. Fluent and no band never have their own variant: they read the Mode's copy. Arrays are Bolt-style line sets, one picked at random per use. `{name}` placeholders are filled from `vars` and escaped.
- **Authoring:** one entry per line, keyed `<screen>.<line>`. Write the Mode variants first (they are today's strings, moved), then `early`, then `growing` only where the Mode copy is too long for 7 to 9 year olds. Every `early` line is a fixed line (no numbers spliced in except `{n}` counts), so the Studio voice records it whole. The table is plain data, so a reviewer can read it top to bottom; `node tools/copy-table.mjs` prints it as a Markdown table (key by variant) for the owner to review.
- **Tests (`test/copy-bands.test.mjs`):** every `copy('...')` key used in `js/` exists; every key on a mapped screen has an `early` variant; `early` sentences have 8 words or fewer and an entry at most 2 sentences, `growing` 14 or fewer; no word over 10 letters in `early` except an allowlist (Explorer, Challenger, numbers, Bolt's name); placeholders match across variants; no em dashes; no "Vedas" claims (reusing `copy.test.mjs` rules). `test/voice-coverage.test.mjs` (better-voice) includes every `early` variant and every Bolt line.
- **Migration:** only the screens in the map move their strings into `js/copy.js`. Other `fx.t()` calls keep working unchanged; `fx.t()` is not removed. Rejected: a big-bang move of all copy (high risk, and the Guide's `w()` system already works for Modes).

**7. The Mode suggestion.** With a Grade answer, the Mode picker tags one card "Suggested": Pre-K to 2 or ages 3 to 7 Explorer, 3 to 7 or ages 8 to 12 Challenger, 8 to 12, 13 and up or Grown-up Pro (the `MODES` grade ranges). Nothing is preselected; any Mode can be chosen.

**8. Age answer reuse.** If the Player answered with an age (not a grade), that age is also saved as their Age answer (`store.setAge`) when they have none, so the posting question is not asked again. A grade answer never sets or changes the Age answer, and neither answer ever makes posting less strict than the Age answer alone. Rationale: after the move, the Age answer only chooses World or Device boards, and the grade question is as neutral as the age question. Accepted by the owner on 2026-10-17 (AB2); ADR 0001 gains the consequence (task 6.1).

**9. Privacy (ADR 0008).** The Grade answer is personal information about a child if an operator collects it. This app never collects it: it stays in the browser's storage, is not in any request (including analytics, Boards and the Firebase SDK), and is carried only in the backup code and the learnvedicmath progress hand-off (device to device in the URL fragment, which is never sent to the server). The privacy policy, the parent note and `cloud/README.md` say so. Removing a Player removes it. `privacy.spec.ts` checks every request body and URL during a session with each band.

## Screen and component map

Paths after the move. "Copy" means the screen's fixed strings move to `js/copy.js` with `early` (and where needed `growing`) variants.

| Screen or component | File | What changes by band |
|---|---|---|
| Grade question (new) | `js/app.js` `gradeQuestion()` (sheet, reused by the home card and Me) | new screen; speaker button; Bolt's line |
| Mode picker | `js/app.js` `modePicker()` | "Suggested" tag; copy (blurbs); Early: speaker button per card |
| Placement offer, climb, result | `js/placement-view.js` | read aloud, choices (3 or 4), copy, neutral miss lines |
| Home (tiles) | `js/app.js` `home()`, `heroStats()` | copy (greeting, heading, tile subtitles); Early: read-aloud button shown in every Mode |
| Sky and Dojo card | `js/sky-view.js`, `js/app.js` | Bolt's bubble copy |
| Practice and Endless runs | `js/app.js` `practice()`, `answerUI()` | Early tap answers with 3 choices in every Mode; praise, retry, hint lead-ins, "Type just the answer" copy; read aloud default; Bolt's lines |
| Star round | `js/star.js` `runStar()` | Early: 3 choices instead of digit boxes; PRAISE and replay lines as copy keys; read aloud |
| Hook | `js/hook.js` | Early: no race (states the time); dare and result copy |
| Arena | `js/arena.js`, `js/app.js` `arenaView()` | Practice: Early tap with 3 choices and "Practice, no clock" chosen first; Growing no ticks; Ranked: League rules, clock as a bar for Early and Growing, no ticks |
| Games | `js/app.js` `gameView()`, `js/games.js` | Practice timers (Early untimed where the game supports it, Growing no ticks); result copy; game mechanics unchanged |
| Tower challenges | `js/app.js` `challengeView()` | Early: untimed as in Calm (Medals that need the clock say so, as in Calm) |
| Bolt | `js/bolt.js` (poses), lines in `js/copy.js` `bolt.*` | tone per band |
| Tour | `js/tour.js` | Early: a speaker button on each card; copy unchanged in this change |
| Me | `js/app.js` `meView()` | "For grown-ups: Reading help" (Change, Clear); per-Player Read aloud |
| Age question (posting) | `js/app.js` `askAge()` | skipped when an age came from the grade question (decision 8) |
| Parent note | `js/app.js` `parentNote()` | one sentence: the Grade answer stays on this device |
| Guide, Sutra pages, Watch, Duel (retired by #47 if it merges first), Play experiences | | unchanged (out of scope) |

## Risks / Trade-offs

- **A child picks the wrong grade** (or a sibling's). Low cost: only presentation changes, and a grown-up can fix it in Me.
- **Two questions on the first visit** (grade, then Mode) before any play. Mitigation: both are one tap, the grade question is skippable, and the Mode suggestion makes the second tap obvious. Measure time to the first question with the existing `first_win` buckets.
- **Copy drift between variants.** Mitigation: the table puts variants side by side, and the tests catch missing keys, placeholders and length.
- **Early tap answers make some Practice easier** (3 choices). Accepted: it is Practice, Ratings still move with answers, and Ranked rounds keep the League's input.

## Migration Plan

Existing Players have no Grade answer, so nothing changes until they answer. The only migration is `vm.voice` to per-Player `voice` (decision 4), run once per device. Rollback: older code ignores `reading` and `voice` on the Player record and reads `vm.voice` again (left in place for one release).

## Owner decisions

The owner accepted every open question from PR #51 as recommended on 2026-10-17:

- AB1: first visit is grade question, Mode pick (with the suggestion), Placement offer, home (decisions 2 and 7).
- AB2: an age given instead of a grade is also the Age answer; a grade never decides posting (decision 8).
- AB3: Ranked rounds keep the League's clock length, input and choices for every band (decision 4).
- AB4: Read aloud becomes per Player, with a one-time copy of the device setting (decision 4).
- AB5: the Guide, Sutra pages, Watch, Duel, the Play experiences (#47) and generator question text keep Mode wording in this change; a follow-up adds variants (proposal, out of scope).
- AB6: Q17 is (b) only: age shapes the Vedic Math Modes, not the sbmadhav.com "Explain it like I'm 8" switch.

No questions remain open.
