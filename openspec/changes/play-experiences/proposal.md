# Proposal

## Why

The app teaches through question-and-answer rounds. The owner wants people to fall in love with math, which needs ways to play where math is the thing you do, not the thing you are tested on: discovery before explanation, making things, music, story, family play. Twelve such experiences were built and play-tested first as a separate playground; the owner asked to keep them inside Vedic Math, under the existing sections, replacing existing features where they overlap, with no new top-level area.

## What Changes

- **Twelve play experiences**, each a page inside an existing section (no new nav item):
  - Dojo: Sutra Spellbook (`#/dojo/spells`), Discovery Locks (`#/dojo/locks`)
  - Arena: Party Mode (`#/arena/party`), Ghost Races (`#/arena/ghosts`), Daily Number (`#/arena/daily-number`)
  - Games: Tala Lab (`#/games/tala`), Mandala Studio (`#/games/art`), Pattern Wall (`#/games/wall`), Teach the Apprentice (`#/games/apprentice`), Estimation Bets (`#/games/bets`), Math Lens (`#/games/lens`)
  - Sutras: The Lost Śulba Scroll (`#/sutras/lost-scroll`)
- **Section shelves**: the Dojo, Arena, Games and Sutras pages list their experiences for the Player's Mode. Explorer does not see Dojo and Sutras, so it does not see their experiences.
- **Party Mode replaces the Duel** (BREAKING for the `duel` capability): two to four Players on one screen, each answering at their own Mode, instead of two Players at one level. `#/duel` opens Party Mode; the Home tiles and the Sky place point to it; the Duelist badge becomes Party host (same counter).
- **Sparks from play**: finishing a puzzle, a lock, a round or a chapter earns a few Sparks, at most 150 a day from play experiences.
- **Per Player state**: experiences keep their progress under `vm.play.<player id>.*`, like the rest of the app.
- **Analytics**: route views count the page name (`play/<name>`), never the params after it; experiences send fixed-word events `math/play/<experience>/<action>`.

Out of scope:

- Phones as Party controllers (needs a server).
- World boards for the new experiences (they share links instead; nothing new is posted).

## Capabilities

### New Capabilities

- `play-experiences`: the twelve pages, where they live, shelves, per Player state, Sparks from play, privacy of shared links and the camera.

### Modified Capabilities

- `duel`: REMOVED; Party Mode takes its place.
- `analytics`: ADDED "Play experience events".

## Impact

- New `js/play/` (catalog, kit, icons, `exp/<id>.js` and their pure `-core.js` modules) and `css/play/` (loaded with the page that needs it).
- `js/app.js`: play route and `playView()`, section shelves, `#/duel` redirect, play rewards (`vmplay` event); `duelView()` removed.
- `js/arena.js`: Duel engine removed. `js/gamify.js`: Party host badge. `js/sky.js`: Party place. `js/metrics.js`: play route template.
- `build.py`: stamps and precaches `css/play/*.css` (`#vm-css` map) so the experiences work offline.
- `index.html`: nav highlighting covers section subpages. `math.css`: shelf cards.
- Tests: `test/play/*.test.mjs` (one per experience, plus catalog and shell rules); Playwright `e2e/tests/play.spec.ts`; `arena.spec.ts` Duel tests removed; `routes`, `offline`, `a11y` updated.
- Nothing new is sent to Firebase. Math Lens uses the camera only on the device and downloads its digit reader from a CDN on first use; `parentNote()` needs no change.
