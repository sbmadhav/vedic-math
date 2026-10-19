# find Specification

## Purpose
Let anyone find anything in the app by its name or a plain word, from the menu bar of every page, with nothing typed leaving the device.

## Requirements

### Requirement: A Find page
The system SHALL offer a Find page at `#/find` with a search box focused on open, a one-line hint of what it searches, and results that update as the Player types. It SHALL be in the menu bar of every page (after Guide, marked current on `#/find`), SHALL open from the landing by a link, and SHALL open from any page when the `/` key is pressed outside a text field, menu or dialog. It SHALL open before a Mode is picked, with Challenger wording until one is.

#### Scenario: From the menu bar
- **WHEN** a Player presses Find in the menu bar
- **THEN** the Find page opens with the search box focused and Find marked as the current page

#### Scenario: The slash key
- **WHEN** a Player on the Dojo page presses `/` with no text field focused
- **THEN** the Find page opens with the search box focused

#### Scenario: Before a Mode
- **WHEN** a new visitor follows the landing's Find link
- **THEN** the Find page opens, not the mode picker

### Requirement: A result followed before a Mode
A result followed before a Mode is picked SHALL open the mode picker, and picking a Mode there SHALL open that result when the picked Mode can open it (it is among that Mode's Find entries), and Home otherwise. The result SHALL be remembered only in the page's memory, never stored.

#### Scenario: A result before a Mode
- **WHEN** a new visitor opens Find, follows a Skill result and picks Challenger on the mode picker that shows
- **THEN** that Skill's page opens, not Home

#### Scenario: A result the picked Mode cannot open
- **WHEN** a new visitor follows the Times sprint game result from Find and picks Explorer
- **THEN** Explorer Home opens

### Requirement: The index holds every named thing
The index SHALL hold every section, grade, Skill, Trick, Sutra and sub-sutra, game, play experience, guide section and video in the catalogs, each with its kind, its title in the Mode's wording, a one-line description and the page it opens. It SHALL be built in the page from the catalogs, with no index file and no request to any other server (the video catalog may load as the app's own module on first use).

#### Scenario: A Skill by name
- **WHEN** a Challenger types "fractions"
- **THEN** Skills whose title or description mentions fractions are listed, each opening `#/skill/<id>`

#### Scenario: A Sutra in plain letters
- **WHEN** a Player types "urdhva"
- **THEN** Ūrdhva-Tiryagbhyām is listed under Sutras, opening its deep dive

#### Scenario: A video
- **WHEN** a Player types the title of a video and follows the result
- **THEN** the video player opens in place with that video

### Requirement: Plain words find things too
Each entry MAY carry plain-word synonyms, and the sections SHALL: "take away" and "minus" find the subtraction Trick, "squares" finds the Trick for numbers ending in 5, "leaderboard", "scores" and "race" find the Arena, "settings", "nickname", "name", "color" and "reset" find Me, "videos" finds Watch, "help" and "how" find the guide. Matching SHALL ignore case and diacritics and SHALL accept a prefix of at least two letters.

#### Scenario: Take away
- **WHEN** a Challenger types "take away"
- **THEN** the Trick "Subtract from 100, 1000, 10000" is among the first three results

#### Scenario: Settings
- **WHEN** a Player types "settings"
- **THEN** Me is the first result

### Requirement: Results are grouped and ranked
Results SHALL be grouped by kind in the order sections, Tricks, Skills, Sutras, games, play experiences, guide, grades, videos, at most eight per kind. Within a kind, a match on the title SHALL rank above a match on a synonym, which SHALL rank above a match in the description.

#### Scenario: Title first
- **WHEN** a Pro types "arena"
- **THEN** the Arena section is the first result, above guide sections that mention it

#### Scenario: Eight per kind
- **WHEN** a Challenger types "number"
- **THEN** no kind lists more than eight results

### Requirement: Results are filtered to the Mode
Entries the Player's Mode cannot open SHALL NOT be listed: the Dojo and Sutras sections in Explorer (its menu hides them), experiences, games and videos not listed for the Mode, and guide sections the Mode does not have. Tricks and Sutras SHALL stay listed for Explorer with their Explorer titles, as the Explorer guide explains them and their pages open for it.

#### Scenario: Explorer sees only its own experiences and games
- **WHEN** an Explorer types "spell" and then "sprint"
- **THEN** Sutra Spellbook (a Dojo experience) and Times sprint (a Challenger and Pro game) are not listed

#### Scenario: Explorer titles
- **WHEN** an Explorer types "fives"
- **THEN** the Trick is listed as "Fives squared in one breath"

### Requirement: The browse list
With nothing typed, the Find page SHALL show the browse list: every section the Mode has, each with its one-line plain description, in menu order. When nothing matches, the page SHALL say so and offer the browse list and the guide.

#### Scenario: Empty box
- **WHEN** a Challenger opens Find and types nothing
- **THEN** Home, Learn, Dojo, Arena, Games, Sutras, Watch, Me and Guide are listed, each with one line saying what is there

#### Scenario: No match
- **WHEN** a Player types "zzzz"
- **THEN** the page says nothing matched and shows the browse list

### Requirement: Keyboard and screen readers
The results SHALL be announced as they change (a polite live region with the count), Enter in the box SHALL open the first result, Down from the box SHALL move focus to the first result, and Escape in the box SHALL clear it. Every result SHALL be a link or a button with its title as its name.

#### Scenario: Enter opens the first result
- **WHEN** a Player types "arena" and presses Enter
- **THEN** the Arena page opens

#### Scenario: Accessible
- **WHEN** axe checks the Find page with results showing, in both schemes
- **THEN** it finds no serious or critical violation

### Requirement: Nothing typed leaves the device
The search text SHALL never be stored, sent to analytics or put in the address. Following a result SHALL send only the fixed event `math/find/go`.

#### Scenario: Typing and following
- **WHEN** a Player types "squares" and follows a result
- **THEN** no request carries the text, the address is the result's route, and exactly one `math/find/go` event is sent
