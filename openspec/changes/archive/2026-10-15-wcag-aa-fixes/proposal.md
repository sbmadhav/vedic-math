# Proposal

## Why

A WCAG 2.1 AA audit of sbmadhav.com (owner approved the fixes) found these gaps in Vedic Math:

- **2.4.3 Focus Order:** the button-choice games rebuild or disable their option buttons after every answer, so keyboard focus drops to `<body>` and a keyboard or screen reader Player has to Tab back from the top of the page for every question.
- **4.1.3 Status Messages:** Arena feedback (`#arPop`, "+12" or the right answer) is `aria-hidden` and visual only; in Times sprint a right answer is only a flash of color.
- **1.4.10 Reflow:** at 320px the belt strip on the home page (`.belts-mini`, 360px wide) and the voice picker in `#/me` (`.vv-row`, 346px) scroll sideways.
- **1.4.12 Text Spacing:** sutra cards clip long Sanskrit names under a text spacing override.
- **2.2.2 Pause, Stop, Hide:** the moving background and looping decoration only stop for the OS reduced-motion setting. The site now has one Pause motion switch in the shared Explore menu (`html.motion-paused`, sbmadhav.github.io), which this app must honour like reduced motion.
- `.pr-keys` carries an `aria-label` with no role.

## What Changes

- Games: while focus is inside the game area, it returns to the first option of the next question (or the same tile on the Make the target board) after each rebuild; a round started from the keyboard puts focus on the first option. Focus is never moved when it was elsewhere.
- Arena and challenge rounds: one short polite status message per answer ("Right, plus 12. Score 46." or "Not quite. It was 42."; a challenge miss is read from the existing answer line). Times sprint announces "Right! N so far." in the game's status line. The visual pop and the explanation line are unchanged.
- Layout: the belt strip wraps, the voice settings column can shrink to the screen, and sutra card faces grow with their text.
- Motion: every reduced-motion check (`fx.motionOff()`) also honours `html.motion-paused`; the background stops and restarts live when the class changes; CSS loops stop through `/design-system/components.css`. The page's own Moving background switch keeps working; either one stops the background.
- `.pr-keys` becomes `role="group"`.

Out of scope:

- Arena timing (WCAG 2.2.1). An untimed Arena practice is planned separately in the Star Quest change.
- The shared Explore menu and `components.css` themselves (other repos).
- Anything sent or kept: no change to Boards, analytics or the parent note.

Affected: all three Modes (Explorer, Challenger, Pro) and every Player; keyboard, screen reader and motion-sensitive Players most.

## Capabilities

### New Capabilities

- `accessibility`: focus after an answer, status messages for answers, reflow and text spacing at 320px, and pausing motion.
