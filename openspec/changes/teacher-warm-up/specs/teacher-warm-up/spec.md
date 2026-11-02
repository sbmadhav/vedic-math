# Spec Delta

## ADDED Requirements

### Requirement: A projector warm-up in five screens
The site SHALL serve a static page at `/teachers/warm-up/` with five screens in order: Today's trick (its name, its Sutra crediting the 1965 book, the idea and its worked example stepped with Next), Problem 1, Problem 2, Problem 3, and Practice at home (the Trick page's address). Each problem SHALL be shown alone; Reveal SHALL show its answer, and then Show the steps SHALL show the Trick's own steps for those numbers. A polite line SHALL say where the class is ("Problem 2 of 3").

#### Scenario: A whole warm-up
- **WHEN** a teacher opens the warm-up for Square numbers ending in 5 and presses Next through it
- **THEN** the screens are Today's trick, Problem 1 (25²), Problem 2 (65²), Problem 3 (115²) and Practice at home showing `learnvedicmath.com/tricks/square-numbers-ending-in-5/`

#### Scenario: Reveal, then the steps
- **WHEN** the teacher presses Reveal on Problem 2 and then Show the steps
- **THEN** 4225 is shown, and then the Trick's steps for 65 appear under it while the answer stays

### Requirement: The Trick of the day or the teacher's pick
The warm-up SHALL pick its Trick from the 15 Trick page Tricks by the local date, so it changes each day with nothing stored. A Pick a trick list SHALL change it for this visit, and `?trick=<id>` SHALL open that Trick; an unknown id SHALL fall back to the Trick of the day. Each Trick SHALL have three fixed problems, each larger than the one before, that the Trick takes.

#### Scenario: Two days
- **WHEN** the warm-up is opened on two consecutive dates
- **THEN** it shows two different Tricks, and the same Trick to everyone on the same date

#### Scenario: A bookmarked Trick
- **WHEN** a teacher opens `/teachers/warm-up/?trick=by11`
- **THEN** the warm-up is for Multiply by 11

#### Scenario: Problems rise
- **WHEN** the problem data is checked
- **THEN** every problem passes its Trick's `valid()`, and each Trick's three problems grow in size

### Requirement: Made for a projector and a clicker
The problem's numbers SHALL be at least 20% of the viewport height. A Full screen button SHALL use the Fullscreen API, hidden where it is not supported. Right, Space and Page Down SHALL go on (the next step of the screen, or the next screen at its end); Left and Page Up SHALL go back; R SHALL reveal, then show the steps. There SHALL be no clock and no sound, nothing SHALL move by itself, and the page SHALL work in Daybreak and Deep Space.

#### Scenario: A presenter clicker
- **WHEN** a teacher opens the warm-up for Multiply by 11 and presses Page Down four times from the first screen
- **THEN** the worked example's three steps have appeared one by one and the warm-up is on Problem 1 (23 × 11), and Page Up goes back to the example with its steps

#### Scenario: Full screen
- **WHEN** the browser offers the Fullscreen API
- **THEN** a Full screen button is shown, and where `document.fullscreenEnabled` is false it is hidden and the rest of the page works the same

#### Scenario: Big enough for the back row
- **WHEN** a problem is shown on a 1280 × 720 screen
- **THEN** its numbers are at least 144 px tall

#### Scenario: Nothing moves by itself
- **WHEN** the warm-up is left open on any screen for a minute
- **THEN** nothing on it has changed and no animation is running

### Requirement: The warm-up stores and sends nothing about anyone
The warm-up's own scripts SHALL write nothing to storage (the shared header saving a chosen color scheme aside), and it SHALL create no Player, earn no Sparks, post to no Board and load no Firebase. Its words SHALL say "No sign-in and no student accounts. This page stores nothing on this device." and link to the privacy policy, and SHALL NOT claim a school needs no privacy review or that the site is COPPA compliant. No copy SHALL contain an em dash.

#### Scenario: Nothing stored
- **WHEN** a teacher goes through a whole warm-up without touching the color scheme switch
- **THEN** `localStorage` and `sessionStorage` are unchanged and no request goes to a Google host

#### Scenario: Honest words
- **WHEN** the copy tests scan the warm-up and `/teachers/`
- **THEN** they contain the no sign-in sentence, no claim about privacy reviews or COPPA compliance, and no em dash

### Requirement: One click from the teachers page
The warm-up box on `/teachers/` SHALL offer "Open the projector warm-up" as its main button, linking to `/teachers/warm-up/`, and SHALL keep Open the Arena beside it.

#### Scenario: From the teachers page
- **WHEN** a teacher presses Open the projector warm-up on `/teachers/`
- **THEN** `/teachers/warm-up/` opens on Today's trick, with no Mode picker
