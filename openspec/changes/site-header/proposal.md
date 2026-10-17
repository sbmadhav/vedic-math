# Proposal

## Why

The owner asked for the Vedic Math header to match the header on the rest of sbmadhav.com, and it still does not. The home page (the site's main header) has one sticky bar: the Madhav brand, its section links as soft pills, Explore, a round sun or moon button for the color scheme, a Music pill and the kid mode switch. Vedic Math has two bars: the brand, Explore and a three-button System / Daybreak / Deep Space picker on top, then a full-width tab strip (underlined tabs, a round music icon and the Player chip) below. A visitor moving between the home page and Vedic Math sees a different header, a different theme control and a different music control. At 768px the current tab strip also makes the whole page scroll sideways (795px wide).

## What Changes

- One header bar in the home page's order and style: brand, the Vedic Math nav (Home, Learn, Dojo, Arena, Games, Sutras, Watch, Guide) as pill links inside the bar, Explore, the round color scheme button, the Music pill, and the Player chip in the place where the home page has its kid mode switch (Vedic Math has no kid mode switch; the play modes set the wording).
- The color scheme control becomes the home page's round button: a sun in Daybreak, a moon in Deep Space. A click switches to the other scheme; a choice that differs from the system is saved under the same `theme` key the rest of the site uses, and switching back to match the system clears it. The System / Daybreak / Deep Space picker (`.md-modes`) is removed from this page.
- The music button becomes a pill like the home page's (note, "Music", a small equalizer, filled with ink while playing). It still opens Vedic Math's music panel (tracks, volume, Moving background).
- The current route's nav link is a filled pill (the design system's selected state) instead of an underline.
- Below 1180px, where the home page hides its section links, the nav moves to its own rows in the same header and wraps, so every tab is on screen and nothing scrolls sideways. Under 600px Explore and Music show icons only (with their names kept for assistive tech), and under 420px the brand shows only Bolt and the Player chip only the avatar, as on the home page.

Out of scope:

- The shared files (`/design-system/`, `/assets/`). Where the site itself is inconsistent (the design system page and its README still show the three-button picker; `md-wrap` is 48px wider than the home page's `.wrap`), this change records the difference for the owner and does not edit them.
- The play screen header (`js/shell.js`), which already covers the site header while a round runs.

Affected: every Mode (Explorer, Challenger, Pro) and every Player. Nothing new is stored or sent; `parentNote()` and `cloud/README.md` are unchanged. One analytics event is added (`vedic-math/theme/<scheme>`, no personal data).

## Capabilities

### New Capabilities

- `site-header`: the Vedic Math header matches the header of the rest of sbmadhav.com: parts, order, look, color scheme button, music control, current route and small screens.

### Modified Capabilities

None.

## Impact

- `index.html` (header markup, the inline color scheme script), `math.css` (header, nav, theme button, music pill), `js/ambient.js` (music button markup), `js/guide.js` (tour step selector for the nav).
- `e2e/tests/header.spec.ts` (new), `e2e/tests/load.spec.ts`, `e2e/tests/csp.spec.ts`, `e2e/tests/a11y.spec.ts`.
