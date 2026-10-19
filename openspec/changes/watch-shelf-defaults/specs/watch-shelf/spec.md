# Spec Delta

## MODIFIED Requirements

### Requirement: Shorts are tiles
Shorts SHALL be shown as tiles on their own, when the Player picks Shorts, and never mixed with videos. They SHALL play one at a time in the page's player, tall. There SHALL be no swipe feed and no automatic next Short.

#### Scenario: A Short ends
- **WHEN** a Short finishes playing
- **THEN** nothing else starts on its own

#### Scenario: Picking Shorts
- **WHEN** a Player opens the Watch shelf and then picks Shorts
- **THEN** no Short tile is shown before the pick, and only Short tiles are shown after it

### Requirement: Filters on the Watch shelf
The Watch shelf SHALL open on every Mode the Player may see ("Both" for Challenger and Pro) and on Videos, and SHALL let the Player narrow it to their own Mode and filter by Skill area, by Trick, by length (under 2 minutes, 2 to 5, 5 to 8, 8 to 12) and by Videos or Shorts (and Links for Pro), within what their Mode may see. Pro's websites and games SHALL be shown only under Links, and Links SHALL show only them.

#### Scenario: Shorts about tricks
- **WHEN** a Challenger Player picks Shorts and the Tricks filter
- **THEN** only Shorts matched to a Trick, visible to Challenger, are shown

#### Scenario: Longer videos
- **WHEN** a Player picks "8 to 12 min"
- **THEN** only videos from 8 minutes up to 12 minutes long are shown, or a note that none match

#### Scenario: Opening the shelf
- **WHEN** a Challenger Player opens the Watch shelf
- **THEN** "Both" and "Videos" are picked, videos for Challenger and Explorer are shown, and no Short is shown

#### Scenario: Pro links
- **WHEN** a Pro Player opens the Watch shelf and picks Links
- **THEN** the websites and games are shown, with no video or Short tile, and they were not shown before the pick
