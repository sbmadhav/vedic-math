# Star Quest: decisions so far

The game-world direction for Phase 1 ("the magic moment" in `PLAN.md`). This file records what was decided in the 2026-10-15 session, what was only proposed, and the open questions for the next grilling round. Nothing here is built in the app yet.

- Prototype source: `docs/prototypes/star-quest/index.html` (open it in a browser; it is a single self-contained page). `docs/` is excluded from the published site.
- Hosted copy (private to the owner): https://claude.ai/artifact/UGeYFXcehapmUL2nVzmbmU, version 2.

## The ask, in the owner's words

> I want this to be more interactive, like the kids are inside a game, instead of tasks and tabs, the rendering needs real think through. [...] teaching should be more instant. made a mistake, learn and earn. Incentivize the learners to make mistakes, try harder things keep making mistakes and learning. like different levels in a game. [...] I dont want full 3d game rendering that will be a lot, but how can we add more animations and illustrations to get there?

## Decided by the owner

1. **A game world, not tasks and tabs.** Players should feel they are inside a game, moving through levels.
2. **Instant teaching.** A mistake is followed at once by the lesson, on the Player's own numbers, not by a page of text.
3. **Mistakes are rewarded.** "Learn and earn": the design should push Players to try harder things, make mistakes and learn from them.
4. **No 3D engine.** Animation and illustration carry the feel.
5. **Phase 0 first.** Trust bugs and privacy were fixed before any game work (done: all nine changes merged on 2026-10-15).
6. **Questions never repeat in a fixed order.** Each round draws a fresh, shuffled set and avoids the previous round's numbers where the pool allows. (Prototype comment, applied in version 2.)
7. **No locked levels.** Every level is open from the start. The suggested path is still drawn on the map. (Prototype comment, applied.)
8. **Skipping is allowed and visible.** A Player can skip past a level at any time. A skipped level gets its own marker (dashed outline, skip badge, "skipped" label) so it reads as passed over, not completed. Completing it later clears the marker; skipping a completed level leaves it completed. (Prototype comment, applied.)
9. **Watch round length.** Long rounds bore people. The prototype now uses 4 questions per round, tunable. (Prototype comment, applied.)

## Proposed and shown in the prototype, not yet confirmed

These came from Claude's concept and the prototype. The owner said the prototype "looks good" but has not ruled on each one; treat them as the recommended answers going into grilling.

- **World theme: the night sky.** Each Sutra is a constellation; each Trick is a star in it. Builds on the existing 27-nakshatra wheel and Bolt instead of a new art style.
- **Bolt is a co-pilot and teacher, not a pet.** Six SVG poses (idle, think, surprised, explain, cheer, wink). He delivers the teaching so the screen has almost no text.
- **A level is a short flight to light one star**, on one Trick.
- **The mistake loop:** wrong answer, then a fast animated replay of the Trick on the Player's own number (skippable), then a rematch on a nearby number.
- **Sparks** are the currency that lights stars. Prototype values: right answer +2, comeback (rematch right after a miss) +3, Dare +4. Target 8 sparks per star with 4-question rounds, so a clean round lights it.
- **Anti-gaming:** comeback sparks only from a corrected mistake, at most once per question type (two-digit, three-digit) per round, so deliberate misses earn nothing extra.
- **Dare:** an optional harder question each round (offered from question 2). Right pays double; a miss costs nothing and still shows the replay.
- **Rating moves:** right +1, miss -1, comeback +2, Dare right +2. A corrected mistake nets the same as a first-time right answer.
- **Answer boxes show the number of digits** of the answer.
- **The first-time reveal** plays the Trick once (35 squared) before the first question of the first star.
- **Calm mode:** the same world with motion off, defaulting to the system reduced-motion setting.
- **Rendering stack:** SVG for the map, stars and Bolt; 2 or 3 parallax layers for depth; CSS and the Web Animations API for motion; the existing canvas confetti for sparks. No framework, no bundler, works offline. Rive for Bolt is a possible later upgrade.
- **Tabs mostly disappear.** The map becomes home; Arena, Duel and Boards become places on the map (for example a race track, a duel ring, a tower).
- **Return to the map after a lit star** happens automatically after 4.5 seconds (or by button).

## Tensions with the current plan and glossary

- **"Not doing in 2026"** in `PLAN.md` rules out extra reward systems, an animal buddy and boss battles. Sparks, Bolt and Dares edge toward these. Proposed reading: Bolt is a teacher, not a buddy; a Dare is a harder question, not a battle; sparks replace a reward rather than adding one. Needs the owner's ruling.
- **"Level"** in `GLOSSARY.md` means one of the 72 numbered stages of a game. In Star Quest a "level" is a star. One of them needs a new word.
- **Sparks vs XP vs Score.** The glossary has XP (progress from everything) and Score (Ranked rounds only). Sparks are a third number unless they replace or feed one of these.
- **Rating** in the glossary is per game, per Skill and for the Arena. The prototype keeps one Rating for the whole sky.
- **Skip vs Placement.** Free skipping overlaps with Placement setting the starting point.

## Open questions for the next grilling round

Rough order; the first group can be asked together.

1. Is the night sky (Sutra = constellation, Trick = star) the world, or does the owner want a different theme?
2. Does the map replace the current home and tabs, or sit beside them at first?
3. Do sparks replace XP, feed XP, or stay separate? Do they ever reach World boards?
4. Is Bolt a co-pilot (teacher only), and is that compatible with "no animal buddy"?
5. Are the spark values (2 / 3 / 4, target 8, 4 questions) right after playing version 2?
6. Is the comeback limit (once per question type per round) too stingy?
7. Do the digit-count answer boxes stay, or are they too much of a hint?
8. Auto-return to the map, or button only (kinder to screen readers)?
9. What word replaces "level" for a star, given the glossary's Level?
10. Does a skip count for anything (for example, does it advance Bolt and the path), and does Placement suggest where to start?

Later, once those settle:

11. How do Arena, Duel, Daily Sutra and Boards appear on the map?
12. How do Explorer, Challenger and Pro differ in the sky (density, wording, narration)?
13. How do the 135 Skills and the Dojo Belts map onto constellations and stars?
14. Which Phase 1 items from `PLAN.md` does Star Quest absorb (Hook, Mistake Museum, Game shell and Calm mode) and which stay separate?
15. How is it split into OpenSpec changes (proposed: map, mistake loop, Bolt, game shell)?

## Next step

Run `/grill-with-docs` on this file. Settle the answers in `GLOSSARY.md` and an ADR where needed, then write the OpenSpec changes.
