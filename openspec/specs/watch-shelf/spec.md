# watch-shelf Specification

## Purpose
Show each Player short, checked videos that fit their Mode and the Skill or Trick in front of them, played inside the page, with nothing that sends a child off the site.

## Requirements

### Requirement: Videos live in their own data file
Every video and Short SHALL be one entry in a separate data file with: id, title, channel, YouTube id, duration in seconds, kind (video or short), Modes, Skills, Tricks, made for kids (yes or no), captions (yes or no), the date it was last checked, and one line on why it is there. The file SHALL be loaded only when the Watch shelf or a Watch section opens, and SHALL be saved for offline use; the videos themselves need a connection.

#### Scenario: Home does not load the list
- **WHEN** a Player opens home and plays a game without opening anything to watch
- **THEN** the video list is not requested

#### Scenario: Offline
- **WHEN** a Player who visited once opens the Watch shelf offline
- **THEN** the shelf lists its videos and says they need a connection to play

### Requirement: Every video plays in the page
Every video and Short SHALL play in the page's own player, in YouTube's privacy-enhanced mode. No video, Short, playlist or channel SHALL be a link that leaves the site.

#### Scenario: Choosing a video
- **WHEN** a Player chooses a video on the Watch shelf
- **THEN** it plays in the page's player from `youtube-nocookie.com`, and the page stays open

### Requirement: No links out for Explorer and Challenger
Explorer and Challenger Players SHALL see no link that leaves the site anywhere a video or reading is offered: no "Open on YouTube", no websites or games, no outside reading in a Sutra's deep dive or the history card. Pro Players SHALL keep "Open on YouTube" and the shelf's websites and games, which open in a new tab.

#### Scenario: Challenger player
- **WHEN** a Challenger Player opens a video
- **THEN** the player has no "Open on YouTube" link

#### Scenario: Pro shelf
- **WHEN** a Pro Player opens the Watch shelf
- **THEN** it also lists websites and games, marked as opening a new tab

### Requirement: Each Mode sees its own and the Mode below
A Player SHALL see videos marked for their own Mode and for the Mode below it: Pro sees Pro and Challenger, Challenger sees Challenger and Explorer, Explorer sees only Explorer.

#### Scenario: Explorer
- **WHEN** an Explorer Player opens the Watch shelf
- **THEN** every video shown is marked for Explorer

#### Scenario: Pro
- **WHEN** a Pro Player opens the Watch shelf
- **THEN** it shows videos marked for Pro or Challenger and none marked only for Explorer

### Requirement: Made for kids first
For Explorer and Challenger, videos YouTube marks "made for kids" SHALL come before others in every list, and a Skill or Trick's picks SHALL use only made-for-kids videos when it has any.

#### Scenario: A Trick with both kinds
- **WHEN** a Challenger Player opens a Trick that has one made-for-kids video and two others
- **THEN** its picks show only the made-for-kids video

### Requirement: Critiques are for Pro only
Entries that question whether the methods are Vedic SHALL be shown to Pro Players only.

#### Scenario: Challenger on the Sutras page
- **WHEN** a Challenger Player opens the Sutras page
- **THEN** no critique of the methods' origin is listed

### Requirement: Shorts are tiles
Shorts SHALL be shown as tiles among the other entries and SHALL play one at a time in the page's player, tall. There SHALL be no swipe feed and no automatic next Short.

#### Scenario: A Short ends
- **WHEN** a Short finishes playing
- **THEN** nothing else starts on its own

### Requirement: Filters on the Watch shelf
The Watch shelf SHALL open filtered to the Player's Mode and SHALL let the Player filter by Skill area, by Trick, by length (under 2 minutes, 2 to 5, 5 to 8, 8 to 12) and by videos or Shorts, within what their Mode may see.

#### Scenario: Shorts about tricks
- **WHEN** a Challenger Player picks Shorts and the Tricks filter
- **THEN** only Shorts matched to a Trick, visible to Challenger, are shown

#### Scenario: Longer videos
- **WHEN** a Player picks "8 to 12 min"
- **THEN** only videos from 8 minutes up to 12 minutes long are shown, or a note that none match

### Requirement: Hand-picked videos first, keywords as a fallback
A Skill or Trick page SHALL show 2 or 3 videos matched by hand to that Skill or Trick, by the rules above. Only when it has no hand-matched video visible to the Player SHALL it fall back to whole-word keyword matching, and it SHALL show nothing when neither finds one.

#### Scenario: Hand-matched Trick
- **WHEN** a Pro Player opens Square numbers ending in 5, which has three hand-matched videos
- **THEN** those videos are shown and no keyword match is added

#### Scenario: No hand match
- **WHEN** a Player opens a Skill with no hand-matched video
- **THEN** keyword matches visible to their Mode are shown, or no Watch section at all

### Requirement: The video Bolt offers in a Star
When a Star round offers a video after two misses, it SHALL be a video hand-matched to that Trick and visible to the Player's Mode, made for kids first for Challenger, shortest first. Keyword matches SHALL NOT be offered.

#### Scenario: A Trick with a hand-matched video
- **WHEN** a Challenger Player misses twice in a Star for Square numbers ending in 5
- **THEN** Bolt offers its shortest made-for-kids hand-matched video, which plays in the page

### Requirement: A daily check that every video still plays
The daily live tests SHALL check every entry in the data file in a real browser: that the video still exists and plays in an embedded, privacy-enhanced player. A deleted, private or unembeddable video SHALL fail the run and name the entry.

#### Scenario: A video is removed from YouTube
- **WHEN** the daily run checks an entry whose video was deleted
- **THEN** the run fails and its report names that entry's id and title

### Requirement: The existing shelf is migrated
The 67 existing entries SHALL be migrated: videos and Shorts with a YouTube id stay if they pass the checks (under 8 minutes, under 4 for Explorer, play in the page, correct method); each playlist becomes one passing video from it or goes; channel links and the Shorts page link go; websites and games for Pro or every Mode stay as Pro-only links; websites and games for Explorer or Challenger only go.

#### Scenario: A playlist
- **WHEN** the shelf is migrated
- **THEN** no entry links to a playlist or a channel

#### Scenario: A kids' games site
- **WHEN** the shelf is migrated
- **THEN** sites marked for Explorer or Challenger only, such as PBS KIDS Math Games, are no longer listed

### Requirement: Every video meets the length bar
Every video and Short on the Watch shelf SHALL be under 12 minutes long, for every Mode, Explorer included.

#### Scenario: A long video
- **WHEN** an entry of 12 minutes or more is added to the data file
- **THEN** the node tests fail and name it

#### Scenario: Explorer
- **WHEN** an Explorer Player opens the Watch shelf
- **THEN** it may list videos up to 12 minutes long, made for kids and shortest first as before
