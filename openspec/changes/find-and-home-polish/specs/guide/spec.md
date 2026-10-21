# Spec Delta

## MODIFIED Requirements

### Requirement: The guide is easy to find
The menu bar SHALL have a Guide link in every Mode, and the footer SHALL link to the guide. Home SHALL show a short "New here?" note with one control, "Quick tour", that starts the tour (whose last step points at the Guide link in the menu bar), while the Player has not played on an earlier day. The note SHALL have a solid background so the background drawing never shows through its words. The mode picker SHALL link to the guide.

#### Scenario: Menu bar
- **WHEN** an Explorer Player looks at the menu bar
- **THEN** a Guide link is there, and on the guide it is marked as the current page

#### Scenario: New here
- **WHEN** a new Challenger Player opens Home and presses Quick tour in the "New here?" note
- **THEN** the note has exactly one control, and the tour's first step opens
