# Design

## Context

- `window.siteTrack(name, title)` (`sbmadhav.github.io` `assets/analytics.js:20-24`) queues until GoatCounter's `count.js` loads after load and idle, then sends `{ path, title, event: true }`. Paths are cut to 120 characters. It is a no-op when DNT or GPC is on, or on localhost.
- `track(name, title)` in `js/app.js:26` wraps it with the `math/` prefix and a try/catch.
- E2E fixtures already answer GoatCounter locally (`e2e/tests/fixtures.ts:15-24`).

## Goals / Non-Goals

**Goals:**
- Every metric in the plan's Measurement table for Phases 1 and 2 has an event behind it.
- All naming and device-level flags in one module that is easy to audit for identifiers.

**Non-Goals:**
- Real GoatCounter page views for hash routes (see decision 1).
- Per-Player metrics. Metrics are per device, which is the plan's definition ("fired once per device").

## Decisions

**1. Route views as `siteTrack` events from this repo.**
`render()` calls `metrics.view(hash)` after the view renders. Rejected: teaching `assets/analytics.js` to count `hashchange` as page views. It is cleaner in GoatCounter (routes appear under Pages), but it changes a file shared by every page on sbmadhav.com and lives in another repo, and this repo cannot pin it. If the owner prefers real page views, that is a one-line follow-up there, and this event can then be dropped.

**2. Route collapsing.** The route table regexes (`js/app.js:46-68`) map to templates: numeric captures become fixed words (`level`, `kata`, `challenge`, `chapter`), word captures that are content ids (skill, game, grade, sutra, trick) stay. Content ids are public catalog names, not about the Player.

**3. Per-answer events only in untimed play.** Practice, Endless runs and Katas are paced by the Player (one answer every several seconds). Timed rounds can produce one answer a second; one request per answer there would add network work during the round and multiply hit counts. Timed rounds send `round_end` only, and the plan's metrics that use `q_answered` (time to first win, retained accuracy later) do not need per-answer events in timed rounds.

**4. Device flags.** `vm.firstSeen` (ms timestamp, set on the first boot) and `vm.metrics` (`{ firstWin: true, d1: true, d7: true }`) in `localStorage`. They are device-level, not per Player, never sent, and not part of Player backups. Clearing storage resets them; the plan already notes the undercount.

**5. Round counter per visit.** A module variable counts `round_end` per area in this page load; `round2_start` fires when a round starts and that area's count is already 1. A stopped or abandoned round (no `onEnd`) sends nothing.

**6. Buckets, not numbers.** `first_win` uses five fixed buckets; no event carries a Score, a count or a time value.

## Risks / Trade-offs

- [GoatCounter hit volume on the free plan] → Untimed-only per-answer events; if volume is still high, sample `q_answered` (for example 1 in 4) without changing the spec's event names. Owner to confirm the plan limit.
- [Events lost when the tab closes before `count.js` loads] → Accepted; metrics are directional.
- [Someone adds an event with a Nickname later] → The node scan test lists every call site of `metrics.*` and `track(` and fails on dynamic values that are not from the allowed sets.

## Migration Plan

Client-only. Rollback is a revert; already-sent counts stay in GoatCounter.
