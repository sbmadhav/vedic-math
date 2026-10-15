# Spec Delta

## MODIFIED Requirements

### Requirement: Related videos match whole words
"Watch it explained" picks SHALL come from videos matched by hand to the Skill or Trick first. Only when there are none SHALL keyword matching be used, and it SHALL match whole words or tags of the Skill or Trick, never a word fragment inside another word.

#### Scenario: Percent lesson
- **WHEN** a Player opens "Discounts, tax and percent change"
- **THEN** no counting video for young children, such as Numberblocks, is linked

#### Scenario: Hand-matched picks win
- **WHEN** a Skill has one hand-matched video and its title words also match three other videos
- **THEN** only the hand-matched video is shown
