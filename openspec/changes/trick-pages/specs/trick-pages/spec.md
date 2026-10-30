# Spec Delta

## ADDED Requirements

### Requirement: A static page for each of 15 Tricks
The site SHALL serve a static page at `/tricks/<slug>/` for each of the 15 Tricks listed in the change's design, and an index at `/tricks/` linking to all 15 by their Trick names. Each Trick page SHALL show the Trick's name as its heading, its Sutra's Sanskrit name and meaning, when to use it, the idea, one worked example step by step, and a "Practice this trick" link to `/play/#/skill/v-<trick>`, with the site header and footer, in Daybreak and Deep Space.

#### Scenario: Square numbers ending in 5
- **WHEN** a visitor opens `/tricks/square-numbers-ending-in-5/`
- **THEN** the heading reads "Square numbers ending in 5", the Sutra line names Ekādhikena Pūrveṇa, "By one more than the one before", and Practice this trick links to `/play/#/skill/v-sq5`

#### Scenario: The index
- **WHEN** a visitor opens `/tricks/`
- **THEN** it lists 15 links, one to each Trick page, each named by the Trick's title

#### Scenario: JavaScript off
- **WHEN** a visitor opens any Trick page with JavaScript off
- **THEN** the worked example shows every step, and no calculator buttons are shown

### Requirement: The calculator steps through the Trick for the visitor's numbers
With JavaScript, each Trick page SHALL offer "Try it with your numbers": the Trick's own input fields and limits, Show steps, New numbers, and Back, Next and Show all over the Trick's steps for those numbers. Numbers the Trick does not take SHALL show the Trick's own message and no steps. Earlier steps SHALL stay on screen. Nothing SHALL move by itself, and a step SHALL appear without motion under reduced motion, Pause motion or Calm.

#### Scenario: Typed numbers
- **WHEN** a visitor types 85 on the Square numbers ending in 5 page and presses Show steps, then Show all
- **THEN** the steps say the part before the 5 is 8, 8 × 9 = 72, and 85² = 7225

#### Scenario: A number the Trick does not take
- **WHEN** a visitor types 84 on that page and presses Show steps
- **THEN** "Pick a number that ends in 5." is shown and no steps are drawn

#### Scenario: Keyboard and screen reader
- **WHEN** a keyboard user presses Show steps and then Next
- **THEN** focus stays on the button pressed, and the step line is announced politely with the new step's words

### Requirement: Trick pages are findable
Each Trick page SHALL have its own title, meta description, canonical link to its own `https://learnvedicmath.com/tricks/<slug>/` URL, Open Graph tags, and JSON-LD of type `LearningResource` and `BreadcrumbList`. `sitemap.xml` SHALL list `/tricks/` and every Trick page. A published slug SHALL NOT change.

#### Scenario: Canonical and sitemap
- **WHEN** the built site is checked
- **THEN** every Trick page's canonical link is its own URL, and `sitemap.xml` lists `/tricks/` and all 15 Trick pages

#### Scenario: Structured data
- **WHEN** a Trick page's JSON-LD is parsed
- **THEN** it holds a `LearningResource` named after the Trick and a `BreadcrumbList` of Home, Speed tricks and the Trick

### Requirement: Trick pages credit the 1965 book
Each Trick page SHALL say its Sutra comes from Bharati Krishna Tirtha's 1965 book, and no Trick page SHALL say the Tricks or Sutras are from the Vedas, are "traditional Vedic mathematics sutras", or call them "Vedic sutras". No page SHALL contain an em dash.

#### Scenario: Copy scan
- **WHEN** the copy tests scan every page under `/tricks/`
- **THEN** each Trick page credits the 1965 book, and none contains a banned phrase or an em dash

### Requirement: Trick pages stay light and leave the game alone
A Trick page's first load SHALL stay within the per-page budget recorded in `docs/perf/baseline.json`, and the build SHALL fail above it. The Trick pages SHALL NOT add any file to the game's import map, precache list or first-load set. A Trick page SHALL write nothing to storage and SHALL NOT load Firebase.

#### Scenario: The game's first load
- **WHEN** the site is built with the Trick pages
- **THEN** the game's first-load total is unchanged and `/tricks/calculator.js` is not in the worker's precache list

#### Scenario: Nothing stored
- **WHEN** a visitor uses the calculator on a Trick page
- **THEN** `localStorage` and `sessionStorage` are unchanged and no request goes to a Google host
