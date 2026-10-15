# Videos: decisions

Decided in the 2026-10-15 grilling; every recommended answer was accepted. Nothing here is built yet. The code changes come first as one OpenSpec change, then the videos arrive in batches.

## Where things stood

67 resources on the Watch shelf: 19 videos, 4 Shorts, 4 playlists, 13 channels, 22 websites and 5 games. 22 played in the page. 13 were about Vedic methods (4 of them critiques). Skill pages matched videos by 14 keywords, so most of the 135 Skills and most Tricks had none.

## Decisions

### What we are building toward
1. **About 400 videos and Shorts**, in batches of about 100: 2 or more per Skill, 3 to 5 per Trick, Shorts where a quick clip fits (mostly Explorer and Challenger).
2. **Batch order:** all Tricks; then kindergarten to grade 5 Skills; then grades 6 to 8; then high school and beyond. Each batch merges once its spot-check passes.
3. **English only**, as in `PLAN.md`.

### Every video must
4. **Play in the page.** Nothing sends a Player to YouTube. Existing playlists and channel links are swapped for single in-page videos.
5. **Pass a real-browser check** that it plays in the page, its length, and whether it has captions. The same check runs in the daily live tests, and a deleted or unembeddable video fails the run.
6. **Meet the bar:** under 8 minutes (under 4 for Explorer); teaches the method correctly; from a channel with a track record; no claim that the methods come from the Vedas; no clickbait aimed at kids. Shorts meet the same bar.
7. **Be checked for accuracy** by reading its captions and description and confirming the method and the worked example's answer. Trick videos and anything outside the approved channels get a full check; videos without captions only go in after a closer look, or are left out.

### Who decides
8. **The owner approves a list of channels once** (about 15 to 30, each with a reason and a sample video). Videos from approved channels are picked freely; anything else needs the owner's sign-off.
9. **Each batch's pull request lists every video** (title, channel, length, Skill or Trick, one line on why) and picks 10 at random for the owner to spot-check.
10. **Finding candidates uses a YouTube Data API key** the owner creates, kept in a git-ignored local file and never in the site. The browser check (5) still confirms each one.

### How Players see them
11. **Matched by hand:** each video lists its Skills and Tricks. Keyword matching stays only as a fallback for pages with no hand-picked video.
12. **By Mode:** each video carries the Modes it suits; a Mode sees its own and the Mode below it (Explorer only its own).
13. **Made for kids first:** Explorer and Challenger prefer videos YouTube marks "made for kids", falling back only when a Skill has none.
14. **No links out for Explorer and Challenger;** links out stay for Pro.
15. **The "is it really Vedic?" critiques stay, for Pro only.**
16. **Shorts are tiles, never a swipe feed.**
17. **The Watch shelf gets filters:** the Player's Mode by default, then Skill area, Tricks, length, and videos or Shorts. Skill and Trick pages show their own 2 or 3 picks.
18. **The list is a separate data file**, loaded only when the Watch shelf or a Watch section opens; it is saved for offline, the videos themselves need a connection.
19. **Watching earns no Sparks.** The Video learner badge (60 seconds of watching) stays.
20. **The parent note gets one sentence** that videos come from YouTube in privacy-enhanced mode and YouTube's rules apply once one plays. Videos stay available without the Parent step.
21. **Bolt can offer a Trick's video** after two misses in a Star (see `star-quest.md`).

## Next

One OpenSpec change for the shelf (data file, filters, hand matching, in-page only, Mode and made-for-kids rules, the daily check, the parent note, migrating the 67 entries), then the channel list for the owner to approve, then batch 1 (Tricks).
