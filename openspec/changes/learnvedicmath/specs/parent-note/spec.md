# Spec Delta

## MODIFIED Requirements

### Requirement: The note states consent, identity and keeping
The parent note SHALL state that nothing is posted before the Age answer, that nothing is ever posted for a Player whose Age answer is under 13, and that no identity exists until the first post. It SHALL list the fields an entry holds, say that each entry stops being shown 30 days after its last update and is then deleted by an automatic clean-up that usually finishes within a few days, and say how to ask for earlier removal (`privacy@learnvedicmath.com`, with the Nickname, color and date).

#### Scenario: Note for an under-13 Player without the Parent step
- **WHEN** a grown-up opens the note for a Player whose Age answer is under 13
- **THEN** it says nothing is posted for this Player and their Scores stay on this device's board, and it offers no way to turn World boards on

#### Scenario: Keeping
- **WHEN** a grown-up reads the note
- **THEN** it says entries stop being shown after 30 days and are deleted automatically soon after, and names `privacy@learnvedicmath.com` for removal requests

### Requirement: The note mentions videos
The parent note SHALL say, in one sentence, that video pictures come from this site, that a video loads from YouTube in privacy-enhanced mode only after a Player presses play, and that YouTube's own rules apply once it plays. Videos SHALL stay available to every Player.

#### Scenario: Grown-up reads the note
- **WHEN** a grown-up opens the parent note in any Mode
- **THEN** it says nothing reaches YouTube until a video is played, and YouTube's rules apply once it plays

#### Scenario: Under 13 without the Parent step
- **WHEN** a Player whose Age answer is under 13 opens a video and presses play
- **THEN** it plays

## ADDED Requirements

### Requirement: The note links the privacy policy
The parent note SHALL end with a link to `/privacy/` and to `/parents/`, and its wording SHALL agree with the published privacy policy about what is sent, to whom, and for how long it is kept.

#### Scenario: Grown-up wants more detail
- **WHEN** a grown-up reaches the end of the parent note
- **THEN** it links to the privacy policy and the page for parents, both on this site
