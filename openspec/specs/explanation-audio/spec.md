# explanation-audio Specification

## Purpose
Every explanation in the game (Skill pages, worked examples, the Guide, Sutra deep dives, tour steps, page introductions and more) can be heard through a Listen button, in the Studio voice when the line is recorded and the device's voice until then, one line at a time and never by itself.

## Requirements

### Requirement: Every explanation can be heard
Each explanation block SHALL have a Listen button that reads it aloud: a Skill page's idea and How it works, the worked example and the solution steps, the Trick tool's shown steps, each Sutra card's back, each Sutra deep dive section (In plain words, Why it works, Worked examples, Where it is used) and the diagram step on screen, the History card, each Guide section, each tour step and each game's description. The button SHALL read the same text the page shows, in the Player's Mode words.

#### Scenario: A Skill page
- **WHEN** a Player presses Listen on a Skill page
- **THEN** the idea and each How it works line are read in order

#### Scenario: A Guide section in Explorer words
- **WHEN** an Explorer Player presses Listen on a Guide section
- **THEN** the Explorer wording of that section is read

### Requirement: Star replays, quests, round formats and the Older roots notes can be heard
A Star replay SHALL have a Listen button once every step is shown, reading the steps in order; ending the replay SHALL stop it. The Daily quests card SHALL have one reading today's quest labels, and the Challenge tower chapter one reading the round format rules. The Sutras page's Older roots card SHALL have one reading its intro, then each note as the list shows it.

#### Scenario: A Star replay
- **WHEN** a Player misses a Star question, the replay has shown every step, and the Player presses Listen
- **THEN** the steps are read in order, and skipping the replay stops it

#### Scenario: Today's quests
- **WHEN** a Player presses Listen on the Daily quests card
- **THEN** today's three quest labels are read in order

#### Scenario: The Older roots notes
- **WHEN** a Player presses Listen on the Older roots card of the Sutras page
- **THEN** its intro and then each note are read in order

### Requirement: Page introductions, video descriptions and badge rules can be heard
Each page introduction (Learn, a level, Dojo, Katas, the Challenge tower, Arena, Games, Sutras, Watch, Guide) SHALL have a Listen button that reads the words the page shows in the Player's Mode, its fixed lines and the Player's own numbers. The video player SHALL have one reading the video's description; pressing play or closing the player SHALL stop it. The Me page SHALL have one reading the rules of the badges the Player has not earned, in the order shown, and none once every badge is earned.

#### Scenario: A page introduction
- **WHEN** a Player presses Listen under the Sutras page's introduction
- **THEN** its fixed line plays and then "You have collected" with the Player's own count

#### Scenario: A video's description
- **WHEN** a Player opens a video, presses Listen and then presses play
- **THEN** the description is read and stops when the video starts

#### Scenario: Badges to earn
- **WHEN** a Player presses Listen over the Me page's badges
- **THEN** the rules of the badges not yet earned are read in order

### Requirement: Listen uses the studio voice
A Listen button SHALL read each line with the read-aloud voice order: the natural voice when the Player turned it on, else the whole studio recording, else studio clips, else this device's voice. Every explanation line with fixed words SHALL be in the studio recording list, so it plays whole once recorded.

#### Scenario: A recorded line
- **WHEN** a Player presses Listen and the line has a studio recording
- **THEN** the recording plays and the device's voice says nothing

#### Scenario: No recording
- **WHEN** a line has no studio recording and no clips
- **THEN** this device's voice reads it

#### Scenario: A new explanation without a recording entry
- **WHEN** a change adds an explanation a Listen button reads but the recording list does not hold
- **THEN** the node test suite fails and names it

### Requirement: One explanation at a time
Only one Listen button SHALL play at a time. Pressing a second button SHALL stop the first and start the second. Pressing a playing button SHALL stop it. A playing button SHALL show it with `aria-pressed="true"`, and SHALL return to `aria-pressed="false"` when its lines end or are stopped.

#### Scenario: Two buttons
- **WHEN** a Player presses Listen on one Guide section and then on another
- **THEN** the first stops, the second plays, and only the second is pressed

### Requirement: Listen stops when the Player moves on
Leaving the page, closing or swapping the Sutra deep dive, moving to another tour step, or any new read-aloud line SHALL stop a playing Listen button, and no later line of it SHALL start.

#### Scenario: Leaving the page
- **WHEN** a Listen button is playing and the Player goes to another page
- **THEN** nothing more of it is said

### Requirement: Listen follows a tap
A Listen button SHALL play only after the Player presses it, and SHALL play with read aloud off.

#### Scenario: Read aloud off
- **WHEN** a Challenger Player with read aloud off presses Listen
- **THEN** the explanation is read

### Requirement: The Listen button is accessible
The Listen button SHALL be a native button named "Listen: " followed by what it reads, operable with Enter and Space, at least 44 by 44 CSS pixels, using design tokens only, with no serious or critical axe violations in either color scheme, pressed or not.

#### Scenario: Keyboard
- **WHEN** a keyboard user focuses a Listen button and presses Enter, then Space
- **THEN** it starts, then stops

### Requirement: One anonymous event per Listen
Each press that starts a Listen button SHALL send one event, `math/listen/explanation`, and nothing about which explanation, Player or page. A press that stops it SHALL send nothing.

#### Scenario: Two presses
- **WHEN** a Player starts one Listen button and starts another
- **THEN** two `math/listen/explanation` events are sent and nothing else names an explanation
