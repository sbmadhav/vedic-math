# Design

## Context

Try a trick (`first-visit` spec, archived `first-visit-clarity` change) sets Challenger as a Mode guess and opens `firstStarHref()`, the Star Bolt's path suggests (today `#/star/from9/1`). `runStar()` in `js/star.js` deals four questions from the Star's band and calls `ask()` at once. The Trick is taught only by `replay()`, after a miss. The landing's lede says "Learn a mental math trick in a minute", so a visitor's first minute contradicts it.

## Goals / Non-Goals

**Goals:**
- A visitor who presses Try a trick sees the Trick worked once on real numbers before any question, then starts with one button.
- Keyboard, screen reader, Calm and Pause motion all work with no special case.
- Small: one pure helper, one phase in `runStar()`, two lines in `starView`, a few CSS rules.

**Non-Goals:**
- A tutorial, a multi-step lesson or an animation. The replay already animates step by step after a miss.
- Changing what Home, the Dojo, the Sky or a Trick page open.
- Pre-empting the Hook in `placement`.

## Decisions

**1. Only on the Try a trick path.** The card shows when the Star was opened by Try a trick, and only for that first render. Try a trick sets `starView.introFor` to the Star's route in memory; `starView` compares it with its own route, clears it, and passes `intro: true` to `runStar()`. So Play again, Back and reopen, a reload, and the same Star from Home all start on the first question.
- Rejected: the card on every Star 1 from Home too. A Player who picked Challenger and presses Play this Star has Home's Star door line and the Trick page one tap away; the complaint was about the first tap from the landing. Keeping it to one path keeps this change minimal and leaves Home to `placement`'s Hook (decision 4).
- Rejected: a hash flag (`#/star/from9/1?learn`). It would be a new route form for the router, `afterPick()` and Find to accept, and a shared link would replay the card for someone who is not new.

**2. The example is a problem the round does not deal.** `starIntro(state)` is pure (no DOM, node-tested): it takes the easiest problem (lowest Kata) of the Star's band that is not one of the four dealt questions, falling back to the Star's whole third, and adds it to `used` so neither a rematch nor a Dare repeats it. For `from9` Star 1 at a new Challenger's Rating, that is a "100 − nn" problem from Kata 1, the owner's own example shape. The steps are the Trick's own `steps(vals)`, the same lines the replay shows, so there is no new wording to keep honest per Trick.

**3. Static card, one button.** Tag "Learn the trick", the Trick's title, its `idea` line, "Worked example: 100 − 84", the steps as an ordered list (all at once, no entry animation), "Start the Star" and "Then 4 questions like it." Bolt says "Watch it once. Then it is your turn." The number pad and the Dare are hidden; "Skip this Star" and the shell's Back stay. Focus goes to Start the Star (its description is the Trick's title), the live region says once "Learn the trick first: <title>. A worked example, then Start the Star.", Escape starts (as it ends a replay), and starting focuses the first question. Nothing moves or waits, so Calm and Pause motion need no branch. Nothing is spoken: Read aloud is off by default in Challenger, and with it on the first question is read as today. No new spoken line means no studio voice recording.

**4. Fit with `placement` (and its Hook).** `placement` plans the Hook: a new Challenger or Pro Player's first Star opens with a calculator dare, then a reveal of the Trick on the dare's numbers, then the round easiest first. A visitor from Try a trick is a new Player, so once `placement` ships the Hook would play on this same Star. `placement` absorbs this card as follows (to be written into its design and tasks when it is applied):
- When the Hook plays (the Trick has a dare and the Player is new), the Hook's reveal is the teaching and this card is not shown, so the visitor is never taught twice.
- When the Hook does not play (a Trick with no dare, or a Player who saw or skipped it), the card stays as the Try a trick path's way to teach first.
- If the owner decides that the Hook's dare must come before any teaching, `placement` replaces this card on the Try path; `starIntro()` and the `intro` option can then be removed with their tests.
Nothing here reads or writes Placement or Hook state, so either order of shipping works.

**5. Fit with `find-and-home-polish` (PR #94).** That change asserts Try a trick lands on "Question 1 of 4". Whichever merges second updates the other's e2e steps to press Start the Star first. The code paths do not overlap: this change touches the picker's Try handler and `starView`, #94 touches `home()`, `newHereHTML()` and `findView()`.

## Risks / Trade-offs

- One more tap before the first answer (the first question is two taps away instead of one). Accepted: the owner chose teaching first, and the extra tap is the one the lede promises.
- A visitor who already knows the trick reads a card. Mitigation: the Start button is focused and on screen at 390 px; Skip this Star still works.

## Migration

None. Nothing is stored; `starView.introFor` lives in memory.
