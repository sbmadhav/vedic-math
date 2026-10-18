# Spec Delta

## ADDED Requirements

### Requirement: Guide and tour counts
Opening the guide SHALL be counted as a route view, `math/view/guide`, or `math/view/guide/section` when opened at a section, without the section's name. The tour SHALL send `math/tour/start` when it opens, and then exactly one of `math/tour/finish` (Done on the last step) or `math/tour/skip` (Skip tour, Escape, or leaving Home while it is open). These events SHALL follow "Events carry no identifiers".

#### Scenario: Guide at a section
- **WHEN** a Player opens `#/guide/katas`
- **THEN** one `math/view/guide/section` event is sent

#### Scenario: Tour finished
- **WHEN** a Player goes through every step of the tour and presses Done
- **THEN** `math/tour/start` and `math/tour/finish` are each sent once, and no `math/tour/skip`

#### Scenario: Tour skipped with Escape
- **WHEN** a Player presses Escape on the second step
- **THEN** `math/tour/start` and `math/tour/skip` are each sent once
