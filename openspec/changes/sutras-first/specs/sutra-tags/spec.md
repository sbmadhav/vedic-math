# Spec Delta

## ADDED Requirements

### Requirement: A Sutra tag names the Sutra and what it means
A Sutra tag SHALL show the IAST name of the Sutra or sub-sutra a method uses (marked `lang="sa-Latn"`), its one-line meaning in the Player's Mode (Explorer: the Sutra's Explorer meaning; Challenger and Pro: the meaning on its Sutra card), and a word for how the method relates to it. Where the tag is not inside another link or button it SHALL be one link to that Sutra's Deep dive (`#/sutras/<id>`), whose accessible name holds the kind word, the name, the meaning and "open its deep dive".

#### Scenario: A Trick page in Challenger
- **WHEN** a Challenger Player opens the Trick page for Square numbers ending in 5
- **THEN** a tag reads "Sutra", "Ekādhikena Pūrveṇa" and "By one more than the one before", with Say it, and it links to `#/sutras/s1`

#### Scenario: Explorer words
- **WHEN** an Explorer Player opens the same Trick page
- **THEN** the tag's meaning reads "One more than the number before"

### Requirement: Tags where a Trick is learned
A Sutra tag SHALL be shown on every Trick page, in each Trick's cell in the Dojo, on the Katas list, and on each Kata under its heading and on its result.

#### Scenario: A Kata
- **WHEN** a Player opens Kata 1 of Subtract from 100, 1000, 10000
- **THEN** a tag for Nikhilaṃ Navataścaramaṃ Daśataḥ with its meaning is shown under the heading

#### Scenario: The Dojo
- **WHEN** a Challenger Player opens the Dojo
- **THEN** each of the 21 Trick cells has a tag link to its Sutra's Deep dive

### Requirement: Tags in a Star round
A Star round SHALL show its Trick's Sutra tag under its title, on Try a trick's worked example, in the replay after a miss, and on the end screen. The tag under the title SHALL be text, not a link, so no tap leaves a round by mistake; the worked example's and the end screen's tags SHALL be links.

#### Scenario: A Star names its Sutra
- **WHEN** a Challenger Player opens Star 1 of Multiply by 11 and misses the first question
- **THEN** the round's header shows the tag "A special case of Ūrdhva-Tiryagbhyām" with its meaning, as text, and the replay names Ūrdhva-Tiryagbhyām

#### Scenario: The end screen links
- **WHEN** that Player finishes the round
- **THEN** the end screen shows the tag as a link to `#/sutras/s3`

### Requirement: Tags on Arena results, Watch and games
The result of an Arena daily or Practice round SHALL list "Sutras in this round": a tag for each Sutra that answered at least one of its questions, with how many of those were right. A Watch card of a video matched to a Trick SHALL name its Sutra, and the player for it SHALL show its tag as a link. A game that teaches a Sutra's method SHALL show its tag on its page and name the Sutra on its card in the games list.

#### Scenario: The Arena round review
- **WHEN** a Pro Player finishes an Arena Practice round in which they answered near-base products
- **THEN** the result lists "Sutras in this round" with Nikhilaṃ Navataścaramaṃ Daśataḥ and how many of its questions were right, and lists no Sutra for percents or divisions

#### Scenario: Watch
- **WHEN** a Challenger Player opens the player for a video matched to Square numbers ending in 5
- **THEN** the player shows the Ekādhikena Pūrveṇa tag as a link, and the video's card names Ekādhikena Pūrveṇa

#### Scenario: A game
- **WHEN** a Challenger Player opens the Answer checker game
- **THEN** its page shows "Uses the idea of Guṇitasamuccayaḥ" with its meaning

### Requirement: Every Trick maps to one Sutra and one relation
Each of the 21 Tricks SHALL map to one Sutra or sub-sutra and one relation: the Sutra itself, a sub-sutra, a special case of the Sutra, or a method that uses the Sutra's idea. Multiply by 11, Divide by 9 and Square any two-digit number SHALL be special cases; Check answers with digit sums and Multiply by 5, 25, 50 and 125 SHALL use the idea.

#### Scenario: Every Trick is mapped
- **WHEN** the unit tests check the map
- **THEN** every Trick has one Sutra card id and one of the four relations, its id is listed in that card's Tricks, and no relation is "sutra" for the five Tricks named above

### Requirement: Honest notes, and no stretched tags
For Pro, the tag on the Trick page of a special case or a borrowed idea SHALL say why in one line (for digit sums: the check is much older than the 1965 book). No tag SHALL name a Sutra for a question that no Sutra answers in a line, such as Arena percents and divisions or a school Skill.

#### Scenario: Digit sums
- **WHEN** a Pro Player opens the Trick page for Check answers with digit sums
- **THEN** the tag reads "Uses the idea of Guṇitasamuccayaḥ" and its note says the digit sum check, casting out nines, is much older than the 1965 book

### Requirement: One tap to the Deep dive and one back
Following a Sutra tag SHALL open that Sutra's Deep dive. When it was followed from another page of the app, closing the Deep dive SHALL return to that page; when the Deep dive was opened from outside the app, closing it SHALL show the Sutras page, as before.

#### Scenario: From a Trick and back
- **WHEN** a Challenger Player on the Trick page for Square numbers ending in 5 follows its tag and then closes the Deep dive
- **THEN** the Deep dive of Ekādhikena Pūrveṇa opened, and closing it shows the Trick page again

### Requirement: Tags are not spoken
No Sutra tag, progress line or Sutra card on Home SHALL be read aloud by Read aloud or a Listen button. Say it in a tag SHALL play only the Name clip already recorded for that Sutra, and only after a tap.

#### Scenario: Read aloud on
- **WHEN** an Explorer Player with Read aloud on opens a Trick page and its first question is read
- **THEN** nothing from the tag is spoken

### Requirement: Tags work on a phone in both schemes
Tags SHALL use design tokens only, wrap without sideways scrolling at 320 px, and pass axe with no serious or critical violation in Daybreak and Deep Space.

#### Scenario: A 320 px phone
- **WHEN** a Player opens a Trick page, a Kata and the Dojo at 320 px in Daybreak and in Deep Space
- **THEN** no page scrolls sideways and axe finds no serious or critical violation in the tags
