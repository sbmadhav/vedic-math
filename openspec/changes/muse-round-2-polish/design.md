# Design

## Context

- Source: round 2 of the Muse play-through review (2026-10-31), items 1 (the games half) and 4 (Number rain, the lobby after Stop), plus the "stopped rounds save no score, worth stating more clearly in game" note; the audit table with every verdict is in `_handoff/feedback/2026-10-31-muse-review-2.md` (outside the repo on purpose).
- The defects the review confirmed shipped in the `muse-round-2` pull request: fraction choice names, "1 miss", the Ghost Races count shown alone, the backup code shown and a restore field, the Video learner badge toast inside the player, a suspended Web Audio context handing a studio line to the device voice. This change is only the new behavior.
- What was already planned and is not repeated here: a message for every Sparks award and the daily cap (`muse-review-polish` D4), quests completing at the Mode switch (D3), a wait indicator (D1), the quest refresh line (D2).
- The owner delegated the product calls below (owner-delegated, 2026-10-31). The owner approves this change before it is applied.

## Decisions

### D1. Stopped rounds say what they save, in the lobby and on the button (owner-delegated, 2026-10-31)

The lobby's "Your skill in this game" paragraph gains the sentence "Stop ends a round with nothing saved: no score, no Sparks and no change to this skill." under the existing "Every round adapts" line, so the number a Player sees after a stopped round is explained next to it. A game's Ranked round labels its exit "Stop (nothing saved)"; Endless practice keeps "Finish", which does save. No confirm dialog: a timed round has to stop the moment Stop is pressed, and a dialog over a clock is the kind of pressure the game avoids. The Arena and the Challenge tower keep their own words (their Guide sections already say a stopped round is not scored).

Alternatives: showing "reached Level 7 this round" in the lobby (rejected: it would look like a saved result); saving the skill from a stopped round (rejected: it would let a Player stop whenever the dial turns against them).

### D2. Games read their questions aloud through one helper (owner-delegated, 2026-10-31)

Every game shows its question through the kit's `ask(html, { say })`: it sets the live line the games already use (`ctx.say`), and when read aloud is on it speaks `say` or the words `normalize(html)` gives (the same words `choiceLabel()` gives the choice buttons). One helper, so a new game cannot forget the voice. The prompts:

| Game | Spoken at each question |
| --- | --- |
| More or less (every level) | "Which is more: three sixths or two fifths?" (dots: "Which has more?" as now) |
| Bigger slice | "Which is bigger: three eighths or one half?" |
| Times rocket | "48 times 7" |
| Make ten | "Make 10 with two of these." |
| Number bonds | "7 and what make 10?" |
| Flash dots | after the flash: "How many did you see?" |
| Number detective | "Make 20 from 3, 7 and 5." |
| Number line | "Where is 2.3 on the line?" |
| Match the pairs | nothing (a memory game has no question) |
| Spot the mistake | "Is this right: 47 times 11 equals 517?" |
| Number rain | "Tap the multiples of 7." (again when the number changes) |
| What comes next | "What comes next: 3, 6, 9, 12?" |
| Balance it | "Find the mystery number: x plus 3 equals 9." |

Timed games do not wait for the voice, and the voice is cut by the next question (`voice.speak` cancels what is playing), so a fast Player hears the start of each line, which is how Practice already behaves. Explorer's existing lines stay as they are.

Alternatives: reading only in untimed and Calm rounds (rejected: the reviewer turned read aloud on and expected the game to talk; a Player who finds it too much turns the setting off).

### D3. Number rain stands still without motion (owner-delegated, 2026-10-31)

Under `noMotion()` (Calm, Pause motion or the reduced-motion preference) the rain does not drift. Numbers appear in place in a row near the top, each in a free column, stay for `max(2.5, 4 - 0.1 × level)` seconds, then leave; a multiple that leaves untapped is a miss, as a drop that reaches the ground is today. The spawn rate stays the same, so the round has as many numbers as a moving one. The "falling numbers" group label reads "Numbers that wait" in this mode, so a screen reader is not told things fall. With motion on, nothing changes: the speed and the 0.6 factor for reduced motion go, since reduced motion now takes the still mode.

Alternatives: keeping the drift but larger targets (rejected: the complaint is the moving target, not its size); pausing the round while the Player aims (rejected: a timed game with a pause is a different game).

### D4. What this change does not do

- Sparks on the Scroll's chapter pages are paid today (15 a puzzle, 25 a chapter, inside the 150 a day cap) and only lack a message: `muse-review-polish` D4.
- The quest toast in an Endless run is a quest met by the day's earlier answers completing at the next answer, or an answers quest reaching its goal mid-run: `muse-review-polish` D3 and D4 (the Sparks history makes it checkable).
- The studio voice is not on the live site (built `--voice off` until R2 exists). Its fallbacks were checked in the `muse-round-2` pull request; setting up the host is the owner's task (`docs/agent/studio-voice.md`).

## Risks

- D2 adds spoken lines whose frames need a studio re-record (listed in the proposal); until then the device voice reads them, which is the live site's state anyway.
- D3 changes a timed game's feel under Calm; Medals in that mode are unchanged (a Level played without the clock already earns no Medal).
