# Spec Delta

## MODIFIED Requirements

### Requirement: Every video plays in the page
Every video and Short SHALL play in the page's own player, in YouTube's privacy-enhanced mode. Until a Player presses play, the page SHALL show only the thumbnail served from this site and SHALL NOT create the YouTube frame or contact any YouTube host. No video, Short, playlist or channel SHALL be a link that leaves the site.

#### Scenario: Choosing a video
- **WHEN** a Player chooses a video on the Watch shelf and presses play
- **THEN** it plays in the page's player from `youtube-nocookie.com`, and the page stays open

#### Scenario: Before play
- **WHEN** a Player opens a video's player but has not pressed play
- **THEN** no frame and no request for any YouTube host exists, and the thumbnail comes from `/thumbs/`
