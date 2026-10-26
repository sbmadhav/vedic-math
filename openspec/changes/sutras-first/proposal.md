# Proposal

## Why

The owner, Madhav, on 2026-10-21: "It is important to make the sutras and the new method the focus of the app." Earlier the same week: "Try a trick should be inside the 3 levels and it should teach or aligned to some novel vedic math sutra that is applicable", and to build everything fast with no questions or confirmations. This request counts as the owner's approval to implement this change; the decisions it needed are recorded in `design.md` from the repository's plan documents (`docs/PLAN.md`, `docs/star-quest.md`, `GLOSSARY.md`, the ADRs and the open changes).

Today the Sutras are one section among nine (Home, Learn, Dojo, Arena, Games, Sutras, Watch, Guide, Find), sixth in the menu and hidden from Explorer. The audit (design, "Audit") found that a Player meets a method without its Sutra almost everywhere it is used:

- A **Star round** never names its Sutra: not in its header, not in the worked example Try a trick shows, not in the replay after a miss, not on the end screen.
- A **Kata** never names it; the Katas list shows the name with no meaning and no link.
- The **Dojo** shows the Sutra name in small type with no meaning and no link.
- A **Trick page** shows the name, Say it and the meaning, but no way to the Deep dive (the only link between a Trick and its Sutra runs the other way, from the Deep dive's "Try it yourself").
- The **Arena** never says which questions a Sutra answers in one line; Pro's mental arithmetic families are near-base products and squares the Sutras were made for.
- **Watch** marks a trick video "Trick" and never names the Sutra.
- The **Answer checker** game teaches the digit sum check and never names Guṇitasamuccayaḥ.
- **Home** leads with Sparks, streaks and (for Pro) today's Arena race; the Sutras are a tile folded under "More ways to play". The **landing page** never names a Sutra above its last two paragraphs.
- No page shows a Player **how far they are with each Sutra**: the Sutras page counts cards collected and nothing else.

## What Changes

- **A Sutra tag** on every Trick, Star, Kata, worked example, Arena round review, Watch video and game that teaches one: the Sutra's name (with Say it where there is room), its one-line meaning in the Mode's words, and an honest word for how the method relates to it (the Sutra itself, a sub-sutra, a special case, or "uses the idea of"), as one link to its Deep dive. Closing the Deep dive returns to where the Player was.
- **Honest mapping** of the 21 Tricks to the 29 Sutras and sub-sutras, checked against the repository's sources (design, "The Sutra map"): three Tricks are special cases of their Sutra (`by11`, `div9`, `duplex`), six are sub-sutras, and two only use a Sutra's idea (`check9`: the digit sum check, casting out nines, is much older than the 1965 book; `times5`: times 10, halve).
- **Progress per Sutra**, built only from what the device already keeps (Trick mastery, Stars lit, Katas done, cards collected): on each Sutra card, in each Deep dive, and in a "Your sutras" card on Home. Nothing new is stored or sent.
- **Sutras first in the menu**, right after Home, in every Mode, Explorer included, with Explorer wording on the Sutras page and its cards.
- **Home leads with the Sutras.** Challenger and Pro Home open with the next Sutra on Bolt's path (its tag, its next Star, Play this Star and Learn the sutra), then the Arena and the Skill map; the Player strip with Sparks moves below the doors. Explorer Home gains one "A sutra to say" card above its eight picture tiles.
- **The landing page leads with the Sutras and the method**: a hero about the sutra way, then a section with one sum done the school way and the sutra way, three Sutras with an example each linking to their Deep dives, and where the Sutras come from, before "Pick how you learn".
- **A Deep dive opens without a Mode**, so the landing can link to one.
- One new anonymous event, `math/sutra_tag/<surface>`, when a Sutra tag is followed.

Out of scope:

- Try a trick inside each Mode (the `try-trick-in-modes` work, built by another change); this change builds on whatever the Mode picker and Mode cards say.
- Any new or changed spoken line. Tags, progress lines and the landing section are not read aloud; Say it in a tag plays the Name clip already recorded (design, "Voice").
- New Sutra content: Deep dives, verses and worked examples stay as they are.
- Stars or Belts for Explorer (star-round, `explorer-belts`), and new Tricks for the Sutras that have none.
- The Sky (opt-in) already draws each Sutra as a Constellation; it keeps its labels.
- The in-app Mode picker's hero, which `try-trick-in-modes` is changing.

Modes and Players affected: every Mode. Explorer gains the Sutras page in its menu, a Sutra card on Home and Sutra tags in its words; Challenger and Pro get the new Home order, tags everywhere and per-Sutra progress. Nothing changes for what is stored, Boards, Ratings or Ranked rounds; the one new thing sent is the anonymous tag event above, fixed words only.

## Capabilities

### New Capabilities

- `sutra-tags`: the Sutra tag, where it is shown, its honest wording, the link to the Deep dive and back, and that it is not spoken.
- `sutra-progress`: progress per Sutra from device data, on the Sutras page, in the Deep dive and on Home.

### Modified Capabilities

- `first-visit`: Home's first door is the next Sutra; Pro leads with it instead of the Arena; the Player strip follows the doors; Explorer Home gains its Sutra card.
- `landing-pages`: the hero and the page order lead with the Sutras and the method (a new section before "Pick how you learn").
- `site-header`: Sutras come right after Home in the menu, in every Mode. The header requirement itself is `learnvedicmath`'s "The header is the Learn Vedic Math header" (it removes "The header matches the rest of sbmadhav.com"), and its nav list carries the new order, so this change adds only the menu order requirement.
- `find`: the browse list follows the new menu order, and the Sutras section is listed in Explorer too.
- `sutra-deep-dive`: a Deep dive opens without a Mode; closing it returns to the page it was opened from.
- `star-round`: Explorer's Dojo may link to the Sutras page.
- `badges`: Sutra scholar is listed to Explorer, who now has Sutra cards.
- `analytics`: following a Sutra tag is counted.

## Impact

- New `js/sutra-tag.js` (the Sutra map and the tag) and `js/sutra-progress.js` (pure progress per Sutra); `js/app.js` (Trick page, Dojo, Katas, Kata, Arena review, Watch, game page, Sutras page, Deep dive, Home, the router's Mode-free routes), `js/star.js` (header, worked example, replay, end screen), `js/arena.js` (the round's review list), `js/mental.js` (each Pro question names the Sutra that answers it), `js/sutras.js` (Explorer meanings), `js/gamify.js` (Sutra scholar in every Mode), `js/find.js` (menu order), `play/index.html` (menu order, Sutras in Explorer), `site/index.html` and `theme/site.css` (landing), `math.css` (tokens only).
- Tests: new `test/sutra-tag.test.mjs`, `test/sutra-progress.test.mjs`; `test/mental.test.mjs`, `test/arena.test.mjs`, `test/find.test.mjs`, `test/gamify.test.mjs`; new `e2e/tests/sutras-first.spec.ts`; updated header, Home, landing, Dojo and first-visit specs; one cov spec per new scenario.
- Docs: `GLOSSARY.md` (Sutra tag, Sutra way, Sutra progress), `docs/agent/play-experiences.md` if a kit line changes (none expected).
- Nothing new is kept, and the only new event is `math/sutra_tag/<surface>` with a fixed word (no Sutra, Trick, Mode or progress in it), so `parentNote()`, `cloud/README.md` and the privacy policy do not change (ADRs 0002, 0006 and 0008 hold: progress per Sutra is computed on the device from records that already stay there).
