# find Specification

## Purpose
Let anyone find anything in the app by its name or a plain word, from the menu bar of every page, with nothing typed leaving the device.

## Requirements

### Requirement: A Find page
There SHALL be a Find page at `#/find`: a search box focused on open, a one-line hint of what it searches, and results that update as the Player types. For Challenger and Pro it SHALL be the Find trigger ending the menu, current on `#/find` and the guide; for Explorer it SHALL sit under More places on Home. It SHALL open from the landing, by `/` outside a text field, and by Ctrl K or Cmd K anywhere, but never over a dialog, a menu or a round, and before a Mode is picked (Challenger wording).

#### Scenario: From the menu bar
- **WHEN** a Challenger Player presses Find in the menu bar
- **THEN** the Find page opens with the search box focused and Find marked as the current page, its shortcut shown beside it on a wide screen

#### Scenario: The slash key
- **WHEN** a Player on the Dojo page presses `/` with no text field focused
- **THEN** the Find page opens with the search box focused

#### Scenario: Ctrl K
- **WHEN** a Player typing in a Practice answer box presses Ctrl K (Cmd K on a Mac)
- **THEN** the Find page opens with the search box focused

#### Scenario: Not during a round
- **WHEN** a Player in a Star round presses Ctrl K
- **THEN** the round stays open

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
The index SHALL hold every section, Play mode (Explorer, Challenger, Pro), grade, Skill, Trick, Sutra and sub-sutra, game, play experience, guide section and video in the catalogs, each with its kind, its title in the Mode's wording, a one-line description and the page it opens. The index SHALL be built in the page from the catalogs, with no index file and no request to any other server (the video catalog may load as the app's own module on first use).

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
Each entry MAY carry plain-word synonyms, and the sections SHALL: "take away" and "minus" find the subtraction Trick, "squares" finds the Trick for numbers ending in 5, "multiply" and "multiplication" find the Trick "Multiply any two numbers in one line", "leaderboard", "scores" and "race" find the Arena, "settings", "nickname", "name", "color" and "reset" find Me, "videos" finds Watch.

#### Scenario: Take away
- **WHEN** a Challenger types "take away"
- **THEN** the Trick "Subtract from 100, 1000, 10000" is among the first three results

#### Scenario: Settings
- **WHEN** a Player types "settings"
- **THEN** Me is the first result

### Requirement: A Play mode opens Me
A Play mode entry SHALL give the Mode's ages and blurb and open Me, where a Mode is picked or changed.

#### Scenario: A Play mode
- **WHEN** a Challenger types "explorer" and follows the Explorer Mode result
- **THEN** Me opens, where the Mode can be changed

### Requirement: How words are matched
A word that names a kind ("games", "tricks", "skills", "sutras", "videos", "grades") SHALL find the entries of that kind. Question and size words (such as how, does, is, what, me, for, big, work) SHALL be ignored, except when the whole query is the title of an entry. Matching SHALL ignore case and diacritics and SHALL accept a prefix of at least two letters.

#### Scenario: A title made of an ignored word
- **WHEN** a Player types "Me"
- **THEN** Me is the first result

#### Scenario: A kind word
- **WHEN** a Challenger types "games"
- **THEN** the Games section is listed and at least four games are listed under Games

### Requirement: Results are grouped and ranked
Results SHALL be grouped by kind: the Best match group first (see "Questions are answered first"), then sections, Play modes, Tricks, Skills, Sutras, games, play experiences, guide, grades, videos, at most eight per kind. Within a kind, an entry matching a larger share of the words SHALL rank above one matching fewer; at equal share, a match on the title (whole or a prefix) SHALL rank first, then on a synonym, then on a kind word, then in the description.

#### Scenario: Title first
- **WHEN** a Pro types "arena"
- **THEN** the Arena section is the first result, above guide sections that mention it

#### Scenario: Eight per kind
- **WHEN** a Challenger types "number"
- **THEN** no kind lists more than eight results

### Requirement: The group that matches more comes first
Between kinds, a group whose best entry matches a larger share of the words SHALL come first; groups with equal shares keep the order of "Results are grouped and ranked".

#### Scenario: Multiply big numbers
- **WHEN** a Challenger types "multiply big numbers"
- **THEN** the Tricks are the first group and "Multiply any two numbers in one line" is its first result

### Requirement: A share of the words is enough
An entry SHALL be listed when every word of the query matches it, or when at least half of the words match it and one of them is in its title, synonyms or kind words.

#### Scenario: One stray word
- **WHEN** a Challenger types "arena zzzz"
- **THEN** the Arena section is still the first result

### Requirement: Results are filtered to the Mode
Entries the Player's Mode cannot open SHALL NOT be listed: the Dojo section in Explorer (its menu hides it), experiences, games and videos not listed for the Mode, and guide sections the Mode does not have. The Sutras section SHALL be listed in every Mode, Explorer included, since the Sutras are in every Mode's menu. Tricks and Sutras SHALL stay listed for Explorer with their Explorer titles and Explorer meanings, as the Explorer guide explains them and their pages open for it.

#### Scenario: Explorer sees only its own experiences and games
- **WHEN** an Explorer types "spell" and then "sprint"
- **THEN** Sutra Spellbook (a Dojo experience) and Times sprint (a Challenger and Pro game) are not listed

#### Scenario: Explorer titles
- **WHEN** an Explorer types "fives"
- **THEN** the Trick is listed as "Fives squared in one breath"

### Requirement: The browse list
With nothing typed, the Find page SHALL first offer help, a link to the guide and (once a Mode is picked) Take the tour, then show the browse list: every section the Mode has, each with its one-line plain description, each zone of the menu with the places in it (Home; the Sutras and Learn; the Arcade, the Dojo, the Arena and Games; Watch; Me and the Guide). When nothing matches, the page SHALL say so and offer the browse list and the guide.

#### Scenario: Empty box
- **WHEN** a Challenger opens Find and types nothing
- **THEN** Read the guide and Take the tour come first, then Home, Sutras, Learn, Arcade, Dojo, Arena, Games, Watch, Me and Guide are listed, each with one line saying what is there

#### Scenario: The tour from Find
- **WHEN** a Challenger presses Take the tour on Find
- **THEN** Home opens with the tour's first step

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

### Requirement: Questions are answered first
When the query is a known question or phrase about the app or who it is for, or holds one with nothing else but ignored words, Find SHALL list its answers first in a group named "Best match" and SHALL NOT list them again below. A query that holds such a word among other words SHALL be searched as usual.

#### Scenario: How does it work
- **WHEN** a Challenger types "how does it work", "help" or "where do I start"
- **THEN** the first group is Best match and its first result is the Guide, followed by Getting around

#### Scenario: What is Vedic math
- **WHEN** a Challenger types "what is vedic math"
- **THEN** the Best match group lists the Sutras section and the guide section on Sutra cards first

#### Scenario: For kids
- **WHEN** a Challenger types "for kids", "children" or "my child"
- **THEN** the first group is Best match and its first result is Explorer Mode, opening Me, followed by the Play modes guide section

#### Scenario: For adults
- **WHEN** a Player types "for adults"
- **THEN** the Best match group's first result is Pro Mode

#### Scenario: Not a question about the app
- **WHEN** an Explorer types "how many dots"
- **THEN** there is no Best match group and the Skill "How many dots?" is listed
