# Proposal

## Why

The owner: "change the core fabric. First have an intro challenge at each age group, that goes from basic to the most difficult. Based on that gauge the level of the user and stick with that level. Some kids can be beyond their age and this will help that."

Today the Mode a Player picks decides both how the app looks and where the math starts: every Rating starts at 1 in Explorer, 5 in Challenger and 9 in Pro (`START` in `js/adapt.js`), the Skill map suggests the Mode's grades (`MODES[m].grades` in `js/fx.js`), and Bolt's path starts at the white belt (`startBeltOf()` in `js/sky.js`). A 6-year-old who already multiplies has to pick an older Mode, with older wording and controls, to get math that fits. Ratings do adapt, but only Skill by Skill, after several rounds, and the Skill map keeps suggesting the Mode's grades.

The owner settled the design in three grilling rounds (Q1 to Q16, `_handoff/RESUME.md`, all accepted 2026-10-17). This change writes those answers down as one plan. It also absorbs `hook-first-star` (Q14): the Hook becomes the opening of the first Star that Placement points to.

Re-planned 2026-10-21 for the React and TypeScript game (`react-typescript` task 12.2, design D3 and D14). The owner's answers Q1 to Q16 and decisions PL1 to PL7 are unchanged. What changed is only where and how it is built: its screens are React route modules under `/learn/`, rendered safely on the server (nothing that depends on a Player is drawn there), and its logic is framework-free TypeScript in `app/src/logic/` on the shared question generators in `shared/src/`. It also writes down how the Hook and the worked example card from `try-trick-teaches` (its design decision 4) fit together.

## What Changes

- **Placement level, separate from Mode (Q1, Q9).** A Placement finds one Placement level: a school grade from K to 12. Mode keeps choosing only wording, controls and League. A 6-year-old placed at grade 5 keeps Explorer's look and gets grade 5 math in Practice.
- **When it runs (Q3, Q14).** On a first visit: Mode pick, then the Placement offer at `/learn/placement` ("Want to find your level? About 3 minutes", Start or Skip), then home with the first Star suggested at the Placement level. Skip gives the Mode's defaults, exactly as today. Placement can be retaken any time from Me.
- **The climb (Q4, Q8).** Untimed. One question per step, each step a school grade, each question from a school Skill at that grade (no Tricks). It starts at the Mode's first grade (Explorer K, Challenger 3, Pro 8), climbs one step after each right answer, has no ceiling (it can climb to grade 12 from any Mode), and stops after 2 misses at the same step or 12 questions. The Placement level is the highest step answered right.
- **Explorer climbs with 3 big choices (Q10).** Every Explorer question is multiple choice with 3 big buttons, keeping Explorer's look, even for algebra. Other Modes answer with their usual entry.
- **Read aloud (Q16).** In Explorer each question is read aloud automatically (the Studio voice from `better-voice` Part B, else the built-in voice) with a replay button. In Challenger and Pro the question is read only when the Player taps Hear it.
- **What the Placement level changes (Q5, Q7).** Practice only: where Skill practice, Endless runs, Stars, Arena Practice and game Practice start when the Player has no Rating yet; which grades the Skill map suggests; and which Belt Bolt's path starts at (so which Star is suggested first). League stays equal to Mode. Ranked rounds are unchanged: a Ranked round with no Rating yet starts at the Mode's start, the daily Arena set is the same for everyone in a League, and nothing about Boards changes.
- **The Hook (from `hook-first-star`).** A new Challenger or Pro Player's first Star, the one Placement points to, opens with the "beat the calculator" dare when its Trick has one. The Hook's rules are carried over unchanged.
- **The Hook and Try a trick (`try-trick-in-modes`).** Try a trick is its own short lesson inside each Mode, not a Star, so the worked example card of `try-trick-teaches` is gone and the Hook never shares a Star with it. A Try a trick records no answer, so a Player who did only that is still new and the first Star still gets the Hook.
- **Built in React, server-safe (`react-typescript` D14).** The offer, the climb and the result are one React route module. The server renders the document, the header and the nav and keeps the view's space; everything that reads the Player, the Mode or the climb is drawn in the browser after start-up, so the server never sees a Placement level and the first browser render matches the server's.
- **Players who already have progress (Q11).** They see a Placement card on home once, never forced. Taking it only raises saved Ratings that sit below the Placement level's start, and only moves Bolt's start Belt forward. Nothing earned is lowered.
- **How the result is shown (Q12).** The Player sees steps ("You climbed 7 steps! Bolt will start you there."), never a grade. "About grade 5" appears only for grown-ups: in the parent note and in small print in Me.
- **Privacy (Q13).** The Placement level and every Placement answer stay on the device with the rest of progress, are never posted and never sent to analytics. One fixed analytics event, `math/placement/done`, with no step, grade or count in it.

Out of scope:

- Changing the Mode picker or Mode names, or asking for an age or grade. Reading by age is the separate `age-bands` change, built after this one.
- A Placement level per area (number, fractions, algebra): one overall level (Q9); per-Skill Ratings even out the rest.
- Placement questions from Tricks (Q8).
- Any change to Ranked rounds, Leagues, Boards, Scores, Medals, Sparks rules or the daily Arena set.
- Stars for Explorer (the `star-round` rule that Explorer is not offered Stars stays).
- New Hook dares for the blue, purple and black belt Tricks (none can be raced honestly on a basic calculator).

Modes and Players affected:

- **New Players in every Mode:** the first visit gains the Placement offer and, if taken, Practice starts at their Placement level.
- **Explorer:** 3-choice questions and automatic read aloud during Placement; a "Start here" tile on home at the Placement level. No Stars and no Hook, as today.
- **Challenger and Pro:** Placement with the usual entry; the first suggested Star at the Placement level, opened by the Hook when its Trick has a dare.
- **Existing Players:** one optional Placement card on home; raise-only.
- **Grown-ups:** the parent note and Me show "about grade N".

## Order and dependencies

Built in React after the `react-typescript` migration (its design D3: `placement` is the first follow-on change, then `age-bands`). Planned now, implemented after these are archived or merged:

1. `learnvedicmath` (the move) archived: under-13 Players on Device boards only, the Parent step retired, the privacy policy in `docs/legal/`, and its changes to `parent-note`, `analytics` and `posting-consent`.
2. `react-typescript` through phase 6 (Legacy retired, its task group 9): the game at `https://learnvedicmath.com/learn/` with path routes, every view this change touches a React route module (the Mode picker, Home and the Sky, the Skill map, Skill practice and runs, the Star round, the Arena, games, Me), the logic in `app/src/logic/` and `shared/src/`, the lifecycle hooks and their lint rule, `ClientOnly` and the store's server snapshot. This change never adds code to a Legacy view. Its phases 7 (3D) and 8 (server voice) are independent of this change and are not waited for. If a module lands somewhere other than the paths below, update this change before `/opsx:apply`.
3. `better-voice` Part B (the Studio voice): Explorer's automatic read aloud uses its whole lines. Questions with numbers use the server voice (`react-typescript` D16) once its phase 8 is on, else clips or the device's voice.
4. `sky-home`, `star-round` and `try-trick-in-modes` archived (Bolt's suggested Star and `placedBelt`, the Star round, Try a trick inside each Mode).

`age-bands` comes after this change and modifies two of its requirements (read aloud and the number of choices move from Mode to Reading band).

`hook-first-star` is superseded: its Hook requirements move into this change's `hook` capability, and its own folder is marked superseded and must not be applied or archived.

## Capabilities

### New Capabilities

- `placement`: the offer, the untimed climb, Explorer's 3 choices and read aloud, the result, what the Placement level changes, existing Players, retaking, Calm and screen readers, and what stays on the device.
- `hook`: the Hook on the first Star after Placement (carried over from `hook-first-star`, with "first Star" now meaning the Star Placement points to).

### Modified Capabilities

- `ratings`: Practice starts at the Placement level's Rating when there is no Rating yet; Ranked rounds keep the Mode's start.
- `analytics`: one `math/placement/done` event; the Placement level is added to what an event never carries.
- `parent-note`: the note gives the Player's Placement level in grown-up words.

## Impact

Paths are for the React game (`react-typescript` design D11; the game at `/learn/`):

- New `app/src/logic/placement.ts` (pure, framework-free, Vitest-tested): the step list, the Placement pool, the climb state machine, Explorer's 3 choices, the Placement level to Rating and Belt tables, and the raise-only merge. It draws questions from `shared/src/skills/` and is never imported by the server build.
- New `app/src/views/placement/` route module (`Placement.tsx` with `Offer`, `Climb`, `Result` and one CSS file per component, tokens only), route `/learn/placement` in `app/src/routes.ts`, server-rendered with no loader or action; its body inside `ClientOnly`; every listener and timer through the lifecycle hooks (`useAbortSignal`, `useRound`, `useTimer`).
- `app/src/shell/ModePicker.tsx`: the first-visit flow goes on to `/learn/placement` after the pick.
- `app/src/views/home/`: the existing-Player card and Explorer's "Start here" tile (browser only). `app/src/views/learn/`: the Skill map's "Suggested for you". `app/src/views/me/`: the Placement row, Retake and `parentNote()`.
- `app/src/logic/adapt.ts`: `rating()` and `skillRating()` take a Practice flag and use the Placement level's start.
- `app/src/logic/sky.ts`: `startBeltOf()` already reads `placedBelt`; Placement writes it.
- `app/src/logic/store.ts`: `S.placement` (per Player, in the backup code), `placedBelt` on the Player record; the server snapshot has neither.
- New `app/src/logic/hook.ts` (pure: dares, calculator keys, `isNewPlayer`) and `app/src/views/star/Hook.tsx` with `Calculator.tsx` (the race, the reveal), plus the Star round's easiest-first deal in `app/src/logic/star.ts`, as planned in `hook-first-star`; the worked example card's `intro` option yields to the Hook.
- `app/src/logic/metrics.ts`: `placementDone()`.
- `app/src/logic/voice.ts` and the `better-voice` line list: Placement's fixed lines are recorded whole; its questions' sentences match templates in `shared/src/voice-text.ts`.
- Tests: new `app/src/logic/placement.test.ts` and `hook.test.ts`; `adapt.test.ts`, `metrics.test.ts`, `star.test.ts`, `store.test.ts`; the lifecycle lint rule covers the new view; new `e2e/tests/placement.spec.ts` and `e2e/tests/hook.spec.ts`; `e2e/tests/ssr.spec.ts` (the new route), `a11y.spec.ts`, `privacy.spec.ts`, `analytics.spec.ts`, `try-trick-teaches.spec.ts`, `first-visit.spec.ts` and the `cov/first-visit-*` specs.
- Docs: `GLOSSARY.md` (Placement, Placement level, Step, Hook), `docs/PLAN.md` (Placement row), ADR 0001's last consequence, new `docs/adr/0007-placement-level-sets-practice-only.md`, `cloud/README.md` (says the Placement level is kept on the device and never sent). Nothing new is sent, so `cloud/README.md` changes only in wording.
