# Tasks

Prerequisites (owner):
- Approve this change.
- Approved by the owner on 2026-10-16 with Google Chirp 3 HD and the audio in this repo's releases, not a new repo.
- A Google credential the Text-to-Speech API accepts (a classic `AIza` key restricted to Cloud Text-to-Speech, or a service account), set only as `GOOGLE_TTS_KEY` in the shell that records.
- The Chirp 3 HD voice name, picked by ear on `docs/prototypes/voice/`.

Part A (tasks 1) can ship on its own before part B.

## 1. Tune the built-in voice (A)

- [x] 1.1 `js/voice.js`: `rateVoice(v)` returns `{ tier: 'good' | 'ok' | 'poor', pts }` from the name and `voiceURI` (rules in design decision 2), and `englishVoices()` sorts by it. `bestVoice()` never returns a poor voice when a good or ok one exists. A voice picked by name in Me still wins.
  - Verify: new `test/voice.test.mjs` with fake voice lists:
    - macOS Safari (`com.apple.voice.compact.en-US.Samantha` and `com.apple.voice.enhanced.en-US.Ava`) picks Ava.
    - Windows Edge (`Microsoft David - English (United States)` and `Microsoft Aria Online (Natural) - English (United States)`) picks Aria.
    - Chrome on macOS picks `Google US English` over `Samantha`.
    - Android (`English United States`) is ok.
    - A list of only `Albert`, `Zarvox` and `eSpeak` returns the best poor voice.
    - Non-English voices are never returned.
- [x] 1.2 `speakBuiltIn()`: pitch 1 always; rate 0.9 for Explorer, 0.95 otherwise.
  - Verify: `test/voice.test.mjs` stubs `speechSynthesis` and asserts pitch 1 and rate 0.9 with `body.mode-explorer`, and 0.95 without.
  - Verify: Playwright `e2e/tests/voice.spec.ts` "built-in voice is tuned". With the studio voice off and an init script that records `speechSynthesis.speak()` utterances, an Explorer Practice question is spoken at pitch 1 and rate 0.9.
- [x] 1.3 Me settings: the picker lists good and ok voices first and marks poor ones "(robotic)". When every English voice is poor, show the poor-voice note (design decision 3) with "Got it", stored per Player as `vm.voiceNoteSeen`.
  - Verify: `voice.spec.ts` "poor-voice note". With an init script that makes `getVoices()` return only compact voices, `#/me` shows the note with the iPhone and Windows steps. After "Got it" and a reload it is gone. With an Enhanced voice in the list it never shows.
  - Verify: `e2e/tests/a11y.spec.ts` `#/me` has no new violations, and the 320px accessibility scenario still holds with the note shown.

## 2. Recording tools (B, repo-only)

- [ ] 2.1 Move `docs/prototypes/voice/tools/` to `tools/voice/` and add `tools/` to `exclude` in `_config.yml`. `inventory.mjs` writes `tools/voice/lines.json`:
  - the whole lines: every line of the covered Skills, enumerated until 200,000 draws add nothing new, plus the fixed lines;
  - the clips: numbers in both takes and every frame, from sampling until 50,000 lines in a row add no new frame.
  - Verify: `python3 build.py --out /tmp/x` publishes nothing under `tools/`, and `test/build.test.mjs` asserts `tools/` is excluded.
  - Verify: `lines.json` has about 19,700 whole lines from the K to 2 Skills (excluding `2-add1000` and `1-compare`) and about 1,550 clips.
- [ ] 2.2 `normalize()` fixes found by the inventory: ordinal denominators ("12ths" to "twelfths", "4ths" to "fourths") and the bond prompt (read "make 10?", not "make 10 what?").
  - Verify: `test/voice.test.mjs` cases for `Keep the 12ths.` and `3 and how many more make <b>10</b>?`, plus today's fraction, power, negative and money cases, so nothing else moves.
- [ ] 2.3 `make-clips.mjs` records `lines.json` with the chosen voice through `voice-lib.mjs`. Keys come only from the environment; there is a disk cache keyed by provider, voice, speed and text; only changed lines are re-recorded. It writes:
  - whole lines `l/<hash>.m4a`;
  - five clip packs `p/<pack>.<hash>.m4a` (AAC, mono, 24 kHz, 32 kbps);
  - the generated module `js/voice-index.js` in this repo (voice id, base URL, pack names, sizes and clip offsets, covered Skills and fixed lines).
  - Verify: a second run makes no request and changes no file.
  - Verify: the total recorded characters and the provider's bill are in the PR, within 10% of design decision 4.
- [ ] 2.4 `publish.mjs` packs the audio into `voice-<id>.tar` and uploads it with `gh release create voice-<id>` (or `gh release upload` to replace), and writes the archive's SHA-256 and tag into `js/voice-index.js`. `.github/workflows/ci.yml` downloads it with `gh release download`, checks the hash and unpacks it into `_site/voice/` before the deploy; `build.py --out` fails if `voice/` is missing or does not match the index, and never precaches it.
  - Verify: `test/build.test.mjs` cases for a missing archive and a wrong hash; `git log --all -- '*.m4a'` shows no audio added outside `docs/prototypes/`.
  - Verify: after deploy, `curl -I https://sbmadhav.com/vedic-math/voice/p/core.<hash>.m4a` returns 200 with `content-type: audio/mp4`.

- [ ] 2.5 Spend guard (prototyped in `voice-lib.mjs`): the ledger, `BUDGET_USD` (default 300), `RUN_USD` (default 50) and `RATE_PER_MIN` (default 300); keys only from the environment.
  - Verify: new `test/voice-tools.test.mjs` runs `charge()` with a stub provider: a request past the monthly or run cap throws before the stub is called; cached lines are not charged; the ledger keys by month.
- [ ] 2.6 Owner steps on Google Cloud, before the full recording: restrict the key to Cloud Text-to-Speech; a $300 monthly budget with alerts at 50%, 90% and 100%; a Text-to-Speech quota cap (300 requests a minute, 50,000 a day).
  - Verify: the owner confirms in the PR; the full recording run's ledger total is in the PR.

## 3. Studio voice (B, app)

- [ ] 3.1 `js/voice.js`:
  - `lineHash(voice, words)` gives the file name, and `planLine(words)` (from `stitch-plan.mjs`, moved into `js/`) gives clip ids.
  - `speakStudio()` fetches and decodes a whole line, or schedules clips from a decoded pack, all on one `AudioContext`.
  - `speak()` follows the voice order in the spec, with the 600 ms rule.
  - Verify: `test/voice.test.mjs`: `lineHash` matches the hash `make-clips.mjs` used (shared fixture). Plans are checked for "7 plus 5 equals what?", "Count up from 9 to 16. First get to 10." (16 uses the end take), "4368 divided by 16 equals what?", a negative and a decimal. A line with an unknown frame returns `null`.
- [ ] 3.2 Loading:
  - `js/voice-index.js` is imported only when read aloud first plays.
  - The core pack loads on `requestIdleCallback` (or after 2 s) once read aloud is on.
  - Whole lines are fetched when needed; other packs load on first need.
  - Timers and listeners that belong to a view go through `js/life.js`.
  - Verify: `voice.spec.ts`:
    - "no audio when read aloud is off": a Challenger Practice round makes no request to `/vedic-math/voice/`.
    - "Explorer whole line": an Explorer Practice question logs `studio:line` in `window.__voiceLog`, and `speechSynthesis.speak` is not called.
    - "clips for a three-digit sum": a `2-add1000` question logs `studio:clips`.
    - "slow line falls back": with the line request held for 2 s, the line logs `studio:clips`.
    - "broken audio falls back": with `/vedic-math/voice/` requests answered 404, the line logs `builtin`.
    - "no provider calls": across an Explorer round, no request goes to `googleapis.com` or another speech provider.
  - Verify: `test/lifecycle-scan.test.mjs` passes.
  - E2E tests fetch the real audio site read-only. That is a static GET and is allowed (no Firestore, no counting).
- [ ] 3.3 `stop()` stops scheduled sources and bumps the token, so a file that finishes loading late never plays a stale line. On iOS, set `navigator.audioSession.type = 'playback'` where it exists.
  - Verify: `voice.spec.ts` "leaving stops studio audio": start a line, go to `#/learn`, and `__voiceLog` shows nothing started after the route change.
  - Verify: `e2e/tests/games.spec.ts` balloon stop and start still passes.
  - Verify: the owner checks on a real iPhone with the ringer off that lines play, and the result is noted in the PR.
- [ ] 3.4 Me settings: "Voice" offers Studio voice (default), This device's voice and Natural voice (download). The built-in picker stays for "This device's voice".
  - Verify: `voice.spec.ts`: picking "This device's voice" makes the next line `builtin`, and "Test voice" plays the studio sample.

## 4. Offline and coverage

- [ ] 4.1 `sw.js`: `/vedic-math/voice/` requests are cache first. On install, those entries are copied from the previous `vedic-math-*` cache. `build.py` leaves `voice/` out of `PRECACHE` (task 2.4).
  - Verify: `e2e/tests/offline.spec.ts` (built `_site`, chromium), new test: an Explorer Player hears two lines online, goes offline and reloads. A heard line logs `studio:line`, and a new line logs `studio:clips` or `builtin`.
- [ ] 4.1b `test/build.test.mjs`: the built `_site` contains no `texttospeech.googleapis.com` (or other provider host) and nothing shaped like a Google key or token.
  - Verify: adding a fake `AIza...` string to a published file makes it fail.
- [ ] 4.2 New `test/voice-coverage.test.mjs`:
  - samples every generator (seeded: 300 per Skill and level, all Katas, Arena sets for each League, towers, games, fixed lines);
  - fails on any Explorer-surface line without a whole hash in `js/voice-index.js` or clips (naming the line);
  - fails when overall coverage drops below 99%.
  - Verify: it passes on the recorded index, and changing one Explorer praise line without re-recording makes it fail with that line in the message.

## 5. Words and docs

- [ ] 5.1 `GLOSSARY.md`: Read aloud, Built-in voice, Studio voice, Natural voice (added with this proposal). `README.md` and `CLAUDE.md`: how to re-record and publish after a wording change, and that the audio archive lives in this repo's releases. `cloud/README.md` Privacy: one line saying read aloud plays files from this site and sends no text.
  - Verify: `test/copy.test.mjs` (no em dashes) passes over the new copy.
- [ ] 5.2 Delete `docs/prototypes/voice/` audio once the studio voice ships.
  - Verify: the PR that ships 3.x lists it.

## 6. Release check

- [ ] 6.1 Node, build and Playwright suites pass locally (`BASE_URL=http://localhost:8124`, and the built `_site` for offline), and after deploy the live E2E run is green. The owner listens on an iPhone, an Android phone and a Windows laptop and signs off. Then archive the change.
