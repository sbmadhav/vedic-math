# Tasks

## 1. The bar and the filter

- [x] 1.1 `js/watch.js`: `MAX_LENGTH = 720` and `LENGTHS.longer = [480, MAX_LENGTH]`. Verify: `test/watch.test.mjs` "length buckets": 119, 120, 299, 300, 479, 480, 719 and 720 seconds give short, mid, mid, long, long, longer, longer and none; a 600-second fixture video is the only match for `length: 'longer'`.
- [x] 1.2 `test/videos.test.mjs`: every video under `MAX_LENGTH` for every Mode, with no Explorer branch. Verify: `node --test 'test/**/*.test.{js,mjs}'` passes on the current list.
- [x] 1.3 `js/app.js`: `LENGTH_LABEL.longer = '8 to 12 min'`, the lede "none is longer than 12 minutes" from `MAX_LENGTH`, `data-secs` on each card. Verify: `test/watch.test.mjs` checks `LENGTH_LABEL` has exactly the `LENGTHS` keys; new Playwright test in `e2e/tests/watch.spec.ts`: the lede says 12 minutes, the Length chips read Any length, Under 2 min, 2 to 5 min, 5 to 8 min, 8 to 12 min, and each chip keeps exactly the cards whose `data-secs` falls in its bucket (or shows "No videos match these filters yet.").

## 2. Docs

- [x] 2.1 `docs/videos.md` decision 6 and the `js/videos.js` schema comment say under 12 minutes for every Mode. Verify: `grep -rn "under 8\|under 4 \|under 480\|under 240\|longer than 8" js docs/videos.md` finds nothing.

## 3. Release check

- [ ] 3.1 Node, build, `openspec validate --strict`, Playwright (chromium, webkit, mobile) on a local server and the offline spec on a built `_site` pass; after deploy, the live Watch shelf shows the "8 to 12 min" chip.
