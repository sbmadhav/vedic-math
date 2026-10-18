# honest-framing Specification

## Purpose
Describe the origin of the sutras truthfully on every surface, so the product never claims an ancient or Vedic source that historians do not support.

## Requirements

### Requirement: Sutras are credited to the 1965 book
Every Player-facing surface that mentions where the sutras or the speed tricks come from SHALL say they are from Bharati Krishna Tirtha's 1965 book. This SHALL include the footer, ledes, page titles and any share text.

#### Scenario: Footer
- **WHEN** any page is shown
- **THEN** the footer says the speed tricks use sutras from Bharati Krishna Tirtha's 1965 book

#### Scenario: Future share text
- **WHEN** share text or a share card mentions the sutras
- **THEN** it credits Bharati Krishna Tirtha's 1965 book

### Requirement: No claim of a Vedic source
No Player-facing copy SHALL say the sutras are from the Vedas, are "traditional Vedic mathematics sutras", or call them "the Vedic sutras".

#### Scenario: Copy scan
- **WHEN** the shipped HTML and every string in the app's scripts are scanned
- **THEN** none contains "from the Vedas" (outside the history text that says they are not), "traditional Vedic mathematics sutras" or "Vedic sutras"

### Requirement: Om is labelled as atmosphere
Wherever the Chanted Om setting is offered, the system SHALL show the note "Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book." No copy SHALL present the Om, the bowl or the name clips as part of the Sutras or of the Vedas.

#### Scenario: Me page
- **WHEN** a Player opens the Me page sound settings
- **THEN** the Chanted Om switch shows the note beside it

#### Scenario: Copy scan
- **WHEN** the shipped HTML and every string in the app's scripts are scanned
- **THEN** the Om note is present and no string calls the Om or the ambience Vedic
