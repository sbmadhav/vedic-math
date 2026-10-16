# Design

## Context

- `js/fx.js` `speak(text, force)` is the only way into speech. It calls `js/voice.js` `speak()` when read aloud is on (`fx.voiceOn()`, default on for Explorer only) or when `force` is set.
- `voice.speak()` turns question HTML into words (`normalize()`) and cancels anything playing. It then uses the natural voice (Tier 2: Kokoro in `js/voice-worker.js`, opt-in, about 92 MB) or the built-in voice (Tier 1: Web Speech, pitch 1.04 to 1.15, and a ranking that still picks compact and Windows desktop voices when those are all there is).
- Call sites of `fx.speak()` all follow a tap:
  - `js/app.js`: the Practice question (`:325`), the Kata question (`:486`), "Hear it" (`:367`), Explorer praise (`:358`), Explorer "Not quite. Try again!" and hints (`:361`, `:362`, `:365`), and the read-aloud toggles (`:208`, `:1130`).
  - `js/arena.js`: Explorer Arena and tower tap rounds (`:100`, `:219`).
  - `js/star.js`: the Star question (`:238`).
  - `js/games.js`: the Balloon pop prompt and counts (`:173`, `:174`), and "Which has more?" (`:188`).
  - Bolt's lines, menus and Sky labels are never spoken.
- `sw.js` caching:
  - `?v=` files are cache first, own files network first, shared files stale while revalidate.
  - The worker intercepts every fetch from the pages it controls, including other paths on sbmadhav.com.
  - Caches are `vedic-math-<VERSION>`; the current and previous ones are kept.
- Owner decisions after the first prototype:
  - The browser voice and Kokoro are both not good enough; the owner will pay a little for a good voice.
  - Skip kid voices for now.
  - Pick whichever bitrate sounds better: 32 kbps.
  - Do not commit audio to this repo; reconsider "audio as a service".
  - A 99% coverage floor is fine.
  - Network built-in voices are fine to keep.

## Inventory

Run `node docs/prototypes/voice/tools/inventory.mjs 1000 1`. It writes `inventory.json`. It samples every source of spoken text, normalizes each line with the real `normalize()`, and splits it with `stitch-plan.mjs` into numbers, word frames and pauses.

The sample covers:
- 1,000 lines per Skill and generator level (135 Skills x 3 levels, question and first hint);
- all 1,050 Katas, which are what Stars deal;
- 60 Explorer daily sets, and 20 each for Challenger and Pro;
- every 7th tower challenge;
- the Balloon pop prompts and counts, and the fixed lines.

| | Count |
|---|---|
| Lines sampled | 829,442 |
| Distinct lines | 202,336 |
| Sentence templates (numbers replaced by #) | 4,189 |
| Fixed lines (no digits) | 245 lines, 9,448 characters |
| Word frames between numbers | 1,098 frames, 28,133 characters |
| Number clips | 0 to 99 plus hundred, thousand, million, point and negative: 105, times two takes |

In the sample, 12.5% of lines are fixed lines, 87.5% can be stitched, and 0% cannot be said.

The frame set is nearly closed: 1,032 frames at 300 samples per Skill and level, 1,098 at 1,000 and 1,110 at 1,500. The tail is long Pro algebra and calculus frames. The top 300 frames cover 87% of frame uses and the top 800 cover 99.7%.

### Every Explorer line, enumerated

Each K to 2 Skill was sampled until 200,000 draws in a row added no new line.

| | Lines (questions and first hints) | Characters |
|---|---|---|
| All K to 2 Skills | 1,213,060 | 34.4 million |
| `2-add1000` (three-digit adding and subtracting) | 840,338 | most of the rest |
| `1-compare` (compare two numbers) | 352,997 | |
| Every other K to 2 Skill, the Explorer Arena pool and the games | **19,725** | **720,457** |

The Explorer Arena pool (`k-add10`, `k-sub10`, `k-bonds`, `k-count`, `1-doubles`, `1-maketen`, `k-teens`) is inside the last row. So whole studio lines cover every Explorer line except those two Skills, which are stitched like everything else.

### Findings to fix in `normalize()` (task 2.2)

- Ordinal denominators are read as digits plus "ths" ("Keep the 12ths"). 50 frames carry digits because of this.
- The number bond prompt "3 and how many more make 10?" is read as "make 10 what?", because a `?` after a number becomes "what".

## Goals / Non-Goals

**Goals:**
- A voice the owner is happy with, the same on every device, for every Explorer line, for at most tens of dollars once and nothing a month.
- Never worse than today: anything not recorded is read by a better-tuned built-in voice.
- Nothing new leaves the device; offline once saved.

**Non-Goals:**
- Kid voices (deferred by the owner).
- A Player-facing voice picker for the studio voice.
- Other languages.
- Removing the natural voice.

## Decisions

**1. Voice order: natural voice, whole studio line, studio clips, built-in voice. One voice per line.**
- The natural voice stays first, because only Players who chose its download have it.
- A whole line beats clips. If the whole line has not arrived within 600 ms (a slow network), the clips say it, so a line never waits long.
- Mixing voices inside a line sounds broken. A line with any missing clip goes whole to the built-in voice.

**2. Built-in voice rating (A).**
- **Good:** the name or `voiceURI` matches neural or natural, Microsoft "Online", Siri, Premium, Enhanced (Apple `com.apple.voice.enhanced.*` and `.premium.*`), or starts with Google.
- **Poor:** novelty voices, eSpeak, Apple `com.apple.voice.compact.*`, and Microsoft voices without "Online".
- **Ok:** anything else.
- Within a tier the order is English US, then UK, India, others.
- Pitch is always 1. Rate is 0.9 for Explorer and 0.95 otherwise.
- `rateVoice()` in `docs/prototypes/voice/proto.js` is the reference.
- Network voices stay rated good (owner decision). With the studio voice as the default, they are only a fallback.

**3. The poor-voice note.**
Copy, with no em dashes:

> The voices on this device sound robotic. The game uses its own studio voice where it can. For a clearer voice everywhere, add an Enhanced English voice: on iPhone or iPad, Settings, Accessibility, Spoken Content, Voices; on a Mac, System Settings, Accessibility, Spoken Content, System voice, Manage Voices; on Windows, Settings, Time and language, Speech, Add voices; on Android, Settings, Text-to-speech output, Speech Services by Google.

It shows in Me only, once per Player, until "Got it".

**4. The studio voice is a paid neural voice, recorded once at dev time.**
Prices are list prices found in October 2026. Check them before buying.

The one-time recording is about 770,000 characters per voice: 720,457 for whole Explorer lines, about 9,400 for fixed lines and about 40,000 for clips. A wording change re-records only the lines it touches.

| Voice | Price after the free tier | Free each month | One-time recording (770K characters) | If called at play time, 10.5M characters a month (plan C) |
|---|---|---|---|---|
| Google Chirp 3 HD | $30 per million | 1M characters | $0 (inside the free tier) | about $285 a month |
| Google Neural2 | $16 per million | 1M | $0 | about $152 a month |
| Google WaveNet | $4 per million | 4M | $0 | about $26 a month |
| Azure neural (e.g. Ava) | $15 per million | 0.5M | about $4 | about $150 a month |
| OpenAI gpt-4o-mini-tts | about 1.5 cents a minute | none | about $11 (about 760 minutes) | about $155 a month |
| ElevenLabs Flash v2.5 | about $50 per million | plan credits | about $40 | about $525 a month |

The plan C column assumes 100 Players a day x 100 lines x 35 characters. It grows with every Player.

The recommendation is to shortlist Google Chirp 3 HD (Google's newest and most natural, and free at this size) and Azure Ava, and let the owner pick by ear.
- `voice-lib.mjs` already has adapters for all four providers. They read keys only from the environment.
- With a key set, `make-clips.mjs` adds the voice to the listening page. The 12 sample lines and their clips come to about 1,500 characters, inside every free tier.
- Before buying, read the provider's terms on storing and serving generated audio. The voice must be licensed for a public website. ElevenLabs needs a paid plan for that.

**5. Kokoro stays only as the natural voice.**
The prototype showed that free Kokoro clips are not good enough for the owner, so it is not the studio voice. Its tools stay, because `voice-lib.mjs` makes test clips for free.

**6. Format: AAC in `.m4a`, mono, 24 kHz, 32 kbps.**
- Every current browser plays it, including older iPhones that cannot play Ogg Opus (Safari added that in 18.4).
- 32 kbps is the better-sounding of the two options (owner: "whichever is better").
- Providers return 24 kHz PCM, and `afconvert` (or `ffmpeg -c:a aac`) encodes it.
- Playwright Chromium and WebKit both decode it through Web Audio.

**7. Audio as a service: a separate static site on the same origin.**
- **Whole lines.** One file per line, named by the first 16 hex characters of SHA-1 over the voice id and the normalized words: `/vedic-math-voice/<voice>/l/<hash>.m4a`. That is about 19,900 files and about 210 MB (2.15 s average at 4 KB/s, plus about 2 KB of container overhead per file).
- **Clips.** Five content-hashed packs, about 11 MB (decision 8).
- **Where the files live.** A new repo `sbmadhav/vedic-math-voice` serves them as GitHub Pages project pages at `sbmadhav.com/vedic-math-voice/`. A workflow publishes them with actions/deploy-pages from a build artifact, so the audio is never in any git history. The tools upload the artifact; only an index (`index.json`) and the workflow live in that repo.
- **Why this host.** It is the same origin as the game, so there is no CORS, no new third party, no parent-note change, and the service worker can cache it. It is free, and well inside the Pages limits (1 GB per site, about 100 GB a month).
- Other hosts considered:

| Host | Free allowance | Drawback |
|---|---|---|
| Firebase Hosting (same Firebase project) | 10 GB stored, 360 MB a day | A new request to Google from every Player |
| Cloudflare R2 behind a custom domain | 10 GB, free egress | A new vendor and DNS |
| This repo | none needed | Rejected by the owner: about 220 MB of binaries in history |

**8. Clips, for the lines with no whole recording.**
- Numbers 0 to 99 are one clip each, in a mid-sentence take ("seventy three,") and an end-of-sentence take ("seventy three."). Frames are said alone with their punctuation.
- Clips are packed into sprites with 0.25 s of silence between them. Each pack is decoded once with `decodeAudioData`, and its clips are scheduled on one `AudioContext` with 40 ms gaps, 120 ms after a comma, 260 ms after a sentence end, and 6 ms fades.
- Each clip's real start and end are found by searching for sound around its stored start, because AAC decoders add a start offset (`clipBounds()` in the prototype).

| Pack | Clips | Size at 32 kbps |
|---|---|---|
| Core (numbers, Explorer frames and fixed lines) | 210 numbers + 117 | about 1.2 MB |
| Grades 3 to 5 | 294 | about 2.0 MB |
| Tricks (Katas, Stars, Challenger and Pro Arena, towers) | 308 | about 2.1 MB |
| Grades 6 to 8 | 216 | about 1.6 MB |
| Grades 9 to 12 | 408 | about 3.9 MB |
| All | about 1,550 | about 11 MB |

**9. Loading and offline.**
- `js/voice-index.js` is imported only when read aloud first plays. It is generated, and holds the voice id, the base URL, the pack names, the clip index and the covered Skills.
- When a line comes from a covered Skill or is a fixed line, `speak()` fetches its file. Otherwise it plans clips.
- The core pack loads on idle once read aloud is on.
- Files and packs are cache first in `sw.js`, because their names change with their bytes. On install, the worker copies `/vedic-math-voice/` entries from the previous cache, so a deploy never drops audio a Player already has.
- Offline, a line the device never fetched falls back to clips (core pack saved) or the built-in voice.
- Nothing is precached at install: only Players who use read aloud download audio. An Explorer Player downloads about 1.2 MB once, plus about 10 KB per new line.

**10. iOS.**
- Web Audio, unlike `speechSynthesis`, is silenced by the iPhone ringer switch. Set `navigator.audioSession.type = 'playback'` (Safari 16.4 and later) before the first line, and check on a real iPhone (task 3.3).
- The `AudioContext` is resumed inside the tap that leads to speech.

**11. Coverage is a test.**
- `test/voice-coverage.test.mjs` fails on any Explorer line without studio audio (its hash missing from the index, or a missing clip) and when overall coverage falls below 99% (owner decision).
- A wording change to an Explorer line therefore needs `node tools/voice/make-clips.mjs` and a publish, before or with the commit that changes the wording.

## Alternatives

**C. A live cloud voice at play time (audio as a service, live).**
A small server function (Cloud Functions or a Cloudflare Worker) would call the provider for each new line, store the result, and serve it to everyone after that.
- **For:** any line works whole, including three-digit sums, with no stitching.
- **Against:**
  - A monthly cost that grows with Players (decision 4, last column), and little help from the cache, because most Explorer lines are three-digit sums or comparisons that rarely repeat.
  - A function host, abuse limits (App Check, per-IP quotas) and a spend cap to build.
  - Question text and every Player's IP address go to the function and the provider, which needs an ADR, `parentNote()` and `cloud/README.md` changes, and a decision about under-13 Players without the Parent step.
  - No offline.
- **Revisit when:** after B ships, the owner finds the stitched lines (mainly three-digit sums and comparisons) too choppy. First try recording those two Skills whole as well. That is about 33.7 million characters: about $100 once with Google WaveNet, about $980 once with Chirp 3 HD, and about 12 GB of audio. Choose C only if that is worse, and then with Google WaveNet or Neural2 and a hard monthly cap.

**Free voices only (the first version of this change).** The browser voice, tuned, and Kokoro clips. Tried in the prototype; the owner rejected both.

**Natural voice for everyone.** A 92 MB download and a fast device, and the same Kokoro voice the owner rejected.

**Kid voices.** Deferred by the owner. The first prototype found no free, natural child voice. Kokoro and Piper are adult only, research child models are non-commercial, and cloning would need a real child's recording. The only real child voices in browsers are Edge's online Ana and Maisie. Paid providers have some child-like voices (for example Azure's Ana), to revisit with the studio voice later.

## Risks / Trade-offs

- **Stitched lines sound less smooth.** Mitigation: whole lines for almost every Explorer line, two number takes, and the owner judging the chosen voice's clips in the prototype.
- **A second repo and a publish step for audio.** Mitigation: one script (`publish.mjs`) builds the artifact and starts the workflow, and the coverage test catches a forgotten publish.
- **The provider changes or retires the voice.** Mitigation: the audio is ours once recorded, and a full re-record costs at most about $40.
- **Terms of use for stored audio.** Mitigation: check before buying (decision 4).
- **The iPhone ringer switch.** Mitigation: decision 10 and a real-device check.

## Open decisions for the owner

1. Which studio voice. Listen on the prototype after setting a key, or on the providers' demos linked there. Recommended shortlist: Google Chirp 3 HD and Azure Ava.
2. Create the provider account and key (Google Cloud with the Text-to-Speech API, or Azure Speech), and the empty `sbmadhav/vedic-math-voice` repo with Pages set to "GitHub Actions".
