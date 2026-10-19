# Proposal

## Why

The Watch shelf opens on the Player's own Mode and on "Everything", a mix of videos and Shorts (and, for Pro, sites and games under the videos). On 2026-10-17 the owner asked for the shelf to open on both Modes the Player may see, to open on Videos, and to keep Videos and Shorts apart. A Challenger opening the shelf now sees the whole list they may watch, and a tall Short tile no longer sits between wide video tiles.

## What Changes

- **Mode chip:** the shelf opens on "Both" (every Mode the Player may see) whenever the Mode sees more than one Mode (Challenger and Pro). The Player's own Mode chip still narrows it. Explorer sees only Explorer and has no Mode chip, as before.
- **"Videos or Shorts" chip:** Videos | Shorts, plus Links for Pro (whose group is then labeled "Videos, Shorts or Links"), with Videos picked when the shelf opens. The mixed "Everything" option goes, so videos and Shorts are never shown together.
- **Pro's sites and games** show only under Links, and Links shows only them (no video tiles). Under Videos and Shorts there is no "Sites and games" section.
- **Copy:** the Watch shelf card in the in-app guide (`js/guide.js`) says the shelf opens on both Modes and on Videos.

Out of scope:

- What each Mode may see, made for kids first, length buckets, the in-page player, Bolt's offer in a Star.
- The Skill area, Tricks and Length chips: unchanged, and they still narrow Videos and Shorts. Under Links they have no effect, as before an empty filter on links had none.

Affected: every Player who opens the Watch shelf.

## Capabilities

### Modified Capabilities

- `watch-shelf`: MODIFIED "Filters on the Watch shelf" (opens on every Mode the Player may see, on Videos) and "Shorts are tiles" (shown on their own, never mixed with videos).

## Impact

- `js/app.js` `watchView`: the starting filter (`level: 'all'` when `MODE_SEES[m].length > 1`, `kind: 'video'`), the kind chips, the Links section only when `kind === 'link'`.
- `js/watch.js`: comment on `filterShelf` only (its defaults are unchanged; the shelf always passes a kind).
- `js/guide.js`: the Watch shelf card's "how" line.
- Tests: `e2e/tests/watch.spec.ts`, `e2e/tests/cov/watch-shelf-3`, `-5`, `-6`, `-8`, `-9`.
- **Order:** after `video-length-12` (its MODIFIED "Filters on the Watch shelf" adds the 8 to 12 bucket, which this text keeps).
