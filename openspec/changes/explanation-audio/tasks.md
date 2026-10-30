# Tasks

Prerequisites:
- `better-voice` part B merged (the studio voice and `js/explain-lines.js`), with its recording run including the explanation lines.
- The owner approves this change.

## 1. Voice

- [x] 1.1 `js/voice.js`: `speak()` returns a Promise, true when the line finished and false when it was stopped or a newer line took over, for the studio voice (whole and clips), the built-in voice and the natural voice; `stop()` settles the pending line with false. New `speakAll(texts)` plays lines in order with a 250 ms pause and stops at the first false.
  - Verify: `test/voice.test.mjs` and the part B e2e specs (`voice.spec.ts`, `read-aloud.spec.ts`) still pass; `listen.spec.ts` sees buttons return to not pressed after the lines end and after a stop.

## 2. Listen buttons

- [x] 2.1 `js/listen.js`: `listenBtn(key, what)`, `toggle()`, `stopListen()`, `wireListen(root, signal)`; one playing button; listeners on the view signal through `js/life.js`; aborting stops it.
  - Verify: `test/lifecycle-scan.test.mjs` passes; `listen.spec.ts` "leaving the page stops it", "one at a time".
- [x] 2.2 `js/explain-lines.js`: `skillPageLines` (a Trick's page reads its idea and when to use it), `sutraSectionLines`, `linesForKey`, `listenKeys`. Existing functions unchanged.
  - Verify: `test/explain-lines.test.mjs` "every Listen key resolves to recorded lines in every Mode" and "the keys the app draws exist".
- [x] 2.3 Buttons in `js/app.js` (Skill page, worked example, solution, Trick tool, Sutra card, deep dive sections and diagram, History, Guide sections, game description) and `js/tour.js` (each step).
  - Verify: `listen.spec.ts` covers a Skill page (recorded and device voice), the Guide, a game, the Sutras page, a deep dive section and its diagram, the worked example and a tour step.
- [x] 2.4 Styles in `math.css` (`.listen-btn`, tokens only, pressed fill `var(--teal)` with `var(--on-accent)`).
  - Verify: `listen.spec.ts` axe on a pressed button in both schemes; `a11y.spec.ts` routes (Skill, Sutras, Guide, game) unchanged.
- [x] 2.5 `metrics.listened()` sends `math/listen/explanation` once per start.
  - Verify: `listen.spec.ts` checks one event per start and none per stop.

## 3. Words and docs

- [x] 3.1 `GLOSSARY.md`: Listen.
- [x] 3.2 Owner decisions in design.md (Sound effects off, the wording items, the deferred places). A wording change needs a re-record with `tools/voice/` (README).
  - Done 2026-10-30 (owner-delegated): design decisions 9 and 10. Listen plays with Sound effects off and Calm; `normalize()` reads an arrow to a worked example's answer as "gives" and a run of ten or more digits digit by digit (73 Sutra card and deep dive lines now read differently, recorded in the 4.6 re-record); Sanskrit words stay. Verify: `test/voice-normalize.test.mjs` (the five new cases, and the sweep over every generator), `test/voice-coverage.test.mjs` "every Explorer line has studio audio" still passes on the `voice-53224c8ddd` manifest.

## 4. Deferred

- [x] 4.1 Star round replay steps (`js/star.js` `replay()`): the steps already appear one by one with Bolt; a Listen button there needs its own design with the round's timing.
  - Done 2026-10-21 (PR #122): design decision 8; the button appears once every step is shown and reads them from the page (clips, else the device's voice); the replay ending stops it. Verify: `listen.spec.ts` "a Star replay reads its steps once they are all shown, and Escape stops it" (chromium, webkit, mobile); `star.spec.ts` unchanged.
- [x] 4.2 Page introductions (`md-lede` in `js/app.js`: Learn, grade, Dojo, Katas, tower, Arena, Games, Sutras, Watch, Guide): most hold live counts, so the fixed sentences need splitting into data first to be recorded.
  - Prep done 2026-10-29 (`explanation-audio-prep`): the ten introductions are data in `js/ledes.js`, one function per page giving its parts; a fixed line is a string (catalog counts filled in, as the Guide's copy does) and a part with the Player's own numbers is marked `live()`. `js/app.js` draws each with `ledeHTML()`, and `ledeLines()` in `js/explain-lines.js` puts the fixed lines of every Mode in the recording list (18 lines, src `ledes`; none recorded yet). The parts that hold the Player's numbers (a level's "7 of 31 skills mastered.", the Sutras page's "You have collected 3 of 29.") are never listed. Verify: `test/ledes.test.mjs` "every page introduction shows the words it showed before the split, in every Mode" (each lede against the old template, copied word for word) and "the recording list holds every fixed line of every page introduction, and none with the Player's numbers"; the lede specs (`routes.spec.ts`, `dojo.spec.ts`, `progress.spec.ts`, `sutras-progress.spec.ts`, `watch.spec.ts`, `backup-restore.spec.ts`, `first-visit.spec.ts`, `sutras-first.spec.ts`) unchanged. Open: a Listen button on them, after the 4.6 re-record records them (open decision 3).
  - Done 2026-10-30: design decision 10. A Listen button under each of the ten (key `lede:<id>`, the Player's own numbers in the key for a level and the Sutras page; `ledeKeyLines()`), playing the device's voice until the 4.6 re-record. Verify: `test/explain-lines.test.mjs` "a page introduction reads the words its page shows, in every Mode" and "every Listen key resolves to recorded lines in every Mode"; `listen.spec.ts` "a page introduction plays its fixed lines in the studio voice and the Player's own numbers with the device voice" and "a page introduction reads the words the page shows with the device voice when none is recorded".
- [x] 4.3 Watch descriptions: each sits inside a card button, and a button cannot hold another. They are recorded already.
  - 2026-10-21: only 56 of 298 descriptions match the `voice-53224c8ddd` recording (the wording moved on), so no button until the 4.6 re-record, and the card layout still needs its own design.
  - Done 2026-10-30: design decision 10. The button is in the video player the card opens (`from:.vp-why`), not on the card; play and close stop it. Verify: `listen.spec.ts` "the player reads the video's description, and pressing play stops it"; `watch.spec.ts`, `privacy.spec.ts` unchanged.
- [x] 4.4 Badge rules, quest labels, format rules and Mode blurbs: short labels; recorded already, no buttons yet.
  - Quest labels and format rules done 2026-10-21 (PR #122): design decision 8; one button on the Daily quests card (`from:.q-l`) and one under the tower chapter's format legend (key `formats`), every line recorded. Verify: `listen.spec.ts` "Home's daily quests are read, each label in turn" and the two tower chapter cases; `test/explain-lines.test.mjs`. Open: badge rules (the Party Mode badge's rule is not recorded; 24 rules in one block) and Mode blurbs (inside the Mode card buttons; the Mode names are not recorded).
  - Done 2026-10-30: design decision 10. One button over the Me page's badges reads the rules of the badges still to earn (`from:.badge:not(.got) small`); Mode blurbs get none (the first visit's Mode cards stay its only buttons). Verify: `listen.spec.ts` "the Me page reads the rules of the badges still to earn".
- [x] 4.5 "Older roots" notes (`BG_NOTES`): move them out of `js/ambient.js` (not importable in Node) so they can be recorded, then add a button.
  - 2026-10-21 (PR #122): the notes already live in `js/sky-scene.js` (Node imports it); the intro (`ROOTS_INTRO`) moved there too, and `rootsLines()` puts both in the recording list, as the page shows them (`test/explain-lines.test.mjs`). Open: none of them is recorded yet, so the button follows the 4.6 re-record.
  - Done 2026-10-29 (`explanation-audio-prep`): `js/app.js` reads the notes from `js/sky-scene.js` itself (`js/ambient.js` no longer passes them on), and the Older roots card has a Listen button (key `roots`, `linesForKey('roots')` gives `rootsLines()`). Like every Listen line, each note plays its studio recording once the 4.6 re-record has one, and this device's voice until then. Verify: `listen.spec.ts` "the Older roots card reads its notes in the studio voice once they are recorded" and "the Older roots card reads what it shows with the device voice when none is recorded" (chromium, webkit, mobile); `test/explain-lines.test.mjs` "the keys the app draws exist" and "every Listen key resolves to recorded lines in every Mode".
- [ ] 4.6 Re-record after `sutra-examples` (#44) merges: its new worked examples are Sutra deep dive lines. Then remove the `todo` from "every explanation line is recorded whole" in `test/voice-coverage.test.mjs` (about 390 lines were missing on 2026-10-19) so it gates. Some of them can never match: the `method` of the Vedic Skills (`v-sq5`, `v-near-base`, `v-crosswise`, `v-from9`, `v-by9s` and others) holds a worked example with numbers drawn per page load, so `skillLines()` changes between runs; fix them first (fixed example numbers, or leave them out like other worked steps).
  - Prep done 2026-10-25 (`explanation-audio-finish`): left out. A Trick's Skill page shows the Trick's idea and when to use it, never those two worked steps, so `skillLines()` now lists what the page shows (`skillPageLines()` reads the same) and the recording list is the same on every load: 1,717 lines, 367 not in the `voice-53224c8ddd` recording. Verify: `test/explain-lines.test.mjs` "the explanation lines are the same on every load" (two loads with different random draws) and "a Skill page reads the lines its Skill records". Open (owner): the re-record (`tools/voice/lines.mjs`, `record.mjs`, `publish.mjs`), then removing the `todo`.
  - 2026-10-30: `sutra-examples` (#44) merged on 2026-10-17, so nothing waits on it. The recording list is 1,745 lines, 463 of them not in `voice-53224c8ddd` (Watch 245, Guide 84, Sutra deep dives 81 and cards 10, with the readings decision 9 changed, page introductions 18, tour 12, Older roots 8, Skills 4, and the Party Mode badge rule). Open (owner): the re-record, then removing the `todo`.

## 5. Release check

- [ ] 5.1 Node, build and Playwright suites pass locally; after deploy the live E2E run is green. The owner listens on an iPhone (ringer off), an Android phone and a Windows laptop. Then archive the change.
  - 2026-10-30 (`explanation-audio-rest`): Node, build and the touched Playwright specs pass locally (chromium, webkit, mobile). Open (owner): the listening check, after the 4.6 re-record; then archive.
