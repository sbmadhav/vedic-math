# Design

## Context

- `js/resources.js` exports `RESOURCES` (67 entries: `title`, `url`, `type` channel|video|short|playlist|website|game, `vedic`, `tags`, `desc`, `mode` explorer|challenger|pro|all, `yt` for 22 of them). `js/app.js` imports it statically (line 10), so it is in every first load.
- Uses: `watchView()` (`js/app.js:864`, filters mine, vedic, short, video, channel, site, all), `videosFor()` (`:262`, keyword match through `relatedTo()` in `js/related.js`), the Sutras history card (`:555`, `vedic` and `history` websites), `sutraHTML()` Learn more (`:571`, `DETAILS[name].read` pairs, 4 of them YouTube URLs, the rest Wikipedia), and the global `click` handler on `a[data-watch]` (`:886`) that opens `openPlayer()` for embeddable entries and lets the rest open a new tab.
- `openPlayer()` (`:893`) builds a `dialog.vm-player` with a `youtube-nocookie.com/embed/<id>` iframe (or `videoseries?list=` for playlists), an "Open on YouTube" link for everyone, and the 60-second Video learner timer.
- `build.py` pins and precaches every `js/*.js` module, and dynamic `import()` resolves through the import map, so a new module is saved for offline with no build change.
- `star-round` gives `runStar()` a `findVideo(trick, mode)` option, `async () => null` until this change.
- E2E: the suite runs daily (`.github/workflows/e2e.yml`); `e2e/tests/fixtures.ts` blocks Firestore writes and answers GoatCounter locally; `chromiumOnly(testInfo)` exists.

## Goals / Non-Goals

**Goals:**
- A data shape that 400 videos can be added to in batches without code changes.
- No path from an Explorer or Challenger screen to another site.
- A daily signal when a video breaks.

**Non-Goals:**
- Finding or approving videos (tooling and owner steps after this change).

## Decisions

**1. The data file is an ES module, `js/videos.js`.**
`export const VIDEOS = [{ id, title, channel, yt, duration, kind, modes, skills, tricks, madeForKids, captions, checked, why, critique? }]` and `export const LINKS = [{ id, title, url, kind: 'site' | 'game', skills, tricks, critique?, checked, why }]` (all Pro-only, so no `modes`). `critique: true` marks entries that question the "Vedic" origin; it is optional and only allowed on Pro entries.
- An ES module is pinned with a `?v=` hash and precached by `build.py` like every module, so "saved for offline" needs no build change, and a stale copy can never mix with new code. Loaded with `import('./videos.js')` from `js/watch.js` (`loadVideos()` caches the promise), never statically, so first loads do not carry it.
- Rejected: `videos.json` fetched at runtime. It would need its own precache entry and hash in `build.py`, and JSON has no comments for the reviewer notes batches will want.

**2. `js/watch.js` holds every rule, as pure functions over the data.**
- `MODE_SEES = { explorer: ['explorer'], challenger: ['challenger', 'explorer'], pro: ['pro', 'challenger'] }`; `visibleTo(v, mode)` also drops `critique` unless Pro.
- `order(list, mode)`: for Explorer and Challenger, made-for-kids first; then shortest first.
- `picksFor({ skill, trick, mode }, n = 3)`: hand-matched (`v.skills.includes(skill)` or `v.tricks.includes(trick)`) and visible, ordered; for Explorer and Challenger, only made-for-kids ones if any exist; then 2 or 3 of them; if none, `relatedTo(words, visible)` (keyword fallback); else `[]`.
- `videoForTrick(trick, mode)`: hand-matched to the Trick only, visible, ordered; first or `null`. This is the `findVideo` passed to `runStar()`, wrapped to return `null` offline (`navigator.onLine === false`) or when the import fails.
- `filterShelf(list, { mode, strand, tricks, length, kind })`: `strand` via `byId[skill].strand`; `tricks` true keeps entries with any Trick; `length` buckets `< 120`, `120 to 300`, `300 to 480` seconds; `kind` video or short (or `link` for Pro).
- `embedSrc(v)`: `https://www.youtube-nocookie.com/embed/<yt>?autoplay=1&rel=0&modestbranding=1&playsinline=1`. With `rel=0`, YouTube shows related videos only from the same channel at the end; Shorts and videos never chain into a feed because the player is closed and rebuilt per choice.

**3. Links out by Mode.** One helper, `linksOut()` = `fx.mode() === 'pro'`, decides every outside link:
- `openPlayer()` hides `.vp-yt` unless Pro; Shorts open the player with the `tall` class.
- The shelf lists `LINKS` (marked "Opens in a new tab") only for Pro.
- The Sutras history card's "Read more" line and Wikipedia entries in a deep dive's Learn more render only for Pro; YouTube entries in `DETAILS[name].read` are rewritten as video ids (`['Nikhilam multiplication for beginners', { yt: 'f0W32SwhAwM' }]`) and open the in-page player for every Mode.
- The global `[data-watch]` handler opens the player for a video id; plain `<a target="_blank">` remains only for Pro links.
- The click handler's analytics call becomes `track('watch/' + kind)` with `kind` in video, short, link (fixed words), instead of the hostname.
- A node scan (`test/watch.test.mjs`) asserts that every `target="_blank"` in `js/app.js` sits behind `linksOut()`.

**4. The shelf view.** `watchView()` becomes async-rendered: a heading and a skeleton list at once, then `loadVideos()` fills it. Filters are chip groups (`aria-pressed`): Mode (the Modes the Player may see, own Mode selected), Skill area (strands), Tricks, Length, Videos or Shorts (and Links for Pro). Video cards keep the 16:9 thumbnail; Short tiles are 9:16 in the same grid. Offline, a note says "Videos need a connection" and cards are disabled. The lede and note text change: "Every video plays right here" and, for Pro, "Sites open in a new tab".

**5. Watch sections.** `videosFor(s, trick)` becomes a placeholder `<div data-watch-for>` filled after `loadVideos()` with `picksFor()`, so Skill pages do not wait on the list. Under the view signal (no work after leaving).

**6. The daily check.** `e2e/tests/videos.live.spec.ts`, chromium only, no retries, runs in the daily workflow and on demand:
- For every `VIDEOS` entry: a request to `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<yt>&format=json` must answer 200 (404 means deleted or private, 401 means embedding is off).
- Then, in one browser page per entry (4 workers), load `embedSrc(v)` without autoplay and wait up to 10 s for the player: fail if YouTube's error screen (`.ytp-error`) appears or no `video` element is created. Failures list `id` and `title`.
- It never touches Firestore or GoatCounter; it reads only YouTube. Kept out of the push-triggered run's critical path by tagging it `@live-videos` and running it in the daily job, plus a `workflow_dispatch` input.
- Rejected: only the oEmbed check. It misses region and age restrictions that break embeds; decision 5 asks for a real-browser check.

**7. Schema and bar as node tests.** `test/videos.test.mjs`: unique ids; `yt` matches `^[\w-]{11}$` and is unique; `duration` under 480 s, under 240 s when `modes` includes Explorer; `kind` video or short; `modes` non-empty and valid; every `skills` id exists in `byId` and every `tricks` id in `TRICKS`; `checked` is a date not in the future; `why` non-empty; `critique` only with `modes` `['pro']`; no URL in `VIDEOS` at all; `LINKS` URLs are https and not YouTube; no title or `why` contains "from the Vedas" or an em dash.

**8. Migration of the 67 entries** (a scripted pass plus hand edits, one commit):
- 19 videos and 3 Shorts with `yt`: each goes through the browser check (decision 5: plays embedded, length, captions) and the bar (decision 6: under 8 min, under 4 for Explorer, method correct); those that pass become `VIDEOS` entries with Modes from the old `mode` (`all` becomes every Mode), Skills and Tricks filled by hand, `madeForKids` and `captions` from the check, `why` from the old `desc`. Long talks (several Pro videos run well over 8 minutes) are dropped.
- 4 playlists (two tecmath, two 3Blue1Brown): each replaced by its one best video that passes, or dropped.
- 13 channels and the "Numberblocks Shorts" page link: dropped; their names are listed in the PR as candidates for the approved channel list (decision 8).
- 27 websites and games: the 14 marked Pro or every Mode become `LINKS` (Pro only), with the 3 critiques (Vedic Mathematics on Wikipedia, the arXiv paper, The News Minute) flagged `critique`; the 13 marked Explorer or Challenger (8 websites, 5 games) are dropped, since no Explorer or Challenger Player may follow a link out and they are aimed at young children.
- The PR lists every kept, replaced and dropped entry with the reason.

**9. Parent note.** One sentence in `parentNote()`, worded per Mode: "Videos play from YouTube in privacy-enhanced mode, and YouTube's own rules apply once one plays." The same in `cloud/README.md` Privacy. Videos need no Parent step (they post nothing).

## Risks / Trade-offs

- [The migration leaves some Modes with very few videos until batch 1] → Expected; batch 1 (all Tricks) follows. Keyword fallback still fills Skill pages where any video fits.
- [The daily check is flaky when YouTube is slow] → 10 s timeout per entry, oEmbed first, failures name entries; a run is re-dispatched by hand before anyone edits data.
- [Made-for-kids videos disable some player features (no comments, no end screens)] → That is the point for Explorer and Challenger.
- [Removing websites hurts Pro parents who used them for kids] → They were marked for Explorer and Challenger, who may not follow links out (decision 14); Pro keeps its own.

## Migration Plan

1. Land code and migrated data in one change; `js/resources.js` is deleted in the same commit.
2. No stored Player data changes (the old `vid:` seen keys are unused since `sparks-replace-xp`).
3. Rollback: revert; `js/resources.js` comes back.

## Files touched

- New: `js/videos.js`, `js/watch.js`, `test/videos.test.mjs`, `test/watch.test.mjs`, `e2e/tests/watch.spec.ts`, `e2e/tests/videos.live.spec.ts`
- Deleted: `js/resources.js`
- `js/app.js`, `js/related.js`, `js/sutra-details.js`, `math.css`, `cloud/README.md`, `.github/workflows/e2e.yml` (daily job includes `@live-videos`)
- Tests: `test/copy-accuracy.test.mjs`, `test/lifecycle-scan.test.mjs`; `e2e/tests/progress.spec.ts`, `offline.spec.ts`, `privacy.spec.ts`, `routes.spec.ts`, `star.spec.ts` (if `star-round` has shipped)
