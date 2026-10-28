# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page
The landing page SHALL show the Nikhilam Family as its large picture, named for screen readers, with no Bolt. It SHALL say in plain words what Vedic Math is (the Sutras from Bharati Krishna Tirtha's 1965 book and the Tricks built on them, with practice, games and Boards for ages 4 to adult), offer one main "Start learning" button to `/play/`, show the three Modes as links under "Pick how you learn", frame games as one way to learn among several, and link to the grown-up pages. Its sections SHALL come in this order: the hero, the Sutras and the method, the Modes, what the site teaches and where the tricks come from, For grown-ups, then the footer. It SHALL NOT claim the methods come from the Vedas.

#### Scenario: Start learning
- **WHEN** a first-time visitor taps Start learning on the landing page
- **THEN** `/play/` opens and the Mode picker is shown

#### Scenario: The hero picture
- **WHEN** a visitor opens the landing page at 320, 375, 768 or 1280 px wide, in Daybreak or Deep Space
- **THEN** the Nikhilam Family is shown, named "The Nikhilam Family: the Devanagari digits one, zero and nine", at the same size as before with no layout shift

#### Scenario: Honest framing
- **WHEN** the landing page text is checked by the copy tests
- **THEN** it credits the 1965 book and contains no claim of a Vedic source

#### Scenario: Page order
- **WHEN** a visitor reads the landing page from the top
- **THEN** the section headings come in the order: the hero's headline, "One short rule, one line of work", "Pick how you learn", "What you learn", "Where the tricks come from", "For grown-ups"

### Requirement: The landing hero says little
The landing page's hero SHALL hold one short headline that names the sutra way, at most one short line under it, and the Start learning button, big and in the accent colour, on screen without scrolling at every width. The button SHALL glow gently every few seconds, and the glow SHALL stop under reduced motion, Pause motion and Calm. Everything else SHALL be below the hero. The welcome back version keeps the same shape, with its own headline, line and button words.

#### Scenario: The hero says little
- **WHEN** a visitor opens the landing page
- **THEN** the hero shows the headline "Math in your head, the sutra way", the line "Free, for ages 4 to adult." and Start learning, at most 14 words before the button, and the Sutras and what the site teaches are said below it

#### Scenario: Start learning draws the eye and works every way
- **WHEN** a visitor opens the landing page at 320, 375, 768 or 1280 px wide
- **THEN** Start learning is at least 56 px tall and on screen without scrolling, opens `/play/` by click, tap or Enter, glows every few seconds while the family's nine nods toward it, and holds still with reduced motion, Pause motion or Calm

## ADDED Requirements

### Requirement: The landing page leads with the Sutras and the method
Right after the hero the landing page SHALL show a section headed "One short rule, one line of work" that says what a Sutra is and shows one sum done the school way and the sutra way side by side. With JavaScript off it SHALL show the same.

#### Scenario: Both ways
- **WHEN** a visitor reads the section
- **THEN** it shows 98 × 97 worked the school way and the sutra way, both ending in 9506

#### Scenario: A phone
- **WHEN** a visitor opens the landing page 320 px wide in Daybreak or Deep Space
- **THEN** the section's cards sit in one column, nothing scrolls sideways, and axe finds no serious or critical violation

### Requirement: Three Sutras one tap from their Deep dives
The section SHALL show Ekādhikena Pūrveṇa, Nikhilaṃ Navataścaramaṃ Daśataḥ and Ūrdhva-Tiryagbhyām, each with its meaning and one worked example, as links to their Deep dives in the game. It SHALL say the Sutras are from Bharati Krishna Tirtha's 1965 book and are not found in the Vedas, and SHALL link to all 29 Sutras.

#### Scenario: A Sutra card
- **WHEN** a first-time visitor taps the Nikhilaṃ Navataścaramaṃ Daśataḥ card on the landing page
- **THEN** the game opens on that Sutra's Deep dive, not the Mode picker

#### Scenario: Where they come from
- **WHEN** a visitor reads the section
- **THEN** it credits Bharati Krishna Tirtha's 1965 book, says the Sutras are not found in the Vedas, and links to all 29 sutras
