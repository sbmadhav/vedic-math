## ADDED Requirements

### Requirement: The header matches the rest of sbmadhav.com
The Vedic Math header SHALL be the same sticky bar as the home page of sbmadhav.com, with the brand, the Vedic Math nav, Explore, the round color scheme button and the music control in the home page's order. The Player chip SHALL come last, where the home page has its kid mode switch, and the page SHALL NOT show a kid mode switch.

#### Scenario: Same parts in the same order
- **WHEN** a Player opens Vedic Math on a 1280px wide screen
- **THEN** the header shows, in one row, the brand, Home, Learn, Dojo (not in Explorer), Arena, Games, Sutras (not in Explorer), Watch and Guide, Explore, the color scheme button, Music and the Player chip, in that order, matching the order of the home page's header

#### Scenario: Same look
- **WHEN** the home page and Vedic Math are opened at 1280px in the same scheme
- **THEN** the two headers have the same height, background, blur, bottom border, brand icon size, Explore size and color scheme button size and shape

#### Scenario: Stays on top
- **WHEN** a Player scrolls down a long view
- **THEN** the header stays at the top of the screen

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
The Vedic Math nav SHALL use the home page's pill links, and the link of the current route SHALL be marked with `aria-current="true"` and shown as a filled pill; every other link SHALL have `aria-current="false"`.

#### Scenario: Current route
- **WHEN** a Player opens Learn, Arena, Games, Watch or Guide
- **THEN** exactly that nav link is current and filled

### Requirement: Music control in the site's style
The music control SHALL be a pill like the home page's, with a note, the word "Music" and a small equalizer, filled while music plays. It SHALL open the Vedic Math music panel and SHALL never start music by itself.

#### Scenario: Open the panel
- **WHEN** a Player clicks Music in the header
- **THEN** the music panel opens, and Escape closes it

### Requirement: Small screens
Below 1180px the nav SHALL move to a second row of the header and scroll sideways on its own. At 320, 375 and 768px wide no part of the page SHALL scroll sideways and every header control SHALL be on screen. Under 600px Explore and Music SHALL show icons only and keep their accessible names.

#### Scenario: A 320px phone
- **WHEN** a Player opens Vedic Math on a 320px wide screen in either scheme
- **THEN** the brand, Explore, the color scheme button, Music and the Player chip are on the first row, the nav is on the second row, the page does not scroll sideways, and every nav link can be reached by scrolling the nav

#### Scenario: Accessible header
- **WHEN** axe checks the header at 1280px and 320px in both schemes, with the music panel closed and open
- **THEN** it finds no serious or critical violation

### Requirement: Tabs appear after a Mode is picked
Before a Player has picked a Mode, the Vedic Math tabs SHALL be hidden, because every route shows the mode picker until then. They SHALL appear as soon as a Mode is picked.

#### Scenario: First visit
- **WHEN** a new Player opens Vedic Math and has not picked a Mode
- **THEN** the mode picker shows and no Vedic Math tabs are visible

#### Scenario: After picking
- **WHEN** the Player picks Challenger
- **THEN** the tabs appear and Learn opens the Learn page

