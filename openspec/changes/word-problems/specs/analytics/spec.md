# Spec Delta

## ADDED Requirements

### Requirement: Word problems are counted
The system SHALL send one anonymous `math/story/<area>/<right|miss>` event when a Word problem is finished, where `<area>` is `practice`, `run` or `star` and the result is `right` for a right answer on any try, and SHALL send `math/story/asking` when a "What is it asking?" hint is shown. No event SHALL carry the story, the Skill, a name, a number or anything the Player typed. These events SHALL follow "Events carry no identifiers".

#### Scenario: A Word problem answered after its first hint
- **WHEN** a Challenger presses Hint on a Practice Word problem and then answers it right
- **THEN** `math/story/asking` and then `math/story/practice/right` are sent, each made only of fixed words
