# Design

## Mode cards

Each card is `<li><a class="lv-mode lv-mode--<colour>" href="/play/?mode=<id>">`. The link's name is its whole text, the Mode, its ages and blurb, ending in its call to action ("Start as Explorer"): naming it by the call to action alone left visible words out of the name, which axe reports as a label-in-name failure (WCAG 2.5.3). The Mode name stays an `h3` inside the link (valid HTML, and heading navigation still finds each Mode). The call to action is a pill at the card's foot filled with the Mode's colour, with `--on-accent` text and an arrow, so the card reads as a button on its own; the whole card is the target. Hover lifts the card with `--shadow-ledge-hover`, press drops it with `--shadow-ledge-press`, keyboard focus shows the `--focus` ring, all like Start learning, and the movement stops under reduced motion, Pause motion and Calm.

## The game reads `?mode=`

In `js/app.js` boot, before the first `render()`: `URLSearchParams(location.search).get('mode')`; when `Object.hasOwn(fx.MODES, id)` it calls `fx.setMode(id)` and `gm.startDay()` (the Mode picker's own two calls) and `metrics.modeLink(m)`, which sends `math/landing/mode/<id>` through the metrics early queue (the game runs before the deferred `js/analytics.js`). Then `mode` is deleted from the search and `history.replaceState` writes the address back with the rest of the search and the hash. The first `render()` then finds a Mode and draws Home. The service worker answers `/play/?mode=...` like `/play/` (navigations within scope go to the cached page).

## Welcome back without a write

The page already has a before-paint script in `<head>` that reads `vm.players`. A second inline script, placed right after the Modes band so the hero and the cards are parsed and nothing below them is painted yet, reads `vm.players` again (in `try`, so blocked storage leaves the first-visit HTML), and only when the list is not empty:

- sets `data-visit="back"` on `<body>` (a hook for tests and styles), the hero's headline, line and button text (`textContent`, so a Nickname is never parsed as markup);
- for the active Player's Mode, adds the "Your Mode" badge, `aria-current="true"`, "Keep playing as <Mode>" and `href="/play/"`; the other cards read "Switch to <Mode>".

So that changing the words never shifts the page, the `<head>` script, on `?home` with Players, sets `data-lv-wait` on `<html>`; `main` stays `visibility: hidden` until the welcome back script removes it in a `finally` (and a 1.5 s CSS animation shows it anyway if that script never runs). Without JavaScript or with storage blocked the attribute is never set.

The bare `/` still leaves before paint for such a device, so this runs only on `/?home`. Inline scripts are allowed by hash: `build.py` hashes every inline script into the page's Content-Security-Policy in `_headers`, so no policy changes by hand.

## Order and copy

Hero, Modes ("Pick how you learn"), a two-column section ("What you learn": the 1965 book, practice, games, Stars and Boards; "Where the tricks come from"), "For grown-ups" with its links, the footer. No em dashes.
