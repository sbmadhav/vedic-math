# Handoff: watch-shelf

## State

- Branch `watch-shelf`, worktree `/Users/sbmadhav/Documents/codebase/wt-watch-shelf`, rebased on origin/main `8d83fb9` (star-round merged). PR https://github.com/sbmadhav/vedic-math/pull/26 open to `main` (not merged); its body has the 67-entry migration table.
- Done: tasks 1.1 to 5.1 (ticked in tasks.md).
- Not done:
  - 4.2 is done (after star-round merged in #25): `starView()` passes `starVideo`, which wraps `videoForTrick`; Watch opens the in-page player (`openPlayer(v, opener, onClose)`) and closing it goes back to the round. Tests in `star.spec.ts`.
  - **6.1 (release check):** after deploy, a manual E2E run (workflow_dispatch) with `@live-videos` green. Then the channel list for the owner (candidates are in the PR), then batch 1 (Tricks).

## What was built

- `js/videos.js`: `VIDEOS` (20, all checked 2026-10-15) and `LINKS` (13, Pro only, `history` and `critique` flags).
- `js/watch.js`: the rules, as pure functions over a list that is passed in; `loadVideos()` is the only import of `videos.js`.
- `js/app.js`:
  - `outLink()` is the only place that writes a `target="_blank"` link for the shelf, the player and the deep dives, and it returns nothing unless Pro.
  - Play buttons are `button[data-watch="<yt>"]`, handled by the one document click handler.
  - `fillWatch()` fills the Skill and Trick "Watch it explained" section, and `watchView()` is the new shelf.
  - `parentNote()` has the video sentence.
- `js/related.js` matches over VIDEOS title and why. `js/sutra-details.js` stores reading videos as `{ yt }`. `js/resources.js` is deleted.
- Tests: `test/videos.test.mjs`, `test/watch.test.mjs`, `test/copy-accuracy.test.mjs`, `test/metrics.test.mjs` (allowed analytics values).
- E2E: `watch.spec.ts` (new), `videos.live.spec.ts` (new, `@live-videos`), and updates to `privacy`, `progress`, `routes`, `modes`, `practice` and `offline`.
- Workflow: `.github/workflows/e2e.yml` leaves `@live-videos` out on push.

## How the videos were checked (to repeat for batches)

Use Node `fetch` (python urllib fails on this machine's certificates).

1. oEmbed must return 200.
2. Read the watch page's `ytInitialPlayerResponse` for `lengthSeconds` and caption tracks. The made-for-kids marker is the text "Miniplayer is off for videos made for kids". Width and height come from `streamingData`.
3. Load the youtube-nocookie embed in Playwright, inside an iframe on a page at the site's origin. A top-level or referrer-less embed shows "Video player configuration error". Use `cc_load_policy=1&mute=1&autoplay=1` and capture the `/api/timedtext` response to read the captions.
4. Read the captions to confirm the method, the worked examples, and that the video makes no "from the Vedas" claim.

The scripts were scratch files and are not in the repo.

## Decisions taken (also in the PR)

- `c8hyYXepGvI` is a vertical 13 s clip showing the written-columns nines trick, not fingers. It is now a Short titled "Easy 9 times table trick".
- `oV7Kxm3Zr_c` does not explain why the trick works, so it is retitled "How to square numbers ending in 5".
- Playlist replacements came from each playlist's own list, not from a search: tecmath 11s (`l1BezGxm7zg`), tecmath subtracting with zeros (`Qf_45zM68R4`), 3Blue1Brown higher order derivatives (`BLkz5LGWihw`), 3Blue1Brown 3D transformations (`rHLEWRxRGiM`).
- `s4w5qyBxs48` uses a different method from the `duplex` Trick, so it is matched to Skill `6-exp` only.
- `captions` counts auto-generated English captions.

## Tests (last run)

- Node: all pass. Build: OK. `openspec validate --strict`: valid.
- Playwright against the local checkout (port 8131; port 8124 belongs to the star-round worktree's server), chromium, webkit and mobile, all specs except `@live-videos` and tests with "offline" in the title: 449 passed, 151 skipped, 0 failed.
- `offline.spec.ts` against a built `_site`: green.
- `videos.live.spec.ts`: 20 of 20 green. The deliberate-failure check (a deleted id) failed as expected on both the oEmbed step and the embed step, and the entry was removed.

## Resume

```
cd /Users/sbmadhav/Documents/codebase/wt-watch-shelf
git fetch && git rebase origin/main
node --test 'test/**/*.test.{js,mjs}'
```
