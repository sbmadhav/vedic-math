# Spec Delta

Applies after the `site-header` change is archived (this change is built after it).

## ADDED Requirements

### Requirement: The header is the Learn Vedic Math header
Every page of the site, the game included, SHALL use the same sticky header from the site's header partial: the Learn Vedic Math brand (Bolt and the name, linking to `/?home`), the page's own nav in the nav slot (in the game: Home, Learn, Dojo except in Explorer, Arena, Games, Sutras except in Explorer, Watch and Guide), the round color scheme button, the Music pill in the game, and the Player chip last in the game. It SHALL NOT have an Explore button or a kid mode switch.

#### Scenario: Game header
- **WHEN** a Challenger Player opens `/play/` on a 1280px wide screen
- **THEN** the header shows, in one row, the brand, the game's nav, the color scheme button, Music and the Player chip, and no Explore button

#### Scenario: Landing header
- **WHEN** a visitor opens `/`
- **THEN** the header shows the brand, links to Play and the grown-up pages, and the color scheme button

#### Scenario: Stays on top
- **WHEN** a Player scrolls down a long view
- **THEN** the header stays at the top of the screen

## REMOVED Requirements

### Requirement: The header matches the rest of sbmadhav.com
**Reason**: Vedic Math moves to its own domain and brand (docs/adr/0004); it no longer shares a header with sbmadhav.com and drops the Explore menu (owner decision 11).
**Migration**: Replaced by "The header is the Learn Vedic Math header". The other site-header requirements (color scheme button, current route, music control, small screens, tabs after a Mode is picked) stay.
