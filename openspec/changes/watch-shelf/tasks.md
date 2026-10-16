# Tasks

Prerequisites: `sparks-replace-xp` is merged (no Sparks for videos). `star-round` is optional: if it has shipped, task 4.2 wires its `findVideo` seam; if not, `star-round` uses `videoForTrick()` directly when it lands.

## 1. Data and rules

- [x] 1.1 Create `js/videos.js` (`VIDEOS`, `LINKS`) with the schema in design decision 1. Verify: new `test/videos.test.mjs` with every check in design decision 7.
- [x] 1.2 `js/watch.js`: `loadVideos()`, `MODE_SEES`, `visibleTo()`, `order()`, `picksFor()`, `videoForTrick()`, `filterShelf()`, `embedSrc()`, `linksOut()`. Verify: new `test/watch.test.mjs` over a small fixture list: Explorer sees only Explorer, Challenger sees Challenger and Explorer, Pro sees Pro and Challenger; critiques only for Pro; made-for-kids first and made-for-kids only in picks when any exist (Explorer and Challenger); hand matches beat keyword matches and keywords are used only when there are none; `videoForTrick()` never returns a keyword match and returns the shortest; length buckets at 119, 120, 300 and 479 s; `embedSrc()` is `youtube-nocookie.com`.
- [x] 1.3 `js/related.js` matches over `VIDEOS` (title and `why`), whole words as today. Verify: `test/copy-accuracy.test.mjs` "related videos match whole words only" updated to the new shape and still rejects "Discounts" for "count".

## 2. Migration of the 67 entries

- [x] 2.1 Run the browser check (plays embedded, length, captions) and the bar on the 22 entries with a YouTube id; write passing ones to `VIDEOS` with Modes, Skills, Tricks, `madeForKids`, `captions`, `checked`, `why`; pick one passing video for each of the 4 playlists or drop it; drop the 13 channels and the Shorts page link; move the 14 Pro or every-Mode websites to `LINKS` with the 3 critiques flagged; drop the 13 Explorer or Challenger websites and games; delete `js/resources.js`. Verify: `test/videos.test.mjs` passes on the migrated data; the PR lists each of the 67 entries as kept, replaced or dropped with a reason; `grep -rn "resources.js\|RESOURCES" js/` finds nothing.
- [x] 2.2 `js/sutra-details.js`: YouTube reading entries become `{ yt }` video ids that exist in `VIDEOS` (or are dropped with the video). Verify: `test/watch.test.mjs` asserts every `{ yt }` in `DETAILS` is a `VIDEOS` id.

## 3. Views

- [x] 3.1 `watchView()`: loads the list on open, filters (Mode default, Skill area, Tricks, length, videos or Shorts, Links for Pro), Short tiles, offline note. Verify: new Playwright `e2e/tests/watch.spec.ts`:
  - Explorer sees only Explorer entries (each card has `data-modes` containing `explorer`); Pro sees no Explorer-only entry;
  - picking Shorts and Tricks shows only Short tiles with a Trick;
  - Pro sees a Links group with "Opens in a new tab"; Challenger sees none and no `a[target="_blank"]` anywhere in `#view`;
  - opening a Short plays it in `dialog.vm-player.tall` with an iframe from `youtube-nocookie.com`, and closing it starts nothing else.
- [x] 3.2 `openPlayer()`: no "Open on YouTube" for Explorer and Challenger; Shorts tall; Video learner minute unchanged. Verify: `watch.spec.ts` Challenger player has no `.vp-yt`; Pro has it; `e2e/tests/progress.spec.ts` "Video learner" still passes with a `VIDEOS` entry.
- [x] 3.3 Skill and Trick Watch sections (`videosFor()`) filled after load with `picksFor()`; Sutras history links and Wikipedia Learn more for Pro only; YouTube Learn more entries play in the page. Verify: `watch.spec.ts`: a Trick with hand-matched videos shows 2 or 3 of them and no keyword extras; a Skill with none shows keyword matches or no section; the Sutras page for Challenger has no outside link and no critique; for Pro it has them.
- [x] 3.4 The list is not part of first loads. Verify: `watch.spec.ts`: opening home and a game requests no `/vedic-math/js/videos.js`; opening `#/watch` requests it once; `e2e/tests/offline.spec.ts` "every route renders offline after one visit" covers `#/watch` (list shown, "need a connection" note).

## 4. Star offer, parent note and privacy

- [x] 4.1 `parentNote()` and `cloud/README.md` Privacy: the video sentence, per Mode. Verify: Playwright `e2e/tests/privacy.spec.ts` new test: the note in each Mode mentions privacy-enhanced YouTube videos; an under-13 Player without the Parent step can open and play a video (iframe present).
- [x] 4.2 (Follow-up after `star-round` merges: `videoForTrick(trickId, mode)` is exported from `js/watch.js` and resolves to `null` offline or when the list fails to load.) `starView()` passes `videoForTrick` (offline and load failures return `null`) as `findVideo`. Verify: Playwright `e2e/tests/star.spec.ts` new test: two misses in a Star for a Trick with a seeded hand-matched video show Bolt's offer once; accepting opens the in-page player; closing returns to the rematch; a third miss shows no offer; offline (`context.setOffline(true)`) shows none.
- [x] 4.3 Nothing is sent but YouTube's embed. Verify: `privacy.spec.ts`: opening and playing a video makes no Firestore request and no request carrying the Nickname; the analytics event is `math/watch/video` or `math/watch/short` (fixed words).

## 5. Daily live check

- [x] 5.1 `e2e/tests/videos.live.spec.ts` (chromium only, tagged `@live-videos`, no retries): oEmbed 200 for every entry, then the embedded player loads with no `.ytp-error` within 10 s; failures name `id` and `title`. Add it to the daily job and the `workflow_dispatch` path in `.github/workflows/e2e.yml`. Verify: run it locally against the migrated list (green); temporarily add an entry with a deleted video's id and confirm the run fails naming it, then remove it.

## 6. Release check

- [ ] 6.1 Node, build and Playwright suites pass locally; after deploy the live E2E run (including `@live-videos`) is green. Then the next steps from `docs/videos.md`: the channel list for the owner, then batch 1 (Tricks).
