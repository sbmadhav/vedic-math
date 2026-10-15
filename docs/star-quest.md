# Star Quest: decisions so far

The game-world direction for Phase 1 ("the magic moment" in `PLAN.md`). This file records every decision, from the 2026-10-15 session and the grilling that followed it. Terms are defined in `GLOSSARY.md`; Sparks replacing XP is ADR 0003. Nothing here is built in the app yet: the next step is the OpenSpec changes listed at the end.

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

## Decided in the grilling (2026-10-15)

Every recommended answer was accepted.

### The world
1. **The Sky is the world.** Each Sutra is a Constellation; its Tricks' Stars sit in it. Built on the 27-nakshatra wheel and Bolt.
2. **The Sky replaces the tile grid as home**, with an "All places" menu as the plain list.
3. **Landmarks** around the Sky's edge lead to the other places: Arena (race track), Duel (ring), Games (arcade), Watch (observatory), the Skill map (library), Daily Sutra and Boards (tower).
4. **The Sky holds Tricks only.** The 135 school Skills stay in the Skill map.
5. **Challenger and Pro first.** Explorer keeps its current home until it has its own Constellations with every prompt read aloud (a later change).
6. **Art at launch:** Constellations drawn as lines between Stars with the Sutra name, the nakshatra wheel and parallax star layers, Bolt's six poses. No per-Constellation illustration yet.

### Stars
7. **A Star is one of three steps of rising difficulty for one Trick**, each drawing from one third of that Trick's 50 Katas. 21 Tricks make 63 Stars across 17 Constellations.
8. **Every Star is open.** Skipping is allowed, marked on the Sky, and earns nothing; lighting it later clears the mark. Placement picks the first Star Bolt suggests.
9. **Bolt's suggested path follows Belt order**, white to black. A Belt is earned by lighting all 9 Stars of its 3 Tricks.
10. **A Star round is 4 shuffled questions**, avoiding the previous round's numbers where the pool allows.
11. **A Star adapts to its Trick's own Rating** (each Trick is already a Skill).
12. **Stars are Practice**: Sparks, no Score, never posted to a Board.
13. **Bolt is a teacher and co-pilot only**: no feeding, moods, outfits or collecting.
14. **The answer boxes show the digit count** in Challenger and are hidden in Pro.
15. **Back to the Sky by button only**, never automatically.

### Mistakes, Comebacks and Dares
16. **A miss shows the Trick replayed on the Player's own number** (skippable), then a rematch on a nearby number.
17. **A Comeback** (rematch right after a miss) pays more than a first-time right answer, at most once per kind of question per round.
18. **A Dare** is an optional harder question from question 2: right pays double, a miss costs nothing and still shows the replay.
19. **After two misses in one Star, even after the replay, Bolt offers one short video** for that Trick, hand-matched from the Watch shelf, played in the page, skippable, earning nothing, at most once per round.

### Sparks (ADR 0003)
20. **Sparks replace XP everywhere**, including the weekly Board. Existing totals carry over 1:1.
21. **Star values sit on the existing scale:** right 10, Comeback 15, Dare 20, and 40 lights a 4-question Star.
22. **The numbered player level becomes a Title** (Number Rookie to Vedic Legend) with no number; the Level 5 and Level 10 badges are renamed to their Titles.
23. **Watching videos earns nothing.** The +5 per new video goes; the Video learner badge stays.
24. **Katas lose their own 0 to 3 stars; game Levels' 0 to 3 rating becomes Medals** (bronze, silver, gold).

### Plan items absorbed
25. **The Hook becomes the opening of the first Star.** Returning Players skip it.
26. **The Mistake Museum is dropped**: the in-Star replay and rematch replace it.
27. **The game shell and Calm mode apply to Stars**, and add an untimed Arena Practice (also closes WCAG 2.2.1).

### Rollout and measurement
28. **Existing progress migrates:** a Star starts lit when at least half the Katas in its third are done; earned Belts stay earned.
29. **Opt-in first:** a "Try the new Sky" switch for Challenger and Pro for about 2 weeks, then the default (Explorer keeps the old home).
30. **Anonymous counts** for Star lit, Star skipped, Comeback, and Dare taken and won.

## OpenSpec changes, in build order

1. `sparks-replace-xp`: the rename, Titles, removing the video +5, carrying totals over, Medals.
2. `star-round`: one Star end to end (mistake replay, Comeback, Dare, skip, Bolt, 4 shuffled Kata questions, Trick Rating, the video offer).
3. `sky-home`: the Sky, Constellations, Landmarks, "All places", Belts, the opt-in switch, migrating progress, the new counts.
4. `hook-first-star`: the Hook as the first Star's opening.
5. `game-shell-and-calm`: full-screen play, Calm mode, untimed Arena Practice.

Explorer's own Constellations come after these, as a separate change.
