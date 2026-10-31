# landing-pages Specification

## Purpose
Give learnvedicmath.com a fun front door and plain pages for grown-ups, readable without JavaScript and quick to load, and keep the site its own brand.

## Requirements

### Requirement: Static pages built ahead of time
The landing page (`/`) and the grown-up pages (`/parents/`, `/teachers/`, `/privacy/`, `/terms/`) SHALL be complete HTML in the build output, readable with JavaScript off, with the site header and footer, in both color schemes (Daybreak and Deep Space, following the system with a saved override). They SHALL load no module of the game, no Firebase code and nothing from YouTube.

#### Scenario: JavaScript off
- **WHEN** a visitor opens `/parents/` with JavaScript turned off
- **THEN** the whole page text, header and footer are shown

#### Scenario: What the landing page loads
- **WHEN** a first-time visitor opens `/`
- **THEN** no request is made for `/js/app.js`, any Firebase file or any YouTube host

### Requirement: The landing page
The landing page SHALL show the Nikhilam Family as its large picture in the hero. It SHALL say what Vedic Math is (the Sutras from Bharati Krishna Tirtha's 1965 book and the Tricks built on them; practice, games and Boards for ages 4 to adult), offer one main "Start learning" button to `/play/`, show the three Modes as links under "Pick how you learn", link to the grown-up pages, and order its sections as the Page order scenario lists. It SHALL NOT claim the methods come from the Vedas.

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

### Requirement: The landing hero says little
The landing page's hero SHALL hold one short headline that names the sutra way, at most one short line under it, and the Start learning button, big and in the accent colour, on screen without scrolling at every width. The button SHALL glow gently every few seconds, and the glow SHALL stop under reduced motion, Pause motion and Calm. Everything else SHALL be below the hero. The welcome back version keeps the same shape, with its own headline, line and button words.

#### Scenario: The hero says little
- **WHEN** a visitor opens the landing page
- **THEN** the hero shows the headline "Math in your head, the sutra way", the line "Free, for ages 4 to adult." and Start learning, at most 14 words before the button, and the Sutras and what the site teaches are said below it

#### Scenario: Start learning draws the eye and works every way
- **WHEN** a visitor opens the landing page at 320, 375, 768 or 1280 px wide
- **THEN** Start learning is at least 56 px tall and on screen without scrolling, opens `/play/` by click, tap or Enter, glows every few seconds while the family's nine nods toward it, and holds still with reduced motion, Pause motion or Calm

### Requirement: Learning is the top-level word
The site SHALL present itself as a place to learn, with games as one way to learn among several. The landing page's main button SHALL read "Start learning" on a first visit and the Modes SHALL sit under the heading "Pick how you learn". The header and footer link to `/play/` on the landing and grown-up pages SHALL read "Learn". Inside the game, neither the page title nor a header tab SHALL name the app "Play".

#### Scenario: Landing labels
- **WHEN** a first-time visitor opens `/?home`
- **THEN** the main button reads "Start learning", the Modes heading reads "Pick how you learn", and the header and footer link to `/play/` reads "Learn"

#### Scenario: Not-found page
- **WHEN** a visitor opens an unknown path
- **THEN** its main button to `/play/` reads "Start learning"

#### Scenario: Inside the game
- **WHEN** a Player opens `/play/` (the URL stays `/play/` for now)
- **THEN** the page title is "Learn Vedic Math", not "Play · Learn Vedic Math", and no header tab is named Play

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

### Requirement: The Mode cards are links
Each of the landing page's three Mode cards (Explorer, Challenger, Pro) SHALL be one link to `/play/?mode=<id>` (`explorer`, `challenger`, `pro`) whose accessible name holds all its visible words (the Mode, its ages and blurb) and ends in its call to action. The call to action SHALL be visible at the card's foot ("Start as Explorer", "Start as Challenger", "Start as Pro") with an arrow. The lede SHALL say that a tap starts in that Mode and that the Mode can be changed any time.

#### Scenario: A card is a link
- **WHEN** a first-time visitor opens the landing page
- **THEN** there are three links whose names end in "Start as Explorer", "Start as Challenger" and "Start as Pro", to `/play/?mode=explorer`, `/play/?mode=challenger` and `/play/?mode=pro`, each showing its call to action

#### Scenario: Tapping a card
- **WHEN** a first-time visitor taps the Explorer card
- **THEN** the game opens on the Explorer Home, not the Mode picker, the address reads `/play/` with no query, and the Player's Mode is Explorer

### Requirement: The Mode cards respond like buttons
A Mode card SHALL lift on hover, show the focus ring on keyboard focus and press down when pressed, as Start learning does, and SHALL hold still under reduced motion, Pause motion and Calm. The cards SHALL stack in one column on a phone with no sideways scroll.

#### Scenario: Keyboard
- **WHEN** a visitor moves focus to the Pro card with the keyboard and presses Enter
- **THEN** the card shows the focus ring and the game opens on the Pro Home

#### Scenario: A phone
- **WHEN** a visitor opens the landing page 375 px wide
- **THEN** the three cards sit in one column, each at least 44 px tall, and nothing scrolls sideways

### Requirement: A Mode link opens the game in that Mode
When the game opens with `?mode=<id>` and `<id>` is a Mode (`explorer`, `challenger` or `pro`), it SHALL set that Mode for the active Player exactly as tapping that card on the Mode picker does (starting the day, clearing a Mode guess), open Home instead of the Mode picker, and send one `math/landing/mode/<id>` event, which counts the pick. Either way it SHALL then remove `mode` from the address with `history.replaceState`, keeping any route. An unknown value SHALL change nothing.

#### Scenario: Counted
- **WHEN** a first-time visitor opens `/play/?mode=pro`
- **THEN** the Player's Mode is Pro, one `math/landing/mode/pro` event is sent, and no event names the Player

#### Scenario: Unknown value
- **WHEN** a first-time visitor opens `/play/?mode=wizard`
- **THEN** the Mode picker is shown, no Mode is stored, and the address reads `/play/`

#### Scenario: Switching
- **WHEN** a Challenger Player opens `/play/?mode=explorer`
- **THEN** the Player's Mode is Explorer and the Explorer Home opens

### Requirement: Welcome back
On a device with Players, the landing page opened with `?home` SHALL show a welcome back version. Its hero SHALL read "Welcome back, <Nickname>" with the active Player's Nickname from this device ("Welcome back" when none is stored), the line "Pick up where you left off." and a button "Keep playing" to `/play/`.

#### Scenario: The welcome back hero
- **WHEN** a Challenger Player named Swift Tiger 42 taps the brand in the game's header
- **THEN** the landing page reads "Welcome back, Swift Tiger 42" and "Pick up where you left off.", and its main button reads "Keep playing" and opens `/play/`

### Requirement: Welcome back marks Your Mode
On the welcome back version, when the active Player has a Mode, that Mode's card SHALL be marked "Your Mode" and `aria-current="true"`, its call to action SHALL read "Keep playing as <Mode>" and link to `/play/`, and the other cards SHALL read "Switch to <Mode>".

#### Scenario: A returning Challenger
- **WHEN** a Challenger Player opens `/?home`
- **THEN** the Challenger card is marked "Your Mode" and reads "Keep playing as Challenger", and the others read "Switch to Explorer" and "Switch to Pro"

#### Scenario: Switching from the landing page
- **WHEN** that Player taps "Switch to Pro"
- **THEN** the game opens on the Pro Home

### Requirement: Welcome back only reads
The welcome back version SHALL set its words before the page's main content is first shown, so nothing shifts, and SHALL change only the page's own text and attributes: it SHALL write nothing to storage and send nothing about the Player. The first-visit version SHALL be the page's HTML, so with JavaScript off or storage blocked the first-visit version is shown.

#### Scenario: Nothing written or sent
- **WHEN** a returning Player opens `/?home`
- **THEN** localStorage is unchanged and no request carries the Nickname

#### Scenario: Storage blocked
- **WHEN** the landing page is opened with storage blocked, or with JavaScript off
- **THEN** the first-visit version is shown: "Math tricks you can do in your head", Start learning and "Start as" on every card

### Requirement: The landing page leads with the Sutras and the method
Right after the hero, a section headed "One short rule, one line of work" SHALL say what a Sutra is and show one sum the school way and the sutra way side by side, the sutra way headed by its Trick's plain-English name over the Sutra's Sanskrit name. With JavaScript the sutra way SHALL be a three-step click-through (Back, Next) that never moves by itself, counted once per page load as `math/landing/demo/done` at its last step. With JavaScript off it SHALL show every step and no buttons.

#### Scenario: Both ways
- **WHEN** a visitor reads the section
- **THEN** it shows 98 × 97 worked the school way and the sutra way, both ending in 9506, the sutra way headed "Multiply numbers near 10, 100 or 1000" with the Sanskrit name under it

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

### Requirement: Bolt and Math Lens on the landing page
After the Modes the landing page SHALL show a section headed "Inside the game" with Bolt and Math Lens, each with its picture (decorative to assistive technology) and one line that says what it does: Bolt, the robot teacher who shows each Trick and works a missed answer step by step on the Player's numbers; Math Lens, which makes puzzles from digits the camera sees and keeps the pictures on the device. It SHALL read the same with JavaScript off.

#### Scenario: Inside the game
- **WHEN** a visitor reads the landing page, in Daybreak or Deep Space, at 320 or 1280 px wide
- **THEN** "Inside the game" shows Bolt and Math Lens with one line each, nothing scrolls sideways, and axe finds no serious or critical violation
