# Tasks

Waits for the owner's approval of `proposal.md` and `design.md`. Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`). PR #127 edits `js/app.js`'s neighbours: merge `main` before starting.

## 1. Stopped rounds say what they save (D1)

- [ ] 1.1 `gameView()` in `js/app.js`: the lobby sentence "Stop ends a round with nothing saved: no score, no Sparks and no change to this skill." under "Every round adapts"; the exit label "Stop (nothing saved)" for a Ranked round (`openShell`'s `exit`), "Finish" kept for Endless practice. Verify: `e2e/tests/games.spec.ts` gains "a stopped Ranked round keeps the lobby's skill and says why": start Ranked, answer twice, Stop, the lobby's skill line is unchanged and contains the sentence, `cloudLog` has no board write.
- [ ] 1.2 `test/copy.test.mjs` and the honest-framing specs pass (no em dash, Glossary words: Score, Sparks).

## 2. Games read their questions aloud (D2)

- [ ] 2.1 `js/games.js`: `ask(html, { say })` on the game kit (`kit(ctx)`): sets the live line and, when `fx.voiceOn()`, speaks `say || normalize(html)` through `fx.speak`. Every game in design D2's table calls it at each question; Balloon pop and More or less at the dot levels keep their lines. Verify: `test/games.test.mjs` runs each game's question builder through the same words and asserts no `<`, `&` or `^` reaches the voice, and that More or less at a fraction level says both fractions in words.
- [ ] 2.2 `e2e/tests/games.spec.ts`: with a recording speech engine (the `fakeSpeech` pattern of `voice.spec.ts`) and read aloud on, Times rocket's first question is spoken as "N times M", and Number rain speaks "Tap the multiples of N." at the start. Verify: the spec passes on chromium, webkit and mobile.
- [ ] 2.3 The new fixed frames are listed for the studio recording (`tools/voice/lines.mjs` reads them from the games) and `test/voice-coverage.test.mjs` names them in its `todo` until the owner re-records. Verify: `pnpm test`.

## 3. Number rain stands still without motion (D3)

- [ ] 3.1 `js/games.js` (`rain`): under `noMotion()` the numbers appear in place and leave after `max(2.5, 4 - 0.1 × level)` s; an untapped multiple is a miss when it leaves; the group label reads "Numbers that wait. Tap multiples of N."; the 0.6 speed factor goes. Verify: `test/games.test.mjs` checks the wait time at levels 1, 10 and 20.
- [ ] 3.2 `e2e/tests/games.spec.ts`: with Calm on, a drop's position does not change over 1 s, a tap on a multiple scores, and the drop is gone after its wait. Verify: the spec passes on chromium, webkit and mobile; `docs/perf/baseline.json` gains a `firstLoad.changes` entry if `js/games.js` moves the total.

## 4. Done

- [ ] 4.1 `openspec validate --all --strict`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py`, the Playwright suite. Archive after release with the coverage specs for the scenarios in `specs/games/spec.md` (`e2e/tests/cov/games-1.spec.ts` to `games-3.spec.ts`).
