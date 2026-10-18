# Spec Delta

## Purpose

Show genuine mathematics in Sanskrit verse, honestly framed, with pronunciation and meaning.

## ADDED Requirements

### Requirement: Verses section on the Sutras page
The Sutras page SHALL end with a section "Mathematics in Sanskrit verse" that says the Sutras are not verses and no older text contains them, and lists the verses in three subsections: From the Vedic texts, From India's great mathematicians, and Numbers hidden in words.

#### Scenario: Opening the Sutras page
- **WHEN** a Player scrolls to the end of the Sutras page
- **THEN** they see the section heading, the honest introduction and three subsections of verse cards

### Requirement: Each verse shows text, pronunciation, meaning and source
Each verse card SHALL show the Devanagari (`lang="sa"`), the IAST (`lang="sa-Latn"`), a respelling, the meaning, the math in plain words, and, on request, a word-by-word reading, the source with its dating, a note, and the references it was checked against.

#### Scenario: Āryabhaṭa's value of π
- **WHEN** a Player opens the details of Āryabhaṭa's value of π
- **THEN** they see each word with its English gloss and the source Āryabhaṭīya, Gaṇitapāda 10

### Requirement: Listen
A Listen button on each card SHALL read the verse with a Hindi or Sanskrit system voice when the device has one (reading the Devanagari), otherwise with an English voice reading the respelling. A second tap or leaving the page SHALL stop it.

#### Scenario: A device with a Hindi voice
- **WHEN** a Player taps Listen on a device with a Hindi voice
- **THEN** the Devanagari is spoken with that voice and the button shows Stop

### Requirement: Honest labels
The one verse in the 1965 book SHALL be labelled as Tirtha's own composition with its known problems, and no verse SHALL be presented as a source of the Sutras. Philosophical verses SHALL be labelled as philosophy.

#### Scenario: The gopī bhāgya verse
- **WHEN** a Player reads the gopī bhāgya card
- **THEN** it says the verse is in Tirtha's 1965 book, is not ancient, and that its last digit is wrong

### Requirement: Verses in deep dives
A Sutra deep dive SHALL show any verse with a real mathematical link to that Sutra.

#### Scenario: Yāvadūnam
- **WHEN** a Player opens the Yāvadūnam deep dive
- **THEN** it shows the Līlāvatī verse on squaring
