# Design

## Context

- Source: the Muse review (2026-10-31), items 3, 6, 7, 8 and 10, and a 360x740 Playwright pass over 32 routes (no overflow, no console errors, small breadcrumb targets). The audit table is in `_handoff/feedback/2026-10-31-muse-review.md`.
- The small fixes the review found (Spellbook link, Locks banner, quest and Games copy, tower pictures, the Nikhilam example) shipped in the `muse-review-fixes` pull request; this change is only the new behavior.
- The owner delegated the product calls below to the agent (owner-delegated, 2026-10-31). The owner approves this change before it is applied.

## Decisions

### D1. Wait indicator: a bar after 1.2 s, Next after 2 s in untimed rounds (owner-delegated)

Holds shorter than 1.2 s (a right answer's 0.7 to 0.9 s pause) read as a beat, not a freeze, so they get nothing. Longer holds show a bar on the held keypad that fills over the hold, so the Player sees time passing and how much is left. One polite announcement ("Next question in a moment") per hold, never per tick. In untimed rounds (Practice, Stars, Katas, Discovery Locks, tower and Arena Practice with Calm) a hold of 2 s or more also shows **Next**: pressing it or Enter ends the hold. Timed rounds keep the hold (skipping it would change the race). The bar does not animate with reduced motion, Pause motion or Calm; it shows the time left as text instead.

Alternatives: a spinner (says "loading", which is wrong); always skippable (would let a Ranked round skip its own pacing).

### D2. Quest refresh copy (owner-delegated)

One line under the quest card: "New quests at midnight, your time. Everyone in your Mode gets the same three." Explorer: "New quests every morning." It states the rule the code already has (`pickQuests()` seeds on the local date and Mode). No countdown: a clock on Home adds pressure the game avoids elsewhere.

### D3. Quests met earlier today complete at the Mode switch (owner-delegated)

`checkQuests()` also runs on the store's `player` event (a Mode change). A quest of the new Mode that today's activity already meets completes then, once, with its toast on the Me page. It still counts only today's activity (the baseline from `startDay()`), so lifetime totals never complete it; the existing scenario "Challenger to Explorer mid-day" still holds. This replaces the late toast in an unrelated game.

### D4. Sparks history and messages (owner-delegated)

`store.addSparks(n, why)` already receives a reason; it also appends `{ n, why, at }` to a per-Player `sparksLog`, newest first, capped at 50 entries. The Me page shows it under the Sparks total as "Recent Sparks", with readable labels for each `why` (`quest`, `arena`, `kata`, `trick`, `play`, `challenge`, `run`, `star`, `answer`). Answers are grouped: consecutive `answer` awards within one round show as one row ("Practice: 12 answers, +130"). The log is part of the Player's saved progress, so backup and restore carry it; it is never sent anywhere.

Silent awards get a message: watching a trick to its last step and a sutra card's first flip toast "+5 Sparks"; experiences toast "+N Sparks" through the shared toast, and the first award that hits the 150-a-day cap says "That is today's 150 play Sparks. More tomorrow." once a day.

Alternatives: a full ledger with every answer (grows without bound, and a Player wants totals, not rows of +10).

### D5. The tour does not open under a press (owner-delegated)

`homeTour()` listens (under the Home view's signal) for `pointerdown` and `keydown` between Home drawing and the tour opening. If either happens, the tour does not open this time and its state stays unset, so it is due on the next Home visit. A replay the Player asked for (Quick tour, Take the tour) always opens.

### D6. Narrow screens (owner-delegated)

Breadcrumb links (`.crumbs a`), `.px-back`, Home's Quick tour (`button.md-link`) and Daily Number's Archive link get `min-height: 24px` with padding (or an equivalent hit area via `::after`), meeting WCAG 2.2 2.5.8 without changing how they look. The deep dive footer's Previous and Next wrap the sutra name onto two lines below 400 px instead of an ellipsis. The Star round's title ellipsis at 360 px stays (deliberate, controls first).

## Risks

- The `sparksLog` grows the saved progress by at most 50 small entries (about 3 KB).
- A Mode-switch toast on Me is new; it fires at most once per quest per day.
