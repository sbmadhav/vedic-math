# Spec Delta

## Purpose

Give learnvedicmath.com a fun front door and plain pages for grown-ups, readable without JavaScript and quick to load, and keep the site its own brand.

## ADDED Requirements

### Requirement: Static pages built ahead of time
The landing page (`/`) and the grown-up pages (`/parents/`, `/teachers/`, `/privacy/`, `/terms/`) SHALL be complete HTML in the build output, readable with JavaScript off, with the site header and footer, in both color schemes (Daybreak and Deep Space, following the system with a saved override). They SHALL load no module of the game, no Firebase code and nothing from YouTube.

#### Scenario: JavaScript off
- **WHEN** a visitor opens `/parents/` with JavaScript turned off
- **THEN** the whole page text, header and footer are shown

#### Scenario: What the landing page loads
- **WHEN** a first-time visitor opens `/`
- **THEN** no request is made for `/js/app.js`, any Firebase file or any YouTube host

### Requirement: The landing page
The landing page SHALL show the Nikhilam Family (the brand mark's three digits) as its large picture, named for screen readers, and no Bolt (Bolt appears only inside the game), say in plain words what Vedic Math is (Tricks from Bharati Krishna Tirtha's 1965 book, practice, games and Boards for ages 4 to adult), show the three Modes, offer one main button to `/play/`, and link to the grown-up pages. It SHALL NOT claim the methods come from the Vedas.

#### Scenario: Start learning
- **WHEN** a first-time visitor taps Start learning on the landing page
- **THEN** `/play/` opens and the Mode picker is shown

#### Scenario: The hero picture
- **WHEN** a visitor opens the landing page at 320, 375, 768 or 1280 px wide, in Daybreak or Deep Space
- **THEN** the Nikhilam Family is shown, named "The Nikhilam Family: the Devanagari digits one, zero and nine", at the same size as before with no layout shift

#### Scenario: Honest framing
- **WHEN** the landing page text is checked by the copy tests
- **THEN** it credits the 1965 book and contains no claim of a Vedic source

### Requirement: Learning is the top-level word
The site SHALL present itself as a place to learn, with games as one way to learn among several. The landing page's main button SHALL read "Start learning" and the Modes SHALL sit under the heading "Three ways to learn". The header and footer link to `/play/` on the landing and grown-up pages SHALL read "Learn". Inside the game, "Play" SHALL name only playing a game or a round.

#### Scenario: Landing labels
- **WHEN** a visitor opens `/?home`
- **THEN** the main button reads "Start learning", the Modes heading reads "Three ways to learn", and the header and footer link to `/play/` reads "Learn"

#### Scenario: Not-found page
- **WHEN** a visitor opens an unknown path
- **THEN** its main button to `/play/` reads "Start learning"

### Requirement: Pages for grown-ups
`/parents/` SHALL explain, in plain words, what the game keeps on the device, what it sends and to whom, that Players under 13 post nothing, and how to ask a question or a deletion (`privacy@learnvedicmath.com`). `/teachers/` SHALL describe classroom use without promising any school plan, and say a school plan needs a separate agreement. `/privacy/` and `/terms/` SHALL show the published policy and terms with their last-updated dates.

#### Scenario: A parent looks for the contact
- **WHEN** a grown-up opens `/parents/`
- **THEN** it shows `privacy@learnvedicmath.com` and links to `/privacy/`

### Requirement: Its own brand
No page SHALL show the sbmadhav.com Explore menu or load any file from sbmadhav.com. No page SHALL link to sbmadhav.com except the export popup that `/import/` opens.

#### Scenario: Requests on load
- **WHEN** any page of the site loads
- **THEN** no request goes to `sbmadhav.com`

### Requirement: Grown-up pages are found from the game
The game's footer SHALL link to the parents page and the privacy policy (as `/parents/?home` and `/privacy/?home`), for every Mode, and the parent note SHALL link to the privacy policy.

#### Scenario: Explorer footer
- **WHEN** an Explorer Player's grown-up looks at the game's footer
- **THEN** it has a "For grown-ups" link to the parents page and a "Privacy" link
