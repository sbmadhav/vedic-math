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
6. **Meet the bar:** under 12 minutes, for every Mode (raised from 8 minutes, and from 4 for Explorer, on 2026-10-16; openspec `video-length-12`); teaches the method correctly; from a channel with a track record; no claim that the methods come from the Vedas; no clickbait aimed at kids. Shorts meet the same bar.
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

Batch 1 (Tricks), 2026-10-15: 23 videos from the approved channels, each checked as in `openspec/changes/archive/2026-10-15-watch-shelf/HANDOFF.md`. Tricks still without a video that meets the bar: `by9s` (beyond the nines table), `duplex`, `osculator`, `zero-sum`, `add-sub` and `ratio-zero`.

Batch 2 (kindergarten to grade 5 Skills), 2026-10-17: 130 videos from the approved channels, 70 for Explorer and 60 for Challenger, 118 of them made for kids and 8 of them Shorts, each checked the same way. Every one of the 50 Skills from kindergarten to grade 5 now has two or more hand-matched videos, and every kindergarten to grade 2 Skill has two or more for Explorer (`test/videos.test.mjs` holds this). Explorer's shelf goes from 2 videos to 72.

Batch 3 (grades 6 to 8 Skills), 2026-10-17: 112 videos from the approved channels, 3 to 5 for each of the 29 grade 6 to 8 Skills, checked the same way (oEmbed 200; length, captions and made-for-kids from the watch page; embedded playback at the site's origin; captions read). No approved channel had a video that meets the bar for the six Tricks above: tecmath's squaring videos use the nearest ten, not the duplex, and the divisibility by 7 videos double and subtract instead of using the osculator.

Trick top-up, 2026-10-27: every approved channel searched again for the six Tricks above, each candidate checked the same way. One passes: tecmath's "Square ANY number up to 1000" (`HWF1y5FfGXo`, 10:19) teaches the duplex (square each digit, twice the cross product in the middle, add), so `duplex` now has a video. The other five still have none on an approved channel:
- `by9s`: the only full lesson, mindpowermath's (`SGPhyFRnxAg`), runs 13:08; MooMooMath's nines tricks stop at one- and two-digit numbers times 9.
- `osculator`: Math with Mr. J and MooMooMath teach double the last digit and subtract, a different rule; mindpowermath's divisibility lessons run 12:52 and 43:19.
- `zero-sum`, `ratio-zero`: no approved channel teaches them. Glover's equation videos are about straight lines.
- `add-sub`: tecmath's simultaneous equation tricks use cross-multiplication; mindpowermath's runs 24:34.

Videos on channels not yet approved that pass the other checks are listed for the owner in the top-up pull request: 98thPercentile (`by9s`), Bu-Math Explorations (`osculator`, for 13 only), Scholarsight (`zero-sum`) and MathsCore (`add-sub`, `ratio-zero`).

New channels, 2026-10-29 (the owner's decision on that list). The 20 channels the owner approved first are the ones batch 1 (#31) drew from; these change that list:
- **98thPercentile, approved.** Live online classes for kindergarten to grade 12; short whiteboard lessons with every product written out. Sample: `PR2SGZHOaps`.
- **MathsCore, approved video by video only.** Its Vedic Math Sutra series is uneven: the Sutra 5 video fails the bar, and so does the Sutra 7 video (below). Every other MathsCore video needs the owner's sign-off, as an unapproved channel's would.
- **Scholarsight, declined:** `i6agwNlm1l8` (for `zero-sum`) has a description that calls the method an "ancient sutra", the reason TED-Ed was dropped.
- **Bu-Math Explorations, declined:** `TxWmcjIB8uA` (for `osculator`) comes from a channel of 396 subscribers with machine-sounding narration, so no track record.

The three videos the owner approved were checked again the same way (oEmbed 200; length, captions and made-for-kids from the watch page; embedded playback at the site's origin; captions read; the worked examples read off the frames). One went in as approved, one was swapped for the same lesson from the same channel, and one was dropped:
- `ratio-zero`: MathsCore's Sutra 6 (`LmX9HeJzO_E`, 5:10) goes in for Pro. When the y numbers are in the ratio of the right-hand sides, x is 0: 2x + 4y = 8 and 3x + 8y = 16 give y = 2, and 12x + 78y = 12 and 16x + 96y = 16 give x = 1. (The practice pairs in its description are each one line written twice; the video does not use them.)
- `by9s`: 98thPercentile's `K1BRRJK2Wx4` (3:20, made for kids) ends with its outro before it puts the two parts together, so it writes 7 and 2, 75 and 24, 144 and 855 but never a product (72, 7524 or 144855). The channel's full upload of the same lesson, `PR2SGZHOaps` (4:23, not made for kids), finishes it: 99 × 76 = 7524 and 999 × 145 = 144855. That one goes in for Challenger. Its 10:00 lesson (`o0K8ej61AFk`) was left out: the narration slips (it says 99 take away 15 the wrong way round, and switches 99 and 999 mid-example) and its second half teaches a different method.
- `add-sub`: MathsCore's Sutra 7 (`OfmlkFSzxtU`, 5:46) was dropped. Its final answers are right (x = 1, y = 3; x = 6, y = 2), but its first example's slide subtracts (x + 3y) − (3x + y) and writes −2x − 2y = 4 (it is −2x + 2y = 4), then takes out −2 to get x − y = −2, which does not follow from the line above.

What the six Tricks have now: `duplex` (tecmath), `by9s` (98thPercentile, beside the nines table Short) and `ratio-zero` (MathsCore) have a lesson; `osculator`, `zero-sum` and `add-sub` still have none that meets the bar.

`hour-half-hour-song` (`MaVgBjVh4b8`) failed the daily check once on 2026-10-27 with a 10 second load timeout, not a YouTube error. On the same day oEmbed answered 200, the watch page said it plays embedded, and the live check passed 3 times in 3, so it stays.
