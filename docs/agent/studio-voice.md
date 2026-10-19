# Studio voice

Read aloud plays prerecorded audio from `/vedic-math/voice/` (Google Chirp 3 HD, Aoede), else the device's own voice.

- The studio audio is never committed (the Sutra name clips in `sounds/` are the one committed audio, and `build.py` rejects audio anywhere else). It is a GitHub Release archive (`voice-<hash>`) named with its SHA-256 by the generated `js/voice-index.js`, and the CI deploy unpacks it into `_site/voice/` (`tools/voice/ci-fetch.mjs`).
- The recording tools are repo-only in `tools/voice/` (`lines.mjs`, `record.mjs`, `publish.mjs`; steps in the repo `README.md`). A change to any spoken line needs a re-record and publish in the same PR, or `test/voice-coverage.test.mjs` fails for Explorer lines.
- Keys and tokens come only from the shell (`GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token)`), never a file. Keep the spend guard in `tools/voice/voice-lib.mjs` ($300 a month, $50 a run, 300 requests a minute).
- The game never calls a speech service, and `build.py` fails on a provider host or key in a published file.
- `sw.js` keeps `/vedic-math/voice/` files cache first in `vedic-math-voice`, a cache every deploy keeps: up to 4,000 whole lines, and one copy of the line set, clip directory and each pack (a re-record's new copy replaces the old one; `test/sw-voice.test.mjs`).
