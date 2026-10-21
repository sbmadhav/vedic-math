# Proposal

> **Approved by the owner.** On 2026-10-20 the owner asked: "we have to redo the home page and how we show the homepage content when someone is a repeat visitor. The Three ways to play section is confusing. It looks like it is clickable but it is not." and "Don't ask me questions, make assumptions where necessary." That message is the owner's approval of this change; the assumptions made are listed below.

## Why

- **The Mode cards look clickable and are not.** The landing page's "Three ways to learn" band shows Explorer, Challenger and Pro as cards with a ledge shadow and a coloured top border, the same look as the game's Mode cards and tiles, which are buttons. On the landing page they are plain list items: a tap does nothing.
- **A returning Player sees the first-visit pitch.** A device with Players goes straight into the game from `/`, but the brand link in the game opens `/?home`, which shows the same page a stranger sees: "Math tricks you can do in your head" and Start learning, with no sign that the page knows them.
- **The page reads out of order.** What the site is sits inside the Modes band, between the lede and the cards.

## What Changes

- **The Mode cards are links.** Each card is one link to `/play/?mode=explorer` (`challenger`, `pro`) with a visible call to action at its foot ("Start as Explorer" and an arrow), and hover, focus and press states like Start learning. The band's heading becomes "Pick how you learn", and its lede says a tap starts in that Mode and the Mode can be changed any time.
- **The game reads a Mode link.** `/play/?mode=<id>` with a known Mode id sets that Mode exactly as tapping its card on the Mode picker does (`fx.setMode`, `gm.startDay`), so Home opens and the picker is skipped; the query is then removed from the address with `history.replaceState`. An unknown value changes nothing. The game counts it once as `math/landing/mode/<id>`.
- **Welcome back.** On a device with Players, `/?home` shows a welcome back version: the hero reads "Welcome back, <Nickname>" (the active Player's Nickname from this device, or "Welcome back" without one), the line under it reads "Pick up where you left off." and its button reads "Keep playing" (to `/play/`). The active Player's Mode card is marked "Your Mode" (and `aria-current`), its call to action reads "Keep playing as <Mode>" and goes to `/play/`; the other cards read "Switch to <Mode>". A small inline script reads storage and changes text only; the page still writes nothing to storage, and the first-visit version is the HTML, so it is what shows with JavaScript off or storage blocked.
- **The page reads in order.** Hero, then the Modes, then what the site teaches beside where the tricks come from, then For grown-ups, then the footer.

Unchanged: the bare `/` still replaces itself with `/play/` before it paints on a device with Players (hosting, "Returning Players go straight into the game"); Start learning on a first visit still opens the Mode picker; the sky background and the Nikhilam Family's motion are as before.

## Assumptions

- The heading is "Pick how you learn", not "Three ways to play": it says the cards are a choice to make, and keeps learning as the top-level word (landing-pages, "Learning is the top-level word").
- "Your Mode" is the active Player's Mode, guessed (Try a trick) or picked. With no Mode yet, the cards keep "Start as <Mode>".
- The Nickname is shown in the hero because it is already on screen in the game; it is read from this device and never sent.
- The landing page sends no event of its own for a card tap (the page is left at once, and analytics loads only when the browser is idle); the game counts the arrival instead (`math/landing/mode/<id>`, through the early queue in `js/metrics.js`, since the game reads the link before `js/analytics.js` has run; the `math/mode/<id>` that `fx.setMode` sends directly is not sent that early).
- Archiving: the requirements this change modifies are added by the `learnvedicmath` change, which is not archived yet; archive `learnvedicmath` first.

Modes and Players affected: every visitor to the landing page (all Modes); returning Players who open `/?home`; Players who arrive in the game from a Mode card.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `landing-pages`: the Mode cards are links with a call to action; the heading "Pick how you learn"; the game opens in the Mode a card names; the welcome back version for a device with Players; the page order.
- `hosting`: returning Players who open `/?home` see the welcome back version, and the page still writes nothing.
