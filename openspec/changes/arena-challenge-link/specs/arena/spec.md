# Spec Delta

## ADDED Requirements

### Requirement: Challenge a friend from the daily result
The result of an Arena daily challenge round SHALL offer a "Challenge a friend" button ("Send to family" in Explorer), in every Mode and for every Player, under 13 included. It SHALL open the device's share sheet with the share text and the challenge link, or, without a share sheet, copy them and say "Copied. Paste it anywhere." Practice, untimed Practice and Word problem rounds SHALL NOT show the button. Tapping it SHALL send nothing to any Board.

#### Scenario: Sharing a daily result
- **WHEN** a Challenger Player finishes the daily challenge on 2026-10-30 with Score 240 and taps Challenge a friend on a device with a share sheet
- **THEN** the share sheet opens with the share text and the link `https://learnvedicmath.com/play/#/arena/day/2026-10-30/challenger/240`

#### Scenario: No share sheet
- **WHEN** the device has no share sheet and the Player taps Challenge a friend
- **THEN** the text and link are copied to the clipboard and "Copied. Paste it anywhere." is shown

#### Scenario: Practice has no button
- **WHEN** a Player finishes a Practice, untimed Practice or Word problem round
- **THEN** the result shows no Challenge a friend button

#### Scenario: Explorer
- **WHEN** an Explorer Player finishes the daily challenge
- **THEN** the button reads "Send to family"

#### Scenario: Under-13 Player
- **WHEN** a Player whose Age answer is under 13 taps the button
- **THEN** the share sheet opens as for any Player, no request goes to Firebase, and nothing is posted to a World board

### Requirement: The share text says what the round was and nothing personal
The share text SHALL name the site, the Arena daily challenge, the League, the local date as `YYYY-MM-DD`, the Score, the right and missed counts and the best combo, and invite the reader to beat it with no sign-in. It SHALL NOT contain a Nickname, avatar, Player id, Age answer, Rating, emoji, em dash, or any Sutra or Trick name.

#### Scenario: The words
- **WHEN** a Challenger Player finishes the daily challenge on 2026-10-30 with Score 240, 14 right, 2 missed and a best combo of 9
- **THEN** the text reads "Arena daily challenge", "Challenger League", "2026-10-30", "Score 240", "14 right", "2 missed" and "best combo 9x"

#### Scenario: Nothing personal in the text
- **WHEN** the share text of any daily result is built
- **THEN** it contains no Nickname, avatar, Player id, Age answer, Rating, emoji or em dash, and no Sutra or Trick name

### Requirement: A challenge link on its day and League is the daily challenge
A challenge link, `#/arena/day/<YYYY-MM-DD>/<league>` or `#/arena/day/<YYYY-MM-DD>/<league>/<score>`, for the Player's local today and League SHALL open the lobby with Daily challenge picked, Calm included, and the line "A friend's challenge: Score <score> to beat", or "A friend's challenge" with no Score part. Start SHALL play that day's daily round, Ranked as every daily round is, only if the date and League still match when Start is tapped.

#### Scenario: Same day, same League
- **WHEN** a Challenger Player opens `#/arena/day/2026-10-30/challenger/240` on 2026-10-30 and taps Start
- **THEN** the round deals the same questions in the same order as the sharer's daily round, the lobby showed "Score 240 to beat", and the Score posts as any daily challenge does

#### Scenario: Midnight
- **WHEN** a Challenger Player opens today's Challenger challenge link at 23:58 and taps Start after midnight
- **THEN** the round plays the link's questions as Practice and its Score is sent to no World board

### Requirement: A challenge link survives the Mode picker
On a device with no Mode, a challenge link SHALL show the Mode picker first and then open the friend's challenge, never Home.

#### Scenario: No Mode yet
- **WHEN** a new visitor opens `#/arena/day/2026-10-30/challenger` on 2026-10-30, with no Score part
- **THEN** the Mode picker is shown first, and after a Mode is picked the Arena opens with the friend's challenge reading "A friend's challenge" with no number, not Home

### Requirement: A challenge link on another day or League is Practice
A challenge link whose date is not the Player's local today, or whose League is not the Player's, SHALL offer the friend's round as Practice, dealing `dailySet(league, day)` for the link's League and date and saying it is not on the Boards, with today's daily challenge offered beside it. That Practice round's Score SHALL never leave the device; its Sparks count as any Practice's do.

#### Scenario: Another League
- **WHEN** a Pro Player opens a Challenger challenge link for today
- **THEN** the lobby offers the friend's round as Practice with the Challenger questions, says it is not on the Boards, and offers today's Pro daily challenge beside it

#### Scenario: Another day
- **WHEN** a Player opens a challenge link dated yesterday and plays the friend's round
- **THEN** its Score is sent to no World Score board

### Requirement: A challenge link is checked and never starts by itself
A Score part that is not a whole number from 0 to 9999 SHALL be ignored, and the line SHALL read "A friend's challenge" with no number. A link whose date or League does not parse SHALL open the Arena as `#/arena` does. No countdown or round SHALL start from a challenge link without a tap on Start.

#### Scenario: A broken link
- **WHEN** a Player opens `#/arena/day/yesterday/wizard/lots`
- **THEN** the Arena lobby opens as `#/arena` does, with no friend's line

#### Scenario: A bad Score
- **WHEN** a Player opens a valid link for today whose Score part is `99999`
- **THEN** the lobby reads "A friend's challenge" with no Score

#### Scenario: No autoplay
- **WHEN** a challenge link opens
- **THEN** no countdown or round starts until the Player taps Start
