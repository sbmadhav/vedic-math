# Design

## Context

The reference is the header of the home page, https://sbmadhav.com/ (`header.nav` in `index.html` and `assets/app.js` of the sbmadhav.github.io repo). It is the site's main header, and the design system README describes the same bar ("The sticky header collapses its nav links under 1180px and keeps the scheme, music and kid-mode controls"). The other pages differ from it and from each other: the design system page uses the older `header.top` bar with the three-button `md-modes` picker (the one Vedic Math has today), and the State of Voice Agents report has its own report bar (52px, a long scrolling contents list, Download PDF, a System / Light / Dark segment). Vedic Math follows the home page.

Measured with Playwright (chromium, `node e2e/local-server.mjs 8126`, live pages from https://sbmadhav.com) at 1280, 768, 375 and 320px in both schemes.

## Differences before this change

Vedic Math compared with the home page header.

| Area | Home page | Vedic Math before |
| --- | --- | --- |
| Rows | One bar | Two bars: brand, Explore, scheme picker; then a tab strip |
| Order | Brand, section links, Explore, scheme button, Music, kid mode switch | Brand, Explore, scheme picker / tabs, music icon, Player chip |
| Height | 67px (one row); 105px at 420px and below (controls wrap) | 122px at every width |
| Brand | `Madhav` with a 34px Bolt; text hidden at 420px and below | Same text and link target (`/`), 32px Bolt; text hidden at 480px and below |
| Section links | Pills: 600 weight, .95rem, `ink-muted`, 6px 12px, hover fill `bg-alt`; right-aligned next to Explore; hidden below 1180px | Tabs: 700 weight, 15px, 10px 14px, 3px underline (`coral-strong`) for the current route, hover underline; full-width row of their own |
| Color scheme | Round 40px button (36px on phones), sun in Daybreak, moon in Deep Space; a click switches; matching the system clears the choice | Three-button picker "System / Daybreak / Deep Space" (pill group with labels) |
| Music | Pill: note, "Music" (or the track name), equalizer, plus a next-track button; labels hidden under 600px | Round 40px note icon with an equalizer badge, opening a panel |
| Kid mode | Switch at the end of the bar | None, by rule (play modes set the wording); the Player chip is at the end instead |
| Sticky, background, border | Sticky at top 0, `bg` at 88% with 10px blur, 1px `line` bottom border, z-index 50 | Same |
| Fonts | Brand in the display font, controls in Nunito Sans 700 | Same |
| Explore | Shared `xp-btn` (106px with "Explore", 40px icon under 600px) | Same button; reads "Star map" in Explorer and Challenger (by design) |
| Content width | `.wrap`: 1120px including its 24px padding | `md-wrap`: 1120px plus its padding (1168px), so the brand sits 24px further left at wide widths |
| 768px | One row, links hidden, no sideways scroll | The tab strip makes the page 795px wide (sideways scroll) |
| 375 / 320px | Row one: Bolt, Explore, scheme, Music; row two: kid mode switch | Row one: Bolt, Explore icon, squeezed three-button picker; row two: tabs scrolling sideways, Sutras, Watch and Guide off the right edge |
| Daybreak / Deep Space | Same tokens in both; sun or moon shows the scheme | Same tokens; the picker shows the choice as a filled button |

## Decisions

**1. One bar in the home page's order.** `header.top > .md-wrap` holds, in order: `a.home` (brand), `nav.mq-nav` (the Vedic Math links, right-aligned with `margin-left: auto` like the home page's links), `#exploreBtn`, `#themeBtn`, `#mqMusic`, `#mqChip`. The Player chip takes the kid mode switch's place at the end, so the order of every shared part is the home page's. At 1280px it is one 67px row, measured the same as the home page (height, background, border, blur, Bolt size, Explore size, scheme button size and shape).

**2. The nav stays visible, as a second row below 1180px.** The home page hides its section links below 1180px because they are jump links also listed in Explore. Vedic Math's nav is how a Player moves around the app, so instead of hiding it, the bar wraps: the controls stay on row one (Explore pushed right, as on the home page) and the nav takes row two, full width, and wraps onto a third row when it needs to, so every tab is on screen. (A sideways-scrolling row was tried first: on a phone it hid Sutras, Watch and Guide off the right edge with no sign they were there.) Row one keeps the home page's 66px rhythm; the whole header is 106 to 108px, close to the home page's 105px on phones.

**3. The home page's color scheme button.** Same markup (`button.theme#themeBtn` with the sun and moon SVGs, token colors only), same behavior and the same `theme` key: a click switches to the other scheme; when the new scheme matches the system the saved choice is cleared (`''`), otherwise `light` or `dark` is saved; the label says what a click will do ("Switch to Deep Space (dark) scheme"), the title adds "(following your system)" while no choice is saved, and `meta[name=theme-color]` follows `--bg` (read from the tokens, no hex in code). The pre-paint script in `<head>` is unchanged. The `md-modes` picker is removed from this page.

**4. Music keeps its panel, in the home page's pill.** The home page's music is play and next track; Vedic Math's opens a panel with tracks, volume and the Moving background switch, which Players need. So only the button changes: a pill with the note, "Music" and the equalizer (plum bars, sun bars that move while playing, ink fill while playing), hidden labels under 600px. `#vmMBtn`, `#vmMPanel` and the panel's behavior stay.

**5. Current route.** The current link is a filled pill (`ink` with `bg` text), the design system's selected state (`md-chip[aria-pressed="true"]`, `md-modes`), since the home page's jump links have none. Hover is the home page's `bg-alt` fill. `aria-current` is set by `js/app.js` exactly as before.

**6. Small screens.** Under 600px: Explore and Music are 40 and 36px icons with their accessible names, the scheme button is 36px and the gap is 8px (home page values). At 420px and below: the brand shows only Bolt (home page value) and the Player chip only the avatar. Nothing scrolls sideways at 320px.

**7. Kept hooks.** Ids and classes code and tests use stay: `header.top`, `.home`, `.mq-nav` with its `a[href]` and `data-match`, `#exploreBtn`, `#mqMusic`, `#vmMBtn`, `#vmMPanel`, `#mqChip a.mq-chip`, `.hide-explorer`. Removed: the inner `.mq-nav .md-wrap`, `.mq-nav-sp` and `.md-modes` (the tour step for the nav now points at `.mq-nav`; the color scheme specs use `#themeBtn`). `js/shell.js` still makes `body > header` inert while a play screen is open.

**8. Nav links are 6px 10px, not 6px 12px.** Eight links plus the chip need 2px less padding a side to fit in one row inside 1120px; at 1280px there is 70px to spare in Pro (the most links).

## After this change

Screenshots (`after-vm-*.png`, attached to the PR):

- 1280px, both schemes: one bar like the home page: Bolt and "Madhav" on the left; Home (filled), Learn, Dojo, Arena, Games, Sutras, Watch, Guide as pills; Explore; the sun (Daybreak) or moon (Deep Space) button; the Music pill; the Player chip.
- 768px: row one Bolt and "Madhav", then Explore, the scheme button, Music and the chip on the right; row two the eight pills, no sideways scroll.
- 375 and 320px: row one Bolt, then Explore, scheme and music icons and the chip avatar on the right; rows two and three the pills (five, then three), every one on screen.

## Left for the owner (shared files, not edited here)

- The design system README's Color modes section and the design system page still describe and use the three-button `md-modes` picker, while the home page uses the round button. Pick one site-wide pattern; if it is the round button, add `.theme` (and the music pill) to `components.css` so pages stop copying it, and update the README.
- `md-wrap` (`components.css`) is content-box (1120px plus padding) and the home page's `.wrap` is border-box (1120px in all), so headers built on `md-wrap` sit 24px wider each side than the home page's at wide widths. Vedic Math keeps `md-wrap` so the header lines up with its own content.
- The State of Voice Agents report keeps its own report bar (System / Light / Dark labels, Download PDF).

## Risks

- A Player who had chosen System with the picker sees the same result (no saved choice). A Player who wants to return to System clicks until the scheme matches the system, as on the home page; there is no explicit System button any more.
- The home page header can change; `e2e/tests/header.spec.ts` compares the two live headers (order and measured look) so a later drift fails a test.
