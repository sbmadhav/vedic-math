# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page
The landing page SHALL show the Nikhilam Family as its large picture in the hero, named for screen readers, with no Bolt in the hero. It SHALL say in plain words what Vedic Math is (the Sutras from Bharati Krishna Tirtha's 1965 book and the Tricks built on them, with practice, games and Boards for ages 4 to adult), offer one main "Start learning" button to `/play/`, show the three Modes as links under "Pick how you learn", frame games as one way to learn among several, and link to the grown-up pages. Its sections SHALL come in this order: the hero, the Sutras and the method, the Modes, Inside the game, what the site teaches and where the tricks come from, For grown-ups, then the footer. It SHALL NOT claim the methods come from the Vedas.

#### Scenario: Start learning
- **WHEN** a first-time visitor taps Start learning on the landing page
- **THEN** `/play/` opens and the Mode picker is shown

#### Scenario: The hero picture
- **WHEN** a visitor opens the landing page at 320, 375, 768 or 1280 px wide, in Daybreak or Deep Space
- **THEN** the Nikhilam Family is shown, named "The Nikhilam Family: the Devanagari digits one, zero and nine", at the same size as before with no layout shift, it is the page's only image to assistive technology, and the hero does not show Bolt

#### Scenario: Honest framing
- **WHEN** the landing page text is checked by the copy tests
- **THEN** it credits the 1965 book and contains no claim of a Vedic source

#### Scenario: Page order
- **WHEN** a visitor reads the landing page from the top
- **THEN** the section headings come in the order: the hero's headline, "One short rule, one line of work", "Pick how you learn", "Inside the game", "What you learn", "Where the tricks come from", "For grown-ups"

### Requirement: The landing page leads with the Sutras and the method
Right after the hero the landing page SHALL show a section headed "One short rule, one line of work" that says what a Sutra is and shows one sum done the school way and the sutra way side by side. The sutra way SHALL lead with its Trick's plain-English name, "Multiply numbers near 10, 100 or 1000", with the Sutra's Sanskrit name right under it. With JavaScript, the sutra way SHALL be a click-through of three steps with Back and Next buttons and a line saying the step ("Step 1 of 3"), announced politely to screen readers with the step's words; earlier steps SHALL stay on screen, later ones SHALL be hidden without changing the card's size, and on the last step Next SHALL read Start again and go back to Step 1. Nothing in it SHALL move by itself, and a step SHALL appear without motion under reduced motion, Pause motion or Calm. Reaching the last step SHALL be counted once per page load as `math/landing/demo/done`. With JavaScript off the section SHALL show every step, with no buttons.

#### Scenario: Both ways
- **WHEN** a visitor reads the section
- **THEN** it shows 98 × 97 worked the school way and the sutra way, both ending in 9506

#### Scenario: A phone
- **WHEN** a visitor opens the landing page 320 px wide in Daybreak or Deep Space
- **THEN** the section's cards sit in one column, nothing scrolls sideways, and axe finds no serious or critical violation

#### Scenario: Step by step
- **WHEN** a visitor opens the landing page and presses Next twice
- **THEN** the sutra way first shows only "98 is 2 below 100, and 97 is 3 below.", then adds "98 − 3 = 95, and 2 × 3 = 06.", then adds "So the answer is 9506.", the step line reads Step 1 of 3, Step 2 of 3 and Step 3 of 3, and the card's size and the page below it never move

#### Scenario: Back and Start again
- **WHEN** a visitor on Step 3 presses Back, then Next, then Start again
- **THEN** the card shows Step 2, then Step 3, then Step 1, and Back does nothing on Step 1

#### Scenario: Keyboard and screen reader
- **WHEN** a keyboard user tabs to Next and presses Enter, then Space
- **THEN** the card moves to Step 2, then Step 3, focus stays on the button, the current step is marked as the current step, and the polite step line says "Step 3 of 3: So the answer is 9506."

#### Scenario: No motion by itself
- **WHEN** a visitor opens the landing page with reduced motion, Pause motion or Calm, and presses Next
- **THEN** no animation runs in the card before or after the press

#### Scenario: Counted once
- **WHEN** a visitor reaches Step 3, presses Start again and reaches Step 3 again
- **THEN** one `math/landing/demo/done` event is sent, and nothing is written to storage

#### Scenario: JavaScript off
- **WHEN** a visitor opens the landing page with JavaScript off
- **THEN** the sutra way shows all three steps ending in 9506 and no Back or Next button

### Requirement: Three Sutras one tap from their Deep dives
The section SHALL show Ekādhikena Pūrveṇa, Nikhilaṃ Navataścaramaṃ Daśataḥ and Ūrdhva-Tiryagbhyām as links to their Deep dives in the game. Each card SHALL lead with the plain-English name of the Trick its example shows, with the Sutra's Sanskrit name right under it, then its meaning and one worked example. It SHALL say the Sutras are from Bharati Krishna Tirtha's 1965 book and are not found in the Vedas, and SHALL link to all 29 Sutras.

#### Scenario: A Sutra card
- **WHEN** a first-time visitor taps the Nikhilaṃ Navataścaramaṃ Daśataḥ card on the landing page
- **THEN** the game opens on that Sutra's Deep dive, not the Mode picker

#### Scenario: Plain-English name first
- **WHEN** a visitor reads the three Sutra cards
- **THEN** they lead with "Square numbers ending in 5", "Subtract from 100, 1000, 10000" and "Multiply any two numbers in one line", each with its Sanskrit name directly under it

#### Scenario: Where they come from
- **WHEN** a visitor reads the section
- **THEN** it credits Bharati Krishna Tirtha's 1965 book, says the Sutras are not found in the Vedas, and links to all 29 sutras

## ADDED Requirements

### Requirement: Bolt and Math Lens on the landing page
After the Modes the landing page SHALL show a section headed "Inside the game" with Bolt and Math Lens, each with its picture (decorative to assistive technology) and one line that says what it does: Bolt, the robot teacher who shows each Trick and works a missed answer step by step on the Player's numbers; Math Lens, which makes puzzles from digits the camera sees and keeps the pictures on the device. It SHALL read the same with JavaScript off.

#### Scenario: Inside the game
- **WHEN** a visitor reads the landing page, in Daybreak or Deep Space, at 320 or 1280 px wide
- **THEN** "Inside the game" shows Bolt and Math Lens with one line each, nothing scrolls sideways, and axe finds no serious or critical violation
