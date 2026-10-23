# Design

## Context

The owner asked on 2026-10-21 that "the sutras and the new method" be "the focus of the app", and asked for no questions. Each decision below is made from the repository's own plan documents and is recorded here instead of asked. "The new method" is read as the Sutra way (GLOSSARY): computing with one short rule in a line or two, instead of school's long methods.

## Audit

Read before writing: `GLOSSARY.md`, `docs/PLAN.md`, `docs/star-quest.md`, `docs/adr/`, the specs (first-visit, site-header, honest-framing, sutra-deep-dive, sutra-pronunciation, star-round, arena, badges, watch-shelf, analytics, find, guide) and the open changes (learnvedicmath, landing-modes-and-return, try-trick-teaches, explorer-belts, find-and-home-polish, celebrations, placement, age-bands, react-typescript, render-performance), `js/app.js`, `js/sutras.js`, `js/sutra-details.js`, `js/slokas.js`, `js/vedic.js`, `js/star.js`, `js/arena.js`, `js/mental.js`, `js/games.js`, `js/videos.js`, `js/sky.js`, `site/index.html`, `play/index.html`.

Where a Player meets a method without its Sutra:

| Place | Today | Gap |
| --- | --- | --- |
| Star round (`js/star.js`) | Title "Square numbers ending in 5", Star n of 3 | No Sutra anywhere: header, Try a trick's worked example, the replay after a miss ("The Trick"), the end screen |
| Kata (`kataView`) | "Kata n of 50", par time, the Trick's `when` line | No Sutra |
| Katas list (`katasView`) | Sutra name as a tag | No meaning, no link |
| Dojo (`dojoView`) | Sutra name in small type inside each Trick node | No meaning, no link; Explorer is told nothing about the Sutras |
| Trick page (`skillView`) | Name, Say it, Respelling, the Trick's own meaning line | No link to the Deep dive; the Trick's meaning differs from the card's for two Sutras (s5, s10) |
| Arena (`arenaView`, `runArena`) | Score, right, missed, combo | Never says which Sutra answers which question, though Pro's families are near-base products and squares |
| Watch (`watchView`, the player) | "Trick" chip | Never names the Sutra |
| Games: Answer checker | "Use the digit sum check (casting out nines)" | Never names Guṇitasamuccayaḥ |
| Skill map, Speed tricks grade | Sutra name after "Practicing" | No meaning (left as is: a link cannot sit in the Skill link; the Trick page carries the tag) |

Where the Sutras are buried:

- Menu: sixth of nine, hidden in Explorer (`hide-explorer`), and so are their play experiences and the Sutra scholar badge.
- Home: Challenger's Sutra cards and Pro's Sutra deep dive are tiles under the closed "More ways to play"; Pro opens with today's Arena race; every Mode opens with the Sparks strip.
- Landing page: the hero, the Mode cards and "What you learn" never name a Sutra; "Where the tricks come from" is the fourth heading.
- Sutras page: two history cards come before the first Sutra card.
- A Deep dive needs a Mode (`#/sutras/<id>` shows the Mode picker to a new visitor, while `#/sutras` does not), so the landing cannot link to one.
- Progress: only "cards collected" (a card is collected by reading it once), nothing per Sutra.

## The Sutra map

Checked against `js/sutras.js` (the 1965 book's list), `js/sutra-details.js` (each Deep dive's explanation and reading), `js/vedic.js` (each Trick's `sutra` line and steps) and the critiques the repository links for Pro (`js/videos.js` LINKS with `history: true`, `js/slokas.js` refs marked `pro`). Every Trick keeps its `sutraId`; the new `RELATION` table in `js/sutra-tag.js` adds how the method relates to it, and the tag says it in words.

| Trick | Sutra or sub-sutra | Relation | Note |
| --- | --- | --- | --- |
| `sq5` Square numbers ending in 5 | s1 Ekādhikena Pūrveṇa | sutra | The book's own first example |
| `recip` 1/19, 1/29, 1/49 | s1 Ekādhikena Pūrveṇa | sutra | The book's Ekādhika recurring decimals |
| `osculator` Divisibility by 7, 13, 19, 29 | u5 Veṣṭanam | sub-sutra | The osculator is an Ekādhika number; the test is the sub-sutra |
| `from9` Subtract from 100, 1000 | s2 Nikhilaṃ | sutra | |
| `near-base` Numbers near a base | s2 Nikhilaṃ | sutra | |
| `div9` Divide by 9 with running sums | s2 Nikhilaṃ | special case | Nikhilaṃ division with divisor 9 |
| `crosswise` Any two numbers in one line | s3 Ūrdhva-Tiryagbhyām | sutra | |
| `by11` Multiply by 11 | s3 Ūrdhva-Tiryagbhyām | special case | Vertically and crosswise with a multiplier of 11 |
| `duplex` Square any two-digit number | s3 Ūrdhva-Tiryagbhyām | special case | The duplex (dvandva yoga) is how the book squares with this Sutra |
| `transpose` Solve by transposing | s4 Parāvartya Yojayet | sutra | |
| `zero-sum` Equations whose answer is zero | s5 Śūnyaṃ Sāmyasamuccaye | sutra | The tag uses the card's corrected meaning |
| `ratio-zero` The zero in two equations | s6 (Ānurūpye) Śūnyamanyat | sutra | |
| `add-sub` Swapped equations | s7 Saṅkalana-Vyavakalanābhyām | sutra | |
| `square-near` Squares near a base | s10 Yāvadūnam | sutra | Its full recipe is sub-sutra 7; the card of s10 lists it |
| `by9s` Multiply by 9, 99, 999 | s14 Ekanyūnena Pūrveṇa | sutra | |
| `check9` Check with digit sums | s15 Guṇitasamuccayaḥ | uses the idea | Honest correction: the digit sum check (casting out nines) is much older than the 1965 book; the Sutra itself is about sums of coefficients, and the digit sum is the same idea for numbers |
| `times5` Multiply by 5, 25, 50, 125 | u1 Ānurūpyeṇa | uses the idea | Honest correction: times 10 then halve is a proportion, the idea of the sub-sutra; the book uses Ānurūpyeṇa for working bases (that is `sub-base`) |
| `sub-base` A working base like 50 | u1 Ānurūpyeṇa | sub-sutra | The book's use |
| `ends10` Last digits add to ten | u8 Antyayordaśake'pi | sub-sutra | |
| `sqroot` Square roots by looking | u12 Vilokanam | sub-sutra | For perfect squares only, as the Trick says |
| `cuberoot` Cube roots in two seconds | u12 Vilokanam | sub-sutra | For perfect cubes only |

Arena questions (`js/mental.js`, `js/arena.js`) name the Sutra that answers them in one line, from the question's own numbers, or none:

- Pro `nearBase` (both factors near 100 or 1000): s2 Nikhilaṃ.
- Pro `mul2x2`: u8 Antyayordaśake'pi when the tens are the same and the units add to 10, else s3 Ūrdhva-Tiryagbhyām.
- Pro `square`: s1 when it ends in 5, else s10 Yāvadūnam within 20 of 100, else s3 (the duplex).
- Pro `percent` and `divide`: none. No Sutra in the book is the plain method for these, so no tag is shown rather than a stretched one.
- Explorer and Challenger pool questions: the Sutra of their Trick when the Skill is a Trick (`v-sq5` and the rest), else none.

The Sutras with no Trick in the app (s8, s9, s11, s12, s13, s16 and nine sub-sutras) keep their cards and Deep dives; their progress line says to read the Deep dive, and no tag points at them.

## Decisions

**1. One tag, three sizes, one module.** `js/sutra-tag.js` holds the map (`RELATION`), the Mode wording, and `tagHTML(id, { mode, surface, size, relation })`. Sizes: `full` (the Trick page: kind word, name, Say it, meaning, and for Pro the honest note), `line` (Katas, Kata, Arena review, game page, Watch player: kind word, name, meaning), `mini` (Dojo cells, Watch cards: the name only, with the meaning as its description). Every tag that can be a link is one link to `#/sutras/<id>`, whose accessible name is the Sutra's name, its meaning and "open its deep dive". Where the tag would sit inside another link or button (a Watch card, a games list card, a Dojo Trick node) it is plain text, and the link is next to it or on the page it opens.
- Rejected: a tag per Trick in `vedic.js`. The relation and the honest notes belong to the map, and a Trick's `sutra` line stays as it is for Say it and the Sky.

**2. Mode wording.** The name is always the card's IAST name (`lang="sa-Latn"`). The meaning: Explorer gets a new short `kid` line per Sutra in `js/sutras.js` ("One more than the number before"); Challenger and Pro get the card's meaning (the owner-corrected one). The kind word: "Sutra", "Sub-sutra", "Special case of" ("A special case of" in Challenger, "Part of" in Explorer: short, and still not the Sutra itself), "Uses the idea of" ("Idea from" in Explorer). Pro alone sees the note for special cases and borrowed ideas, as Pro alone sees the critiques (watch-shelf). When `age-bands` ships, the meaning moves into the Copy table: the `kid` line becomes the Early variant, so an Early Reading band reads it in any Mode.

**3. Where the tags go, and not.**
- Trick page: the `full` tag replaces today's Sutra block (keeping Say it and the Respelling).
- Star: the `line` tag under the Star's title and on the end screen; the replay after a miss is tagged "The Trick · <Sutra name>" in text. During the questions the header tag is plain text, not a link: a stray tap must not leave a round (star-round "Back by button only"); the link is on the end screen, one tap away.
- Try a trick (`js/try.js`, `try-trick-in-modes`, which replaced the trial Star's worked example card): its card's Sutra block is the `full` tag with surface `try`: the kind word, the name as the link to the Deep dive, that card's own meaning line (`tagHTML`'s `mean` option, so Explorer still reads "Its name means straight down and across."), Say it and the Respelling, with the card's why line under it.
- Kata: the `line` tag under the heading and on the result; the Katas list's tag becomes the `line` tag.
- Dojo: each Trick cell gains a `mini` tag link under its node.
- Arena: the result of a daily or Practice round lists "Sutras in this round": a `line` tag per Sutra that answered at least one question, with right of asked. Never during a timed round (it would cost seconds in a Ranked race), and nothing when no question had a Sutra. The challenge tower is left out (its questions come from school Skills).
- Watch: each card's "Trick" chip names the Sutra (text); the player's footer gets the `line` tag link. A video with Tricks of two Sutras names the first.
- Games: a game with `sutra` in `js/games.js` (only Answer checker, s15 "uses the idea") shows the `line` tag on its page, and the Sutra name on its card in the games list.
- Worked examples: the Trick page's step-by-step animator and Try a trick's card carry the tag (above); a Deep dive's own Worked examples are inside their Sutra.

**4. One tap there, one tap back.** A tag links to `#/sutras/<id>`. The router already draws the Sutras page and opens the Deep dive over it; this change passes "opened in page" when the Player came from another page of the app, so the Deep dive's close button goes back in history to that page (the Trick, the Kata, the Arena) instead of the Sutras page. Opened from outside (a link, a reload), close still goes to the Sutras page.

**5. A Deep dive opens without a Mode.** `#/sutras/<id>` joins `#/sutras`, Watch, Find and the Guide as routes that open before a Mode is picked, so the landing page links straight to three Deep dives. With no Mode the wording is Challenger's (`fx.t` defaults to it), as on the Sutras page today.

**6. Progress per Sutra is computed, never stored.** `js/sutra-progress.js` is pure: given a card and accessors for what the device keeps (`store.mastery`, `store.mastered`, `store.starState`, `store.katasDoneWhere`, `gamify.collectedCard`), it returns the card's Tricks, how many are started and mastered, Stars lit of total, Katas done of total, and whether it is collected. Wording by Mode: Explorer "1 of 3 tricks practiced" (no Stars in Explorer), Challenger "2 of 9 Stars lit", Pro "2 of 9 Stars lit · 1 of 3 Tricks mastered". A card with no Trick says "No trick for this one yet. Read how it works." Shown on the Sutra card's face (with a meter), in the Deep dive's "Try it yourself" (per Trick: Stars lit and mastery, or practiced and mastered in Explorer) and on Home. Nothing new goes into storage, the backup code or the Hand-off, and nothing is sent: ADRs 0002, 0006 and 0008 are untouched, and `parentNote()` does not change. Rejected: PLAN's "Sutra cards earned by use" (5 correct uses); it changes how a card is collected and the Sutra scholar badge, a separate decision.

**7. Home leads with the Sutras.**
- Challenger and Pro: the first door is the Sutra door: the next Star on Bolt's path (`SKY.suggested`, so a Placement level or a kept Belt still picks it) shown as its Sutra tag, "Next Star: <Trick>, Star n", Play this Star (the only primary button), Learn the sutra, and a line that says what a Sutra and a Star are. The Dojo's belts and "Open the Dojo" stay in the door's foot. Then the Arena door and the Skill map door, in both Modes (Pro's Arena moves from first to second; its Dojo door folds into the Sutra door). Then "Your sutras" (decision 6): the next Sutra and up to three started ones, each a link to its Deep dive with its progress, and "See all 29 sutras". Then the Player strip (Sparks, streak, badges), the quests, Pro's leaderboard, and More ways to play (its Sutra tile stays, so no tile leaves Home).
- The headings: Challenger "Learn a sutra, then use it", Pro "Mental math, the sutra way". Explorer keeps "What do you want to play?".
- Explorer: one "A sutra to say" card above the eight picture tiles: one Sutra a day from a short list of those with a plain-number idea (s1, s14, s2, u8, u12), its name with Say it, its Explorer meaning and a "See how it works" link to the Deep dive. The tiles, the Read aloud switch and Watch and sing stay as they are.
- The Sky home (opt-in) is unchanged: it already draws the Sutras as Constellations.

**8. Sutras first in the menu, in every Mode.** Home, Sutras, Learn, Dojo (not in Explorer), Arena, Games, Watch, Guide, Find. `sectionLines()` in `js/find.js` follows (it is the menu order and the tooltips), with an Explorer line ("Short math rules with long names. Tap to hear them."). Explorer gets the Sutras page and the Deep dives in its own words: the lede, the card meanings, and the Worked example tip it already has. Its play experiences stay above Explorer (catalog decision of 2026-10-17); the Sutra scholar badge is listed to Explorer, who can now collect cards; the Explorer Dojo gets its "Read about all 29 sutras" button back. Tabs still appear only after a Mode is picked.

**9. The landing page leads with the Sutras and the method.** The hero headline becomes "Math in your head, the sutra way" with the line "Free, for ages 4 to adult." (13 words before the button). A new section follows the hero, before "Pick how you learn": "One short rule, one line of work", one sum done both ways (98 × 97: school's two rows and an add, then Nikhilaṃ's 95 | 06), three Sutras each with its meaning and one example as links to `/play/#/sutras/s1`, `s2`, `s3`, and the honest line on where they come from with "All 29 sutras" to `/play/#/sutras`. "What you learn" and "Where the tricks come from" stay as they are, below the Mode cards. The welcome back script keeps working (it rewrites the hero's two lines and button only).
- Honest framing (honest-framing spec): the section credits the 1965 book, says the Sutras are not found in the Vedas, and claims nothing ancient. Pro-level critiques stay inside the game (Pro only, as the watch-shelf spec says); the landing names no critique and makes no claim one would dispute.
- The in-app Mode picker's hero belongs to `try-trick-in-modes`; this change leaves it alone.

**10. Voice.** No spoken line is added or changed, so no Studio voice re-record is needed. Tags, progress lines, the Home cards and the landing section are never passed to read aloud or Listen, and none sits inside a Listen button's `from:` scope (`.mq-q`, `.mq-steps li`, `.mq-ans`, `.sc-say`). Say it in the Trick page's `full` tag and on Explorer's Home card plays the Name clip already recorded for that Sutra (`sounds/sutras/<id>.m4a`), only after a tap, as the sutra-pronunciation spec says.

**11. Analytics.** One new anonymous event, `math/sutra_tag/<surface>` titled "Sutra tag: <surface>", when a tag link is followed; `<surface>` is a fixed word (`trick`, `star`, `try`, `kata`, `katas`, `dojo`, `arena`, `watch`, `game`, `home`). The Deep dive it opens is counted as today (`math/sutra/<id>`, the route view). No Sutra id is added to the tag event (the route view already says which Deep dive), and nothing else is sent (analytics spec, "Events carry no identifiers").

**12. Accessibility.** A tag link's name holds every visible word plus "open its deep dive" (WCAG 2.5.3); the IAST name has `lang="sa-Latn"`; the kind word is text, not color. Tokens only, so it reads in Daybreak and Deep Space; it wraps at 320 px. Meters on cards are `role="img"` with their words, like the Sutras page's bar. Home's Sutra door keeps Play this Star first in Tab order and on screen at 390 by 844 (find-and-home-polish "Home fits a phone").

## How it maps to the React migration

No view is added, so `react-typescript`'s tasks gain no view. Each piece lands where its view's migration task already goes:

- `js/sutra-tag.js` and `js/sutra-progress.js` are pure data and rules: they move with the content and logic modules (task 3.3, to `shared/src/` or `app/src/logic/`); `tagHTML` becomes a `SutraTag` component (with `SayButton`), used by every route module below.
- Trick page, Dojo, Katas and Kata: the Learn and Dojo route modules (tasks 6.x). Star: the Star route module. Arena review: the Arena route module. Watch: task 5.2. Sutras page and Deep dive (progress, open without a Mode, close returns): task 5.3. Home and its Sutra door, "Your sutras" and Explorer's card: task 7.1. The menu order: the root layout.
- Progress reads go through the store's hooks (`useSyncExternalStore` with a server snapshot), never in a server render (design D14).
- The landing page is a static page (`site/`), outside the React app.

## Coordination

- `try-trick-in-modes` (another agent) moves Try a trick into each Mode. It owns the Mode picker hero and the Mode cards' Try. This change touches the landing page's hero and a new section, Home's doors and Explorer Home; where both touch the same file the later one rebases. When its pull request is open, the landing and Home part of this change is stacked on it.
- `react-typescript` phase 2 and the re-plans (`replan-*`) are not touched. No view here is Locked today.
- `archive-finished-changes` archives `try-trick-teaches`, `celebrations`, `explorer-belts` and `find-and-home-polish`. This change's deltas are written against their archived text (`Badges listed per Mode`, `Where Stars are offered`, `Three doors first on Home`), so it validates after that merge.
- `learnvedicmath` and `landing-modes-and-return` hold `landing-pages` and the new header requirement; this change's `landing-pages` and `site-header` deltas build on them, so it is archived after both. `learnvedicmath`'s header requirement lists the game's nav; this change updates that list to the new order.

## Risks / Trade-offs

- More text on small screens. Mitigation: `mini` tags in dense places, the meaning wraps under the name, and Home keeps Play this Star above the fold at 390 by 844.
- Explorer meets long Sanskrit names. Mitigation: the Explorer meaning is first-grade English, Say it plays the name, and nothing is required of Explorer on the Sutras page.
- The Pro Home no longer opens on the Arena. The Arena stays the second door with its own primary page; the owner asked that racing not lead.
- A tag on Arena results could read as a claim that every Pro product is a Sutra. Mitigation: tags only where one Sutra answers the question in a line; percents and division get none.

## Migration

None. Nothing new is stored. Old records give the same progress lines.
