# Proposal

## Why

The owner: "kid mode should be different for different ages." Taken as Q17 (b) and accepted with Q18 and Q19 on 2026-10-17 (`_handoff/RESUME.md`): within every Mode, how the app talks and how a Player answers should follow how well the Player reads, while the math difficulty stays with the Placement level.

Today the Mode is the only knob. Explorer (about 4 to 7) gets read aloud by default, big buttons and simpler copy; Challenger and Pro get typed answers and longer copy. A 4-year-old and a 7-year-old Explorer get the same words, and a 7-year-old who picked Challenger (because Placement or a sibling put them there) gets 25-word lines, digit boxes and countdown ticks. Copy is written inline as `fx.t({ explorer, challenger, pro })` in `js/app.js` (22 places), as `w(explorer, challenger, pro)` in `js/guide.js`, and as fixed arrays in `js/star.js` and `practice()`, so there is no place to add a variant for a younger reader.

Re-planned 2026-10-21 for the React and TypeScript game (`react-typescript` task 12.2, design D3 and D14). The owner's answers Q17 to Q19 and decisions AB1 to AB6 are unchanged. What changed is only where and how it is built: the grade question, the band rules and the copy table are written for React route modules under `/learn/`, rendered safely on the server (the server never knows a Player's Grade answer, band or Mode, so everything they shape is drawn in the browser), with the logic as framework-free TypeScript in `app/src/logic/`.

## What Changes

- **Ask once (Q18).** "What grade are you in?" with big buttons Pre-K, K, 1 to 12 and Grown-up, plus "Tell my age instead" (3 to 17 and Grown-up). Asked once per Player on the first visit, before the Mode pick, and skippable. A speaker button reads the question and the buttons on tap. The answer is the **Grade answer**: stored only on the device, in the Player's record, never sent anywhere. A grown-up can change or clear it in Me, under "For grown-ups". Existing Players see one optional card on home.
- **Three Reading bands (Q19)** decided by the Grade answer, applied in every Mode:
  - **Early** (about 4 to 6: Pre-K, K, grade 1, or ages 3 to 6),
  - **Growing** (about 7 to 9: grades 2 to 4, or ages 7 to 9),
  - **Fluent** (10 and up: grade 5 and above, Grown-up, or ages 10 and up).
  No Grade answer means no band: everything behaves as today, by Mode.
- **What a band changes** (the full screen map is in `design.md`):
  - **Read aloud:** Early reads questions, hints and Bolt's lines automatically after each tap, with a replay button; Growing and Fluent read on tap (Hear it on every question). Read aloud becomes a per-Player choice whose default comes from the band.
  - **Wording:** Early and Growing get shorter copy variants (at most 8 and 14 words per sentence) from a new copy table, `app/src/logic/copy.ts`; Fluent gets the Mode's copy.
  - **Answers:** Early taps big buttons (with the Skill's picture when it has one) for every whole-number or choice answer, in every Mode; Growing and Fluent use the Mode's entry.
  - **Choices:** 3 for Early, 4 for Growing and Fluent, wherever choices are shown in Practice, Stars and Placement.
  - **Timers:** Early has no clock in Practice and no calculator race in the Hook; Growing keeps Practice clocks but without countdown ticks, shown as a bar; Fluent as today. Ranked rounds keep their clock, input and choice count for everyone in a League.
  - **Bolt's tone:** Early gets 1 to 4 warm, literal words ("You did it!"), Growing a short friendly coach, Fluent today's lines.
- **Never math difficulty.** A band never changes Ratings, question generators, Kata problems, Star bands, the daily Arena set, Placement's start step or scoring. A test enforces it.
- **The Mode picker suggests a Mode** from the Grade answer with a "Suggested" tag; the Player still chooses freely.
- **Placement** (the `placement` change): Explorer's automatic read aloud and 3 big choices become the Early band's behavior in every Mode; Explorer Players with no band keep them.
- **An age given instead of a grade is also the Age answer**, so it is never asked twice; a grade never decides posting (accepted by the owner on 2026-10-17).
- **Built in React, server-safe (`react-typescript` D14).** The grade question is a browser-only dialog. Band copy, band answers and the "Suggested" tag are drawn in the browser after start-up; the server renders the shell and what is the same for every visitor. The band's spacing class is set before paint by the existing pre-paint script, so nothing jumps when the app starts.

Out of scope:

- The sbmadhav.com "Explain it like I'm 8" switch (Q17 (a)). It is not part of this app.
- Changing what questions say: question, hint and step text from the Skill generators is unchanged (it is read aloud in Early). Shorter generator wording is a later change if the owner wants it.
- Band variants for the Guide's sections, Sutra pages, Watch, the Duel and the Play experiences from PR #47: they keep Mode wording in this change, with read aloud on tap in Early. A follow-up can add variants through the same copy table.
- Game mechanics (Balloon pop, Number rain, Memory match and the rest keep their own controls and choice counts). Games get the band's timers and Bolt lines only.
- Using the Grade answer for anything about math difficulty, Leagues or Boards.
- Collecting or sending age or grade to any server or analytics.

Modes and Players affected:

- **Every Mode:** a Player with a Grade answer gets their band's read aloud, wording, answers, choices, timers and Bolt's tone.
- **Explorer:** today's behavior is the Early band's, so an Early Explorer sees little change except shorter copy; a Growing Explorer (a 7 or 8 year old) gets read aloud on tap and 4 choices.
- **Challenger and Pro:** an Early or Growing Player in these Modes gets tap answers, read aloud and shorter copy that today only Explorer has.
- **Players who skip the question:** no change.
- **Grown-ups:** a "For grown-ups" Reading section in Me; the parent note and privacy policy say the Grade answer stays on the device.

## Order and dependencies

Built in React after the `react-typescript` migration and after `placement`, which it modifies (`react-typescript` D3: `placement`, then `age-bands`):

1. `learnvedicmath` archived: the retired Parent step and under-13 device-only Boards, the new privacy policy in `docs/legal/` (which gains the Grade answer sentence), and its changes to `analytics` and `posting-consent`.
2. `react-typescript` through phase 6 (Legacy retired, its task group 9): the game at `/learn/` with path routes, every screen in the design's map a React route module or component, the logic in `app/src/logic/` and `shared/src/`, `ClientOnly`, the store's server snapshot, the lifecycle hooks and their lint rule, and the pre-paint scripts. This change never adds code to a Legacy view. Its phases 7 (3D) and 8 (server voice) are not waited for; Early lines with a count use the server voice once phase 8 is on.
3. `better-voice` Part B merged: Early's automatic read aloud uses Studio voice whole lines; every Early copy variant is a fixed line and is recorded whole.
4. `placement` archived: this change modifies its `placement` and `analytics` requirements. Archive `placement` first or the archive of this change will refuse the delta.
5. `star-round` archived (it is), for the modified "Answer boxes by Mode".

## Capabilities

### New Capabilities

- `reading-bands`: the grade question, the Grade answer and where it is kept, the three bands, and what each band changes (read aloud, answers, choices, timers, Bolt's tone, the Mode suggestion), with the rule that bands never change math difficulty or Ranked rounds.
- `band-copy`: the copy table, how a line is chosen for a Player (band, then Mode, then default), the authoring limits per band, and the checks that enforce them.

### Modified Capabilities

- `placement`: read aloud and the 3 big choices follow the Early band in every Mode (Explorer with no band unchanged).
- `star-round`: an Early Player answers a Star by tapping 3 choices instead of digit boxes.
- `analytics`: the Grade answer and Reading band join the list of values no event carries.
- `posting-consent`: an age given to the grade question counts as the Age answer.

## Impact

Paths are for the React game (`react-typescript` design D11; the game at `/learn/`):

- New `app/src/logic/bands.ts` (pure, framework-free): `bandOf(answer)`, `RULES` per band, `suggestedMode(answer)`.
- New `app/src/logic/copy.ts`: the copy table for the screens in the design's map, with band variants, and the pure `copyFor(key, who, vars)`; new `app/src/hooks/useCopy.ts` and `useBand.ts` read the current Player through `useStore`.
- `app/src/logic/settings.ts` and `fx.ts`: `band()`, per-Player `voiceOn()` with the band default; the root layout's pre-paint script sets `band-early|growing|fluent` on `body` before paint, and an effect keeps it in step when the Player or the answer changes.
- New `app/src/components/GradeQuestion.tsx` (a `<dialog>`, browser only) used on the first visit, by the home card and in Me; `app/src/shell/ModePicker.tsx` (the suggestion); `app/src/views/home/` (the card, greeting and tiles), `app/src/views/learn/` (Skill practice and runs: answers, choices, praise and feedback lines), `app/src/views/arena/` and `app/src/views/games/` (Practice timers), `app/src/views/tower/`, `app/src/views/me/` ("For grown-ups: Reading help", per-Player Read aloud, `parentNote()`).
- `app/src/views/star/` (and its `Hook.tsx` from `placement`), `app/src/views/placement/`, `app/src/views/sky/`, `app/src/views/guide/` (the Tour), `app/src/components/Bolt.tsx`, `app/src/components/AgeDialog.tsx`: band rules and copy keys as mapped in `design.md`.
- `app/src/logic/store.ts`: `reading` on the Player record (`{ grade }` or `{ age }`, with `at`), per-Player `voice`, migration of the device-wide `vm.voice`; the server snapshot has no Players, so no band.
- One CSS file next to each component it touches gains `body.band-early` rules (button size and spacing only, tokens only, stylelint-checked).
- `shared/src/voice-text.ts`: a sentence template for each Early line that carries a count.
- Tests (Vitest): new `app/src/logic/bands.test.ts`, `copy-bands.test.ts`, `bands-no-difficulty.test.ts`; `store.test.ts`, `metrics.test.ts`, the voice coverage test; an ESLint `no-restricted-imports` entry that keeps `bands` and `copy` out of the math modules; Playwright: new `e2e/tests/bands.spec.ts`; `e2e/tests/placement.spec.ts`, `star.spec.ts`, `hook.spec.ts`, `arena.spec.ts`, `games.spec.ts`, `read-aloud.spec.ts`, `privacy.spec.ts`, `consent.spec.ts`, `a11y.spec.ts`, `ssr.spec.ts`.
- Docs: `GLOSSARY.md` (Grade answer, Reading band, Copy table; Read aloud and Mode updated), new `docs/adr/0008-grade-answer-stays-on-device.md`, ADR 0001 consequence (an age from the grade question is the Age answer), `cloud/README.md` and `parentNote()` (the Grade answer is kept on the device and never sent), the privacy policy draft in `docs/legal/`.
