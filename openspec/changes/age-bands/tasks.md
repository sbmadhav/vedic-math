# Tasks

Prerequisites (owner Q15): `learnvedicmath` archived (paths `/play/` and `/js/`, Parent step retired, privacy policy draft in `docs/legal/`); `better-voice` Part B merged (Studio voice); `placement` archived (this change modifies its spec; the archive refuses otherwise). Check every path against the moved layout before starting.

## 1. Bands (`js/bands.js`, pure)

- [ ] 1.1 `bandOf(reading)`, `RULES` (design decision 4), `suggestedMode(reading)`. Verify: new `test/bands.test.mjs`: every grade and age maps as in the design table; no answer gives no band; `RULES` has choices 3, 4, 4; suggestions match the `MODES` grade ranges.
- [ ] 1.2 Never math difficulty (decision 5). Verify: new `test/bands-no-difficulty.test.mjs`: `js/adapt.js`, `js/levels.js`, `js/skills/*`, `js/check.js`, `js/placement.js` and `dailySet()` do not import `bands.js` or `copy.js` and never read `reading`; for each band and a fixed seed, the same Dial moves, `starPool`, daily set and Placement questions and start step.

## 2. The Grade answer

- [ ] 2.1 `js/store.js`: `player.reading` (`{ grade }` or `{ age }` with `at`), `setReading()`, `clearReading()`, `S.readingCard`; per-Player `voice`, and the one-time copy of `vm.voice` to every existing Player. Verify: `test/store.test.mjs`: round trip through the backup code; removing a Player removes it; the migration runs once and leaves `vm.voice` in place.
- [ ] 2.2 `gradeQuestion()` sheet (decision 1): buttons, "Tell my age instead", Skip, speaker button, Bolt's line; first visit before the Mode picker; the home card for existing Players; Me "For grown-ups: Reading help" with Change and Clear. Listeners on the view's `signal` (`js/life.js`). Verify: new `e2e/tests/bands.spec.ts`: a new visitor sees the question before the Mode picker; Skip leads to the picker with no answer saved; the card appears once for a seeded existing Player and Not now retires it; Change and Clear in Me take effect on the next question; nothing is spoken until the speaker button is tapped. `test/lifecycle-scan.test.mjs` passes.
- [ ] 2.3 Age reuse (decision 8, accepted by the owner as AB2). Verify: `e2e/tests/consent.spec.ts`: age 15 at the grade question means no age question at the first post; grade 8 still gets the age question; an existing Age answer of 11 is kept.
- [ ] 2.4 Mode picker "Suggested" tag (decision 7). Verify: `bands.spec.ts`: grade 1 tags Explorer, age 10 tags Challenger, Grown-up tags Pro; nothing is preselected and every Mode can be chosen.

## 3. The copy table (`js/copy.js`)

- [ ] 3.1 `js/copy.js` and `fx.copy(key, vars)` (decision 6); move the strings of every screen in the design's map into it, Mode variants first, then `early`, then `growing` where needed. Verify: new `test/copy-bands.test.mjs`: keys used exist; every mapped key has `early`; length and word limits; placeholders match; no em dash; `copy.test.mjs` still passes.
- [ ] 3.2 `tools/copy-table.mjs` (repo-only; `tools/` is already in `_config.yml` `exclude` from better-voice, else add it) prints the table as Markdown for review. Verify: running it prints one row per key; the owner reviews the `early` and `growing` columns before release.
- [ ] 3.3 Record every `early` variant and Bolt line with the Studio voice. Verify: `test/voice-coverage.test.mjs` includes them and stays at or above its bar.

## 4. Behavior by band (the screen map)

- [ ] 4.1 `js/fx.js`: `band()`, per-Player `voiceOn()` with the band default, `body.band-<name>` class. Verify: `e2e/tests/read-aloud.spec.ts`: an Early Challenger hears the next question after Next with no other tap; a Growing Explorer hears nothing until Hear it; two Players on one device keep their own Read aloud choice.
- [ ] 4.2 Practice and Endless runs (`practice()`): Early tap answers with 3 choices in every Mode, picture shown, typed only for answers that cannot be buttons; 4 choices for Growing and Fluent where choices show; band copy for praise, retry, hints and notices. Verify: `bands.spec.ts`: an Early Pro on `3-mult` sees 3 buttons and no input; a Growing Explorer sees 4; an Early Player on `9-expand` still gets the text field.
- [ ] 4.3 Star round and Hook: Early 3 choices instead of digit boxes, band Bolt lines, Early dare without a race. Verify: `e2e/tests/star.spec.ts`: an Early Challenger on 85² sees 3 buttons including 7225; Bolt's right-answer line is from the Early set (never "Boom."); `e2e/tests/hook.spec.ts`: an Early new Player's dare states 2.7 seconds and no calculator key appears after `fastForward(5000)`.
- [ ] 4.4 Timers: Early Practice untimed (games, Arena Practice, tower) through the existing `untimed` path; Growing no ticks and a bar clock; Ranked rounds keep the League's clock, input and choices with no ticks and a bar for Early and Growing. Verify: `e2e/tests/arena.spec.ts` and `games.spec.ts`: an Early Player's timed game Level has no clock; a Growing Player's Arena Practice has a bar and no tick (sound spy); an Early Challenger's daily round has the Challenger clock length and keypad.
- [ ] 4.5 Placement (modified requirements): read aloud and choices by band. Verify: `e2e/tests/placement.spec.ts`: an Early Pro gets 3 buttons and automatic speech; a Growing Explorer gets 4 buttons and no automatic speech; an Explorer with no band is unchanged.
- [ ] 4.6 Home, Mode picker, Sky and Dojo card, Tour speaker button: band copy. Verify: `bands.spec.ts` checks one line per screen for each band (Early variant, Growing variant or the Mode's line), and the Tour card has a speaker button for Early only.
- [ ] 4.7 `body.band-early` styles: larger buttons and spacing only, tokens only (`var(--space-*)`, `var(--radius-*)`), both color schemes. Verify: `e2e/tests/a11y.spec.ts`: the grade question, an Early Practice question and an Early Star question in both schemes, no serious or critical violations; 320 px reflow; buttons at least 44 px.

## 5. Privacy

- [ ] 5.1 Nothing leaves the device. Verify: `e2e/tests/privacy.spec.ts`: for each band, a session with Practice, a Star, an Arena daily round and Me sends no request whose URL or body contains the Grade answer, the age or the band; `cloudLog(page)` shows no field for them; `test/metrics.test.mjs`: answering the grade question sends no event.
- [ ] 5.2 Update `parentNote()` ("A grade or age, if given, stays on this device and only changes how much reading help Bolt gives"), `cloud/README.md` and the privacy policy draft in `docs/legal/`. Verify: reviewer reads the diff; `test/copy.test.mjs` passes.

## 6. Docs

- [ ] 6.1 `GLOSSARY.md`: drop "(Proposed in the `age-bands` change.)" from Grade answer, Reading band and Copy table once live, and update Read aloud and Mode. Mark `docs/adr/0008` accepted; add ADR 0001's consequence for decision 8 (an age from the grade question is the Age answer; a grade never decides posting). Verify: reviewer reads the diff.
- [ ] 6.2 `/opsx:archive age-bands` after `placement` is archived and this ships. Verify: `openspec validate --strict` passes; `openspec/specs/` gains `reading-bands` and `band-copy`.

## 7. Release check

- [ ] 7.1 Node, build and Playwright suites pass locally on the moved layout; the live E2E run is green after deploy. Before release, the owner sits with one child from each band (about 5, 8 and 11), each in a Mode of their choice, and notes where they needed help reading.
