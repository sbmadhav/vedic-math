# Spec Delta

## MODIFIED Requirements

### Requirement: The index holds every named thing
The index SHALL hold every section, Play mode (Explorer, Challenger, Pro), grade, Skill, Trick, Sutra and sub-sutra, game, play experience, guide section and video in the catalogs, each with its kind, its title in the Mode's wording, a one-line description and the page it opens. A Play mode entry SHALL give the Mode's ages and blurb and open Me, where a Mode is picked or changed. The index SHALL be built in the page from the catalogs, with no index file and no request to any other server (the video catalog may load as the app's own module on first use).

#### Scenario: A Skill by name
- **WHEN** a Challenger types "fractions"
- **THEN** Skills whose title or description mentions fractions are listed, each opening `#/skill/<id>`

#### Scenario: A Sutra in plain letters
- **WHEN** a Player types "urdhva"
- **THEN** Ūrdhva-Tiryagbhyām is listed under Sutras, opening its deep dive

#### Scenario: A video
- **WHEN** a Player types the title of a video and follows the result
- **THEN** the video player opens in place with that video

#### Scenario: A Play mode
- **WHEN** a Challenger types "explorer" and follows the Explorer Mode result
- **THEN** Me opens, where the Mode can be changed

### Requirement: Plain words find things too
Each entry MAY carry plain-word synonyms, and the sections SHALL: "take away" and "minus" find the subtraction Trick, "squares" finds the Trick for numbers ending in 5, "multiply" and "multiplication" find the Trick "Multiply any two numbers in one line", "leaderboard", "scores" and "race" find the Arena, "settings", "nickname", "name", "color" and "reset" find Me, "videos" finds Watch. A word that names a kind ("games", "tricks", "skills", "sutras", "videos", "grades") SHALL find the entries of that kind. Question and size words (such as how, does, is, what, for, big, work) SHALL be ignored. Matching SHALL ignore case and diacritics and SHALL accept a prefix of at least two letters.

#### Scenario: Take away
- **WHEN** a Challenger types "take away"
- **THEN** the Trick "Subtract from 100, 1000, 10000" is among the first three results

#### Scenario: Settings
- **WHEN** a Player types "settings"
- **THEN** Me is the first result

#### Scenario: Multiply big numbers
- **WHEN** a Challenger types "multiply big numbers"
- **THEN** the Tricks are the first group and "Multiply any two numbers in one line" is its first result

#### Scenario: A kind word
- **WHEN** a Challenger types "games"
- **THEN** the Games section is listed and at least four games are listed under Games

### Requirement: Results are grouped and ranked
Results SHALL be grouped by kind: the Best match group first (see "Questions are answered first"), then sections, Play modes, Tricks, Skills, Sutras, games, play experiences, guide, grades, videos, at most eight per kind. An entry SHALL be listed when every word of the query matches it, or when at least half of the words match it and one of them is in its title, synonyms or kind words. Within a kind, an entry matching a larger share of the words SHALL rank above one matching fewer; at equal share, a match on the title SHALL rank above a match on a synonym, which SHALL rank above a match on a kind word, which SHALL rank above a match in the description. Between kinds, a group whose best entry matches a larger share of the words SHALL come first; groups with equal shares keep the order above.

#### Scenario: Title first
- **WHEN** a Pro types "arena"
- **THEN** the Arena section is the first result, above guide sections that mention it

#### Scenario: Eight per kind
- **WHEN** a Challenger types "number"
- **THEN** no kind lists more than eight results

#### Scenario: One stray word
- **WHEN** a Challenger types "arena zzzz"
- **THEN** the Arena section is still the first result

## ADDED Requirements

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
