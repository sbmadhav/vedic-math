# Design

## Where each experience lives

The rule was "no new route": every experience is a subpage of the section whose purpose it shares, so the nav stays Home, Learn, Dojo, Arena, Games, Sutras, Watch.

| Experience | Section | Why there |
|---|---|---|
| Sutra Spellbook, Discovery Locks | Dojo | They teach the speed tricks: casting a trick's method, and discovering it before it is named |
| Party Mode, Ghost Races, Daily Number | Arena | Races and the daily habit; Party Mode is the Duel's successor |
| Tala Lab, Mandala Studio, Pattern Wall, Teach the Apprentice, Estimation Bets, Math Lens | Games | Play and make |
| The Lost Śulba Scroll | Sutras | History of Indian mathematics, told as a mystery |

Routes are `#/<section>/<name>[/params]`. The section routes stay exact (`#/arena`), the play route comes last in the router, and names use lowercase words with hyphens, so they never collide with sutra deep dives (`#/sutras/<id>`, word characters only).

## Why Party Mode replaces the Duel

Both are same-screen races. Party Mode does everything the Duel did (two Players, one screen, a fair race) and more: up to four Players, each answering at their own Mode with a handicap, six round types. Keeping both would split family play in two. The Duel engine, its route and its tests are removed; `#/duel` links keep working.

## One kit, adapted to the app

The experiences share `js/play/kit.js`. Inside Vedic Math it reads the app's settings directly from storage, so the experiences do not import app modules and their logic stays testable in Node:

- level is the active Player's Mode (`vm.players`);
- sound is `vm.sound`; motion follows reduced motion, Pause motion and Calm (`vm.calm`);
- state is per Player: `vm.play.<player id>.<key>`;
- `track(action)` sends only `math/play/<experience>/<action>` (fixed words) and fires a `vmplay` event, which `js/app.js` turns into Sparks (capped at 150 a day) and badge counts.

## Styles and offline

Each experience has its own stylesheet, loaded with its page (about 200 KB in all, too much for `math.css`). `build.py` stamps them like modules and writes their hashes into a `#vm-css` map that `js/app.js` reads, and adds them to the precache, so the experiences open offline. The experiences' class prefix is `px-` (the video player already owns `vp-`).

## Risks

- **Sound is untested by ear.** Tala Lab and Mandala Studio synthesize sound with Web Audio; the scheduler is tested, the timbres are not.
- **Camera reading** (Math Lens) has only been tested on synthetic images; typing the digits always works.
- **Precache size** grows by the play modules and styles for every visitor.
