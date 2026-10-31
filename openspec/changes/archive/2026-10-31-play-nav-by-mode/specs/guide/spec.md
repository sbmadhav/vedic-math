# Spec Delta

## MODIFIED Requirements

### Requirement: The guide is easy to find
The guide SHALL be reached from Find (its help card and results) in every Mode, from the footer, and for Explorer from More places on Home ("How to play"). While the Player has not played on an earlier day, Home SHALL show a short "New here?" note with one control, "Quick tour", that starts the tour, whose last step points at the Find trigger (for Explorer at How to play). The note SHALL have a solid background so the drawing never shows through. The mode picker SHALL link to the guide.

#### Scenario: Menu bar
- **WHEN** a Challenger Player opens the guide
- **THEN** the Find trigger in the menu bar is marked as the current page, and Find's help card links to the guide

#### Scenario: Explorer
- **WHEN** an Explorer Player looks at Home
- **THEN** More places has How to play, which opens the guide

#### Scenario: New here
- **WHEN** a new Challenger Player opens Home and presses Quick tour in the "New here?" note
- **THEN** the note has exactly one control, and the tour's first step opens

### Requirement: The tour is accessible
The tour SHALL be a modal dialog with an accessible name and description from the current step, SHALL move focus to each step's title, SHALL keep focus inside while open, SHALL close on Escape (counted as a skip) and return focus to the page, SHALL keep each step's card and its target on screen at 390px wide and at 200% zoom, and SHALL not animate when the device asks for reduced motion, when the site's Pause motion is on, or with Calm on.

#### Scenario: Keyboard
- **WHEN** a keyboard user presses Escape on any step
- **THEN** the tour closes and is recorded as skipped

#### Scenario: Phone
- **WHEN** the tour points at the Find trigger on a 390px wide screen
- **THEN** the trigger and the whole card are on screen

#### Scenario: Calm
- **WHEN** Calm is on
- **THEN** the spotlight moves between steps without animation
