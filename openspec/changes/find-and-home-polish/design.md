# Design

## Context

`first-visit-clarity` (archived 2026-10-19) added Try a trick, the three Home doors and Find. A live audit on 2026-10-20 repeated its method on the live site: Playwright, 390 by 844, a fresh context with no saved state, the service worker blocked, analytics answered locally. Two paths to Home: picking the Challenger card, and Try a trick then answering the Star's four questions and going Home. "Actions" are visible links, buttons and summaries in the view; "above the fold" means on screen with no scroll. The same script ran against this branch (local server, the rest of the site proxied from sbmadhav.com) for the after numbers.

The app then moved to learnvedicmath.com (`/play/`) with its own header (no Explore; the Learn Vedic Math brand, mark and name, 193 px wide) and Try a trick gained a Learn the trick card before Star 1. After merging that into this branch the numbers were measured again on local builds of `main` (315288c) and of this branch, chromium and webkit, same viewport and paths (Try a trick now presses Start on the trick card first); see "After the move".

## The audit

### Home, phone, Challenger

| | Before (live) | After (this change) |
| --- | --- | --- |
| Header rows / height | 3 / 147 px | 3 / 130 px |
| Player strip height | 181 px | 123 px |
| "New here?" controls | 2 ("See how everything works", "take the tour"), over the background drawing | 1 ("Quick tour"), solid box |
| Keep going after Try a trick | shown, same Trick as the Star door | left out |
| y of Play this Star (Challenger card) | 707 | 594 |
| y of Play this Star (after Try a trick) | 817 (button ends below the fold) | 594 |
| View actions above the fold (after Try a trick) | 6: Change, See how everything works, take the tour, Keep going, Play this Star, Open the Dojo | 5: Change, Quick tour, Play this Star, Open the Dojo, Race in the Arena |
| Words above the fold (after Try a trick) | 64 | 85 (the Star door's line, now in view) |

### After the move (local builds, `main` 315288c vs this branch)

| | `main` | This change |
| --- | --- | --- |
| Header rows / height at 390 px | 4 / 194 px (brand and color scheme; Music and Player chip; two nav rows) | 3 / 130 px (brand mark and every control; two nav rows) |
| Header at 320 and 375 px | 188 and 194 px | 130 px |
| Player strip height | 181 px | 122 to 123 px |
| "New here?" controls | 2 | 1 ("Quick tour") |
| Keep going after Try a trick | shown | left out |
| y of Play this Star (Challenger card) | 750 to 791 | 590 to 631 |
| y of Play this Star (after Try a trick) | 864 to 904 (below the fold) | 594 to 634 |
| View actions above the fold (after Try a trick) | 4: Change, See how everything works, take the tour, Keep going | 4: Change, Quick tour, Play this Star, Open the Dojo |
| Words above the fold (after Try a trick) | 51 | 85 |
| "Badge earned" toast vs pad after the first right answer | y 772 to 824, pad 435 to 714 (clear at that moment; the pad still moves with the feedback) | y 8 to 60 |

### Toasts in a Star round, phone

| | Before | After |
| --- | --- | --- |
| "Badge earned: First step" after the first right answer | y 772 to 824, pad 494 to 773 (touching; two stacked toasts cover the bottom keys) | y 8 to 60, pad 494 to 773 |

### Find, Challenger

| Query | Before | After |
| --- | --- | --- |
| multiply big numbers | 2 videos | 26; first: Multiply any two numbers in one line, Multiply numbers near 10, 100 or 1000 (Tricks first) |
| squares | 16; Square numbers ending in 5 first | unchanged |
| how does it work | nothing | Best match: Guide, Getting around |
| for kids | 8 Khan Academy Kids videos | Best match: Explorer Mode, Play modes; then the videos |
| games | 8: Games section, Find, 4 guide sections, 1 video, no game | 16: Games section, 8 games, guide sections |
| what is vedic math | 1 guide section | Best match: Sutras, Sutra cards and deep dives, Guide; then Dojo and the Vedic math video |

## Goals / Non-Goals

**Goals:**
- A question or a phrase typed into Find gets a useful first result.
- On a phone, Challenger Home shows its one primary action in the first screen, with no card that repeats it.
- Toasts never sit on the control a Player is about to press.
- Nothing removed: every control, link and route stays.

**Non-Goals:**
- A new search engine, fuzzy spelling or a synonym file: the index stays a small table in `js/find.js`.
- Changing what the tour or the guide say (studio voice lines).
- The Star door's wording and Try a trick's teaching (`hook-first-star`).

## Decisions

### Find: share of words, not all-or-nothing

`score()` now sums the tokens that match (title 10, synonym 8, kind word 6, description 3, a prefix 70 percent) and `share()` is the fraction of tokens that match. An entry is listed when its share is 1, or at least 0.5 with one hit in its title, synonyms or kind words; a description-only half match is noise ("numbers" is in hundreds of descriptions). Within a kind: share, then score, then the shorter title. Between kinds: the group whose best entry has the larger share first, ties in the old kind order, so a one-word query keeps today's order ("arena" still puts the Arena section first).

Alternative considered: keep all-or-nothing and only add stop words. "multiply big numbers" would then work, but "arena zzzz" or a typo in one word would still empty the page.

### Stop words

How, does, do, is, are, what, which, who, why, where, when, I, me, my, can, you, your, this, that, be, big, bigger, huge, work, works, working, some, want, math and maths join the old list. "math" is in almost every description, and the app is a math app; "vedic" stays a word (the Dojo's synonym). Stop words are dropped from the query only, never from titles.

### Best match for questions (INTENTS)

A short table maps phrases to entries. A query matches an intent when it is the phrase, or holds it as whole words and nothing else but stop words and filler (app, site, page, thing, math). So "how does this app work" is a question about the app, while "how many dots" holds "how" but also "many" and "dots" and is searched as usual. The matched entries form a first group, "Best match", and are not listed again below. "how" and "help" were synonyms of the Guide; "how" is now a stop word, and both are intent phrases.

### Play modes in the index

Explorer, Challenger and Pro join the index as kind `mode`, titled "Explorer Mode" and so on, with their ages and blurb, opening Me (where a Mode is picked or changed; before any Mode, Me shows the mode picker, and picking there opens Me). The lines are a copy of `fx.MODES` kept in `js/find.js` so it stays free of the DOM; a node test checks they match.

### Kind words

"games", "tricks", "skills", "videos", "sutras", "grades" match every entry of that kind at weight 6, below a synonym, so "games" lists the games under the Games section.

### Home on a phone

- Player strip under 600 px: a two-column grid (40 px avatar; name, Title and bar), the three numbers on one line under it. 181 px to 123 px. Nothing hidden.
- Keep going: on Challenger Home it is left out when its Skill is `v-<trick>` of the Star the first door offers (Bolt's suggested Star). After Try a trick that is always the case, and the door already offers that Trick with a primary button. Pro and Explorer keep it (their first door is not a Star).
- "New here?": one control, "Quick tour". The tour already ends on the Guide link in the menu bar, so the note still leads to both. Considered: one link to the guide; rejected because the guide is 58 actions long and the tour is six short steps.
- The note gets `background: var(--card)`; the background canvas is at 45 percent opacity under 600 px. Considered: hiding the drawing on phones; rejected, the Moving background switch already does that for those who want it.

### Header

Under 600 px the rows are packed tighter (padding 8 and 6 px, row gap 6 px, nav row gap 2 px, link padding 5 by 8 px), on top of the design system's `.md-header--tabs` rules. On the old sbmadhav.com header that took 147 px to 130 px. The Learn Vedic Math header's brand (mark and name) is 193 px wide, so at 390 px the brand, the color scheme button (36), Music (36) and the Player chip (93) need 382 px with gaps out of 358 and Music and the chip wrap to their own row: four rows, 194 px on `main`. Under 420 px the game's brand shows its mark only (48 px; "Learn Vedic Math, home" stays its accessible name, as the old header hid part of its name at that width), so the brand and every control share the first row: three rows, 130 px at 320, 375 and 390 px. The landing and grown-up pages (no `.mq-nav`) keep the full brand. Two rows do not fit: the nine menu links need 421 px even at 13 px text with the Find icon hidden, and the `site-header` spec requires every menu link on screen without scrolling (a sideways-scrolling menu hid Sutras, Watch and Guide in an earlier version). Explorer's seven links need about 385 px at the tighter size and also wrap.

### Toasts

`toastSide(H, boxH, rects)` in `js/fx.js` is pure. While a round's pad or answer choices (`.star-pad`, `.ar-pad`, `.star-choices`, `.ar-choices`) are on screen the toasts go to the top: the pad moves as feedback appears under the question (the audit saw it end at 683 px when the toast was placed and 773 px a moment later), so a geometric test at placement time is not enough. Otherwise a visible `.md-btn--primary` within 12 px of the bottom band moves them up when the top band is clearer. The box is placed when a toast is added and again 300 ms later. Toasts keep `pointer-events: none`.

## Risks / Trade-offs

- More results per query: a two-word query can list partial matches. Mitigation: partial matches need a title, synonym or kind hit, full matches rank first, eight per kind.
- Intent phrases are a hand-kept list. Mitigation: a node test checks every intent names an entry that exists and every phrase is written normalized.
- A toast at the top covers the round's header (Back, Calm, text size) for three seconds; taps pass through it.
- Merge with `hook-first-star`: both touch `home()` in `js/app.js`. This change only replaces how `last` is computed and the "New here?" note, so a merge is a line or two.

## After try-trick-in-modes

On 2026-10-21 `try-trick-in-modes` moved Try a trick under each Mode card (a lesson at `#/try`, not a Star). The audit numbers above were measured on the old path. The two scenarios that named it now read: Home after the Challenger card's Try a trick (Play this Star on screen at 390 by 844; a Try a trick leaves Keep going alone), and Keep going after a Star of Bolt's first Trick played from Home. Their tests are `e2e/tests/first-visit.spec.ts` and `e2e/tests/cov/first-visit-2.spec.ts`.
