# Proposal

## Why

Gate A ("events flowing, baselines recorded") cannot be met with today's instruments. Verified against the current code:

- **Hash routes are not counted.** The app is one page with hash routes (`js/app.js:46-68`, `hashchange` at `:86`). The shared `/assets/analytics.js` (in the `sbmadhav.github.io` repo) counts the first page view and then only route changes where `location.pathname` changes (`assets/analytics.js:35-46`, via `pushState`, `replaceState` and `popstate`). A hash change keeps the same pathname, so every visit counts as one view of `/vedic-math/` however many pages the Player opens.
- **None of the plan's events exist.** The app sends a few named events through `track()` (`js/app.js:26`, prefix `math/`): Mode picks (`js/fx.js:15`), Arena, Duel, game, Kata, challenge, trick, sutra, mastered and Watch. There is no `q_answered`, `round_end`, `first_win`, `share_click` or `return_d7`, and nothing for the measurement table's `round2_start` and day-1 return.

## What Changes

- **Route views:** each hash route render sends one anonymous event `math/view/<route>`, with numeric parts collapsed (for example `math/view/game/:id/level`), so page-level use is visible.
- **Events**, all through `window.siteTrack` with the existing `math/` prefix:
  - `math/q_answered/<area>/<right|miss>` for each answered question in untimed play (Practice, Endless run, Kata).
  - `math/round_end/<area>/<league>/<r1|r2|r3plus>` when a timed round ends (Arena, ranked or practice game round, tower challenge, Duel), with the round's position in this visit.
  - `math/round2_start/<area>` when a second round starts in the same visit.
  - `math/first_win/<bucket>` once per device, on the first right answer ever, with the time since this device first opened the app bucketed (under 30 s, 30 to 60, 60 to 90, 90 to 180, over 180).
  - `math/return_d1` and `math/return_d7` once per device, on a visit 1 day, and 7 to 13 days, after the first one.
  - `math/share_click/<surface>`, defined now and sent by share actions when they exist (Phase 2).
- **No identifiers:** no Player id, Nickname, Score, Age answer, uid, typed text or seed is ever in an event path or title. GoatCounter stays cookieless; Do Not Track and Global Privacy Control keep everything off (already in `assets/analytics.js:14-16`).
- The parent note says, in one sentence, that the site counts anonymous visits and actions without cookies or IDs.

Out of scope:

- Changing the shared `assets/analytics.js` (another repo). Route views go through `siteTrack` from this repo.
- Building share buttons or challenge links (Phase 2); only the event name and helper are added.
- Dashboards, funnels or exporting GoatCounter data; baselines are read in GoatCounter's own UI.
- Renaming existing events.

Affected: all three Modes and every Player, but nothing they see changes except one sentence in the parent note. Grown-ups reading the note are affected.

## Capabilities

### New Capabilities

- `analytics`: which anonymous route views and events are counted, when each fires, and what they may never contain.

### Modified Capabilities

- `parent-note` (introduced by `add-age-answer-and-parent-step`, not archived yet): ADDED requirement "The note mentions anonymous usage counts".

## Impact

- `js/app.js`: `render()` sends the route view; `practice()`, `kataView()`, `arenaView()`, `duelView()`, `gameView()` and `challengeView()` send the events; `parentNote()` gains one sentence.
- New `js/metrics.js`: event names, route-to-path collapsing, the once-per-device flags (`vm.firstSeen`, `vm.metrics` in `localStorage`, device-level, never sent) and the per-visit round counter.
- `cloud/README.md` Privacy section (`cloud/README.md:82`): one line pointing out that usage counts are separate from Boards and hold no IDs.
- Tests: node test for `js/metrics.js` (paths, collapsing, once-per-device logic, a scan that no event can contain a Nickname or digits beyond the documented buckets); Playwright spec `e2e/tests/analytics.spec.ts` that routes `/assets/analytics.js` to a recording stub, so no real GoatCounter request is made and test runs never count as visits.
- **Depends on:** `add-age-answer-and-parent-step` for the `parent-note` capability. Best landed after `view-cleanup-contract`, which gives every round one `onEnd` path to hook. `pro-arena-mental-arithmetic` adds Arena Practice Ratings but no new events.
- **Volume:** GoatCounter counts each event as a hit. Per-answer events are limited to untimed play to keep hit counts and network requests low during timed rounds (see design).
