# The Placement level sets where Practice starts, never the League

Status: proposed in the `placement` change (numbered after the `learnvedicmath` change's ADRs 0004 to 0006).

Placement finds a Player's Placement level, a school grade, so a child who is ahead of their age group gets math that fits. If that level also moved the Player to another League, or set where Ranked rounds start, a child could fail Placement on purpose to land in an easier League, and a strong 6-year-old would be pushed onto a Board of teenagers. So the Placement level only decides where Practice starts (Ratings with no saved value, the suggested Skills and the first Star). League stays equal to Mode, Ranked rounds with no Rating start at the Mode's start, and the daily Arena set is the same for everyone in a League.

## Considered Options

- **Move the Player to the Mode that matches their level**: rejected, because Mode also sets wording and controls, and a 6-year-old placed at grade 5 still needs Explorer's look (owner Q1).
- **Write Ratings at Placement time**: rejected, because a game's Rating is shared by its Practice and Ranked rounds, so the first Ranked round would start at the Placement level too.
- **A level per area (number, fractions, algebra)**: rejected, because the climb would be 3 to 4 times longer, and per-Skill Ratings even out the differences within a few rounds (owner Q9).

## Consequences

- `js/adapt.js` tells Practice callers from Ranked ones (a Practice flag), and only Practice reads the Placement level.
- Taking Placement later can only raise saved Ratings. Raised game Ratings are then used by Ranked rounds as any saved Rating is: the one, upward-only, opt-in path from Placement to a Ranked round's start.
- Nothing about Boards, Scores, Leagues or the daily Arena set depends on Placement, so retaking it is always safe.
