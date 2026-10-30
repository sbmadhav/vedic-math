# Design

## The click-through is the static card, enhanced

The card's HTML is the whole worked example: the Trick's name, the Sanskrit name, the sum, the board and the three steps, plus a nav row (the step line, Back and Next). The board and the steps carry `data-s="1|2|3"`.

- **Without JavaScript** nothing sets `data-step`, so every step and the whole board show, exactly as today's card plus the board. The nav row is hidden by `@media (scripting: none)`; a browser that does not know that media feature runs scripts anyway.
- **With JavaScript** an inline module at the end of the page sets `data-step="1"` on the card. CSS hides each `[data-s]` later than the step with `visibility: hidden`, which keeps its box: the card is the same size at every step and nothing on the page moves (the landing specs measure zero layout shift). The nav row is in the HTML from the start and keeps its place, but stays `visibility: hidden` until the script has set `data-step`: showing it moves nothing, and a module that fails to load leaves no buttons that do nothing.
- **Back and Next** are real `<button>`s. Back at Step 1 and nothing else is `aria-disabled="true"` (not `disabled`), so focus never drops to the page when a button stops applying. On Step 3, Next reads Start again and goes to Step 1. The current step has `aria-current="step"` and a sun tint (background and box-shadow, never a heavier font, so its text never rewraps and the card never changes height).
- **Screen readers.** The board is `aria-hidden` (the steps say the same in words). The step line is `aria-live="polite"` and `aria-atomic="true"`, rewritten in one `replaceChildren` call; after a press it reads "Step 2 of 3" plus, in `md-sr-only`, the step's words. Later steps are out of the accessibility tree because `visibility: hidden` removes them.
- **Motion.** Nothing moves by itself. After a press (`data-moved`), the newly current step and its board cells fade in over `--duration-medium` (opacity only). Reduced motion, Pause motion (`html.motion-paused`) and Calm (`html.calm`) turn that off. Before a press no animation runs, so the landing page's motion specs (no running animations under Pause motion or Calm) hold.
- **Lifecycle.** The listeners go through `on()` from `js/life.js` with a signal for the page's lifetime, as `js/landing-sky.js` does; `js/life.js` is already loaded by the sky, so it costs no new request.
- **The numbers.** 98 = 100 − 2 and 97 = 100 − 3; 98 − 3 = 97 − 2 = 95 is the left part; 2 × 3 = 6, written 06 because the base 100 has two zeros; 95 × 100 + 6 = 9506 = 98 × 97. The school way's lines stay as they are (98 × 7 = 686, 98 × 90 = 8820, 686 + 8820 = 9506). The Sutra cards' examples are unchanged and right (65² = 4225, 1000 − 368 = 632, 21 × 13 = 273).

## Inside the game

A section after the Modes, headed "Inside the game", with two cards:

- **Bolt**: the idle pose of `js/bolt.js` drawn inline with token colours (`--teal`, `--sky`, `--sun`, `--coral`, `--bolt-screen`, `--bolt-eye`, outline `--on-accent` as in `math.css`), decorative (`aria-hidden`). "Our robot teacher shows you each trick, and when an answer goes wrong, works it step by step on your own numbers." That is the star-round spec ("A miss replays the Trick on the Player's number", "Bolt teaches and reacts"), in the glossary's word: a teacher, never a mascot or pet.
- **Math Lens**: the camera icon of `js/play/icons.js` in a teal circle. "Point the camera at a number plate, a clock or a receipt and play puzzles made from its digits; the pictures never leave your device." That is `js/play/exp/lens.js` and `docs/agent/play-experiences.md` (camera frames stay on the device).

Neither card is a link (see the calls below), and neither picture is an image to assistive technology, so the hero stays the page's one image (`a11y.spec.ts`).

## Executive calls (owner-delegated, 2026-10-29)

1. **Three steps are the sutra way's own three lines.** Owner-delegated, 2026-10-29. The audit asked for a three-step click-through; the card already had three steps, so each becomes a step and the no-JavaScript card keeps the same words. A board shows the work beside them so the click-through is a picture, not only text.
2. **Steps build up instead of replacing each other.** Owner-delegated, 2026-10-29. Earlier steps stay on screen so the visitor never has to hold 95 in their head while reading the next line (the audit's working-memory point, ADHD-friendly: one new thing per press, nothing lost).
3. **The school way stays static beside it.** Owner-delegated, 2026-10-29. It is the comparison; making it click too would double the choices.
4. **Start again on the last step, not a disabled Next.** Owner-delegated, 2026-10-29. There is always a next thing to press, and focus stays on the same button.
5. **The plain-English name is the Trick's own title** from `js/vedic.js` (`near-base`, `sq5`, `from9`, `crosswise`), so the words match the game, with the Sanskrit right under it in the Sutra's colour. Owner-delegated, 2026-10-29, under the rule already decided for every agent.
6. **Bolt is shown below the Modes, not in the hero.** Owner-delegated, 2026-10-29. The Nikhilam Family is the site's name in pictures and stays the hero (glossary); Bolt is the teacher inside the game, so he goes in the section about the game. The old rule "with no Bolt" now reads "no Bolt in the hero".
7. **No links in Inside the game.** Owner-delegated, 2026-10-29. Bolt has no page of his own, and Math Lens without a Mode opens the Mode picker first; the Mode cards just above are the way in. Fewer choices on the page.
8. **One event, at the last step.** Owner-delegated, 2026-10-29. `math/landing/demo/done`, once per page load, says whether the click-through is used to the end; no event for each press. If the visitor finishes before the deferred `js/analytics.js` has run, the event waits for the page's `load` (through `on()`), so it is not lost.
9. **Inline, not a new module.** Owner-delegated, 2026-10-29. Every file in `/js/` is precached by the game's service worker and counted in the game's first-load budget; an inline module on the landing page adds nothing to `/play/` and no request to `/`. The build hashes it into the page's policy like the welcome back script.

## What the audit had wrong or already done

- **Task 2.1 is done.** The Mode cards link to `/play/?mode=<id>`, the game sets that Mode, skips the picker and removes the query (`landing-modes-and-return`, `modeFromLink()` in `js/app.js`, `e2e/tests/cov/landing-pages-3.spec.ts`), and it is live. No change.
- **The Terms do not mention Bolt, Math Lens or Katas.** `site/terms/index.html` and `site/licenses/index.html` name none of them; the Licences page credits Tesseract.js, Kokoro and the fonts.
- **Math Lens is not a handwriting reader.** It reads digits from the camera (a plate, a clock, a receipt) or from typed digits, with Tesseract.js on the device; there is no handwriting input.
- **The sutra way already showed plain words** ("98 is 2 below 100...") and the Sutra cards already had their meanings; what was missing was the order (Sanskrit first) and anything to press.
