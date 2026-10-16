# Proposal

## Why

The owner: "the default TTS that is there is bad. We need to find a better alternative that does not cost me a lot." After listening to the first prototype (the browser voice, tuned and untuned, and the free Kokoro voices, stitched and whole): "Both voices are bad. We need to fix this for good. If I have to pay, what can I get for cheap?"

Read aloud is on by default for Explorer (`fx.voiceOn()`), so the voice is the first thing a 4 to 7 year old hears. Today it is the browser's Web Speech voice (`js/voice.js` Tier 1): pitch raised up to 1.15, and robotic compact or desktop voices on many devices. The opt-in natural voice (Tier 2, Kokoro, a 92 MB download) is rarely used, and the owner does not find Kokoro good enough either.

The inventory in `design.md` shows that what the game says is very regular. Explorer can say about 1.2 million different lines, but 98% of them come from two Skills (three-digit adding and comparing numbers). The other Explorer lines are a closed set of about 19,700 lines and 720,000 characters. Every other line in the game can be put together from about 1,550 short clips, about 40,000 characters. A top paid neural voice can therefore record the whole set once, ahead of time, for between nothing (inside a free tier) and about $40. Asking a paid voice for every line as it plays would cost about $25 to $500 a month.

## What Changes

**A. Tune the built-in voice (the fallback; ships first, small).**
- Pitch 1 for every Mode and voice. Rate 0.9 for Explorer, 0.95 otherwise.
- Every English voice is rated good, ok or poor. Good: neural or natural, Microsoft online, Siri, Premium, Enhanced, Google. Poor: novelty voices, eSpeak, Apple compact, Windows desktop. Best available never uses a poor voice when a good or ok one exists. Network voices (Edge Online, Chrome Google) stay allowed, as today.
- When only poor voices exist, Me settings shows one note on how to add a better system voice.

**B. Studio voice: one paid neural voice, recorded ahead of time and served as audio files (the new default).**
- The owner picks one voice by listening. The shortlist is Google Chirp 3 HD, Azure neural, OpenAI gpt-4o-mini-tts and ElevenLabs Flash. The listening page plays any of them next to today's voices once a provider key is set (`tools/make-clips.mjs`). A repo-only script records with it, once:
  - **whole lines** for every Explorer line except three-digit adding and comparing (about 19,700 lines), and every fixed line (praise, feedback, toggles, digit-free questions and hints);
  - **clips** for everything else: the numbers 0 to 99 in a mid-sentence and an end-of-sentence take, hundred, thousand, million, point, negative, and about 1,100 word frames ("plus", "equals what?", "Count up from").
- Format: AAC in `.m4a`, mono, 24 kHz, 32 kbps. About 210 MB of whole lines plus about 11 MB of clip packs.
- **Audio as a service:** the audio is not committed to this repo. It is published as its own static site, a separate repo `vedic-math-voice` served by GitHub Pages at `https://sbmadhav.com/vedic-math-voice/`. That is the same origin as the game, free, with no new third party and nothing new sent. The game fetches a line's file by the hash of its words, or its clip pack. The service worker keeps what was played, and Explorer's clip pack downloads while idle once read aloud is on.
- `speak()` order: the natural voice if the Player turned it on, then a whole studio line, then studio clips, then the built-in voice. One line is always said by one voice. If a whole line has not arrived within 600 ms, the clips say it.
- A node test fails when an Explorer line has no studio audio. Overall coverage must stay at or above 99%.

**C. A live cloud voice at play time ("audio as a service" in the other sense) is the alternative, not the plan.** A small server function would ask the provider for each new line and cache the result. It would cover any line with no stitching. But it costs every month: about 10 million characters for 100 Players a day comes to about $25 a month (Google WaveNet) up to $525 (ElevenLabs). It also needs a function host, abuse limits and a spend cap, sends question text and Players' IP addresses through a server, and does not work offline. `design.md` has the numbers and when to revisit it.

Out of scope:
- Implementing anything before the owner approves this change. The listening prototype in `docs/prototypes/voice/` is the only code in this change.
- Kid voices (the owner: "skip kid voices for now"). The research is kept in `design.md`.
- A Player-facing picker for the studio voice (one voice, chosen by the owner).
- Reading anything that is not read today, changing when speech happens (it still only follows a tap), or the read-aloud defaults per Mode.
- Removing the opt-in natural voice (Tier 2).

Affected: every Player with read aloud on, which is every Explorer Player by default and any Challenger or Pro Player who turns it on. Explorer Players hear whole studio lines almost everywhere. Grown-ups reading the parent note see no change: the audio is a file from this site, and no text is sent anywhere.

## Capabilities

### New Capabilities

- `read-aloud`: the voice order, studio audio coverage and fallback, loading and offline use, the tuned built-in voice and its rating, the poor-voice note, and stopping.

### Modified Capabilities

None. `accessibility` keeps its "voice picker fits a 320px screen" scenario unchanged.

## Impact

- `js/voice.js`: built-in tuning and rating (A); `speakStudio()` for whole lines and clips, line hashing and pack loading (B); Me settings gain the voice choice and the poor-voice note.
- New generated `js/voice-index.js`: the studio voice id, base URL, pack names and hashes, the clip index, and the list of Skills and fixed lines covered by whole lines. It is imported only when read aloud first plays.
- New repo `sbmadhav/vedic-math-voice` (GitHub Pages, published by a workflow from a build artifact, so the audio never piles up in git history). This repo gets no audio.
- `sw.js`: `/vedic-math-voice/` files are cache first (their names hold their hash), and on install the worker carries them into the next deploy's cache.
- New repo-only `tools/voice/` (moved from `docs/prototypes/voice/tools/`): `inventory.mjs`, `stitch-plan.mjs`, `voice-lib.mjs` (Kokoro and the four paid providers, keys only from the environment), `make-clips.mjs`, `publish.mjs`. `_config.yml` excludes `tools/`.
- Tests: new `test/voice.test.mjs`, new `test/voice-coverage.test.mjs`; new Playwright `e2e/tests/voice.spec.ts`; `e2e/tests/offline.spec.ts`; `e2e/tests/games.spec.ts` (balloon stop and start still cancels).
- `GLOSSARY.md`: Read aloud, Built-in voice, Studio voice, Natural voice.
- One-time cost: $0 to about $40 for the recording, depending on the voice; hosting $0. No ADR: nothing new is sent and no new party is involved. Plan C would need one.
