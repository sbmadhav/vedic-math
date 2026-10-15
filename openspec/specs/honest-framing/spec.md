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
