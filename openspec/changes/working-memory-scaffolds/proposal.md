# Proposal

> **Owner-delegated, 2026-10-29.** The owner shared an outside UX audit (`_handoff/feedback/2026-10-29-ux-audit.md`) and said "analyze this feedback and act on it", and earlier "Make executive decisions. Merge things quickly". The calls inside this change are made under that delegation and recorded in `design.md`, each marked "owner-delegated, 2026-10-29".

## Why

The audit's section 5 C ("Zero friction, low working-memory load") and its tasks 3.1 to 3.3 ask for three scaffolds. Checked against `main` on 2026-10-29:

- **Holding the left part in your head.** Nikhilam (98 × 97 = 95 | 06) and four other Tricks build the answer in two parts, left then right, but Practice and the Katas give one answer box, so the Player keeps 95 in mind while working out 06. The Star round's digit boxes (Challenger) already keep typed digits on screen, with nothing that marks where one part ends.
- **Which digits does this step use?** The Trick animator ("Watch it work" on every Trick page) steps through the Trick with Next step, and colours the numbers in each step's line, but nothing points from the numbers in the question to the digits a step uses. Crosswise (Ūrdhva-Tiryagbhyām) and the near-base distances (Nikhilaṃ) are where that costs most. Space does not step.
- **Reward types.** The audit counts six (Ratings, Sparks, Medals, Stars, Belts, Badges) and asks that the persistent HUD show only Sparks and the Belt, with Stars, Medals and Badges in a trophy case in Me. On `main` the persistent HUD is the Player chip in the header, which already shows only the avatar and the bar of Sparks to the next Title: no Stars, Medals or Badges. Me shows Badges and a Belts count with Stars lit, but no Medals, which are only on each game's and the tower's level maps. Also live: Titles (from Sparks), Sutra cards, Katas done, mastery rings, day streak and Daily quests. Ratings are a 1 to 20 difficulty number shown only in the Arena lobby; they are not a reward.

## What Changes

- **Memory lock answer slots.** In Practice and in the Katas, for Challenger and Pro, a question from one of the five Tricks whose answer is built in two parts (`sq5`, `near-base`, `square-near`, `by9s`, `ends10`) shows two slots side by side, "Left part" and "Right part". Enter or the Lock button locks the left part and moves to the right part; Enter in the right part checks. Checking joins the two parts and compares the whole answer, as before. "Type it in one box" switches to the single box (saved on this device), and "Split into parts" switches back. Explorer keeps its tap answers and single box; Word problems keep one box. In the Star round, Challenger's digit boxes show a bar between the two parts, and the left part's boxes are marked held once full.
- **Digit connectors.** In the Trick animator of "Multiply numbers near 10, 100 or 1000" (Nikhilaṃ) and "Multiply any two numbers in one line" (Ūrdhva-Tiryagbhyām), each step that uses digits shows a small diagram whose coloured lines join the digits that step uses, in the category colours its highlights already use. Next step, Space or the right arrow (with focus on the steps) moves on; Back or the left arrow goes back. The lines draw in, except under Calm, Pause motion or reduced motion, where they are shown at once. Each diagram has a text alternative.
- **Trophy case.** The Player chip shows the Sparks bar and, for a Challenger or Pro Player who holds one, their Belt: nothing else. Me gets a Trophy case: the Belt rack, Stars lit, Medals (gold, silver and bronze from game Levels and the Challenge tower), Sutra cards collected and the Badges, each with a link to where it is earned. No reward data is removed, reset or renamed; every page that showed a reward still shows it.

Unchanged: how answers are checked, Sparks, Ratings, the Arena (a Ranked round keeps one box for everyone), Explorer's answer entry and read aloud default, the Deep dive's worked examples, Home (another change owns it).

## Capabilities

### New Capabilities

- `split-answer`: two answer slots, lockable, for Tricks that build the answer in parts.
- `trick-connectors`: lines joining the digits each animator step uses, stepping by keyboard.
- `trophy-case`: the Trophy case on Me.

### Modified Capabilities

- `sparks`: the Player chip names the Belt of a Challenger or Pro Player who holds one.

## Impact

`js/vedic.js` (the parts of each answer), `js/app.js` (Practice, Katas, the animator, the chip, Me), `js/star.js` (the boxes), a new lazily loaded `js/connectors.js`, `math.css`, tests in `test/` and `e2e/`. No stored data changes shape; the one new device key is `vm.split`. No spoken line changes.
