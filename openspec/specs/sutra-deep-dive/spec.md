# sutra-deep-dive Specification

## Purpose
The Sutra deep dive teaches each Sutra and sub-sutra with three or more worked examples, with its close button and previous and next links pinned so they never scroll away.

## Requirements

### Requirement: At least three Worked examples per Sutra
The Deep dive of every Sutra and sub-sutra (all 29) SHALL show at least three Worked examples, ordered from easy to harder. Each SHALL give a question and the short steps the Sutra uses, ending in the result, which SHALL be highlighted. Where the Sutra applies to plain numbers, the first example SHALL use plain numbers a young Player can follow. Example text SHALL be original and SHALL NOT contain an em dash.

#### Scenario: Every Deep dive teaches with three or more
- **WHEN** a Player opens the Deep dive of any of the 16 Sutras or 13 sub-sutras
- **THEN** it lists at least three Worked examples, numbered "Example 1 of n" onwards, and the first shows its steps with the result highlighted

#### Scenario: Plain numbers first
- **WHEN** a Player opens the Deep dive of Ekādhikena Pūrveṇa
- **THEN** the first Worked example is 25² with the result 625, before 65², 115² and 1/19

### Requirement: Worked examples are correct
Every Worked example's highlighted result SHALL be mathematically correct, and a unit test SHALL check each one with exact arithmetic (integers, exact fractions, or polynomial identities) together with the count of at least three per Sutra.

#### Scenario: A wrong result fails the build
- **WHEN** a Worked example's highlighted result is changed to a wrong value, or an example is added without a check
- **THEN** `pnpm test` fails, naming the Sutra and the example

### Requirement: Try first, then open the steps
Worked examples SHALL be shown as disclosures: the first open, the others closed until the Player opens them. Each SHALL be a control named by its number and question, reachable with Tab and opened and closed with Enter or Space, and SHALL work in both color schemes using design tokens only. A short tip above the list SHALL say to try each one before opening it, worded for the Player's Mode.

#### Scenario: Open by keyboard
- **WHEN** a Player tabs to "Example 2 of 4" in the Deep dive of Ekādhikena Pūrveṇa and presses Enter
- **THEN** its steps appear, ending in 4225, and pressing Space closes them again

#### Scenario: Accessible in both schemes
- **WHEN** axe checks a Deep dive with every Worked example open, in Daybreak and in Deep Space, at 1280px and 375px
- **THEN** it reports no serious or critical violation

### Requirement: Pinned footer
The Deep dive's footer with the previous and next Sutra SHALL stay pinned to the bottom of the dialog while its content scrolls, over the content, with an opaque background from the tokens and a top border. At the end of the scroll the last content SHALL sit above the footer, never under it. This SHALL hold with Calm, Pause motion and reduced motion.

#### Scenario: Footer stays while scrolling
- **WHEN** a Player at 1280, 768, 375 or 320px wide scrolls a Deep dive to the middle and to the bottom
- **THEN** the footer stays at the bottom edge of the dialog, the close button stays in view, and the last text ends above the footer

#### Scenario: Move on from anywhere
- **WHEN** a Player at the bottom of the Deep dive of Nikhilaṃ Navataścaramaṃ Daśataḥ activates "Next: Ūrdhva-Tiryagbhyām"
- **THEN** the dialog shows Ūrdhva-Tiryagbhyām scrolled to the top, and the route is `#/sutras/s3`

#### Scenario: Deep Space and Calm
- **WHEN** Calm is on, motion is reduced and the scheme is Deep Space, and a Player scrolls a Deep dive at 375px
- **THEN** the footer is pinned with the same opaque background as the dialog, and the close button closes the dialog

### Requirement: Pinned close button and one-row footer links
The close button SHALL stay in view at the top of the dialog while it scrolls. At 320px both footer links SHALL fit on one row without sideways scrolling, each with an accessible name that gives the direction and the full Sutra name.

#### Scenario: Close from the middle
- **WHEN** a Player scrolls a Deep dive to the middle at any of 1280, 768, 375 or 320px
- **THEN** the close button is in view and closes the dialog

#### Scenario: Narrow footer
- **WHEN** a Player opens the Deep dive of Nikhilaṃ Navataścaramaṃ Daśataḥ at 320px
- **THEN** "Previous: Ekādhikena Pūrveṇa" and "Next: Ūrdhva-Tiryagbhyām" sit on one row and the dialog does not scroll sideways

### Requirement: A Deep dive opens without a Mode
A Deep dive's route (`#/sutras/<id>`) SHALL open its Deep dive over the Sutras page before a Mode is picked, as `#/sutras` does, using Challenger's wording, so a page outside the game can link to it.

#### Scenario: A link from the landing page
- **WHEN** a first-time visitor opens `/play/#/sutras/s2`
- **THEN** the Deep dive of Nikhilaṃ Navataścaramaṃ Daśataḥ opens over the Sutras page, and no Mode is stored
