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

## Decisions made during implementation

Made while the owner was away.

- **GoatCounter free plan limit.** goatcounter.com refused connections from the build machine (connection reset), so the pages were read through the Internet Archive: the goatcounter.com home page snapshot of 2026-10-12 and the terms page (`/help/terms`) snapshot of 2026-09-20 both say: "GoatCounter.com is currently offered for free for reasonable public usage. Running your personal website or small-to-medium business on it is fine, but sending millions of pageviews/day isn't." There is no numeric monthly cap on the free hosted plan; the source repo (`arp242/goatcounter`, `tpl/help/terms.md`) has the same text, and no pricing page exists any more (`/pricing` has no snapshot in 2026). Events count as hits like pageviews.
- **No throttling or sampling.** Estimated volume: a long visit sends about 10 to 20 route views, up to about 50 `q_answered` in untimed play and a few round events, so at most about 100 hits. Reaching "millions per day" would need over 10,000 such visits a day, far above a personal site's traffic. Per-answer events are already untimed-only (decision 3). If volume ever matters, sample `q_answered` in `metrics.answered()` without renaming events.
- **Early events wait for the helper.** `index.html` runs the `app.js` module before the deferred `/assets/analytics.js` that defines `window.siteTrack`, so the first route view (and `return_d1` / `return_d7`) would be lost. `metrics.js` keeps up to 20 events until `DOMContentLoaded` (or `load`), then hands them to `siteTrack`; if the helper never appears they are dropped. The shared `analytics.js` is not changed.
- **Route views:** `render()` sends the view after the view has rendered, and only if the hash did not change during the render (a view that redirects, like a locked game level, is counted as its target). The Mode picker shown instead of a route is `math/view/pick-mode`. The Sutra dialog opened or closed over the Sutras page counts as `sutras/<id>` and `sutras`. Catalog ids are checked against the catalogs in `app.js` (grades, skills, tricks, sutras, games); an id that is not in them is sent as `unknown`, and a hash matching no route as `other`, so a typed or stale link never reaches GoatCounter. Grade ids are lowercased (`K` becomes `k`). Numeric parts become `level` (game level), `kata` (Kata number), `challenge` (challenge number) and `chapter` (tower chapter), as decision 2 says.
- **Areas.** Answers: `practice` (a skill page and Endless practice), `run` (Endless run), `kata`. Rounds: `arena`, `game` (ranked, Endless practice "Finish" and numbered levels), `tower` (challenge tower), `duel`. A game round's Stop (`gQuit` in ranked or level play) sends nothing. A right answer is one the Player finished correctly (what `store.record` counts as right), with or without a retry or hint; "Show me" is a miss.
- **`first_win` comes from untimed answers only** (Practice, Endless runs, Katas), since timed rounds send no per-answer events. The timer starts at `vm.firstSeen`, written at boot by `returnCheck()`.
- **Devices that played before this change** (any `mathquest.v1.*` record with XP or answers when `vm.firstSeen` is first written) are marked as done for `first_win`, `return_d1` and `return_d7`, so existing devices are never counted as new ones. Their first visit is unknown.
- **`return_d1`** is a visit on the next calendar day (local time) after the first visit; **`return_d7`** a visit 7 to 13 calendar days after. Each once per device.
- **Titles are fixed** (`Vedic Math: page view`, `Vedic Math: question answered`, and so on); they never echo a route or value.
- **`shareClick(surface)`** accepts only `result` and `challenge-link` (the Phase 2 surfaces); there is no share action yet, so nothing calls it.
- **Identifier scan.** `test/metrics.test.mjs` parses every `track(`, `siteTrack(` and `metrics.<fn>(` call in `js/` and fails on any value outside a commented allow-list. Checked by adding `track('x/' + player.name, 'X')` to `js/app.js`: the test failed naming `player.name`, and passed again once removed.
- **GPC check is automated.** `e2e/tests/analytics-gpc.spec.ts` loads the real shared `analytics.js` on the live site (chromium; GoatCounter is answered locally by the fixtures, so nothing is counted) and asserts no GoatCounter request with Global Privacy Control on, and that one is made with it off (control). It skips on localhost, where `analytics.js` is off anyway. Run against the live site on 2026-10-15: both passed.
- **Parent note:** one sentence per Mode via `fx.t()`, naming GoatCounter and what is counted (pages opened, questions answered, rounds finished), "anonymously: no cookies, no IDs and no names", separate from World boards. `cloud/README.md` Privacy gains one line.
