# Proposal

## Why

The Watch shelf's length bar is 8 minutes, and 4 minutes for Explorer (`docs/videos.md` decision 6). The channel research for batch 1 found that many of the best explanations from the approved channels run 8 to 12 minutes (James Glover's Nikhilam and crosswise lessons, Math Antics, Eddie Woo, Numberphile), so several Tricks had no video that met the bar. On 2026-10-16 the owner raised the bar to 12 minutes for every Mode, Explorer included.

## What Changes

- **The bar:** every video and Short is under 12 minutes, for every Mode. The separate 4-minute cap for Explorer goes. The bar is one named constant, `MAX_LENGTH` (720 seconds) in `js/watch.js`.
- **Length filter:** a fourth bucket, "8 to 12 min", after "Under 2 min", "2 to 5 min" and "5 to 8 min". The existing buckets keep their bounds, so a Player who filtered for short videos sees the same ones.
- **Copy:** the shelf's lede says "none is longer than 12 minutes" (built from `MAX_LENGTH`).
- **Docs:** `docs/videos.md` decision 6 and the schema comment in `js/videos.js`.

Out of scope:

- New videos: batch 1 (Tricks) is data and follows as its own pull request.
- Any change to the Mode rule, made for kids first, Shorts, or how Bolt picks a video in a Star (still shortest first).
- The migration requirement of `watch-shelf`, which records how the 67 old entries were judged at the time (against 8 minutes).

Affected: every Player who opens the Watch shelf (all three Modes see the new chip; Explorer may now get videos over 4 minutes), and anyone adding videos to `js/videos.js`.

## Capabilities

### Modified Capabilities

- `watch-shelf`: MODIFIED "Filters on the Watch shelf" (the 8 to 12 bucket); ADDED "Every video meets the length bar".

## Impact

- `js/watch.js`: `MAX_LENGTH`, `LENGTHS.longer`.
- `js/app.js`: `LENGTH_LABEL`, the shelf's lede, `data-secs` on each card (for the Playwright check).
- `js/videos.js`: schema comment only.
- Tests: `test/videos.test.mjs` (the bar), `test/watch.test.mjs` (buckets and labels), `e2e/tests/watch.spec.ts` (lede and length chips).
- `docs/videos.md` decision 6.
- **Order:** after `watch-shelf` (archived into `openspec/specs/watch-shelf`).
