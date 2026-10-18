# guide Specification

## Purpose
Explain every part of the app in one place, in the words of each Mode, and show a new Player around the screen once, so nothing has to be found by trial.

## Requirements

### Requirement: A guide page
The system SHALL offer a guide at `#/guide` with one section per feature area, grouped. Each section SHALL say what the feature is, how to use it and give a tip, SHALL show a small illustration drawn in the page with design tokens (no images), and SHALL link to the real place with a Try it link where one exists. Every route the app has SHALL be explained by at least one section, and every Try it link SHALL open a real route with a real catalog id.

#### Scenario: Reading the guide
- **WHEN** a Challenger Player opens `#/guide`
- **THEN** sections for the skill map, practice, the Dojo, Stars, Katas, Sutra cards, Games, the Arena, the Challenge tower, Party Mode, Boards, Watch, Calm, read-aloud, music, players, offline use and privacy are shown, each with what it is, how to use it, a tip and an illustration

#### Scenario: Try it
- **WHEN** a Player follows the Try it link of the Katas section
- **THEN** the Katas page of a real Trick opens

#### Scenario: A new route
- **WHEN** a route is added to the app and no guide section covers it
- **THEN** the guide tests fail

### Requirement: Guide wording follows the Mode
The guide SHALL use the wording of the Player's Mode (Explorer, Challenger or Pro) and SHALL leave out sections for features the Mode does not have. With no Mode chosen it SHALL use Challenger wording and say to pick a mode first. It SHALL never call Players kids.

#### Scenario: Explorer
- **WHEN** an Explorer Player opens the guide
- **THEN** the sections use the Explorer wording, and there is no section about Stars or the Sky

#### Scenario: No mode yet
- **WHEN** someone opens `#/guide` before picking a mode
- **THEN** the guide is shown (not the mode picker), with a link to pick a mode

### Requirement: Opening the guide at a section
`#/guide/<section>` SHALL open the guide at that section with focus on its heading. An unknown section SHALL open the top of the guide.

#### Scenario: Linked section
- **WHEN** a Player opens `#/guide/arena`
- **THEN** the Arena section is in view and its heading has focus

### Requirement: The guide is easy to find
The menu bar SHALL have a Guide link in every Mode, and the footer SHALL link to the guide. Home SHALL show a short "New here?" note linking to the guide and the tour while the Player has not played on an earlier day. The mode picker SHALL link to the guide.

#### Scenario: Menu bar
- **WHEN** an Explorer Player looks at the menu bar
- **THEN** a Guide link is there, and on the guide it is marked as the current page

### Requirement: A first-visit tour
On Home, for a Player with a Mode and no Sparks yet, on a device that has not seen the tour, the system SHALL show a tour of at most six steps, each pointing at a real element on screen with a short title and text in the Mode's wording. Steps whose element is not on screen SHALL be left out. Every step SHALL offer Skip tour; the last step SHALL offer Done. The tour SHALL be shown once per device, whether it is finished, skipped or left, and SHALL be replayable from the guide.

#### Scenario: First visit
- **WHEN** a new Player picks Challenger on a device that has never shown the tour
- **THEN** Home opens with the tour's first step pointing at the Player's strip, and the step count says how many steps there are

#### Scenario: Shown once
- **WHEN** the Player skips the tour and opens Home again, or reloads
- **THEN** the tour does not appear

#### Scenario: Replay
- **WHEN** the Player chooses Take the tour in the guide
- **THEN** Home opens with the tour's first step

#### Scenario: A returning Player
- **WHEN** a Player who already has Sparks opens Home on a device that has never shown the tour
- **THEN** no tour appears

### Requirement: The tour is accessible
The tour SHALL be a modal dialog with an accessible name and description from the current step, SHALL move focus to each step's title, SHALL keep focus inside while open, SHALL close on Escape (counted as a skip) and return focus to the page, SHALL keep each step's card and its target on screen at 390px wide and at 200% zoom, and SHALL not animate when the device asks for reduced motion, when the site's Pause motion is on, or with Calm on.

#### Scenario: Keyboard
- **WHEN** a keyboard user presses Escape on any step
- **THEN** the tour closes and is recorded as skipped

#### Scenario: Phone
- **WHEN** the tour points at the Guide link on a 390px wide screen
- **THEN** the menu bar is scrolled so the link is visible, and the whole card is on screen

#### Scenario: Calm
- **WHEN** Calm is on
- **THEN** the spotlight moves between steps without animation
