# Design

## Context

- Owner answers Q17 (b), Q18 and Q19 (`_handoff/RESUME.md`, 2026-10-17). Q18 overrides Placement's Q2 ("no age question"): the Mode picker still is the age group for Leagues, and the grade question now tunes presentation only.
- Mode (today `js/fx.js` `MODES`) sets wording through `t({ explorer, challenger, pro })`, read aloud's default (`voiceOn()`: on for Explorer, stored device-wide in `vm.voice`), Explorer's tap answers (`practice()`, `arena.js` `tapMode`), Star digit boxes (`star-round`) and the League.
- The Age answer (`store.setAge`, ADR 0001) is asked at the first would-be post; after the move it only decides World board versus Device board (under 13 is device-only, `learnvedicmath`).
- `S.grade` in the progress record is the last Skill map grade page opened (`gradeView()`), not the Player's grade; the new field has a different name.
- Calm (`game-shell-and-calm`) already removes Practice clocks with an `untimed` flag in games, the Arena and the tower; Ranked rounds keep theirs.
- The Studio voice (`better-voice` Part B) records fixed lines whole and stitches the rest from clips; after `react-typescript` phase 8, a sentence with numbers is a Server line built from a template in `shared/src/voice-text.ts` (its D16).
- Re-planned 2026-10-21 for the React game (`react-typescript` task 12.2). The game is at `/learn/` with path routes, rendered by React Router in a Cloudflare Worker (its D4, D5). Module names in this design are those after that migration (its D6, D11). Today's file, where it differs:

| Today | After `react-typescript` |
|---|---|
| `js/fx.js` (`MODES`, `t()`, `voiceOn()`, `applyMode()`) | `app/src/logic/fx.ts` and `settings.ts`; the body classes from the root layout's pre-paint script and a settings effect |
| `js/store.js` | `app/src/logic/store.ts` (with `subscribe()` and the server snapshot) |
| `js/adapt.js`, `js/levels.js`, `js/check.js`, `js/placement.js` | `app/src/logic/adapt.ts`, `levels.ts`, `check.ts`, `placement.ts` |
| `js/skills/*`, `dailySet()` and the League pools in `js/arena.js` | `shared/src/skills/*`, `shared/src/questions.ts` |
| `js/app.js` views (`modePicker()`, `home()`, `practice()`, `arenaView()`, `gameView()`, `challengeView()`, `meView()`, `askAge()`, `parentNote()`) | `app/src/shell/ModePicker.tsx`, `app/src/views/<area>/`, `app/src/components/AgeDialog.tsx` |
| `js/star.js`, `js/hook.js`, `js/placement-view.js`, `js/sky-view.js`, `js/tour.js`, `js/bolt.js` | `app/src/views/star/` (with `Hook.tsx`), `app/src/views/placement/`, `app/src/views/sky/`, `app/src/views/guide/`, `app/src/components/Bolt.tsx` |
| `test/*.test.mjs` | Vitest, `*.test.ts` next to each module |

- Server rendering (`react-typescript` D14): the server renders the document, the shell and every part of a view that is the same for every visitor; anything that depends on a Player's data renders in the browser after start-up, inside `ClientOnly`. The store's server snapshot has no Players and default settings, so on the server and during hydration there is no Mode and no band. The pre-paint scripts (theme, Pause motion, returning Player, hash shim) run before paint. `/learn/` is prerendered with the first-visit Mode picker (its task 4.3).

## Goals / Non-Goals

**Goals:**
- A 4-year-old, a 7-year-old and a 12-year-old in the same Mode each get words, answers and pace they can manage.
- One place where copy and its variants live, with checks a reviewer can trust.
- The Grade answer is never sent anywhere. It moves only inside the Player's own progress, by the backup code or the progress hand-off a person starts on purpose (decision 9).

**Non-Goals:**
- Any effect on math difficulty, Leagues, Boards or Ranked rounds.
- Rewriting question text from the Skill generators.
- Band variants for every screen at once (the map below is the scope; the rest follows later through the same table).

## Decisions

**1. The question and its answers (Q18).** One screen, "What grade are you in?", with big buttons: Pre-K, K, 1 to 12, Grown-up. "Tell my age instead" swaps the buttons for 3 to 17 and Grown-up. "Skip" leaves no answer. A speaker button reads the question and, on a second tap, the buttons (no speech before a tap: browsers block it on a first load, and the glossary rule stands). Bolt's line under it: "A grown-up can help." No answer hints at what it changes.
- The question is `app/src/components/GradeQuestion.tsx`, a `<dialog>` like the Age and Player dialogs (`react-typescript` task 4.2), drawn only in the browser. The speaker button calls the voice from its click handler. Every listener is on `useAbortSignal` or `useEvent`.
- Stored as `player.reading = { grade: 'pre-k' | 'k' | '1' ... '12' | 'adult', at }` or `{ age: 3..17 | 'adult', at }` on the Player record in `vm.players`, next to `age` (`app/src/logic/store.ts`). Never in a request, never in analytics, never on a Board.
- Rejected: inferring the band from Placement (it measures math, not reading); using Mode as the band (a Challenger can be 7 or 12); a birthday (more than needed).

**2. When it is asked.** First visit: the grade question, then the Mode pick (with the suggestion, decision 7), then the Placement offer (`/learn/placement`), then home. `/learn/` is prerendered with the Mode picker (`react-typescript` task 4.3), so the question opens over it: the pre-paint script that marks a returning Player also marks a first visit with no Grade question asked yet, a CSS rule keeps the picker's cards hidden (their space kept) while that mark is on, and after start-up `GradeQuestion` opens as a modal dialog; answering or Skip closes it, removes the mark and shows the picker with its suggestion. So a first-time visitor never sees the picker before the question, and with JavaScript off the prerendered picker still shows. A new Player added in Me gets the same order. Existing Players see one home card, "Help Bolt talk your way", which opens the question; answering or Not now retires it (`S.readingCard = 'done'`). Me always has it under "For grown-ups: Reading help", with Change and Clear. No adult check guards it: changing it only changes presentation.

**3. Bands.** `bandOf(reading)` in `app/src/logic/bands.ts` (pure, no React or storage):

| Band | Grades | Ages |
|---|---|---|
| `early` (about 4 to 6) | Pre-K, K, 1 | 3 to 6 |
| `growing` (about 7 to 9) | 2, 3, 4 | 7, 8, 9 |
| `fluent` (10 and up) | 5 to 12, Grown-up | 10 to 17, Grown-up |
| none | no answer | no answer |

Band names are internal. Grown-ups see "Reading help: lots / some / a little" in Me; children never see a band name.

**4. What each band changes (`RULES` in `app/src/logic/bands.ts`).**

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

Read aloud becomes **per Player**: `player.voice` true, false or unset; unset uses the band default (or the Mode default with no band), through `voiceOn()` in `app/src/logic/settings.ts`. Automatic read aloud is started from the tap handler that shows the next question, hint or Bolt line, never from a render or a mount effect (a browser blocks speech without a gesture, and Strict Mode runs mount effects twice in development, `react-typescript` B9). A device that already has `vm.voice` set copies it once to every existing Player, then stops reading `vm.voice` (the Studio voice and natural-voice choices stay per device). The copy runs in the store's start-up migration, after hydration (`react-typescript` B7), never on the server. Rejected: keeping it per device; a family sharing a tablet would fight over it.

Ranked rounds keep the League's rules because a Board compares everyone in a League on the same round: tapping 3 choices instead of 4, or having no clock, would change Scores.

**5. Never math difficulty.** `app/src/logic/bands.ts` and `copy.ts` are imported only by views, components and hooks. An ESLint `no-restricted-imports` entry forbids importing either from `app/src/logic/adapt.ts`, `levels.ts`, `check.ts` and `placement.ts` (the engine); `shared/` cannot import from `app/` at all (its own workspace, `react-typescript` D11), so the generators and `dailySet()` in `shared/src/questions.ts` are safe by construction. `app/src/logic/bands-no-difficulty.test.ts` also fails if any of those files reads `reading`, and checks behaviorally that for each band the same seed gives the same Dial moves, the same `starPool`, the same daily set and the same Placement questions and start step.

**6. The copy table (`band-copy`).** Copy that varies lives in `app/src/logic/copy.ts`, as plain typed data (`satisfies Record<string, CopyEntry>`, so a missing variant shape fails `pnpm typecheck`):

```ts
export const COPY = {
  'home.heading': { explorer: 'What do you want to play?', challenger: 'Ready to get faster?', pro: 'Train your mental math', early: 'What do you want to play?' },
  'practice.retry': { default: 'Not quite. Try once more.', early: 'Try again!' },
  'bolt.right': { default: ['Yes!', 'Nailed it.', 'Smooth.', 'Boom.', 'Right!'], early: ['You did it!', 'Yes!', 'Great job!'], growing: ['Yes!', 'Good thinking.', 'Right!'] },
  'placement.result': { default: 'You climbed {n} steps! Bolt will start you there.', early: 'You climbed {n} steps!' }
} satisfies Record<string, CopyEntry>;
```

- **Choosing a line:** the pure `copyFor(key, { mode, band }, vars)` picks the Player's band variant (`early` or `growing`) if the entry has one, else the Mode variant, else `default`. Fluent and no band never have their own variant: they read the Mode's copy. Components call `useCopy()` (`app/src/hooks/useCopy.ts`), which reads the current Player's Mode and band through `useStore` and returns `copy(key, vars)`. Arrays are Bolt-style line sets: one is picked in the event handler that shows the line (the answer tap) and kept in component state, never picked during render, so a re-render or Strict Mode does not change it and the Compiler's purity rules hold. `{name}` placeholders are filled from `vars` as text; React escapes text, and a copy line is never passed to `Markup` or treated as markup.
- **Authoring:** one entry per line, keyed `<screen>.<line>`. Write the Mode variants first (they are today's strings, moved), then `early`, then `growing` only where the Mode copy is too long for 7 to 9 year olds. Every `early` line is a fixed line (no numbers spliced in except `{n}` counts), so the Studio voice records it whole; an `early` line with a count also has a sentence template in `shared/src/voice-text.ts`, so it is a Server line when the server voice is on (`react-typescript` D16) and clips or the device's voice otherwise. The table is plain data, so a reviewer can read it top to bottom; `pnpm --filter tools copy-table` (`tools/copy-table.ts`) prints it as a Markdown table (key by variant) for the owner to review.
- **Tests (`app/src/logic/copy-bands.test.ts`, Vitest):** every `copy('...')` key used in `app/src/` exists; every key on a mapped screen has an `early` variant; `early` sentences have 8 words or fewer and an entry at most 2 sentences, `growing` 14 or fewer; no word over 10 letters in `early` except an allowlist (Explorer, Challenger, numbers, Bolt's name); placeholders match across variants; no em dashes; no "Vedas" claims (reusing the copy test's rules); every `early` line with a count matches exactly one sentence template. The voice coverage test (better-voice) includes every `early` variant and every Bolt line.
- **Migration:** only the screens in the map move their strings into `app/src/logic/copy.ts`. Other Mode wording keeps the form the migration gave it (`t()` in `app/src/logic/fx.ts`), unchanged; `t()` is not removed. Rejected: a big-bang move of all copy (high risk, and the Guide's `w()` system already works for Modes). Rejected: a React context for copy (every line would re-render its subtree on any write; `useStore` with a selector re-renders only what reads the Player).

**7. The Mode suggestion.** With a Grade answer, the Mode picker (`app/src/shell/ModePicker.tsx`) tags one card "Suggested", drawn in the browser inside `ClientOnly` because the prerendered picker is the same for every visitor: Pre-K to 2 or ages 3 to 7 Explorer, 3 to 7 or ages 8 to 12 Challenger, 8 to 12, 13 and up or Grown-up Pro (the `MODES` grade ranges). Nothing is preselected; any Mode can be chosen.

**8. Age answer reuse.** If the Player answered with an age (not a grade), that age is also saved as their Age answer (`setAge` in `app/src/logic/store.ts`) when they have none, in the answer handler, so the posting question is not asked again. A grade answer never sets or changes the Age answer, and neither answer ever makes posting less strict than the Age answer alone. Rationale: after the move, the Age answer only chooses World or Device boards, and the grade question is as neutral as the age question. Accepted by the owner on 2026-10-17 (AB2); ADR 0001 gains the consequence (task 6.1).

**9. Privacy (ADR 0008).** The Grade answer is personal information about a child if an operator collects it. This app never collects it: it stays in the browser's storage, is not in any request (including analytics, Boards and the Firebase SDK), and is carried only in the backup code and the learnvedicmath progress hand-off (device to device in the URL fragment, which is never sent to the server). The privacy policy, the parent note and `cloud/README.md` say so. Removing a Player removes it. The server never sees it: page requests carry no cookie and no query with it (`react-typescript` D14 rejects a settings cookie), the store's server snapshot has no Players, and the pre-paint script reads it only in the browser. `privacy.spec.ts` checks every request body, URL and header during a session with each band, page navigations to the server included.

**10. Server-safe presentation (`react-typescript` D14).** The server render is the same for every visitor, so it holds no band and no Mode: every part of a screen that a band or a Mode shapes (copy from the table, tap answers, the number of choices, the Read aloud button's default, the "Suggested" tag, the home card, Me's Reading help) is inside the screen's `ClientOnly` part and drawn after start-up. Two things must be right before paint, so they are set by the root layout's pre-paint script from the device's storage, like the theme: the `band-<name>` class on `body` (so Early's larger buttons do not jump in) and the first-visit mark of decision 2. The script changes only classes and runs with the request's nonce or its hash (`react-typescript` D15); its source is in `app/src/shell/` with the others. After start-up a settings effect keeps the class in step when the Player or the answer changes.
- Rejected: rendering band copy on the server from a cookie (a setting about a child sent with every request; against ADR 0002 and D14).
- Rejected: setting the band class only after hydration (Early's buttons would grow under the Player's finger).

## Screen and component map

Paths after the `react-typescript` migration. "Copy" means the screen's fixed strings move to `app/src/logic/copy.ts` with `early` (and where needed `growing`) variants.

| Screen or component | File | What changes by band |
|---|---|---|
| Grade question (new) | `app/src/components/GradeQuestion.tsx` (a `<dialog>`, reused by the first visit, the home card and Me) | new screen; speaker button; Bolt's line |
| Mode picker | `app/src/shell/ModePicker.tsx` (prerendered at `/learn/`) | "Suggested" tag; copy (blurbs); Early: speaker button per card; all in its `ClientOnly` part |
| Placement offer, climb, result | `app/src/views/placement/` | read aloud, choices (3 or 4), copy, neutral miss lines |
| Home (tiles) | `app/src/views/home/` (Home, hero stats) | copy (greeting, heading, tile subtitles); Early: read-aloud button shown in every Mode |
| Sky and Dojo card | `app/src/views/sky/`, `app/src/views/dojo/` | Bolt's bubble copy |
| Practice and Endless runs | `app/src/views/learn/` (Skill practice, Mix and Run), the shared answer entry and `Keypad` | Early tap answers with 3 choices in every Mode; praise, retry, hint lead-ins, "Type just the answer" copy; read aloud default; Bolt's lines |
| Star round | `app/src/views/star/` | Early: 3 choices instead of digit boxes; praise and replay lines as copy keys; read aloud |
| Hook | `app/src/views/star/Hook.tsx` (from `placement`) | Early: no race (states the time); dare and result copy |
| Arena | `app/src/views/arena/` | Practice: Early tap with 3 choices and "Practice, no clock" chosen first; Growing no ticks; Ranked: League rules, clock as a bar for Early and Growing, no ticks |
| Games | `app/src/views/games/` (the game shell and each game) | Practice timers (Early untimed where the game supports it, Growing no ticks); result copy; game mechanics unchanged |
| Tower challenges | `app/src/views/tower/` | Early: untimed as in Calm (Medals that need the clock say so, as in Calm) |
| Bolt | `app/src/components/Bolt.tsx` (poses), lines in `app/src/logic/copy.ts` `bolt.*` | tone per band |
| Tour | `app/src/views/guide/` (the Tour) | Early: a speaker button on each card; copy unchanged in this change |
| Me | `app/src/views/me/` | "For grown-ups: Reading help" (Change, Clear); per-Player Read aloud |
| Age question (posting) | `app/src/components/AgeDialog.tsx` | skipped when an age came from the grade question (decision 8) |
| Parent note | `parentNote()` in `app/src/views/me/` | one sentence: the Grade answer stays on this device |
| Guide, Sutra pages, Watch, Duel, Play experiences | | unchanged (out of scope) |

## Risks / Trade-offs

- **A child picks the wrong grade** (or a sibling's). Low cost: only presentation changes, and a grown-up can fix it in Me.
- **Two questions on the first visit** (grade, then Mode) before any play. Mitigation: both are one tap, the grade question is skippable, and the Mode suggestion makes the second tap obvious. Measure time to the first question with the existing `first_win` buckets.
- **Copy drift between variants.** Mitigation: the table puts variants side by side, and the tests catch missing keys, placeholders and length.
- **Early tap answers make some Practice easier** (3 choices). Accepted: it is Practice, Ratings still move with answers, and Ranked rounds keep the League's input.

## Migration Plan

Existing Players have no Grade answer, so nothing changes until they answer. The only migration is `vm.voice` to per-Player `voice` (decision 4), run once per device. Rollback: older code ignores `reading` and `voice` on the Player record and reads `vm.voice` again (left in place for one release). A revert also drops the pre-paint marks; a leftover `band-*` class has no rules without this change's CSS.

## Owner decisions

The owner accepted every open question from PR #51 as recommended on 2026-10-17:

- AB1: first visit is grade question, Mode pick (with the suggestion), Placement offer, home (decisions 2 and 7).
- AB2: an age given instead of a grade is also the Age answer; a grade never decides posting (decision 8).
- AB3: Ranked rounds keep the League's clock length, input and choices for every band (decision 4).
- AB4: Read aloud becomes per Player, with a one-time copy of the device setting (decision 4).
- AB5: the Guide, Sutra pages, Watch, Duel, the Play experiences (#47) and generator question text keep Mode wording in this change; a follow-up adds variants (proposal, out of scope).
- AB6: Q17 is (b) only: age shapes the Vedic Math Modes, not the sbmadhav.com "Explain it like I'm 8" switch.

No questions remain open.

## Builder calls in the re-plan (2026-10-21)

These follow from `react-typescript` and the owner decisions above; review can change them without going back to the owner.

- R1: built after `react-typescript` phase 6 and after `placement`, with no band code in a Legacy view (proposal, Order and dependencies).
- R2: the grade question opens as a dialog over the prerendered Mode picker, which a pre-paint mark keeps hidden until the question is answered or skipped, so AB1's order holds without a flash (decision 2).
- R3: the band class and the first-visit mark are set by the pre-paint script; everything else a band or Mode shapes is drawn in `ClientOnly` (decision 10).
- R4: `bands.ts` and `copy.ts` in `app/src/logic/`, read through `useCopy` and `useStore`; a line set is picked in the handler that shows it (decision 6).
- R5: the math modules are kept free of bands by a lint rule as well as the test (decision 5).
- R6: Early lines with a count get a sentence template for the server voice (decision 6).
