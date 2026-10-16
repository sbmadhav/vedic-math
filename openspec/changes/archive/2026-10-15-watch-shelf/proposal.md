# Proposal

## Why

The Watch shelf is a list of 67 outside resources in `js/resources.js` (19 videos, 4 Shorts, 4 playlists, 13 channels, 22 websites, 5 games), imported by `js/app.js` on every page load although only Watch views use it. Channels and websites open YouTube or other sites in a new tab for every Mode (`wa()`, `js/app.js:39`), the in-page player has an "Open on YouTube" link for everyone (`openPlayer()`, `:897`), and the critiques of the methods' origin show to children. Skill and Trick pages match videos by 14 keywords (`js/related.js`), so most of the 135 Skills and most Tricks have none. The owner settled the shelf in the video grilling (`docs/videos.md` decisions 4, 5 and 11 to 20); this change builds it so the first batch of about 100 videos (all Tricks) can be added as data.

## What Changes

- **A video data file** `js/videos.js` with one entry per video or Short (id, title, channel, YouTube id, duration, kind, Modes, Skills, Tricks, made for kids, captions, checked date, why) and a separate list of Pro-only links. It is loaded only by Watch views (the shelf, a Skill or Trick page's Watch section, a Sutra deep dive's Learn more, Bolt's offer in a Star) and saved for offline; videos need a connection.
- **In-page only:** every video and Short plays in the page in privacy-enhanced mode. No playlists or channels.
- **No links out for Explorer and Challenger:** no "Open on YouTube", no websites or games, no outside reading in Sutra deep dives or the history card. Pro keeps them.
- **Mode rule:** a Mode sees its own and the Mode below; Explorer only its own.
- **Made for kids first** for Explorer and Challenger.
- **Critiques for Pro only.**
- **Shorts as tiles**, one at a time, no feed, no autoplay next.
- **Filters:** the Player's Mode by default, then Skill area, Tricks, length, and videos or Shorts.
- **Hand matching:** each video lists its Skills and Tricks; Skill and Trick pages show 2 or 3 hand-matched picks; keyword matching stays only as a fallback.
- **Bolt's offer** in a Star (`star-round`) gets the real lookup: the shortest hand-matched video for the Trick visible to the Mode, made for kids first.
- **A daily live check** in Playwright that every entry still exists and plays embedded, failing the run on a deleted or unembeddable video.
- **The parent note** gets one sentence: videos come from YouTube in privacy-enhanced mode and YouTube's rules apply once one plays. Videos need no Parent step.
- **Migration of the 67 entries:** videos and Shorts with a YouTube id are re-checked and kept or dropped; each playlist becomes one passing video or goes; the 13 channels and the Shorts page link go (their names go to the channel list the owner approves next); the 14 websites for Pro or every Mode stay as Pro-only links; the 13 websites and games for Explorer or Challenger only go.

Out of scope:

- The channel list for the owner to approve (decision 8) and the batches of new videos (decisions 1, 2, 7, 9, 10): next steps after this change, as data.
- The YouTube Data API key and the candidate-finding script (decision 10): local tooling, never in the site.
- Watching earning Sparks: already removed by `sparks-replace-xp` (decision 19); the Video learner badge is unchanged.
- English only, as today.

Affected: every Player who opens the Watch shelf, a Skill or Trick page, a Sutra deep dive or the Sutras page; Explorer and Challenger Players lose all outside links; Pro Players keep them. Grown-ups reading the parent note.

## Capabilities

### New Capabilities

- `watch-shelf`: the data file and its loading, in-page playback, links by Mode, the Mode rule, made for kids first, critiques, Shorts, filters, hand matching, Bolt's video, the daily check, and the migration.

### Modified Capabilities

- `copy-accuracy`: MODIFIED "Related videos match whole words" (hand-matched first, keywords as fallback).
- `parent-note`: ADDED "The note mentions videos".

## Impact

- New `js/videos.js` (data: `VIDEOS`, `LINKS`), new `js/watch.js` (`loadVideos()`, `visibleTo(mode)`, `picksFor({ skill, trick, mode })`, `videoForTrick(trick, mode)`, `filterShelf()`, `embedSrc()`).
- Deleted: `js/resources.js`. `js/related.js` matches over `VIDEOS` titles and `why`.
- `js/app.js`: `watchView()`, `videosFor()`, `openPlayer()` (no "Open on YouTube" for Explorer and Challenger, tall Shorts), the global `[data-watch]` click handler, `sutrasView()` history links, `sutraHTML()` Learn more, `parentNote()`, `starView()` passes `findVideo`.
- `js/sutra-details.js`: reading entries that are YouTube URLs become video ids.
- `math.css`: Short tiles, filters.
- `e2e/`: new `tests/watch.spec.ts`, new `tests/videos.live.spec.ts` (daily, chromium only); `tests/progress.spec.ts` (Video learner), `tests/offline.spec.ts`, `tests/privacy.spec.ts`, `tests/routes.spec.ts`, `tests/star.spec.ts`.
- Tests: new `test/videos.test.mjs` (schema and bar), `test/watch.test.mjs`; `test/copy-accuracy.test.mjs`.
- `cloud/README.md` Privacy gains the video sentence with `parentNote()`. Nothing is sent to World boards; the in-page player already loads YouTube's privacy-enhanced embed.
- **Order:** after `sparks-replace-xp` (no +5 for videos). Independent of the Sky; plugs into `star-round`'s `findVideo` seam if that has shipped, and otherwise lands first with no Star code to touch.
