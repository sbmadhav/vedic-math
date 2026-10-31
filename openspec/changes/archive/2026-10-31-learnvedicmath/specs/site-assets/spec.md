# Spec Delta

## Purpose

Make the site self-contained: a pinned copy of the design system with its own theme, its own header, fonts, icons and manifest, all served and hashed by this site.

## ADDED Requirements

### Requirement: A pinned copy of the design system
The build SHALL publish design-system v2.2.0 (`tokens.css`, `components.css`, `header.js`) from a copy vendored in the repo under `vendor/design-system/2.2.0/`, at `/ds/2.2.0/`. A test SHALL fail when a vendored file does not match its recorded sha256. No page SHALL load design-system files from another origin.

#### Scenario: A vendored file is edited by hand
- **WHEN** `vendor/design-system/2.2.0/components.css` differs from its recorded sum
- **THEN** the node tests fail and say to vendor a new version instead

### Requirement: The learnvedicmath theme
A `learnvedicmath` theme SHALL load after the design system's tokens and SHALL only give new values to existing token names, for both Daybreak and Deep Space. App CSS SHALL keep using tokens only, never raw colours. The five category colours used for Belts, avatars and tiles SHALL be distinct from each other in both schemes.

#### Scenario: Category colours
- **WHEN** the computed values of `--coral`, `--teal`, `--sun`, `--sky` and `--plum` are compared in each scheme
- **THEN** no two are the same

#### Scenario: No new token names
- **WHEN** the theme file is checked
- **THEN** every custom property it sets is defined in the pinned `tokens.css`

### Requirement: The header comes from one partial
Every page SHALL get its header from the site's header partial (derived from the design system's v2.2.0 `header.html`, without the Explore button and with the Learn Vedic Math brand), put in at build time by the vendored `compose.py`. CI SHALL fail when a page's header differs from the partial.

#### Scenario: A page edited by hand
- **WHEN** a page's header markup is changed outside its slots
- **THEN** `compose.py --check` fails in CI

### Requirement: Fonts served by this site
The fonts SHALL be served from `/fonts/` with their licence texts, declared once in one stylesheet, with Nunito Sans and Fredoka preloaded on each page. No page SHALL declare the same `@font-face` twice, and no mono text SHALL ask for a weight its font does not ship.

#### Scenario: Font requests
- **WHEN** the game loads
- **THEN** every font request goes to `/fonts/` on this site

### Requirement: Its own installable app
The manifest SHALL name the app "Learn Vedic Math" (short name "Vedic Math"), with `id` `/play/`, `start_url` `/play/?source=pwa`, `scope` `/play/` and the site's own icons (192, 512, maskable 512, and an Apple touch icon). Installing from learnvedicmath.com SHALL install only the game.

#### Scenario: Install
- **WHEN** a Player installs the app from `/play/`
- **THEN** the installed app opens `/play/?source=pwa`, and pages outside `/play/` open in the browser

### Requirement: Third-party notices
The site SHALL publish `/licenses/` listing every third-party file it serves (design system, fonts, Firebase SDK, GoatCounter script, voice model code) with its licence, and the build SHALL fail when a file under `vendor/` or `fonts/` has no entry there.

#### Scenario: A new vendored file
- **WHEN** a file is added under `vendor/` without an entry in the notices
- **THEN** the build fails and names it
