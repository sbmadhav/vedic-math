# Proposal

## Why

Timed play is hard to use on the devices kids have. Rounds render inside the page (`#arShell`, `#gShell`, `#chShell` cards in `js/app.js`), so on a phone the keypad of the Arena (`runArena`, `js/arena.js:83`) can sit below the fold, the system keyboard opens over the answer when the hidden input is focused, and the page scrolls mid-round. Every Practice round with a clock (Arena Practice, game Levels, tower Sprint and Time attack) has a time limit the Player cannot turn off, which fails WCAG 2.2.1 Timing Adjustable. Motion is handled piecemeal: `prefers-reduced-motion` checks in `js/fx.js`, `js/ambient.js` and `js/app.js`, a "Moving background" switch on the Me page and in the music panel (`js/ambient.js:239`), and the site-wide "Pause motion" control being added to `/assets/explore.js` (sbmadhav.github.io, `html.motion-paused`, `window.siteMotion`, the `sitemotion` event) is not honoured here yet.

`docs/PLAN.md` Phase 1 lists "Game shell and Calm mode" (full-screen layout, keypad always visible on phones and Chromebooks, Calm toggle with no clocks, A/A+ text size), and the grilling extended it to Stars and added an untimed Arena Practice (`docs/star-quest.md` decision 27).

## What Changes

- **A play shell** for every timed round and every Star round: full screen, fixed, no scrolling, the question, entry and keypad always on screen (portrait and landscape, phones and Chromebooks), the system keyboard kept away from the custom keypad, safe-area insets respected, focus returned to the start button afterwards.
- **Calm**, one switch in the shell header and on the Me page (per device, off by default): Practice rounds lose their clock (Arena Practice, game Levels and practice rounds, tower challenges) and countdown ticks; Medals measured against the clock are not awarded in an untimed run (Sparks still are); Ranked rounds (Arena daily, ranked game rounds) keep their clock and say so; nothing in the app moves.
- **One motion rule:** the app stops all motion when Calm is on, when the device asks for reduced motion, or when the site-wide Pause motion is on (without turning Calm on). The "Moving background" switch keeps deciding whether the background is drawn; it is drawn still whenever motion is off.
- **A and A+ text size** in the shell header (per device), scaling question, answers and keypad.
- **Untimed Arena Practice**: a third Arena choice, 20 questions with no clock, adapting to the Arena Rating, Finish at any time; selected by default in Calm. This closes WCAG 2.2.1 for Practice; the daily challenge keeps its clock as a Ranked round.
- GLOSSARY.md gains **Calm**.

Out of scope:

- The plan's "ghost race" (racing your own earlier pace).
- Changing `/assets/explore.js` (another repo); this change only listens to what it exposes and works when it is absent.
- Untimed Ranked rounds (they would no longer be fair races on a shared Board).
- Redesigning the games themselves; each game's area moves into the shell as it is.

Affected: every Player in every Mode during timed play and Star rounds; Players who need more time or less motion; Players on phones and Chromebooks.

## Capabilities

### New Capabilities

- `calm`: the Calm switch, no clocks in Practice, Ranked rounds keeping theirs, the single no-motion rule with reduced motion and Pause motion, the moving background, and announcements.

### Modified Capabilities

- `page-layout`: ADDED "Play fills the screen with the keypad in view" and "Text size A and A+".
- `arena`: ADDED "Untimed Arena Practice".

## Impact

- New `js/shell.js`: `openShell(title, { signal, onExit })` returning the play area, with the header controls (Calm, A/A+, Stop or Back).
- `js/fx.js`: `calmOn()`, `setCalm()`, `textSize()`, `setTextSize()`; `noMotion()` (from `star-round`) also follows `sitemotion`; `body.calm` and `body.text-plus` classes.
- `js/arena.js`: `runArena()` takes `untimed` (20 questions, no clock); `runChallenge()` and the Duel run inside the shell; no ticks in Calm.
- `js/games.js`: `kit().timed()` skips the clock in Calm for non-Ranked rounds; `ctx.ranked` passed in.
- `js/app.js`: `arenaView()` (third choice, Calm default and note), `gameView()`, `challengeView()`, `duelView()`, `starView()` use the shell; `meView()` settings group; Medal rules for untimed runs.
- `js/ambient.js`: `reduced()` replaced by `fx.noMotion()`, redraws still on `sitemotion` and Calm changes.
- `math.css`: the shell (`100dvh`, safe areas, keypad pinned), `body.calm`, `html.motion-paused` next to every `prefers-reduced-motion` block, `body.text-plus`.
- GLOSSARY.md (Calm).
- Tests: new `test/shell.test.mjs`; `test/arena.test.mjs`, `test/games.test.mjs`, `test/lifecycle-scan.test.mjs`; Playwright new `e2e/tests/shell.spec.ts`, plus `arena.spec.ts`, `games.spec.ts`, `a11y.spec.ts`, `analytics.spec.ts`.
- Nothing new is sent (Calm and text size are device preferences; an untimed Arena Practice round is not posted). `parentNote()` and `cloud/README.md` need no change.
- **Order:** last of the Star Quest changes in the docs' build order; needs `star-round` (Star rounds and `fx.noMotion()`). Owns the Calm switch that `star-round`, `sky-home` and `hook-first-star` already honour through the `vm.calm` preference. Independent of the explore.js change: if `window.siteMotion` is missing, the `html.motion-paused` class check still works, and if neither exists only Calm and reduced motion apply.
