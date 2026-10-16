# Design

## Context

- `js/sutras.js` holds the 29 names in IAST (`SUTRAS`, `SUBSUTRAS`); `js/app.js` builds `ALL_SUTRAS` with ids `s1` to `s16` and `u1` to `u13`, renders the card grid (`sutrasView()`, route `#/sutras`) and the deep-dive dialog (`sutraHTML()`, `openSutra()`, routes `#/sutras/<id>`). Names already carry `lang="sa-Latn"` on cards and in the deep dive.
- `js/vedic.js` gives each of the 21 Tricks a `sutra` string (17 distinct, some with a bracketed note such as "Nikhilam (division by 9)"). The Trick page (`skillView()`), the Katas page tag (`katasView()`, no `lang` today), the Dojo nodes and the Sky (`js/sky.js` `CONSTELLATIONS`, `js/sky-view.js` labels and All places) show them.
- `js/voice.js` is read aloud: Tier 1 Web Speech, Tier 2 opt-in Kokoro in a worker, one stop token so a new speech cancels the old one, playback of Kokoro audio through an AudioContext.
- `js/ambient.js` is the Calm music (singing bowls, tanpura, dawn, chimes) synthesized with Web Audio, started only from its own button; `isPlaying()` says whether it plays; it suspends its context when the tab is hidden.
- `js/life.js` ties listeners and timers to a view's AbortSignal; the router gives each view `{ signal }`.
- The better-voice change (branch `better-voice`, not merged) adds a clip voice for read aloud: Kokoro clips made at dev time by repo-only tools, AAC `.m4a` mono 24 kHz 32 kbps, published under `voice/`, cache first in the service worker and carried across deploys, never in the install precache; generated index `js/voice-clips.js`; tools in `tools/voice/`. It found no free natural child voice and proposes a Kokoro blend (Heart 70%, Kokoro's lighter Japanese voice 30%) for Explorer, with no pitch shifting.
- Research: `docs/sutra-pronunciation.md`. Listening page: `docs/prototypes/sutra-voice/` (serve with `node e2e/local-server.mjs 8185`, open `http://localhost:8185/vedic-math/docs/prototypes/sutra-voice/`).

## Goals / Non-Goals

**Goals:**
- Any Player can hear each name said well, on any device, with one tap, offline after first use.
- A Player who cannot play audio still learns how to say it (the respelling).
- Honest: the names are Sanskrit from a 1965 book; the Om, if chosen, is atmosphere, not part of the book.
- One audio system with better-voice, not two.

**Non-Goals:**
- Teaching Sanskrit; Vedic pitch accent; regional variants beyond one note.
- Ambience outside the Sutra pages.

## Decisions

**1. Clips, not live speech.** The names are fixed, so 29 clips made once beat any live voice: the built-in voices cannot say them (English reads letters, Hindi drops final vowels), and the opt-in Kokoro worker is 92 MB and English-only in kokoro-js. Clips cost about 375 KB in all and sound the same everywhere.

**2. Phonemes from the IAST, not Hindi rules.** kokoro-js only ships an English front end. Kokoro's own Hindi pipeline (Python) uses eSpeak NG's Hindi rules, which delete final short vowels and read the names as Hindi ("ekādhiken pūrveṇ", "daśat"). `tools/voice/sanskrit.mjs` instead reads the IAST letter by letter into IPA in Kokoro's symbols: every short a said, ṃ shaped by the next consonant, ḥ with the echo of its vowel at a word end, jñ as "gy", and the light beat marked by the classical rule. The model gets those phonemes directly (`generate_from_ids` with the voice's style vector). The listening page keeps an eSpeak-Hindi row so the difference can be heard.

**3. One voice: Alpha (`hf_alpha`), subject to the owner's ears.** Candidates, all Kokoro Hindi voices fed the same phonemes, speed 0.85:

| Voice | All 29 | Largest | Typical pitch | Whisper match |
|---|---|---|---|---|
| Alpha (woman) | 374 KB | 21 KB | 231 Hz | 0.62 |
| Beta (woman) | 344 KB | 19 KB | 188 Hz | 0.63 |
| Omega (man) | 366 KB | 20 KB | 128 Hz | 0.62 |
| Psi (man) | 351 KB | 19 KB | 140 Hz | 0.62 |
| Kid blend: Alpha 70%, Japanese voice 30% | 369 KB | 21 KB | 247 Hz | 0.59 |
| Kid blend: Beta 70%, Japanese voice 30% | 351 KB | 19 KB | 216 Hz | 0.61 |

"Whisper match" is a local Whisper small transcription in Hindi mode compared letter by letter with the name (`docs/sutra-pronunciation.md` explains its limits). It found one real bug, now fixed (a beat mark before the consonant made the model say an extra vowel first), and ranks the four Hindi voices as equal within noise. The names to check by ear first are listed in the research doc (Antyayoreva, Pūraṇāpūraṇābhyām, Ādyamādyenāntyamantyena and five more).

- The owner asked for a kid's voice. No free model has a natural child voice (better-voice decision 4b surveyed them). Alpha already sits at 231 Hz, the bottom of a 6 to 10 year old's 230 to 300 Hz range, and the Alpha blend only adds 16 Hz, scores lowest on the Whisper check and twice starts a name with a "ye" sound. So correct pronunciation and the kid-like wish point the same way: Alpha. If the owner hears the blend as clearly younger and no less clear, swap the voice id in `make-sutra-clips.mjs` and remake; nothing else changes.
- One voice for every Mode: a name is a name, and two sets would double the download for little gain.

**4. Files and loading, aligned with better-voice.** Same format (AAC `.m4a`, mono, 24 kHz, 32 kbps, made with macOS `afconvert`), same folder root (`voice/`), same service-worker rule (cache first, carried into the next deploy's cache when unchanged, never in the install precache), same tool folder (`tools/voice/`).
- One small file per name, `voice/sutras/<id>.m4a` (9 to 21 KB), not one 375 KB sprite: the first tap should play in well under a second on a slow phone, and 29 files are few. The build stamps them like better-voice's packs (content-hashed names or `?v=<hash>`, whichever better-voice lands with); `js/say.js` imports the generated file list.
- After the first Say it on a device, the other 28 clips are fetched one at a time while the browser is idle (`requestIdleCallback`, or a timer through `life.later`), so the names work offline from then on. Skipped when `navigator.connection.saveData` is true. Rejected: precaching at install (adds 375 KB for every visitor, most of whom never tap); prefetching when the Sutra page opens without a tap (spends a child's data on a guess).
- Playback through `js/voice.js` `playClip(url)`: decode with `decodeAudioData` and play an AudioBufferSource on the existing AudioContext, sharing the stop token. Rejected: an `<audio>` element. Playwright's WebKit and some locked-down browsers refuse to play it while they decode and play a buffer fine (seen on the listening page), and a shared token means read aloud and Say it never overlap.

**5. Where the button goes.** A button cannot sit inside another button or a link, so:
- Sutra card: a small round speaker button in the card's top corner, a sibling of the flip button (a tap on it does not flip); the respelling under the name on the card face.
- Deep dive: the button after the `h2` name, then the respelling line, then the Devanagari (`lang="sa"`) in smaller type.
- Trick page: in the `.mq-sutra` line, after the name, with the respelling under it. The Trick's `sutraId` picks the clip (the bracket note is not said).
- All places: after each Constellation heading's name.
- Not on: the Sky map labels (SVG text over a dense map; All places is the keyboard twin), Dojo nodes, the Skill map list, the Katas page tag (all inside links or tags; the Trick page is one tap away).
- The button: `<button type="button" class="say-btn" aria-label="Hear how to say Ekādhikena Pūrveṇa" aria-pressed="false">` with a speaker icon and, in the deep dive and Trick page, the visible word "Say it". `aria-pressed="true"` while the clip plays. At least 44 by 44 px. The respelling has a visually hidden prefix "Say it like: ".

**6. The respelling convention.** Sanskrit has a light, predictable stress, not English stress, and vowel length matters more (`docs/sutra-pronunciation.md`, sources there). The respelling spells long vowels so English readers hold them (ah, ee, oo, ay, oh) and short ones quick (uh, i, u), cuts long compounds at their parts, and puts the one light beat per part in capitals by the classical rule (second last syllable if heavy, else third last if heavy, else fourth last). Rejected: marking only long vowels and no beat (kids read capitals as "say this bit louder", which is roughly right and helps them chunk); English-style stress on the first syllable (wrong).
- The respellings are stored in `js/sutras.js` (`say`) and `deva`, generated once by `tools/voice/sanskrit.mjs` and checked by hand; `test/sanskrit.test.mjs` fails if the stored text and the generator disagree, so a change to one is a change to both.

**7. Fallback.** In order: the clip; if it cannot be fetched or decoded, the built-in English voice reads the respelling (hyphens as spaces, lower case: "ay kah dhi kay nuh poor vay nuh" is far closer than the IAST read as English), with a polite status "Played with this device's voice, which may not be exact."; with no speech at all, the status shows "Sound is not available here. Say it like this: ay-kah-dhi-KAY-nuh poor-VAY-nuh." The button never throws and never stays pressed.

**8. Spelling and meaning fixes.** "Pūrvena" to "Pūrveṇa" (three Tricks): `slug()` drops diacritics so Constellation ids are unchanged; `test/sky.test.mjs` names the Sutra and is updated. ṃ for m in "Nikhilaṃ Navataścaramaṃ" and "Śūnyaṃ" (Tirtha writes m; standard IAST and `js/sutras.js` write ṃ; same sound). Three meanings change, each pending the owner's yes (owner decisions below).

**9. Sutra ambience.**
- Sound: the bowl from `js/ambient.js` (inharmonic partials, slow beating, long decay) at a lower level, one strike when `#/sutras` renders and when a deep dive opens (at most one strike per 4 s, so paging through deep dives does not clang). Optional hum: two low sines (C2 and a fifth above) through a 320 Hz low pass, 6 s fade in, very low gain, a slow swell. Om mode: the CC0 recording played at 0.8 speed with the bowl's reverb, once when a page opens and, if the hum is on, every 20 s instead of the hum.
- Its own master gain, so fading it never touches Calm music.
- Settings (per device, like Sound effects): Sutra ambience on by default; Low hum off by default; Chanted Om off by default. On the Me page under Sound, and a compact Ambience button on the Sutra page header and in the deep dive header (`aria-pressed`) that toggles Sutra ambience.
- Silent when: Sound effects is off; Calm is on (`vm.calm`, from game-shell-and-calm); Pause motion is on (`html.motion-paused`); Calm music is playing when the page opens (the music keeps playing; if Calm music starts later, the ambience fades out). Reduced motion does not affect it.
- Autoplay: the AudioContext only starts after a gesture. Arriving by a tap (the usual case) counts; on a fresh load straight to `#/sutras`, the strike waits for the first pointerdown or keydown on the page, and never plays later than that.
- Leaving: the sutras view's signal aborts on any route away from `#/sutras` and `#/sutras/<id>` and the ambience fades out over 1.5 s and closes its nodes. Tab hidden (`visibilitychange`): fade out and stop the hum; when the tab is shown again on a Sutra page, the hum fades back in (no strike). All listeners and timers through `life.on`, `life.later`, `life.every` on the view signal.
- Rejected: an audio file for the bowl (the synth exists, costs nothing, and matches Calm music).

**10. Analytics.** One fixed event per tap that starts a clip: `math/say/sutra`, title "Say a Sutra name". No name, id, voice or Mode. Turning the ambience off is not counted (owner decision 5 if wanted).

## Risks / Trade-offs

- [A synthetic voice may stress or lengthen a syllable oddly] → the listening page lets the owner check all 29 per voice; a Whisper transcription flags the weakest; any name can be remade alone (`make-sutra-clips.mjs s07`), and its phonemes tuned in `names.mjs` (`say` field).
- [Regional pronunciations differ (jñ, ṛ, v)] → one widely used North Indian reading, with a note in the research doc; the respelling is a guide, not the only correct way.
- [Ambience annoys someone] → off with one tap on the page, off in Me, silent with Sound effects off, Calm or Pause motion, never over Calm music.
- [Om offends or confuses] → off by default, labelled honestly, its own switch.
- [better-voice lands with a different stamping scheme] → this change follows whatever `voice/` rule is in main when it is implemented.

## Migration Plan

Additive: no stored data changes. New settings default as in decision 9. Rollback: remove the buttons and `sutraAmbience()`; the clips can stay published.

## Owner decisions

1. **Voice**: Alpha (recommended) or the Alpha kid blend? Listen on the listening page.
2. **Meanings**: approve the three changes (sub-sutra 10 reversed, Sutra 9, sub-sutra 4).
3. **Ambience default**: on (as asked) with the hum off; or off until turned on?
4. **Calm and Pause motion** silence the ambience (as proposed), or only Sound effects off does?
5. **Count ambience off** (`math/ambience/off`) to learn whether it bothers people? Not proposed.
6. **A human recording**: ask a Sanskrit teacher to record the 29 names under CC0 or CC BY (about 3 minutes of audio) and replace the Kokoro clips? Kokoro ships now; a recording could replace it later with no code change.

## Open Questions

- None blocking beyond the owner decisions.
