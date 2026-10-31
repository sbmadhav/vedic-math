# Proposal

> **Approved by the owner.** On 2026-10-29 the owner shared an outside UX audit (`_handoff/feedback/2026-10-29-ux-audit.md`), asked to "analyze this feedback and act on it", and delegated the calls inside each area ("Make executive decisions. Merge things quickly"). That is the approval of this change; the calls made are in design.md, each marked "owner-delegated, 2026-10-29".

## Why

The audit's rows for the landing page (`/`) and for Terms, and its tasks 1.3 and 2.1:

- **The sum reads like a textbook.** The 98 × 97 card shows the school way and the sutra way as two lists of text. Nothing on the page can be pressed except links that leave it, so a visitor reads about the trick instead of watching it happen.
- **The Sanskrit comes first.** The sutra way is captioned "The sutra way: Nikhilaṃ", and each Sutra card leads with its Sanskrit name. A beginner meets "Ūrdhva-Tiryagbhyām" before learning what it does.
- **Bolt and Math Lens are not on the landing page.** The audit says they are selling points that a visitor first meets inside the game. (It says the Terms name them; they do not, see design.md.)
- **The Mode should carry into the game.** Already done: the Mode cards link to `/play/?mode=<id>` and the game sets that Mode and skips the picker (`landing-modes-and-return`, live on learnvedicmath.com). Nothing changes for it here.

## What Changes

- **The sutra way, step by step.** With JavaScript, the sutra way card becomes a three-step click-through: Step 1 of 3 shows how far 98 and 97 are below 100, Step 2 the two parts of the answer (95 and 06), Step 3 the answer 9506. Back and Next walk it; on the last step Next reads Start again. A small board above the steps shows the work (98 −2, 97 −3, then 95 | 06, then 9506), filling in as the steps go. The line between the buttons ("Step 2 of 3") is a polite live region that also says the step's words to a screen reader. Later steps are hidden with `visibility`, so the card never changes size and the page never moves. Nothing moves by itself; a step fades in only after a press, and not at all under reduced motion, Pause motion or Calm. Without JavaScript the card is today's static card: all three steps and the whole board, and no buttons.
- **The plain-English name leads.** The sutra way card names its Trick, "Multiply numbers near 10, 100 or 1000", with the Sutra's Sanskrit name, "Nikhilaṃ Navataścaramaṃ Daśataḥ", right under it. Each of the three Sutra cards leads with the name of the Trick its example shows (Square numbers ending in 5, Subtract from 100, 1000, 10000, Multiply any two numbers in one line) and has the Sanskrit name right under it, then the meaning, the example and See how it works. The Sanskrit is never hidden.
- **Inside the game.** A new small section after the Modes, "Inside the game", shows Bolt (the robot teacher, drawn as in the game) and Math Lens (its camera icon), one honest line each. The hero picture stays the Nikhilam Family; Bolt is not in the hero.
- **Counted once.** Reaching the last step sends `math/landing/demo/done` once per page load (fixed words, nothing about the visitor).

Unchanged: the hero, the Mode cards and the Mode link, welcome back, the bare `/` going on to the game for a device with Players, the sky, and everything the page writes (nothing).

Modes and Players affected: every visitor to the landing page; none inside the game.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `landing-pages`: the landing page's sections and the Bolt rule ("The landing page"); the sutra way as a click-through ("The landing page leads with the Sutras and the method"); the Trick's plain-English name before the Sanskrit on the Sutra cards ("Three Sutras one tap from their Deep dives"); a new requirement for Bolt and Math Lens on the landing page.

## Impact

- `site/index.html` (the sutras section, the new section, one inline module script that imports `/js/life.js`, which the sky already loads), `theme/site.css` (rules for the landing page only, appended).
- Nothing in `/play/`: the game's first-load bytes are unchanged (the script is inline in the landing page, so no new module is precached).
- No spoken line changes: the landing page has no read aloud (no studio voice re-record).
- Specs: `e2e/tests/landing.spec.ts`, `e2e/tests/a11y.spec.ts`, `e2e/tests/cov/landing-pages-7.spec.ts`, `landing-pages-8.spec.ts`, and new `landing-pages-9.spec.ts`.
- Archiving: the requirements this change modifies are written by `learnvedicmath`, `landing-modes-and-return` and `sutras-first`, none archived yet; archive them first.
