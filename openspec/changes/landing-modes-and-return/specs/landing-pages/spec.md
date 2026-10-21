# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page
The landing page SHALL show the Nikhilam Family as its large picture, named for screen readers, with no Bolt. It SHALL say in plain words what Vedic Math is (Tricks from Bharati Krishna Tirtha's 1965 book, practice, games and Boards for ages 4 to adult), offer one main "Start learning" button to `/play/`, show the three Modes as links under "Pick how you learn", frame games as one way to learn among several, and link to the grown-up pages. Its sections SHALL come in this order: the hero, the Modes, what the site teaches and where the tricks come from, For grown-ups, then the footer. It SHALL NOT claim the methods come from the Vedas.

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
- **THEN** the section headings come in the order: the hero's headline, "Pick how you learn", "What you learn", "Where the tricks come from", "For grown-ups"

### Requirement: The landing hero says little
The landing page's hero SHALL hold one short headline, at most one short line under it, and the Start learning button, big and in the accent colour, on screen without scrolling at every width. The button SHALL glow gently every few seconds, and the glow SHALL stop under reduced motion, Pause motion and Calm. Everything else SHALL be below the hero. The welcome back version keeps the same shape, with its own headline, line and button words.

#### Scenario: The hero says little
- **WHEN** a visitor opens the landing page
- **THEN** the hero shows the headline "Math tricks you can do in your head", the line "Free, for ages 4 to adult." and Start learning, at most 14 words before the button, and what the site teaches (the 1965 book, practice, games, Stars and Boards) is said below it

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

## ADDED Requirements

### Requirement: The Mode cards are links
Each of the landing page's three Mode cards (Explorer, Challenger, Pro) SHALL be one link to `/play/?mode=<id>` (`explorer`, `challenger`, `pro`) whose accessible name is its call to action, with its ages and blurb as its description. The call to action SHALL be visible at the card's foot ("Start as Explorer", "Start as Challenger", "Start as Pro") with an arrow. The lede SHALL say that a tap starts in that Mode and that the Mode can be changed any time.

#### Scenario: A card is a link
- **WHEN** a first-time visitor opens the landing page
- **THEN** there are three links named "Start as Explorer", "Start as Challenger" and "Start as Pro", to `/play/?mode=explorer`, `/play/?mode=challenger` and `/play/?mode=pro`, each showing its call to action

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
The welcome back version SHALL change only the page's own text and attributes: it SHALL write nothing to storage and send nothing about the Player. The first-visit version SHALL be the page's HTML, so with JavaScript off or storage blocked the first-visit version is shown.

#### Scenario: Nothing written or sent
- **WHEN** a returning Player opens `/?home`
- **THEN** localStorage is unchanged and no request carries the Nickname

#### Scenario: Storage blocked
- **WHEN** the landing page is opened with storage blocked, or with JavaScript off
- **THEN** the first-visit version is shown: "Math tricks you can do in your head", Start learning and "Start as" on every card
