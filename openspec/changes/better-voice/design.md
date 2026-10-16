# Design

## Context

- `js/fx.js` `speak(text, force)` is the only way into speech; it calls `js/voice.js` `speak()` when read aloud is on (`fx.voiceOn()`, default on for Explorer only) or `force` is set.
- `voice.speak()` normalizes question HTML to words (`normalize()`), cancels anything playing, then uses the natural voice (Tier 2, Kokoro in `js/voice-worker.js`, opt-in, about 92 MB) or the built-in voice (Tier 1, Web Speech). Tier 1 today: pitch 1.04 to 1.15 (1.15 for Explorer on a non-neural voice), rate 0.9 to 0.96, a score table that prefers neural, online, Google and Siri names but still picks compact and Windows desktop voices when they are all there is.
- Call sites of `fx.speak()` (all follow a tap): `js/app.js` Practice question (`:325`), Kata question (`:486`), "Hear it" button (`:367`), Explorer praise (`:358`), Explorer "Not quite. Try again!" and hint (`:361`, `:362`, `:365`), the read-aloud toggles (`:208`, `:1130`); `js/arena.js` Explorer Arena tap rounds and tower tap rounds (`:100`, `:219`); `js/star.js` Star question (`:238`); `js/games.js` Balloon pop prompt and each popped count (`:173`, `:174`) and "Which has more?" (`:188`); `js/voice.js` Me samples. Bolt's lines, menus and Sky labels are never spoken.
- `sw.js`: `?v=` files cache first, own files network first, shared files stale while revalidate; caches `vedic-math-<VERSION>`, current and previous kept, older ones searched for `?v=` hits.
- The prototype `docs/prototypes/voice/` (this change) plays 12 real lines four ways; its tools are the starting point for `tools/voice/`.

## Inventory (task 1 of the brief)

Run: `node docs/prototypes/voice/tools/inventory.mjs 1000 1` (writes `inventory.json`). It samples every source of spoken text, normalizes each line with the real `normalize()`, and splits it with `stitch-plan.mjs` into numbers, word frames and pauses.

Sample: 1,000 lines per Skill and generator level (135 Skills x 3 levels, question and first hint), all 1,050 Katas (which Stars deal), 60 Explorer and 20 Challenger and Pro Arena daily sets, every 7th tower challenge, the Balloon pop prompts and counts, and the fixed lines.

| | Count |
|---|---|
| Lines sampled | 829,442 |
| Distinct lines | 202,336 |
| Sentence templates (numbers replaced by #) | 4,189 |
| Fixed lines (no digits): one whole clip each | 245 lines, 9,448 characters |
| Word frames between numbers | 1,098 frames, 28,133 characters |
| Number clips | 0 to 99, plus hundred, thousand, million, point, negative: 105, times two takes |

Share of lines the clip voice can say:

| How | Share of sampled lines |
|---|---|
| Whole clip (fixed line) | 12.5% |
| Stitched (numbers plus frames) | 87.5% |
| Cannot say | 0.0% in the sample (the frame set is nearly closed: 1,032 frames at 300 samples, 1,098 at 1,000, 1,110 at 1,500; the tail is long Pro algebra and calculus frames) |

By source (whole / stitched): Explorer Arena 13.6% / 86.4%; K to 2 Practice questions 21.3% / 78.7%, hints 22.6% / 77.4%; Balloon pop 0 / 100%; praise, feedback and toggles 100% whole; Katas, Stars, Challenger and Pro Arena 0 / 100%; grades 6 to 12 Practice 4 to 23% whole, the rest stitched.

Frame frequency is steep: the top 50 frames cover 55% of frame uses, 300 cover 87%, 600 cover 98.2%, 800 cover 99.7%. The most used: ".", ",", "times", "equals what?", "equals", "plus", "x plus", "over", "and", "minus", "divided by".

Why not whole clips for everything: K to 2 Practice alone has about 97,000 distinct questions (2-digit and 3-digit adding dominate), and the Explorer Arena pool about 5,200 (4 hours of audio, about 60 MB). Stitching is the only free option that covers every line.

Findings to fix in `normalize()` (task 2.2): ordinal denominators are read as digits plus "ths" ("Keep the 12ths"), 50 frames carry digits because of this; the number bond prompt "3 and how many more make 10?" is read "make 10 what?" because `?` after a number becomes "what".

## Goals / Non-Goals

**Goals:**
- One good voice for every Explorer line on every device, offline once loaded, at no running cost.
- Never worse than today: anything the clips cannot say is read by a better-tuned built-in voice.
- Nothing new leaves the device.

**Non-Goals:**
- A choice of clip voices, other languages, or reading text that is not read today.
- Removing the natural voice (Tier 2).

## Decisions

**1. Voice order: natural voice, clip voice, built-in voice, one voice per line.**
The natural voice stays first because it says any line whole, and only Players who chose a 92 MB download have it. Mixing the clip voice and a built-in voice inside one line sounds broken, so a line with any missing clip goes whole to the built-in voice.

**2. Built-in voice rating (A).**
Good: name or `voiceURI` matches neural or natural, Microsoft "Online", Siri, Premium, Enhanced (Apple's `com.apple.voice.enhanced.*` and `.premium.*`), or starts with Google. Poor: the novelty list (Albert, Bad News, Zarvox and the rest), eSpeak, Apple `com.apple.voice.compact.*`, and Microsoft voices without "Online" (Windows desktop SAPI voices). Ok: anything else (for example Android's "English United States", or "Samantha" in Chrome on a Mac). Within a tier, English US then UK, India, others. Pitch is always 1 (the raised pitch is what made voices strained); rate 0.9 for Explorer, 0.95 otherwise. The prototype's `rateVoice()` in `docs/prototypes/voice/proto.js` is the reference.

**2b. A child voice for Explorer when the device has one.**
The only real child voices any browser offers are Microsoft's online neural voices in Edge: "Microsoft Ana Online (Natural)" (US) and "Microsoft Maisie Online (Natural)" (UK). They are rated good, and for Explorer lines best available prefers them; Challenger and Pro never get them first. Apple, Google and Android ship no child voice (Apple's "Junior" is a novelty voice and stays poor). No pitch shifting anywhere: a raised pitch is what made today's voice sound strained.

Note for the owner: Microsoft "Online" voices in Edge and the "Google" voices in Chrome are network voices: the browser sends the spoken text to Microsoft or Google. Today's ranking already prefers them, so this is not new, and the clip voice (the new default) sends nothing. A keeps allowing them; dropping them would make the built-in voice worse on Windows.

**3. The poor-voice note.**
Copy (no em dashes): "The voices on this device sound robotic. The game uses its own recorded voice where it can. For a clearer voice everywhere, add an Enhanced English voice: on iPhone or iPad, Settings, Accessibility, Spoken Content, Voices; on a Mac, System Settings, Accessibility, Spoken Content, System voice, Manage Voices; on Windows, Settings, Time and language, Speech, Add voices; on Android, Settings, Text-to-speech output, Speech Services by Google." Shown in Me only, once per Player until "Got it".

**4. Clips are made at dev time with Kokoro, not in the browser and not in the cloud.**
`kokoro-js` 1.2.1 (Apache-2.0, the model the natural voice already uses) runs in Node on the developer's machine. Voice `af_heart` at speed 0.92 for Challenger and Pro, the kid blend for Explorer (decision 4b). Numbers 0 to 99 are one clip each (no "seventy" plus "three" joins) in two takes: mid-sentence (said as "seventy three,") and end of sentence (said as "seventy three."), so a final number falls in pitch. Frames are said on their own with their punctuation, so "equals what?" keeps its question rise. Every clip is cached by text, voice and speed, so a wording change only makes the clips it touches. On a quiet laptop a short clip takes well under a second; on the busy build machine used for the prototype it took 10 to 25 seconds, so a full set is minutes to an hour, done rarely.

**4b. The Explorer clip voice: the most kid-like voice that still sounds natural.**
The owner asked for a kid's voice. What exists for free (October 2026):
- Open models with real child voices: none usable. Kokoro v1.0 (54 voices), Piper (about 900 voices), Kitten TTS and MeloTTS have only adult speakers. Research child voices (FastPitch fine-tuned on the MyST children's corpus, `C3Imaging/child_tts_fastpitch`) are research quality, and MyST is licensed for non-commercial research only. Voice-cloning models (Chatterbox, F5-TTS, XTTS-v2) would need a recording of a real child, which raises consent questions for a children's site, and F5-TTS and XTTS-v2 weights are non-commercial.
- Kokoro blends: Kokoro voices are style vectors, and a weighted average of two is a new voice with no retraining and no pitch shift. The prototype tries 8 candidates on four Explorer lines and measures each one's typical pitch (median F0; adult women speak around 180 to 230 Hz, children of 6 to 10 around 230 to 300 Hz):

| Candidate | Voices | Speed | Median F0 |
|---|---|---|---|
| heart | af_heart | 0.92 | 202 Hz |
| bella | af_bella | 0.95 | 193 Hz |
| sky | af_sky | 0.95 | 160 Hz |
| nicole | af_nicole | 0.95 | 150 Hz |
| bella-sky | af_bella 50%, af_sky 50% | 0.95 | 180 Hz |
| heart-sky | af_heart 40%, af_sky 60% | 0.95 | 179 Hz |
| heart-bella | af_heart 50%, af_bella 50% | 1.0 | 201 Hz |
| heart-alpha | af_heart 70%, jf_alpha 30% | 0.95 | 217 Hz |

Sky and Nicole are often called young-sounding, but they are breathier and lower, not higher. No candidate reaches a child's pitch range; heart-alpha (Heart with 30% of Kokoro's lighter Japanese voice, saying English) is the highest and keeps Heart's clarity in the measures, so it is the proposed Explorer clip voice, with the full prototype rows made in it ("Kid blend"). It needs the owner's ears for one risk a number cannot show: a trace of accent from the Japanese voice. If the owner hears one, the fallback is plain Heart, which is already the brightest stock voice.

Proposed: Explorer packs (core) in the kid blend; Challenger and Pro lines (grades 3 and up, Tricks) in Heart, because a childlike voice reading "4368 divided by 16" to a 12 year old or an adult sounds patronizing. That means the number clips exist twice (one set per voice, about 0.65 MB each), adding about 0.65 MB in all. If the owner prefers one voice everywhere, use the kid blend everywhere or Heart everywhere and save that.

Honest summary: there is no free, natural-sounding, genuine child voice to ship. The closest real one is Microsoft Ana in Edge only; the closest everywhere is a brighter Kokoro blend that sounds like a young woman, not a child.

**5. Format: AAC in `.m4a`, mono, 24 kHz, 32 kbps.**
Opus is about 30% smaller, but Safari plays Ogg Opus only from Safari 18.4 (2025) and older iPhones are common with children; AAC in MP4 plays in every current browser, including iOS Safari since the first iPhone. Both Playwright Chromium and WebKit report `probably` for `audio/mp4; codecs="mp4a.40.2"`. Encoded with macOS `afconvert` (or `ffmpeg -c:a aac` elsewhere). 24 kbps saves 25% and is worth one listening check by the owner.

**6. Packs and size.**
Clips go into sprites (one `.m4a` per pack, 0.25 s of silence between clips, a JSON or module index of start and length). One file per pack avoids about 4 KB of container overhead per clip and hundreds of requests, and decoding a pack once with `decodeAudioData` lets clips be scheduled gaplessly on one `AudioContext`. Because AAC decoders add a short start offset, the player searches for sound around each clip's stored start (the prototype does this in `clipBounds()`).

Sizes below are for one voice; the Explorer kid blend adds a second set of number clips (about 0.65 MB, decision 4b). Measured from the prototype clips: about 0.059 seconds of speech per character (numbers spelled out), and 4,000 bytes per second of audio at 32 kbps inside a pack. Estimates per pack, at 32 kbps, gaps included:

| Pack | Clips | Characters | Size |
|---|---|---|---|
| Core (numbers, Explorer: K to 2, Explorer Arena, games, praise, toggles) | 210 numbers + 117 | about 2,000 + numbers | about 1.2 MB |
| Grades 3 to 5 | 294 | 7,470 | about 2.0 MB |
| Tricks (Katas, Stars, Challenger and Pro Arena, towers) | 308 | 7,622 | about 2.1 MB |
| Grades 6 to 8 | 216 | 5,734 | about 1.6 MB |
| Grades 9 to 12 | 408 | 14,739 | about 3.9 MB |
| All | about 1,550 | about 37,600 | about 11 MB (about 8 MB at 24 kbps) |

An Explorer Player downloads about 1.2 MB once. Dropping the rarest 300 frames (those covering 0.3% of frame uses, mostly Pro calculus) would save about 2 MB if 11 MB in the repo is too much.

**7. Loading and offline.**
`js/voice-clips.js` (generated: pack names with hash, clip index) is imported only when read aloud first plays. The core pack loads on idle once read aloud is on; other packs on first need; a line whose pack is not ready yet is read by the built-in voice, so nothing ever waits on a download. Packs are named `voice/<pack>.<hash>.m4a`, so `sw.js` can serve them cache first, and on install it copies packs from the previous cache whose names are still in the new index (so a deploy that does not change clips never drops them). They are not in `PRECACHE`: only Players who use read aloud pay for them.

**8. iOS.**
Web Audio, unlike `speechSynthesis`, is silenced by the iPhone ringer switch. Set `navigator.audioSession.type = 'playback'` (Safari 16.4 and later) before the first clip; the owner checks on a real iPhone (task 3.3). The `AudioContext` is created or resumed inside the tap that leads to speech, as the natural voice does today.

**9. Coverage is a test, not a hope.**
`test/voice-clips.test.mjs` fails on any Explorer line without clips and when overall coverage falls below 99%. A wording change to an Explorer line therefore needs `node tools/voice/make-clips.mjs` in the same commit; other lines can wait, falling back to the built-in voice.

**10. Packs are committed to git.**
About 11 MB now, plus a few hundred KB per later regeneration of one pack. Building them in CI would need Kokoro and 30 to 60 minutes per deploy and could change bytes between runs. Rejected: Git LFS (GitHub Pages does not serve LFS files from the branch).

## Alternatives

**C. A cloud neural voice with a cache (deferred).**
Google Cloud Text-to-Speech Neural2 (about 1 million characters a month free, then $16 per million) or Azure Neural (500,000 free, then $16 per million), through a server function that caches each line's audio. Deferred because:
- Question text would be sent from the Player's device to a server and a third party. Not personal data, but it reveals use and the Player's IP address to a new party, so it needs an ADR, `parentNote()` and `cloud/README.md` changes, and a decision about under-13 Players without the Parent step.
- It needs a server function (Firebase Functions needs the Blaze plan), abuse limits (App Check, per-IP quotas) and a spend cap.
- A cache saves little: about 200,000 distinct lines in the sample, and far more possible.
- Cost: 100 Players a day x 100 lines x 35 characters is about 10.5 million characters a month, about $150 a month; it grows with every Player.
- It needs a connection; the clip voice works offline.

Trigger to revisit: the owner listens to the prototype (and later the real packs) and finds the stitched lines too choppy for Explorer, and the tuned built-in voice is not good enough either. Then first try cheaper fixes (word frames recorded in context, whole clips for the 1,000 most played Explorer lines), and only then C, with an ADR and a spend cap.

**Whole Kokoro clips for every line.** Too big: the Explorer Arena pool alone is about 60 MB and K to 2 Practice is about 97,000 lines.

**Natural voice for everyone (Tier 2 by default).** 92 MB download and a fast device; slow on older phones and tablets, which is what many children use.

**Piper or another open model.** Kokoro sounds better at its size, is already in the app, and keeps the clip voice and the natural voice sounding the same.

## Risks / Trade-offs

- Stitched lines sound less smooth than whole lines. Mitigation: the two number takes, 40 ms gaps, fades; the owner judges in the prototype. Trigger above if not good enough.
- Repo size grows by about 11 MB. Mitigation: per-pack regeneration, optional 24 kbps, optional tail trimming.
- Clips go stale after a wording change. Mitigation: the coverage test for Explorer; built-in fallback elsewhere.
- The ringer switch on iPhone. Mitigation: decision 8 and a real device check.
- Decoding a 4 MB pack uses about 30 MB of memory (24 kHz Float32) on a phone. Mitigation: only the packs a Player uses are decoded, and Explorer only ever needs the core pack.

## Open decisions for the owner

1. Approve A and B as written, or A only for now.
2. The Explorer clip voice: the kid blend (heart-alpha), plain Heart, or another candidate from the kid-voice panel; and whether Challenger and Pro use Heart (proposed) or the same voice.
3. 32 kbps or 24 kbps.
4. Committing about 11 MB of packs to the repo, or trimming the rarest frames first.
5. The 99% coverage floor and the hard fail for Explorer lines.
6. Keep allowing network built-in voices (Edge Online, Chrome Google) that send the spoken text to Microsoft or Google, as today, or rate them ok instead of good so local voices win.
