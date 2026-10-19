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
- [ ] 3.2 Owner decisions in design.md (Sound effects off, the wording items, the deferred places). A wording change needs a re-record with `tools/voice/` (README).

## 4. Deferred

- [ ] 4.1 Star round replay steps (`js/star.js` `replay()`): the steps already appear one by one with Bolt; a Listen button there needs its own design with the round's timing.
- [ ] 4.2 Page introductions (`md-lede` in `js/app.js`: Learn, grade, Dojo, Katas, tower, Arena, Games, Sutras, Watch, Guide): most hold live counts, so the fixed sentences need splitting into data first to be recorded.
- [ ] 4.3 Watch descriptions: each sits inside a card button, and a button cannot hold another. They are recorded already.
- [ ] 4.4 Badge rules, quest labels, format rules and Mode blurbs: short labels; recorded already, no buttons yet.
- [ ] 4.5 "Older roots" notes (`BG_NOTES`): move them out of `js/ambient.js` (not importable in Node) so they can be recorded, then add a button.
- [ ] 4.6 Re-record after `sutra-examples` (#44) merges: its new worked examples are Sutra deep dive lines. Then remove the `todo` from "every explanation line is recorded whole" in `test/voice-coverage.test.mjs` (about 390 lines were missing on 2026-10-19) so it gates. Some of them can never match: the `method` of the Vedic Skills (`v-sq5`, `v-near-base`, `v-crosswise`, `v-from9`, `v-by9s` and others) holds a worked example with numbers drawn per page load, so `skillLines()` changes between runs; fix them first (fixed example numbers, or leave them out like other worked steps).

## 5. Release check

- [ ] 5.1 Node, build and Playwright suites pass locally; after deploy the live E2E run is green. The owner listens on an iPhone (ringer off), an Android phone and a Windows laptop. Then archive the change.
