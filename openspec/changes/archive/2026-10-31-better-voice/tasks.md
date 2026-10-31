# Tasks

Prerequisites (owner):
- Approve this change.
- Approved by the owner on 2026-10-16 with Google Chirp 3 HD and the audio in this repo's releases, not a new repo.
- A Google credential the Text-to-Speech API accepts, only in the shell that records. Done: the owner's gcloud sign-in (`GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token)`, project `sbmadhav-vedic-math`); no key exists.
- The Chirp 3 HD voice name, picked by ear on `docs/prototypes/voice/`. Done: Aoede.

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

- [x] 2.1 Move `docs/prototypes/voice/tools/` to `tools/voice/` and add `tools/` to `exclude` in `_config.yml`. `inventory.mjs` writes `tools/voice/lines.json`:
  - the whole lines: every line of the covered Skills, enumerated until 200,000 draws add nothing new, plus the fixed lines;
  - the clips: numbers in both takes and every frame, from sampling until 50,000 lines in a row add no new frame.
  - Verify: `python3 build.py --out /tmp/x` publishes nothing under `tools/`, and `test/build.test.mjs` asserts `tools/` is excluded.
  - Verify: `lines.json` has about 19,700 whole lines from the K to 2 Skills (excluding `2-add1000` and `1-compare`) and about 1,550 clips.
  - Note: the list is made by the new `tools/voice/lines.mjs` (written to the git-ignored `tools/voice/out/lines.json`); `inventory.mjs` stays the measuring tool. With the wording from the read-aloud wording change it lists 20,150 question, hint and fixed lines (718,000 characters) and 2,291 clips (47,000 characters, sampling 500 per Skill and level plus every Kata, Arena set and tower). Fractions are now said in words, which first made about 7,000 clips; each fraction is now its own frame (`splitParts()` in `js/voice-plan.js`), which brought it back down. The explanation lines (owner request of 2026-10-17, change `explanation-audio`) are listed too: 1,237 whole lines, 90,000 characters, from `js/explain-lines.js`, and the worked steps' frames go into the clip packs.
- [x] 2.2 `normalize()` fixes found by the inventory: ordinal denominators ("12ths" to "twelfths", "4ths" to "fourths") and the bond prompt (read "make 10?", not "make 10 what?").
  - Verify: `test/voice.test.mjs` cases for `Keep the 12ths.` and `3 and how many more make <b>10</b>?`, plus today's fraction, power, negative and money cases, so nothing else moves.
  - Note: shipped with the read-aloud wording change (#43); `test/voice-normalize.test.mjs` holds the cases.
- [x] 2.3 `make-clips.mjs` records `lines.json` with the chosen voice through `voice-lib.mjs`. Keys come only from the environment; there is a disk cache keyed by provider, voice, speed and text; only changed lines are re-recorded. It writes:
  - whole lines `l/<hash>.m4a`;
  - five clip packs `p/<pack>.<hash>.m4a` (AAC, mono, 24 kHz, 32 kbps);
  - the generated module `js/voice-index.js` in this repo (voice id, base URL, pack names, sizes and clip offsets, covered Skills and fixed lines).
  - Verify: a second run makes no request and changes no file.
  - Verify: the total recorded characters and the provider's bill are in the PR, within 10% of design decision 4.
  - Done 2026-10-17: 21,387 whole lines (20,150 question, hint and fixed lines plus 1,237 explanation lines) and 2,291 clips in five packs. The ledger counts 856,620 characters this month (about $25.70 at list price, inside the 1 million free characters a month, so the bill should be $0); design decision 4 estimated 770,000 for the questions alone, and the explanations add 90,000. A second run made no request and changed no file (packs are named by their samples, since AAC encoding is not byte-stable). The audio came out larger than estimated: 394 MB of whole lines (4.5 s average, not 2.15 s) and 20 MB of packs, a 431 MB archive; the published site stays under the 1 GB Pages limit.
  - Note: the recorder is `tools/voice/record.mjs` (`make-clips.mjs` stays the listening page's tool), with Aoede (`en-US-Chirp3-HD-Aoede`, rate 0.95) and a gcloud token. A whole line already on disk is never asked for again; clips are cached in `.cache/`. The index stays small (under 8 KB): which lines exist is a sorted 32-bit key list `l/set.<hash>.bin`, clip ids map to packs in `p/dir.<hash>.json`, and each pack has its offsets in `p/<pack>.<hash>.json`. Every recorded hash and clip is in the repo-only `tools/voice/manifest.json` for the coverage test. A line the provider refuses is left out of the index (said from clips) and named in the log. Lines no longer said move to `out/stale/`.
- [x] 2.4 `publish.mjs` packs the audio into `voice-<id>.tar` and uploads it with `gh release create voice-<id>` (or `gh release upload` to replace), and writes the archive's SHA-256 and tag into `js/voice-index.js`. `.github/workflows/ci.yml` runs `tools/voice/ci-fetch.mjs`, which downloads it, checks the hash and every file the index names, and unpacks it into `_site/voice/` before the deploy; `build.py --out` fails on committed audio or a `voice/` folder, and never precaches it.
  - Verify: `test/build.test.mjs` cases for a missing archive and a wrong hash; `git log --all -- '*.m4a'` shows no audio added outside `docs/prototypes/`.
  - Verify: after deploy, `curl -I https://sbmadhav.com/vedic-math/voice/p/core.<hash>.m4a` returns 200 with `content-type: audio/mp4`.
  - Note: the check lives in `tools/voice/ci-fetch.mjs`, run by `ci.yml` after `build.py`: it fails on a wrong hash or a file the index names that the archive lacks (`test/voice-tools.test.mjs`, three cases on a local archive). `build.py` fails on committed audio or a `voice/` folder (`test/build.test.mjs`). The release is created as a prerelease (never "latest"). macOS tar metadata is left out of the archive. The `curl` check is for after the deploy. The only committed audio outside `docs/prototypes/` is two tiny tone files in `e2e/fixtures/voice/` for the tests (repo-only, never published).
- [x] 2.5 Spend guard (prototyped in `voice-lib.mjs`): the ledger, `BUDGET_USD` (default 300), `RUN_USD` (default 50) and `RATE_PER_MIN` (default 300); keys only from the environment.
  - Verify: new `test/voice-tools.test.mjs` runs `charge()` with a stub provider: a request past the monthly or run cap throws before the stub is called; cached lines are not charged; the ledger keys by month.
  - Note: `makeGuard()` takes its ledger, caps and clock as options for the tests; one guard per process (`sharedGuard()`), so `RUN_USD` covers whole lines and clips together.
- [ ] 2.6 Owner steps on Google Cloud, before the full recording: restrict the key to Cloud Text-to-Speech; a $300 monthly budget with alerts at 50%, 90% and 100%; a Text-to-Speech quota cap (300 requests a minute, 50,000 a day).
  - Verify: the owner confirms in the PR; the full recording run's ledger total is in the PR.
  - Note: no key was made; the recording used the owner's gcloud sign-in. The budget and quota could not be read from here (the Billing Budget API is not enabled on the project), so the owner confirms them in the PR. Observed throughput was about 200 requests a minute.

## 3. Studio voice (B, app)

- [x] 3.1 `js/voice.js`:
  - `lineHash(voice, words)` gives the file name, and `planLine(words)` (from `stitch-plan.mjs`, moved into `js/`) gives clip ids.
  - `speakStudio()` fetches and decodes a whole line, or schedules clips from a decoded pack, all on one `AudioContext`.
  - `speak()` follows the voice order in the spec, with the 600 ms rule.
  - Verify: `test/voice.test.mjs`: `lineHash` matches the hash `make-clips.mjs` used (shared fixture). Plans are checked for "7 plus 5 equals what?", "Count up from 9 to 16. First get to 10." (16 uses the end take), "4368 divided by 16 equals what?", a negative and a decimal. A line with an unknown frame returns `null`.
  - Note: `js/voice-plan.js` holds `lineHash` (cyrb53, 14 hex, the same in Node and the browser), `planLine` and the clip texts; `test/voice-plan.test.mjs` pins one hash and the plans, fractions included. A line with an unknown frame makes `speakStudio()` hand the line to the built-in voice (`studio:missing` in the log).
- [x] 3.2 Loading:
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
  - Note: the e2e tests serve a fake index and two tiny tone files (`e2e/fixtures/voice/`) through `page.route`, so they pass before and after a recording. On a deploy built with `build.py --voice off` (no voice host in the published index or the policy) the cases where recorded voice plays skip (`needsStudioVoice` in `e2e/tests/fixtures.ts`) and the device-voice cases run, so the live suite switches them back on once a build with a voice host is deployed. The index is also imported by Me settings (to show the Studio voice row only when audio exists). Voice code keeps no view timers: the 600 ms race and the idle warm-up are module-level and end on their own.
- [x] 3.3 `stop()` stops scheduled sources and bumps the token, so a file that finishes loading late never plays a stale line. On iOS, set `navigator.audioSession.type = 'playback'` where it exists.
  - Verify: `voice.spec.ts` "leaving stops studio audio": start a line, go to `#/learn`, and `__voiceLog` shows nothing started after the route change.
  - Verify: `e2e/tests/games.spec.ts` balloon stop and start still passes.
  - Verify: the owner checks on a real iPhone with the ringer off that lines play, and the result is noted in the PR.
  - Note: the route change calls `fx.stopSpeaking()` (every voice). The iPhone check is the owner's, in the PR.
- [x] 3.4 Me settings: "Voice" offers Studio voice (default), This device's voice and Natural voice (download). The built-in picker stays for "This device's voice".
  - Verify: `voice.spec.ts`: picking "This device's voice" makes the next line `builtin`, and "Test voice" plays the studio sample.
  - Note: a "Studio voice" checkbox (on by default, shown only when recordings exist) above the built-in picker and the natural voice switch; unchecked, lines go to the device's voice. `voice.spec.ts` "choosing the device voice in Me reads the next line with it". "Test voice" goes through the same order, so it plays the studio sample when recorded.

## 4. Offline and coverage

- [x] 4.1 `sw.js`: `/vedic-math/voice/` requests are cache first in their own cache, `vedic-math-voice`, which every deploy keeps. `build.py` leaves `voice/` out of `PRECACHE` (task 2.4).
  - Verify: `e2e/tests/offline.spec.ts` (built `_site`, chromium), new test: an Explorer Player hears two lines online, goes offline and reloads. A heard line logs `studio:line`, and a new line logs `studio:clips` or `builtin`.
  - Note: instead of copying, voice files live in their own cache, `vedic-math-voice`, which version cleanup skips (trimmed to 4,000 whole lines; the line set, clip directory and packs are never trimmed, and a re-record's new copy of one replaces the old, `test/sw-voice.test.mjs`). The offline test reads the real index of the build and skips when the build has no recordings.
- [x] 4.1b `test/build.test.mjs`: the built `_site` contains no `texttospeech.googleapis.com` (or other provider host) and nothing shaped like a Google key or token.
  - Verify: adding a fake `AIza...` string to a published file makes it fail.
  - Note: also `ya29.` tokens, `AQ.` keys, `sk-` keys and the ElevenLabs, OpenAI, Azure and Polly hosts; the Firebase web config's public `apiKey` is the one allowed.
- [x] 4.2 New `test/voice-coverage.test.mjs`:
  - samples every generator (seeded: 300 per Skill and level, all Katas, Arena sets for each League, towers, games, fixed lines);
  - fails on any Explorer-surface line without a whole hash in `js/voice-index.js` or clips (naming the line);
  - fails when overall coverage drops below 99%.
  - Verify: it passes on the recorded index, and changing one Explorer praise line without re-recording makes it fail with that line in the message.
  - Note: the hashes are in the repo-only `tools/voice/manifest.json`, not the published index. On the recorded index (`voice-53224c8ddd`) it passes, with 99.98% of 92,294 sampled lines covered; changing the Explorer praise "Super star!" to "Super duper star!" made it fail naming that line.

## 5. Words and docs

- [x] 5.1 `GLOSSARY.md`: Read aloud, Built-in voice, Studio voice, Natural voice (added with this proposal). `README.md` and `AGENTS.md`: how to re-record and publish after a wording change, and that the audio archive lives in this repo's releases. `cloud/README.md` Privacy: one line saying read aloud plays files from this site and sends no text.
  - Verify: `test/copy.test.mjs` (no em dashes) passes over the new copy.
- [x] 5.2 Delete `docs/prototypes/voice/` audio once the studio voice ships.
  - Kept until the owner's listening sign-off (6.1), so the comparison page still plays all four versions; delete the 65 samples (2.1 MB) right after.
  - Verify: the PR that ships 3.x lists it.
  - Note: left for after the deploy and the owner's listening check, so the listening page still works for comparison.
  - Done 2026-10-21 (PR #118): the Studio voice shipped on sbmadhav.com/vedic-math/ (live run 39417980199 of 2026-10-20 played it) and the voice was picked by ear long before (Aoede), so the samples went without waiting for the device listen, which happens in the app, not on this page. Deleted `docs/prototypes/voice/audio/` (65 `.m4a` samples and their five `stitch.json` sprite maps, 2.1 MB). Kept `index.html`, `items.json` and `proto.js` (design decision 2 cites its `rateVoice()`); the page says the samples are gone, that rows 1 and 2 still play, and how to remake the free Kokoro clips (`tools/voice/make-clips.mjs`) or restore the old ones from history. The audio folder is git-ignored now, so remade clips are never committed; `make-clips.mjs` and `setup-google.sh` say so. `git ls-files '*.m4a'` lists no audio under `docs/prototypes/voice/`.

## 6. Release check

- [ ] 6.1 Node, build and Playwright suites pass locally (`BASE_URL=http://localhost:8124`, and the built `_site` for offline), and after deploy the live E2E run is green. The owner listens on an iPhone, an Android phone and a Windows laptop and signs off. Then archive the change.
  - Automated part done 2026-10-21 (PR #118): on main plus this PR, `python3 build.py --out` (476 files), `pnpm typecheck`, `pnpm lint` and `pnpm test` (70 files, 719 passed, 1 skipped) pass, and Playwright against the built `_site` on a local server (`node e2e/local-server.mjs 8301 _site`, `BASE_URL=http://localhost:8301`) passes `voice.spec.ts`, `offline.spec.ts`, `load.spec.ts`, `a11y.spec.ts`, `games.spec.ts` and `cov/read-aloud-wording-2.spec.ts` on every project with the Studio voice cases running (210 passed, the rest skipped by project rules), and the whole chromium project passes (1,491 passed, 96 skipped, 2 flaky in `first-visit.spec.ts` that passed on retry, a Home disclosure case this change does not touch). After the deploy, the scheduled live E2E run 39417980199 (2026-10-20, `BASE_URL=https://sbmadhav.com`, 2,175 passed, 0 failed) ran every Studio voice case in `voice.spec.ts` on chromium, webkit and mobile, none skipped.
  - Archived 2026-10-31 (`archive-sweep`, owner: finish everything open) with the Studio voice code live and the two owner items (this listen and 2.6) still open; the `read-aloud` spec is in `openspec/specs/` with coverage specs `e2e/tests/cov/read-aloud-*`, whose Studio voice cases skip until the voice host is set up (learnvedicmath 7.8).
  - Open: the owner's listen on an iPhone, an Android phone and a Windows laptop (with 3.3's iPhone ringer-off check), and 2.6. Since the move to https://learnvedicmath.com the site is built with `--voice off` until the owner's R2 setup (learnvedicmath 7.8), so today's live runs skip the Studio voice cases (`needsStudioVoice`); the live run is checked again once 7.8 is done. Archive only after both.
  - CI of PR #118 (checked 2026-10-22): `check` and `rules` pass. `preview` and `perf` fail for reasons outside this change (it touches no `js/`), and have on every pull request since 2026-10-21. `preview` fails only `background-perf.spec.ts`: the sky background's p95 draw time with the CPU slowed 4x is 6.5 to 7.8 ms against the 4 ms CI budget, red since `bg-sky-a`'s own preview (run 39526238833, before #110 merged) and in the live run 39596555775 (its 5 failures: those 4 cases and a webkit `celebrations.spec.ts` case). `perf` fails on every page's largest contentful paint, 250 to 350 ms over a baseline measured on production before #110, #111 and #116 merged, with a 100 ms tolerance: production at 901b315 is within on each of them (issue #117's table), and the preview on workers.dev answers slower (server response 77 to 200 ms against 28 to 41 ms); the Deep dive's blocking time is over on production too (issue #117). The owner decides on the sky's frame cost and on the preview gate's baseline (react-typescript 1.8).
