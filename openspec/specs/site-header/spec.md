# site-header Specification

## Purpose
The Vedic Math header matches the header on the rest of sbmadhav.com: one bar with the brand, Explore, the color scheme control and the shared pieces, and no kid mode switch.

## Requirements

### Requirement: Color scheme button
The header SHALL have the home page's round color scheme button, showing a sun in Daybreak and a moon in Deep Space. A click SHALL switch to the other scheme. When the new scheme differs from the system scheme it SHALL be saved under the site-wide `theme` key; when it matches the system scheme the saved choice SHALL be cleared, so the page follows the system again. The button's name SHALL say what a click will do. Without a saved choice the page SHALL follow the system scheme.

#### Scenario: Switch and remember
- **WHEN** a Player on a Daybreak system clicks the color scheme button and reloads
- **THEN** the page is in Deep Space, the moon shows, and `theme` is `dark`

#### Scenario: Back to the system
- **WHEN** that Player clicks the button again
- **THEN** the page is in Daybreak, no scheme is saved, and it follows the system from then on

#### Scenario: A choice made elsewhere on the site
- **WHEN** a visitor chose Deep Space on the home page and then opens Vedic Math
- **THEN** Vedic Math opens in Deep Space

### Requirement: Nav shows the current route
The nav SHALL use the home page's pill links. The item whose zone holds the route SHALL have `aria-current="true"` and a filled pill; every other item `aria-current="false"`. Zones: Home (Home, `#/tiles`, `#/places`, `#/try`); Learn (Skill map, grades, Skills, practice, runs, Sutras, Deep dives); Arcade (Arcade, Dojo, Trick pages, Katas, Stars, Arena, Party Mode, tower and Games); Watch; Find (Find and the Guide). Explorer: Play holds Home and its tiles' pages, Learn as above, Me is Me.

#### Scenario: Current route
- **WHEN** a Challenger Player opens Learn, the Arena, Games, Watch or the Guide
- **THEN** exactly Learn, Arcade, Arcade, Watch or Find is current and filled

#### Scenario: A Trick page
- **WHEN** a Pro Player opens the Trick page of squares ending in 5
- **THEN** Arcade is current

### Requirement: Calm and sound control
The header SHALL have one Calm and sound control on every game page: a pill like the home page's music pill, named "Calm and sound", filled while music plays. One click SHALL open its panel: the Calm switch, Pause motion, the Calm music picker (four soundscapes, Stop and Volume), then the Moving background. The play shell's header SHALL have the same control, with Pause motion and the music. Nothing in it SHALL start by itself, Escape SHALL close it, and there SHALL be no kid mode switch.

#### Scenario: Open the panel
- **WHEN** a Player clicks the Calm pill (a note, the word "Calm" and a small equalizer) in the header
- **THEN** the panel opens with the Calm switch and one line on what it does, Pause motion and the four soundscapes (Singing bowls, Tanpura drone, Himalayan dawn, Temple chimes), and Escape closes it

#### Scenario: Calm from the header
- **WHEN** a Player turns on Calm in the header's panel and opens Me
- **THEN** Me shows Calm on, and nothing has started playing

#### Scenario: In a round
- **WHEN** a Player in a Star round opens the shell's Calm and sound control and turns on Pause motion
- **THEN** Pause motion is on for the site, and the header's panel shows it on after the round

### Requirement: Small screens
Below 1180px the nav SHALL move below the controls and wrap onto as many rows as it needs, so every nav item is on screen without scrolling. At 320, 375 and 768px wide no part of the page SHALL scroll sideways and every header control SHALL be on screen. Under 600px the Calm and sound control SHALL show its icon only and keep its accessible name, and the header's rows SHALL be packed tightly. Explorer's three tabs SHALL share their row evenly.

#### Scenario: A 320px phone
- **WHEN** a Player opens Vedic Math on a 320px wide screen in either scheme
- **THEN** the brand mark, the color scheme button, the Calm and sound control and the Player chip are on the first row, the nav is below them, the page does not scroll sideways, every nav item is on screen without scrolling, and the Player chip shows the avatar and the bar to the next Title

#### Scenario: Accessible header
- **WHEN** axe checks the header at 1280px and 320px in both schemes, with the Calm and sound panel closed and open
- **THEN** it finds no serious or critical violation

### Requirement: One header row on a phone
Under 420px the game's brand SHALL show its mark only, keeping "Learn Vedic Math, home" as its accessible name, so the brand and every control share one row: at 390px wide the header SHALL be at most 132px tall.

#### Scenario: A 390px phone
- **WHEN** a Challenger Player opens Home on a 390px wide screen
- **THEN** the header is at most 132px tall, the brand mark and every header control are on one row, every nav link is on screen, and each nav link is at least 24px tall

### Requirement: Tabs appear after a Mode is picked
Before a Player has picked a Mode, the menu SHALL be hidden, the Find trigger included, because every route that depends on a Mode shows the mode picker until then (Watch, the Sutras, the guide and Find open without one, and Find still opens with `/`, Ctrl K or Cmd K). The Mode's menu SHALL appear as soon as a Mode is picked.

#### Scenario: First visit
- **WHEN** a new Player opens Vedic Math and has not picked a Mode
- **THEN** the mode picker shows and no menu item is visible

#### Scenario: After picking
- **WHEN** the Player picks Challenger
- **THEN** the menu appears and Learn opens the Learn page

#### Scenario: Find without a Mode
- **WHEN** a new Player opens `#/find` before picking a Mode
- **THEN** the Find page shows, not the mode picker

### Requirement: The header is the Learn Vedic Math header
Every page of the site, the game included, SHALL use the same sticky header from the site's header partial: the Learn Vedic Math brand (Bolt and the name, linking to `/?home`), the page's own nav in the nav slot (in the game, the Mode's menu of "The menu follows the Mode"), the round color scheme button, the Calm and sound control in the game, and the Player chip last in the game. It SHALL NOT have an Explore button or a kid mode switch.

#### Scenario: Game header
- **WHEN** a Challenger Player opens `/play/` on a 1280px wide screen
- **THEN** the header shows, in one row, the brand, the game's nav, the color scheme button, the Calm and sound control and the Player chip, and no Explore button

#### Scenario: Landing header
- **WHEN** a visitor opens `/`
- **THEN** the header shows the brand, links to Learn (to `/play/`) and the grown-up pages, and the color scheme button

#### Scenario: Stays on top
- **WHEN** a Player scrolls down a long view
- **THEN** the header stays at the top of the screen

### Requirement: The menu follows the Mode
The game's menu SHALL depend on the Player's Mode. For Challenger and Pro it SHALL list, in this order, Home, Learn, Arcade and Watch, then the Find trigger. For Explorer it SHALL list three picture tabs, each an icon above its name: Play (Home), Learn and Me. This replaces the menu lists of "Sutras come first in the menu" (`sutras-first`) and "The header is the Learn Vedic Math header" (`learnvedicmath`).

#### Scenario: Challenger menu
- **WHEN** a Challenger Player opens Home
- **THEN** the menu reads Home, Learn, Arcade, Watch and Find, and Find shows its shortcut on a wide screen

#### Scenario: Explorer menu
- **WHEN** an Explorer Player opens Home
- **THEN** the menu shows exactly three tabs, Play, Learn and Me, each with a picture and its name, each at least 56px tall

#### Scenario: Switching Mode on Me
- **WHEN** a Challenger Player picks Explorer on Me
- **THEN** the menu shows Play, Learn and Me without a reload

### Requirement: Learn and the Arcade hold the places
Learn SHALL open `#/learn`, whose first card opens the Sutras page. Arcade SHALL open `#/arcade`, a page with a card for the Dojo (not in Explorer), the Arena and Games, each with its section's one plain line, then Party Mode and the challenge tower (not in Explorer). Every route SHALL keep opening what it opened before, and every place the earlier nine-item menu reached SHALL stay reachable from the menu, from a page a menu item opens, or from Find.

#### Scenario: The Arcade
- **WHEN** a Pro Player opens Arcade
- **THEN** the page shows the Dojo, the Arena and Games as cards, each with one line saying what is there, and the Dojo card opens `#/dojo`

#### Scenario: Old links still work
- **WHEN** a Player opens `#/dojo`, `#/arena/party`, `#/sutras/s1` or `#/guide/arena` by a link
- **THEN** each opens as before, and the Arcade, Arcade, Learn and Find menu items are marked current

#### Scenario: Learn holds the Sutras
- **WHEN** a Challenger Player opens Learn
- **THEN** the first card on the page opens the Sutras page and says how many Sutra cards are collected

### Requirement: Explorer's tabs say their names
When Read aloud is on, an Explorer tab SHALL say its name ("Play", "Learn", "Me") when tapped: after the page it opens has drawn, or at once when it is the page already open. With Read aloud off it SHALL say nothing.

#### Scenario: Read aloud on
- **WHEN** an Explorer Player with Read aloud on taps Learn
- **THEN** the Learn page opens and "Learn" is spoken once

#### Scenario: Read aloud off
- **WHEN** an Explorer Player with Read aloud off taps Me
- **THEN** the Me page opens and nothing is spoken
