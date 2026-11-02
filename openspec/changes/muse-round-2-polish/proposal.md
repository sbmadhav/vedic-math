# Proposal

> **Approval.** Round 2 of the Muse play-through review (2026-10-31; the audit table is in `_handoff/feedback/2026-10-31-muse-review-2.md`, outside the repo) was reviewed under the owner's instruction "create a special agent to review this and create a detailed actionable plan". The defects it confirmed shipped as fixes in the `muse-round-2` pull request; this change holds the product polish that is new behavior. The product calls are in `design.md`, each marked "owner-delegated, 2026-10-31". The owner approves this change before it is applied.

## Why

The second Muse review played every game and experience and found the maths right and the privacy design sound. The things it could not tell from inside the game, checked against `main` and the live site on 2026-10-31:

- **A stopped round says nothing about what it dropped.** Stop in a game round leaves "with nothing saved" (`quit()` in `gameView()`, `js/app.js`): no Score, no Sparks, and no change to the game's skill, so the lobby still shows "Your skill in this game: Level 5" after a round whose level rose to 7. That is correct (a stopped round is not a finished one) but only the Guide says so. The reviewer called it "fair but worth stating more clearly in game" and read the lobby's unchanged number as stale.
- **Games do not read their questions aloud.** With "read questions aloud" on, Practice, Stars, Katas and the Arena (in Explorer) speak each question (`fx.speakQuestion`), and so do every Listen button and Test voice; checked on the live site with a recording speech engine, every one of those reached the device voice. The games are the exception: `js/games.js` speaks only Balloon pop's "Pop 3 balloons" and More or less's "Which has more?" at the dot levels. Every other game shows its question in the page and plays a sound effect, so a Player who turned read aloud on hears effects and no words, which is what the reviewer reported as "game questions produced only sound effects". The Star half of that report could not be reproduced: Star questions reach the device voice on the live site, and the live site has no studio voice at all (it is built with `--voice off` until the owner sets up R2), so there is no missing clip to fall back from.
- **Number rain keeps moving under Calm.** `noMotion()` only slows the drops to 0.6 of their speed (`js/games.js`, the `rain` game): under Calm, Pause motion or reduced motion the numbers still drift, and a slow or assistive tap lands after the number has moved. The reviewer's automated taps "mostly missed", the missed multiples counted against the dial, and the round fell to Level 1 with 0 points.
- **Sparks that pay silently, and a quest toast with no visible trigger.** The Lost Scroll pays 15 Sparks per puzzle and 25 per chapter (`PLAY_SPARKS` in `js/app.js`, within the 150 a day cap) with no message, which the reviewer read as "no Sparks award". A quest met by the day's earlier answers completes at the next answer anywhere, which landed as a toast inside an Endless run. Both are already planned: `openspec/changes/muse-review-polish/` design D4 (a message for every award, and the cap) and D3 (quests complete at the Mode switch). This change adds nothing for them and only points there.

## What Changes

- **Stopped rounds say what they save.** The game lobby's skill line gains one sentence: "Stop ends a round with nothing saved: no score, no Sparks and no change to this skill." The Stop button's label in a Ranked round of a game reads "Stop (nothing saved)". The Guide's games section keeps its warning.
- **Games read their questions aloud.** When read aloud is on, every game speaks its prompt the moment a question shows, in the words read aloud already uses for the same markup (a fraction as "three sixths", a power as "2 cubed"): "Which is more: three sixths or two fifths?", "Tap the multiples of 7", "48 times 7", "What comes next: 3, 6, 9, 12?". Timed games do not pause for the voice. Balloon pop and More or less keep their lines.
- **Number rain stands still under Calm, Pause motion or reduced motion.** The numbers appear in place in a row near the top, wait a fixed time (4 seconds, a little less as the level rises, never under 2.5), then leave; a multiple that leaves untapped is still a miss. Nothing drifts. With motion on, the game is unchanged.

Out of scope: a Sparks message for the Scroll and the experiences (muse-review-polish D4); the quest timing (muse-review-polish D3); the studio voice on the live site (owner setup, R2 bucket, `docs/agent/studio-voice.md`); a confirm step on Stop (a timed round must stop at once).

Affected: every Player in the games, in every Mode. Nothing new is sent anywhere.

## Capabilities

### New Capabilities

- `games`: stopped rounds say what they save; game prompts are read aloud; Number rain under Calm.

### Modified Capabilities

(none)

## Impact

- `js/app.js` (`gameView()`: the lobby sentence, the Stop label), `js/games.js` (each game's prompt through one `ask(html)` helper on the kit, which sets the live line and speaks it when read aloud is on; the `rain` game's still mode), `js/fx.js` (nothing new: `speak()` and `noMotion()` as they are).
- New spoken lines (fixed frames the studio voice records once; the numbers come from clips or the device voice): "Which is more:", "or", "Tap the multiples of", "What comes next:", "Make", "with", "Which part is missing:", "Is this right:", "Where is", "on the line", "Find the mystery number:", "Stop ends a round with nothing saved: no score, no Sparks and no change to this skill." Listed for the owner's re-record (`tools/voice/lines.mjs`), never recorded by an agent.
- Tests: `test/games.test.mjs` (every game's `ask` text is words, no markup; Number rain's still timings), `e2e/tests/games.spec.ts` (the lobby sentence after Stop; a game question reaches a recording speech engine; Number rain under Calm shows numbers that do not move and keeps the taps), `e2e/tests/read-aloud.spec.ts` (More or less at a fraction level says both fractions in words).
- `docs/perf/baseline.json`: a `firstLoad.changes` entry if `js/games.js` grows past the budget.
