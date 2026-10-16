# Proposal

## Why

The owner: "the default TTS that is there is bad. We need to find a better alternative that does not cost me a lot."

Read aloud is on by default for Explorer (`fx.voiceOn()`), so the voice is the first thing a 4 to 7 year old hears. Today it is the browser's Web Speech voice (`js/voice.js` Tier 1). It raises the pitch (up to 1.15 for Explorer, which makes most voices sound strained and synthetic), and its ranking still picks compact or Windows desktop voices when nothing better is installed, so the same question sounds very different from one device to the next and robotic on many. The opt-in natural voice (Tier 2, Kokoro in a Web Worker) sounds good but needs a 92 MB model download and a fast device, so almost nobody has it.

The inventory in `design.md` shows that what the game says is far more regular than it looks: about 830,000 sampled lines reduce to about 4,200 sentence templates, 245 fixed lines and about 1,100 word frames between numbers. Every one of them can be said by a prerecorded clip set made once, for free, with the same Kokoro model.

## What Changes

**A. Tune the built-in voice (ships first, small).**
- No pitch shift: pitch 1 for every Mode and voice. A calm rate: 0.9 for Explorer, 0.95 otherwise.
- Every English voice is rated good, ok or poor. Good: neural or natural, Microsoft online, Siri, Premium, Enhanced, Google. Poor: novelty voices, eSpeak, Apple compact voices, Windows desktop voices. The built-in voice never uses a poor voice when a good or ok one exists; the Me picker lists good and ok voices first and marks poor ones.
- For Explorer lines, best available prefers a real child voice when the device has one. Only Edge has them (Microsoft Ana and Maisie, online neural voices). No pitch shifting anywhere.
- When only poor voices exist, Me settings shows one note with how to add a better system voice on iPhone or iPad, Mac, Windows and Android. It is shown once per Player until dismissed.

**B. The clip voice: free, the same on every device, works offline (the new default).**
- The owner asked for a kid's voice. No free model has a natural-sounding child voice (see `design.md` decision 4b), so the Explorer clip voice is the most kid-like blend of Kokoro's own voices that still sounds clear: Heart 70% with 30% of Kokoro's lighter Japanese voice, saying English (the "Kid blend" on the listening page), subject to the owner's ears. Challenger and Pro lines use plain Heart.
- At dev time, a repo-only script runs every question generator, normalizes each line with `normalize()`, and makes Kokoro clips (the kid blend for Explorer lines, `af_heart` for the rest) for: every fixed line (praise, feedback, toggles, digit-free questions and hints) as one whole clip; the numbers 0 to 99 in a mid-sentence and an end-of-sentence take, plus hundred, thousand, million, point and negative; and every word frame between numbers ("plus", "equals what?", "Count up from", "percent of").
- Clips are AAC in `.m4a` (mono, 24 kHz, 32 kbps), which current Safari, Chrome, Firefox and Edge all play. They are packed into five content-hashed packs by surface (core for Explorer, then grades 3 to 5, Tricks, grades 6 to 8, grades 9 to 12), about 11 MB in all at 32 kbps (about 8 MB at 24 kbps) and about 1.2 MB for the core pack, which holds every number clip. A pack downloads the first time a line needs it (the core pack while idle once read aloud is on), the service worker keeps it, and it plays offline after that.
- `speak()` plays the clip voice when every clip for the line is in a loaded pack; a line with any clip missing is read whole by the built-in voice (never a mix of voices in one line). The opt-in natural voice keeps priority when it is on and loaded.
- A node test fails when an Explorer line has no clips and reports overall coverage, which must stay at or above 99%, so new wording cannot quietly fall back.

**C (deferred, not built).** A cloud neural voice (Google Neural2 or Azure Neural, about $16 per million characters after a free tier) with a server-side cache. It is deferred: it needs a server function, abuse limits and an ADR because question text would leave the device; generated questions barely repeat, so a cache saves little; and at about 10 million characters a month (100 Players a day hearing 100 lines of about 35 characters) it would cost about $150 a month. The trigger for revisiting it is in `design.md`.

Out of scope:
- Implementing anything before the owner approves this change. The listening prototype in `docs/prototypes/voice/` is the only code in this change.
- New languages, or a Player-facing picker for clip voices (one voice per Mode, chosen by the owner by listening).
- Reading anything that is not read today (Bolt's lines, menus, Sky labels). The clip set covers exactly what `fx.speak()` receives now.
- Changing when speech happens (it still only ever follows a tap) or the read-aloud defaults per Mode.
- Removing the opt-in natural voice (Tier 2).

Affected: every Player who has read aloud on, which is every Explorer Player by default and any Challenger or Pro Player who turns it on. Explorer Players get the biggest change (praise, Explorer Arena, Balloon pop, K to 2 practice are all in the core pack). Grown-ups reading the parent note see no change: nothing new is sent, the clips are files of this site.

## Capabilities

### New Capabilities

- `read-aloud`: the voice order (natural voice, clip voice, built-in voice), clip coverage and fallback, the clip packs and offline use, the tuned built-in voice and its rating, the poor-voice note, and stopping.

### Modified Capabilities

None. `accessibility` keeps its "voice picker fits a 320px screen" scenario unchanged.

## Impact

- `js/voice.js`: built-in tuning and the good, ok, poor rating (A); `speakClips()` and pack loading (B); `settingsHTML()` and `wireSettings()` gain the voice choice and the poor-voice note.
- New `js/voice-clips.js` (generated: the clip index, pack names and hashes; imported only when read aloud first plays), new `voice/*.m4a` packs (published, content-hashed names).
- `sw.js`: voice packs are cache first and carried into the next deploy's cache when their hash is unchanged. `build.py`: lists `voice/` packs as publishable, never precached at install.
- New repo-only `tools/voice/` (moved from `docs/prototypes/voice/tools/` once approved): `inventory.mjs`, `stitch-plan.mjs`, `voice-lib.mjs` (blends, cache, encoding), `make-clips.mjs`, `kid-voices.mjs`; `_config.yml` excludes `tools/`.
- Tests: new `test/voice.test.mjs` (normalize cases, rating, stitch plans), new `test/voice-clips.test.mjs` (coverage); new Playwright `e2e/tests/voice.spec.ts`; `e2e/tests/offline.spec.ts` (clips play offline); `e2e/tests/games.spec.ts` (balloon stop and start still cancels).
- `GLOSSARY.md`: Read aloud, Built-in voice, Clip voice, Natural voice.
- No ADR: nothing new is sent or kept. Plan C would need one.
