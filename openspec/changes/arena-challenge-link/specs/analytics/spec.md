# Spec Delta

## ADDED Requirements

### Requirement: Challenge links are counted without identifiers
Tapping Challenge a friend (or Send to family) on an Arena result SHALL send one `math/share_click/result`, whether the share sheet opened, the text was copied or the Player cancelled. Opening a challenge link SHALL be the route view `math/view/arena/day`, with no date, League or Score in its path or title. No request the page makes SHALL contain the challenge link's fragment. These follow "Events carry no identifiers".

#### Scenario: The button
- **WHEN** a Player taps Challenge a friend on a daily result
- **THEN** exactly one `math/share_click/result` is sent

#### Scenario: Opening a link
- **WHEN** a Player opens `#/arena/day/2026-10-30/challenger/240`
- **THEN** the route view sent is `math/view/arena/day`, and no request URL, path, title or body contains "2026-10-30", "challenger/240" or "240"
