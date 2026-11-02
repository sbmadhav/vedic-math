# The Parent step follows the Age answer, not the Mode

Superseded in part by [ADR 0006](0006-under-13-players-use-device-boards-only.md) once the `learnvedicmath` change ships: the Age answer still decides, but Players under 13 use Device boards only and the Parent step is removed.

Players choose their own Mode with no age check, so a 9-year-old can pick Pro. If the Parent step depended on Mode, picking Pro would skip it and post an under-13 Player's Score online under a persistent anonymous ID, which can count as personal information under COPPA. So every Player gives one neutral Age answer before anything is posted, and anyone under 13 needs the Parent step in every Mode. Mode stays a free choice about difficulty and wording.

## Considered Options

- **Parent step for Explorer and Challenger only, Pro posts freely** (the first draft of the plan): rejected, because choosing Pro bypasses it.
- **Age question only when Pro is chosen**: rejected, because it makes Pro feel gated and still leaves the Age answer tied to a difficulty choice.
- **Parent step for every Player regardless of age**: rejected, because it adds friction for teens and adults, who are most of the Pro League.

## Consequences

- The Age answer is asked once per Player, neutrally (no hint that one answer unlocks more), and is stored only on the device.
- Placement asks it up front once the Hook ships. Until then it is asked the first time a Score or XP total would be posted.
- An age given to the grade question (the `age-bands` change, ADR 0008) is the Age answer when the Player has none, so the age question is not asked twice; a grade never sets or changes the Age answer, and neither answer ever makes posting less strict than the Age answer alone. Accepted by the owner on 2026-10-17 (AB2).
- Get a legal read before promoting the site to schools.
