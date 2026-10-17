# Proposal

## Why

The owner: "change the core fabric. First have an intro challenge at each age group, that goes from basic to the most difficult. Based on that gauge the level of the user and stick with that level. Some kids can be beyond their age and this will help that."

Today the Mode a Player picks decides both how the app looks and where the math starts: every Rating starts at 1 in Explorer, 5 in Challenger and 9 in Pro (`START` in `js/adapt.js`), the Skill map suggests the Mode's grades (`MODES[m].grades` in `js/fx.js`), and Bolt's path starts at the white belt (`startBeltOf()` in `js/sky.js`). A 6-year-old who already multiplies has to pick an older Mode, with older wording and controls, to get math that fits. Ratings do adapt, but only Skill by Skill, after several rounds, and the Skill map keeps suggesting the Mode's grades.

The owner settled the design in three grilling rounds (Q1 to Q16, `_handoff/RESUME.md`, all accepted 2026-10-17). This change writes those answers down as one plan. It also absorbs `hook-first-star` (Q14): the Hook becomes the opening of the first Star that Placement points to.

## What Changes

- **Placement level, separate from Mode (Q1, Q9).** A Placement finds one Placement level: a school grade from K to 12. Mode keeps choosing only wording, controls and League. A 6-year-old placed at grade 5 keeps Explorer's look and gets grade 5 math in Practice.
- **When it runs (Q3, Q14).** On a first visit: Mode pick, then the Placement offer ("Want to find your level? About 3 minutes", Start or Skip), then home with the first Star suggested at the Placement level. Skip gives the Mode's defaults, exactly as today. Placement can be retaken any time from Me.
- **The climb (Q4, Q8).** Untimed. One question per step, each step a school grade, each question from a school Skill at that grade (no Tricks). It starts at the Mode's first grade (Explorer K, Challenger 3, Pro 8), climbs one step after each right answer, has no ceiling (it can climb to grade 12 from any Mode), and stops after 2 misses at the same step or 12 questions. The Placement level is the highest step answered right.
- **Explorer climbs with 3 big choices (Q10).** Every Explorer question is multiple choice with 3 big buttons, keeping Explorer's look, even for algebra. Other Modes answer with their usual entry.
- **Read aloud (Q16).** In Explorer each question is read aloud automatically (the Studio voice from `better-voice` Part B, else the built-in voice) with a replay button. In Challenger and Pro the question is read only when the Player taps Hear it.
- **What the Placement level changes (Q5, Q7).** Practice only: where Skill practice, Endless runs, Stars, Arena Practice and game Practice start when the Player has no Rating yet; which grades the Skill map suggests; and which Belt Bolt's path starts at (so which Star is suggested first). League stays equal to Mode. Ranked rounds are unchanged: a Ranked round with no Rating yet starts at the Mode's start, the daily Arena set is the same for everyone in a League, and nothing about Boards changes.
- **The Hook (from `hook-first-star`).** A new Challenger or Pro Player's first Star, the one Placement points to, opens with the "beat the calculator" dare when its Trick has one. The Hook's rules are carried over unchanged.
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

Built after the learnvedicmath.com move (owner Q15). Planned now, implemented after these are archived or merged:

1. `learnvedicmath` (the move): the game at `https://learnvedicmath.com/play/`, modules under `/js/`, the landing page's "Start playing" button opening `/play/`, under-13 Players on Device boards only, the Parent step retired, and its changes to `parent-note`, `analytics` and `posting-consent`. Every path in this change is written for the new site. If the move's layout differs when it lands, update the paths here before `/opsx:apply`.
2. `better-voice` Part B (the Studio voice): Explorer's automatic read aloud uses its whole lines and clips. Without it the built-in voice reads, which works but is the voice the owner called "hideous".
3. `sky-home` and `star-round` archived (Bolt's suggested Star and `placedBelt`, `runStar()`).

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

Paths are for the new site (modules served from `/js/`, the game at `/play/`):

- New `js/placement.js` (pure, node-tested): the step list, the Placement pool, the climb state machine, Explorer's 3 choices, the Placement level to Rating and Belt tables, and the raise-only merge.
- New `js/placement-view.js`: the offer, the climb and the result screens, on the view's `signal` with `js/life.js`.
- `js/app.js`: route `#/placement` (`/play/#/placement`); the first-visit flow after the Mode pick; the home card for existing Players; "Start here" tile in Explorer; Skill map suggestions; Me's Placement row and Retake; `parentNote()`.
- `js/adapt.js`: `rating()` and `skillRating()` take a Practice flag and use the Placement level's start.
- `js/sky.js`: `startBeltOf()` already reads `placedBelt`; Placement writes it.
- `js/store.js`: `S.placement` (per Player, in the backup code), `placedBelt` on the Player record.
- New `js/hook.js` and `js/star.js` changes as planned in `hook-first-star` (dares, calculator race, reveal, easiest-first round).
- `js/metrics.js`: `placementDone()`.
- `js/voice.js` and the `better-voice` line list: Placement's fixed lines are recorded whole.
- Tests: new `test/placement.test.mjs`, `test/hook.test.mjs`; `test/adapt.test.mjs`, `test/metrics.test.mjs`, `test/star.test.mjs`, `test/lifecycle-scan.test.mjs` (covers the new modules); new `e2e/tests/placement.spec.ts`, `e2e/tests/hook.spec.ts`; `e2e/tests/a11y.spec.ts`, `e2e/tests/privacy.spec.ts`, `e2e/tests/analytics.spec.ts`.
- Docs: `GLOSSARY.md` (Placement, Placement level, Step, Hook), `docs/PLAN.md` (Placement row), ADR 0001's last consequence, new `docs/adr/0007-placement-level-sets-practice-only.md`, `cloud/README.md` (says the Placement level is kept on the device and never sent). Nothing new is sent, so `cloud/README.md` changes only in wording.
