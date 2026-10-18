# Proposal

## Why

The owner: "add a way to pronounce the sutra names; research on the internet and add spoken pronunciation." Later additions: "if you can pick voices, pick a kids voice", and a very mild "Sutra ambience" (a soft singing bowl, or an opt-in chanted Om) while learning the Sutras.

The 29 names (16 Sutras, 13 sub-sutras) are long Sanskrit compounds such as Ūrdhva-Tiryagbhyām and Yāvadūnaṃ Tāvadūnīkṛtya Vargaṃ ca Yojayet. Players see them on every Sutra card, in each deep dive, on every Trick page and as the Sky's Constellation names, but nothing tells them how to say them. Read aloud cannot help: an English built-in voice reads IAST as English letters, and a Hindi voice (where a device has one) drops every final a ("pūrveṇ" for Pūrveṇa). The research (`docs/sutra-pronunciation.md`) also found two misspellings in the Tricks and three English meanings to fix.

## What Changes

**A. Say it**
- A **Say it** button next to a Sutra name plays a short clip of the name. It appears on each Sutra card, in the Sutra deep dive, on Trick pages (the Sutra line under the title) and in All places beside each Constellation heading. Not on the Sky map itself (its names are drawn labels and the map is already dense; All places is its keyboard twin).
- A **respelling** kids can read is shown under the name wherever the button is ("ay-kah-dhi-KAY-nuh poor-VAY-nuh"): long vowels spelled to be held, one light beat per word part in capitals. The deep dive also shows the Devanagari.
- **Name clips**: 29 clips made once, for free, on a laptop with the open Kokoro model and the voice the owner chose, the Alpha kid blend (Hindi Alpha 70%, Japanese Alpha 30%), from phonemes generated from the checked IAST (not Hindi spelling rules). AAC `.m4a`, mono, 24 kHz, 32 kbps, the format the better-voice change uses: 369 KB for all 29, 9 to 21 KB each.
- Clips load on first tap (one small file), and after that first tap the rest load while the device is idle (unless Save-Data is on), so the names then work offline. The service worker keeps them cache first. Nothing is added to the install precache.
- Speech only follows a tap, and the button works whether read aloud is on or off. A tap stops anything being read aloud; a second tap stops the clip; leaving the page stops it.
- **Fallback**: when a clip cannot load or play, the device's English voice reads the respelling, and if there is no voice at all a short message shows the respelling to read. Nothing breaks.
- Accessibility: the button's accessible name is "Hear how to say <name>", at least 44 by 44 px; names carry `lang="sa-Latn"` and the Devanagari `lang="sa"` (including the Katas page tag, which lacks it today).
- One anonymous event per tap: `math/say/sutra`, with no name or voice in it.

**B. Fixes the research found**
- Spelling: "Pūrvena" becomes "Pūrveṇa" in the three Tricks that use it (`js/vedic.js`); "Nikhilam Navataścaramam" and "Śūnyam" match `js/sutras.js` (ṃ). The Sky's Constellation ids do not change.
- Meanings (`js/sutras.js`): sub-sutra 10 Samuccayaguṇitaḥ becomes "The product of the sums" (today's "The sum of the products" is reversed); Sutra 9 becomes "By motion and reckoning (calculus)"; sub-sutra 4 becomes "For 7, multiply by 143". Approved by the owner on 2026-10-17 (see `design.md`).

**C. Sutra ambience**
- On the Sutra pages (`#/sutras` and the deep dives), one soft singing-bowl strike when the page or a deep dive opens, synthesized live with Web Audio like the existing Calm music (no file), and an optional very quiet low hum while reading (off by default). Slow fades in and out, low volume, and only after the Player has tapped or pressed a key on the page.
- Opt in: a quiet chanted **Om** instead of the bowl, behind its own switch, off by default, with the note "Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book." The recording is CC0 (Wikimedia Commons, Tito Dutta), 12 KB, loaded only when the switch is on.
- Always easy to turn off: a visible Ambience button on the Sutra pages and a setting on the Me page. It is silent when Sound effects is off, when Calm is on and when Pause motion is on. Reduced motion does not affect it (it is not a sound setting).
- It never starts when the site's Calm music is already playing (the music keeps playing), and it fades out and stops when the Player leaves the Sutra pages, when the tab is hidden, or when Calm music starts.

Out of scope:
- Clips for anything other than the 29 names (Trick titles, sutra-details text, Bolt's lines; read aloud covers English text and better-voice owns it).
- A voice picker for name clips (one voice, chosen by the owner's ears on the listening page).
- A human recording (no free-licensed recording of any full name exists; see `design.md` open questions).
- Say it on the Sky map labels, Dojo nodes and the Skill map list (those names are inside links; a button cannot sit inside a link).
- Ambience on any page other than the Sutra pages; new Calm music tracks.

Affected: every Player in every Mode on the Sutra pages, Trick pages and All places (Say it, respelling); Players with Sound effects on who open the Sutra pages (ambience). Explorer Players get the same button and respelling (the respelling is the friendliest way in for a 6 year old who cannot read IAST). Grown-ups reading the parent note see no change: nothing new is sent or kept.

## Capabilities

### New Capabilities

- `sutra-pronunciation`: the Say it button and where it appears, the respelling and Devanagari, the name clips (voice, format, loading, offline), stopping, the fallback, and the language and size rules.
- `sutra-ambience`: the bowl strike, the optional hum, the opt-in Om with its honest note, the switches, the rules that keep it silent (Sound effects off, Calm, Pause motion, Calm music playing), and stopping on leaving or hiding the tab.

### Modified Capabilities

- `analytics`: ADDED "Say it is counted".
- `honest-framing`: ADDED "Om is labelled as atmosphere".
- `accessibility`: ADDED "Sutra names say their language".

## Impact

- `js/sutras.js`: each entry gains `say` (the respelling) and `deva` (Devanagari); three meanings change.
- `js/vedic.js`: "Pūrveṇa", ṃ spellings; each Trick gains `sutraId` (`s1` to `s16`, `u1` to `u13`) so a Trick's Sutra string finds its clip ("Nikhilam (division by 9)" is `s2`).
- New `js/say.js` and generated `js/say-clips.js`: `sayButton(id, name)` HTML, `wireSay(root, signal)`, clip loading, the idle prefetch and the fallback. It plays through `js/voice.js` (`playClip()`), so a clip and read aloud never talk over each other.
- `js/voice.js`: `playClip(url)` on the existing AudioContext and stop token.
- New `js/sutra-ambience.js`: `sutraAmbience({ signal })` (bowl strike, hum, Om), the switches, the Ambience button and the Me page settings block. `js/ambient.js` only shares its AudioContext (`audioContext()`).
- `js/app.js`: `sutrasView()`, `sutraHTML()`, `skillView()`, `katasView()` show the button and respelling; the sutras route starts the ambience on its view signal; Me page switches.
- `js/sky-view.js`: All places headings get the button.
- `js/metrics.js`: `say()` sends `math/say/sutra`.
- New published files: `sounds/sutras/<id>.m4a` (29 clips, `?v=<content hash>` from the generated `js/say-clips.js`) and `sounds/om.m4a`. Not under `voice/`: better-voice part B publishes its recordings there from a release archive and fails the build on committed audio under it. `sw.js`: `sounds/` cache first in `vedic-math-sounds`, a cache every deploy keeps, never in the install precache; `build.py` publishes them as ordinary files (no change).
- New repo-only `tools/sutra-voice/` (moved from `docs/prototypes/sutra-voice/tools/`; its own folder so it does not collide with better-voice's `tools/voice/` and its package.json): `sanskrit.mjs`, `names.mjs`, `make-sutra-clips.mjs`, `check.mjs`, `show.mjs`. `_config.yml` excludes `tools/`.
- `math.css`: `.say-btn`, `.say-resp`, the ambience button.
- `LICENSE-CONTENT.md`: credits for Kokoro (Apache-2.0) and the CC0 Om.
- `GLOSSARY.md`: Say it, Respelling, Name clip, Sutra ambience.
- Tests: new `test/say.test.mjs`, `test/sanskrit.test.mjs`, `test/ambience.test.mjs`; `test/sky.test.mjs` (spelling); `test/metrics.test.mjs`; `test/copy.test.mjs` (Om note, no em dashes); new Playwright `e2e/tests/say.spec.ts` and `e2e/tests/ambience.spec.ts`; `e2e/tests/offline.spec.ts` (a played name plays offline); `e2e/tests/a11y.spec.ts` (Sutra page with buttons, both schemes).
- No ADR: nothing new is sent or kept, no identity changes.
