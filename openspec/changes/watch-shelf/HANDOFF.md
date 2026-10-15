# Handoff: watch-shelf (paused for a machine reboot)

## State

- Branch `watch-shelf`, worktree `/Users/sbmadhav/Documents/codebase/wt-watch-shelf`, based on origin/main `d74c21a`.
- Hook enabled (`git config core.hooksPath .githooks`). No PR opened.
- Work done so far: setup and reading only (CLAUDE.md, GLOSSARY.md, docs/videos.md, the change's proposal, design, tasks and spec deltas, js/resources.js, js/related.js, the Watch, Sutras, parentNote and player code in js/app.js, test/copy-accuracy.test.mjs, test/lifecycle-scan.test.mjs). No code is written yet.
- Not yet read: the archived sparks-replace-xp change, openspec/specs/copy-accuracy and parent-note, e2e/tests/fixtures.ts, progress/offline/privacy/routes specs, .github/workflows/e2e.yml, the channel research at `/private/tmp/claude-502/-Users-sbmadhav-Documents-codebase-sbmadhav-github-io/f68a333b-0c60-47bf-ab4d-57df98374296/scratchpad/video-channels.md` (scratchpad, may not survive the reboot), and the star-round worktree (`../wt-star-round`) for a `findVideo` seam.

## Tasks

- Done: none.
- In progress: none.
- Not started: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1 to 3.4, 4.1 to 4.3, 5.1, 6.1.

## Migration table (planned, NOT yet verified: no oEmbed or browser checks run)

Counts in js/resources.js: 19 videos with `yt`, 3 Shorts with `yt`, 1 Shorts page link, 4 playlists, 13 channels, 22 websites, 5 games (67).

- Videos with `yt` (19), each still to check (oEmbed 200, real browser, under 8 min, under 4 for Explorer, method correct): 7XKfnXRcU0c Numberblocks Learn from the Beginning; JxaXmTokjqI Count to 100 Silly Song; ZIniljT5lJI Song of the Count; K2iUnDgfMsQ Count to 20 (KA Kids); _bhvIuVDp7w tecmath easy multiplication; SEupqNi2Rh8 tecmath under twenty; s4w5qyBxs48 tecmath square up to 100; FJ5qLWP3Fqo Math Antics multi-digit; c8hyYXepGvI 9 times finger trick; HJ_PP5rqLg0 Russian multiplication (Numberphile); bL5eUQIMaek multiply by lines; EAyI-yiXaek Eddie Woo expand; qhbuKbxJsk8 Mathologer times tables Mandelbrot (likely over 8 min, drop); T_LjhJKuFKw Mathologer finger multiplication (likely over 8 min, drop); kvLjpQ0XGao tecmath Vedic crosswise; f0W32SwhAwM Nikhilam beginners; L9ofWNzHECQ Nikhilam vinculums; oV7Kxm3Zr_c square ending in 5.
- Dropped by owner instruction: grkWGeqW99c "The magic of Vedic math" (TED-Ed, calls the methods ancient); Vedic Maths Forum India channel and website.
- Shorts with `yt` (3), to check: cxoWrDEUqtw square ending in 5; 9pVR7fKau_U multiplication; Sw-pRuuV1us 11 times.
- Playlists (4): tecmath mental multiplication, tecmath addition and subtraction, 3Blue1Brown calculus, 3Blue1Brown linear algebra: find one passing single video from the same channel each (3Blue1Brown chapters usually exceed 8 minutes, so likely dropped) or drop.
- Channels (13) and Numberblocks Shorts page: drop; list names in the PR as channel-list candidates.
- To LINKS, Pro only (13): Polypad, Khan Academy Algebra, Khan Academy Geometry, Desmos, AoPS Alcumus, NRICH Secondary, Brilliant, Project Euler, VedicMaths.org, Bharati Krishna Tirtha (Wikipedia), Vedic Mathematics (Wikipedia, critique), arXiv paper (critique), The News Minute (critique).
- Drop (13 Explorer or Challenger sites and games): Blocks Universe, Khan Academy Kids, PBS KIDS Math Games, Peg + Cat, Toy Theater, Khan Academy Arithmetic, Tang Math, Math Playground, NRICH Primary, Prodigy, Math is Fun, AoPS videos, Feel the Math Magic.

Finding: three URLs in js/resources.js look broken by an earlier rename of `/math/` to `/vedic-math/`: `khanacademy.org/vedic-math/algebra`, `khanacademy.org/vedic-math/geometry` (should be `/math/...`) and `arxiv.org/abs/vedic-math/0611347` (should be `arxiv.org/abs/math/0611347`). Fix them when moving to LINKS, and check each URL.

## Tests

Nothing changed, so the existing suites are as on main. No new tests yet.

## Decisions so far

None beyond the owner's instructions above.

## Resume

```
cd /Users/sbmadhav/Documents/codebase/wt-watch-shelf
git fetch && git rebase origin/main
node --test 'test/**/*.test.{js,mjs}'
```
Then start at task 1.1 in tasks.md.
