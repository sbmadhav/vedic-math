# Spec Delta

## ADDED Requirements

### Requirement: Decoration never flashes or hides content
No decoration SHALL flash more than three times in any one second, a celebration SHALL last at most 2 seconds, and no decoration SHALL cover a control's hit area or lower the contrast of text below the WCAG AA level.

#### Scenario: Belt celebration
- **WHEN** a Player earns a Belt and the burst plays
- **THEN** it ends within 2 seconds with no more than three flashes in any second, and every button on the screen can still be tapped while it plays
