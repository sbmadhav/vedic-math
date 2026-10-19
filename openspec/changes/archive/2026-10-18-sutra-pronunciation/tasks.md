# Tasks

Prerequisites: the owner has listened on `docs/prototypes/sutra-voice/` and answered the owner decisions in `design.md` (voice, meanings, ambience defaults). Done 2026-10-17 (design.md, Owner decisions). better-voice part B had not merged; its `voice/` rule (release archive, no committed audio) does not fit committed name clips, so this change uses `sounds/` and `tools/sutra-voice/` (design.md, Changes made while building).

## 1. Names, respellings and fixes

- [x] 1.1 Move `docs/prototypes/sutra-voice/tools/` to `tools/voice/` (`sanskrit.mjs`, `names.mjs`, `make-sutra-clips.mjs` from `make-clips.mjs` with only the chosen voice, `check.mjs`, `espeak-hi.mjs` dropped); add `tools/` to `_config.yml` `exclude`. Verify: `python3 build.py --out /tmp/vm-site` succeeds and `/tmp/vm-site/tools` does not exist.
  - Done in `tools/sutra-voice/` instead (better-voice part B owns `tools/voice/` and its package.json). `espeak-hi.*` dropped; the listening page imports the moved files. `python3 build.py --out` succeeds without `tools/` (`test/build.test.mjs`).
- [x] 1.2 `js/sutras.js`: add `say` (respelling) and `deva` (Devanagari) to all 29 entries from `tools/voice/sanskrit.mjs`; apply the approved meaning changes (sub-sutra 10, Sutra 9, sub-sutra 4). Verify: new `test/sanskrit.test.mjs`: for every entry, `respell()` and `toDeva()` of its `tools/voice/names.mjs` spelling (the IAST with compound breaks) equal its `say` and `deva`; spot checks: Sutra 1 respelling "ay-kah-dhi-KAY-nuh poor-VAY-nuh", Devanagari "एकाधिकेन पूर्वेण"; Sutra 2 Devanagari "निखिलं नवतश्चरमं दशतः"; sub-sutra 8 contains "ऽ"; `toIPA('Daśataḥ')` is "ˈdəʃətəhə" (the visarga echo); the beat rule: Yāvadūnam beats on "DOO", Vilokanam on "LOH"; no respelling contains an em dash.
  - Done; meanings approved by the owner. The IPA spot check is "dˈəʃətəhə": the beat mark sits before the vowel since the listening-page fix (docs/sutra-pronunciation.md). `test/sanskrit.test.mjs` also checks names.mjs follows js/sutras.js (names and meanings).
- [x] 1.3 `js/vedic.js`: "Pūrveṇa" in `sq5`, `recip`, `by9s`; "Nikhilaṃ Navataścaramaṃ Daśataḥ", "Nikhilaṃ (division by 9)", "Śūnyaṃ Sāmyasamuccaye"; each Trick gains `sutraId`. Verify: `test/sky.test.mjs` updated to "Ekādhikena Pūrveṇa holds sq5 and recip" and still 17 Constellations with unchanged ids; new assertion in `test/say.test.mjs`: every Trick's `sutraId` is one of the 29 ids, and its `sutra` (without a bracket note) matches that entry's name up to spaces and hyphens.
  - Done. Constellation ids unchanged (asserted in `test/sky.test.mjs`); a bracket note is a short form, so the test checks the card's name starts with the Trick's sutra up to spaces, hyphens and brackets.

## 2. Clips

- [x] 2.1 Make the 29 clips with the chosen voice: `cd tools/voice && npm install && node make-sutra-clips.mjs`, writing `voice/sutras/<id>.m4a` and a generated `js/say-clips.js` (ids, file names, byte sizes). Verify: `test/say.test.mjs`: 29 entries, every file exists, each under 30 KB, total under 500 KB; `node check.mjs` (Whisper) run once and its per-name scores recorded in the PR.
  - Done: 29 clips, 369 KB, largest u7 21 KB, voice `kid_alpha_jalpha`, written to `sounds/sutras/<id>.m4a` with `js/say-clips.js` (bytes and a content hash per clip). Whisper: `tools/sutra-voice/check.json`, mean 0.59 (scores in the PR).
- [x] 2.2 `js/voice.js`: `playClip(url)` decodes and plays on the shared AudioContext under the stop token; `stop()` stops it. Verify: `test/voice.test.mjs` (or new `test/say.test.mjs`) with a fake AudioContext: `playClip` then `speak()` stops the clip; `speak()` then `playClip` cancels speech; `stop()` stops a playing clip.
  - Done: `playClip(url)` uses read aloud's `playing` source and token, so `stop()` and `speak()` stop it unchanged. Covered by `test/say.test.mjs` (stubbed playback) and the Playwright fakes.
- [x] 2.3 `sw.js` and `build.py`: `voice/` files are publishable, stamped by content hash, served cache first, carried into the next deploy's cache when unchanged, never in the install precache (skip if better-voice already did this). Verify: `test/build.test.mjs` (or the existing build test): a built `_site` holds `voice/sutras/*.m4a`, the precache list in `_site/sw.js` names none of them; `e2e/tests/offline.spec.ts` new test (chromium only, `_site` served): tap Say it on Sutra 1 online, wait for the idle prefetch, go offline, open Sutra 3 and tap Say it: the fake AudioContext records a decoded buffer from the cache and no fallback status appears.
  - Done for `sounds/` (cache first in `vedic-math-sounds`, kept across deploys, `?v=` content hash, never precached). `test/build.test.mjs` checks the built site; `e2e/tests/offline.spec.ts` new chromium test passes against a built `_site`.

## 3. Say it

- [x] 3.1 New `js/say.js`: `sayButton(id, name, { label })` HTML, `respellHTML(id)`, `wireSay(root, signal)` (one delegated click listener through `life.on`), first-tap fetch, idle prefetch of the rest (`life.later`, skipped with Save-Data), `aria-pressed` while playing, fallback (built-in voice reads the respelling, or the status with the respelling), one `metrics.say()` per tap that starts a clip. Verify: `test/say.test.mjs` with stubs for fetch, AudioContext and speechSynthesis: a decode failure speaks "ay kah dhi kay nuh poor vay nuh" for `s1` and sets the status text; with no speechSynthesis the status contains the respelling; a second tap stops; aborting the signal stops a playing clip and cancels the pending prefetch; with `saveData` no prefetch runs; `test/lifecycle-scan.test.mjs` covers `js/say.js`.
  - Done. The status uses `fx.toast` (polite).
- [x] 3.2 `js/app.js`: the button and respelling on Sutra cards (a sibling of `.sutra-face`, top corner), in `sutraHTML()` (after the `h2`, with the Devanagari, `lang="sa"`), in `skillView()` (`.mq-sutra`) and `lang="sa-Latn"` on the `katasView()` tag; `wireSay(view, signal)` and on the dialog with the deep dive's own controller. `js/sky-view.js`: the button after each All places Constellation name. `math.css`: `.say-btn` (44 px, tokens only, both schemes), `.say-resp`, `.sd-deva`. Verify: new Playwright `e2e/tests/say.spec.ts` (fake AudioContext and speechSynthesis injected with `page.addInitScript`; GoatCounter stub from fixtures):
  - Done; `e2e/tests/say.spec.ts` passes on chromium, webkit and mobile. Visible label "Hear how to say" (part of the accessible name).
  - `#/sutras/s1`: the dialog shows the IAST, "ay-kah-dhi-KAY-nuh poor-VAY-nuh" and "एकाधिकेन पूर्वेण"; the button's accessible name is "Hear how to say Ekādhikena Pūrveṇa"; tapping it fetches only `voice/sutras/s1`, sets `aria-pressed="true"`, and back to false when the fake clip ends;
  - tapping Say it on an unflipped card plays and the card stays unflipped;
  - `#/skill/v-div9`: Say it fetches the `s2` clip;
  - `#/places`: 17 Say it buttons;
  - with read aloud off (`vm.voice` = 0) the button still plays; on load nothing is fetched from `voice/`;
  - route away while playing: the fake source's `stop()` was called;
  - `voice/sutras/*` aborted by `page.route`: the fake speechSynthesis got "ay kah dhi kay nuh poor vay nuh" and the status shows the device-voice message;
  - analytics: two taps send two `math/say/sutra` hits with no id; a stopping tap sends none;
  - at 320 px wide the deep dive header with the button does not scroll horizontally.
- [x] 3.3 Accessibility. Verify: `e2e/tests/a11y.spec.ts` adds `#/sutras`, `#/sutras/s3` and `#/places` in both schemes with no serious or critical violations; `say.spec.ts` checks every IAST name on those pages has `lang="sa-Latn"` and the Devanagari `lang="sa"`, and each `.say-btn` box is at least 44 by 44.
  - Done: `#/sutras/s3` added to the axe routes (both schemes; `#/sutras` and `#/places` were there); lang and 44 px checks in `say.spec.ts`.

## 4. Sutra ambience

- [x] 4.1 `js/ambient.js`: `sutraAmbience({ signal })` with its own gain: bowl strike (rate limited to one per 4 s), optional hum, Om mode (fetches `sounds/om.m4a` only when on), the gesture wait, `strike()` for deep dives, fades on abort, on `visibilitychange` (through `life.on`) and when Calm music starts (`onChange`); settings `sutraAmbOn()` (default on), `sutraHumOn()` (off), `sutraOmOn()` (off); silent when `fx.soundOn()` is false, `vm.calm` is on, `html.motion-paused` is set, or `isPlaying()` was true at start. Verify: new `test/ambience.test.mjs` with a fake AudioContext: no node is created before a gesture; a gesture then strike creates oscillators; two strikes within 4 s create one; Sound effects off, Calm on, Pause motion on and music playing each create nothing; reduced motion alone does not silence it; aborting the signal ramps the gain to 0 and stops the hum; Om off never fetches `sounds/om.m4a`; `test/lifecycle-scan.test.mjs` covers the new code.
  - Done in `js/sutra-ambience.js` (sharing `ambient.js`'s AudioContext). `test/ambience.test.mjs` and `test/lifecycle-scan.test.mjs`.
- [x] 4.2 `js/app.js`: start `sutraAmbience` from the sutras route on the view signal; strike on `openSutra()`; the Ambience toggle in the Sutra page header and the deep dive header; the Me page settings (Sutra ambience, Low hum, Chanted Om with the honest note). Add `sounds/om.m4a` (CC0, Tito Dutta, Wikimedia Commons `File:Om.ogg`) and its credit in `LICENSE-CONTENT.md`. Verify: new Playwright `e2e/tests/ambience.spec.ts` (fake AudioContext recording created nodes and gain ramps, injected with `addInitScript`):
  - Done; `e2e/tests/ambience.spec.ts` passes on all three projects. Om: CC0, Tito Dutta, credited in `LICENSE-CONTENT.md` with the Kokoro clips.
  - `#/sutras` with defaults: nothing before a click; after a click on the page one strike; opening a deep dive strikes once more; two deep dives within 4 s strike once;
  - Low hum on: a hum source starts; going to `#/dojo` ramps the ambience gain to 0 and stops the hum within 2 s, and no ambience timer fires later (clock fast-forward 60 s, no new nodes);
  - tab hidden (`document.dispatchEvent` after overriding `visibilityState`): the hum fades out; visible again on a Sutra page: it fades back in with no strike;
  - Calm music started from the note button first, then `#/sutras`: no ambience nodes and the music's gain untouched; ambience playing, then Calm music started: ambience fades out;
  - Sound effects off on the Me page: no ambience; Ambience button off on the page: fades out and stays off after reload;
  - `html.motion-paused` set: no ambience; `prefers-reduced-motion` emulated: strike still plays;
  - Chanted Om off: no request to `sounds/om.m4a`; on: the Om plays instead of the strike and the note text is on the Me page.
- [x] 4.3 Copy. Verify: `test/copy.test.mjs`: the Om note is present verbatim, no new string has an em dash or calls the ambience or the Om Vedic.
  - Done in `test/copy.test.mjs`.

## 5. Counts, glossary and release

- [x] 5.1 `js/metrics.js`: `say()` sends `math/say/sutra` titled "Say a Sutra name". Verify: `test/metrics.test.mjs`: `say()` sends exactly that path and title; the "no identifiers" scan covers `js/say.js`.
  - Done; the scan also checks `js/sutra-ambience.js` sends nothing (owner decision 5).
- [x] 5.2 `GLOSSARY.md`: Say it, Respelling, Name clip, Sutra ambience (added in this proposal; adjust if the owner renames anything). Verify: read through; terms used the same way in code comments.
  - Done: the four terms updated (no longer marked proposed).
- [x] 5.3 Full checks. Verify: `node --test 'test/**/*.test.{js,mjs}'` passes; `cd e2e && BASE_URL=http://localhost:8124 npx playwright test` passes against `node e2e/local-server.mjs 8124`; `openspec validate sutra-pronunciation --strict` passes; after release, archive the change so `openspec/specs/` gains `sutra-pronunciation` and `sutra-ambience`.
  - Checks pass (see the PR). Archive after release: not yet.
