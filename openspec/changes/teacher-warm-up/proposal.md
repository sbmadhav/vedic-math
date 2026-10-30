# Proposal

> **Approval.** On 2026-10-30 the owner shared outside feedback (`_handoff/feedback/2026-10-30-growth-playbook.md`) and asked to "analyze this and create several todo tasks", under the standing delegation of 2026-10-29. Once merged, this change counts as approved for building. The calls are in design.md, each marked "owner-delegated, 2026-10-30".

## Why

The feedback's third engine: a 1-click "Smartboard Warm-Up (5 Min)" on `/teachers/`, "a giant projector-friendly screen with 1 trick and 3 progressively harder class problems with a reveal button". Checked against `main` and the live site on 2026-10-30:

- **A warm-up exists, but it is a pointer to the Arena.** PR #171 (merged 2026-10-29) added "A 5-minute warm-up for today's class" to `/teachers/`: a box that says to put today's Arena daily challenge on the class screen and race it together, and an Open the Arena button (`/play/#/arena`). It has no projector layout, no single Trick, no class problems and no reveal. On a device with no Mode the Mode picker comes first, and with Calm on the Arena opens on an untimed round, so the teacher has to pick Daily challenge.
- **The Arena is the wrong tool for a whole-class warm-up.** It is a 60-second individual race with a keypad, sized for one person at arm's length; a class cannot read it from the back of a room, and a teacher cannot pause on one question to talk it through.
- **The feedback's premise is wrong.** "No accounts and no under-13 data means teachers can use it without district privacy review" is not a claim the site can make. Whether a school needs a review is the school's decision; ADR 0006 and learnvedicmath task 13.1 say a lawyer reviews the privacy policy "before any school outreach". The page can say truthfully what it does (no sign-in, no student accounts, nothing stored on the device), and promoting it to teachers waits for that review.

## What Changes

- **A projector warm-up at `/teachers/warm-up/`.** A static page, no Mode, no Player and no storage, in five screens: (1) Today's trick: the Trick's name, its Sutra, the idea, and its worked example stepped through with Next; (2 to 4) Problem 1, 2 and 3, each larger than the last, shown alone in very large type, with Reveal (the answer) and then Show the steps (the Trick's own steps for those numbers); (5) "Practice at home": the Trick page's address in large type, `learnvedicmath.com/tricks/<slug>/`.
- **Made for a room.** Text sized for the back of a class (the problem at least a fifth of the screen's height), high contrast in Daybreak and Deep Space, a Full screen button, and keys a presenter clicker sends: Right, Space and Page Down go on; Left and Page Up go back; R reveals. No clock, no sound, nothing moves by itself.
- **A Trick for each day, or the teacher's pick.** The Trick of the day rotates through the 15 Tricks of the `trick-pages` change by the local date; a "Pick a trick" list changes it for this visit only. Three problems per Trick are fixed in data and rise in size (design D3).
- **One click from `/teachers/`.** The #171 box gains "Open the projector warm-up" as its main button, with Open the Arena kept beside it, and its words updated.
- **Counted with fixed words.** `math/teachers/warmup/start/<trick>` on the first Next, `math/teachers/warmup/done/<trick>` on reaching Practice at home.

Unchanged: the Arena, the game, the rest of `/teachers/`, and what the site sends (nothing new about anyone).

## Capabilities

### New Capabilities

- `teacher-warm-up`: the projector warm-up page and its link from `/teachers/`.

### Modified Capabilities

- `analytics`: new requirement "Warm-up counts".

## Impact

- New: `site/teachers/warm-up/index.html`, `tools/trick-pages/warm-up.ts` (published at `/teachers/warm-up/warm-up.js` with its types taken out, like the `trick-pages` calculator), `tools/trick-pages/warm-up-problems.ts` (three problems per Trick), `theme/warm-up.css` (tokens only).
- `site/teachers/index.html`: the warm-up box's button and words.
- Depends on `trick-pages`: it shares the step board module, the 15-Trick list and the Trick page addresses, so it is built after `trick-pages` (or in the same PR).
- No spoken line changes: the page has no read aloud.
- Tests: new `test/warm-up.test.mjs`, `e2e/tests/cov/teacher-warm-up-1.spec.ts` to `teacher-warm-up-4.spec.ts`, `e2e/tests/cov/analytics-15-warm-up.spec.ts`; `a11y.spec.ts` gains the page; `e2e/tests/cov/` specs for `/teachers/` updated for the new button.
