# Spec Delta

## ADDED Requirements

### Requirement: Progress per Sutra comes from what the device keeps
A Sutra's progress SHALL be computed on the device from the records it already keeps for the Player (each Trick's mastery, its Stars lit, its Katas done, and whether the Sutra card is collected), over the Tricks its card lists. A Sutra SHALL count as started when any of its Tricks has been practiced (it has a Skill record), any of its Stars is lit or any of its Katas is done; a collected card alone SHALL NOT start it. Nothing new SHALL be stored for it, and nothing about it SHALL be sent.

#### Scenario: Same record, same progress
- **WHEN** the unit tests compute the progress of Ekādhikena Pūrveṇa for a record with two of its nine Stars lit and Square numbers ending in 5 mastered
- **THEN** it reports 2 of 9 Stars lit and 1 of 3 Tricks mastered, and the record is unchanged

#### Scenario: Nothing sent
- **WHEN** a Player opens the Sutras page, a Deep dive and Home
- **THEN** no request carries a Sutra's progress, and localStorage is unchanged by drawing them

### Requirement: Progress is shown on each Sutra card and in its Deep dive
Each Sutra card on the Sutras page SHALL show its progress line and a meter: Explorer "n of m tricks practiced", Challenger "n of m Stars lit", Pro "n of m Stars lit · k of t Tricks mastered". A card with no Trick SHALL say there is no trick for it yet. In the Deep dive, "Try it yourself" SHALL show each Trick's Stars lit (Challenger and Pro) or whether it is practiced (Explorer).

#### Scenario: A Challenger card
- **WHEN** a Challenger Player who lit Star 1 of Square numbers ending in 5 opens the Sutras page
- **THEN** the Ekādhikena Pūrveṇa card reads "1 of 9 Stars lit"

#### Scenario: A card with no Trick
- **WHEN** a Player looks at the Pūraṇāpūraṇābhyām card
- **THEN** it says there is no trick for this one yet

### Requirement: Your sutras on Home
Challenger and Pro Home SHALL show a "Your sutras" card after the doors: the Sutra of the next Star and up to three other Sutras the Player has started, each a link to its Deep dive with its progress line, and a link to all 29 Sutras.

#### Scenario: A new Challenger
- **WHEN** a new Challenger Player opens Home
- **THEN** "Your sutras" lists the Sutra of the next Star with "0 of n Stars lit" and a link to see all 29 sutras

#### Scenario: A started Sutra is listed, a collected card alone is not
- **WHEN** a Challenger who has practiced Square numbers ending in 5 without lighting a Star, and collected the Ūrdhva-Tiryagbhyām card without practicing any of its Tricks, opens Home
- **THEN** "Your sutras" lists the Sutra of the next Star, then Ekādhikena Pūrveṇa with "0 of 9 Stars lit", and not Ūrdhva-Tiryagbhyām
