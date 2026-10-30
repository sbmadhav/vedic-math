# Licence of the content and of new code

This repository has two licences, split at one commit.

## Up to the cutoff commit: MIT

Everything published in sbmadhav/vedic-math up to commit `2a8b7a3d4da7888d8956a4314fcff0978a510fe0` (2026-10-28) stays under the MIT License in [LICENSE](LICENSE): the software (HTML, CSS, JavaScript, TypeScript, Python and other code) and the learning content the earlier notice called part of it (lessons, Katas, Worked examples, games). That grant cannot be withdrawn: anyone holding a copy from before the cutoff keeps the MIT rights to it.

## After the cutoff: all rights reserved

After the cutoff commit, new files and post-cutoff changes are proprietary unless a file says otherwise. In particular, all rights are reserved for:

- the lessons, Kata and Worked example text, Deep dives and every other learning text;
- Bolt, the Nikhilam Family and all other art, the icons and the name Learn Vedic Math;
- the Name clips and Studio voice clips recorded after the cutoff, and every other recording;
- the code written or changed after the cutoff.

A file that has both keeps its pre-cutoff text under MIT; only what was added or changed after the cutoff commit is proprietary. The git history is the record of which is which: compare the file with its version at the cutoff commit (`git diff 2a8b7a3d4da7888d8956a4314fcff0978a510fe0 -- <file>`, or `git blame`). A file added after the cutoff is proprietary as a whole. No per-file marker is needed; a file licensed otherwise says so in a notice of its own.

You may read the code and run your own checkout to study it. You may not copy, publish, sell or build on it without written permission from the owner. Playing at https://learnvedicmath.com/ is free under the site's terms (https://learnvedicmath.com/terms/).

## Never licensed

- The name Madhav Srinivasan and his likeness, including use that suggests endorsement.

## Third-party work

Vendored code, fonts and models keep their own licences: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md), published at https://learnvedicmath.com/licenses/.

## Sounds

- `sounds/sutras/*.m4a`, the 29 Sutra Name clips: made with the open Kokoro-82M speech model (Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M) through kokoro-js, from phonemes this repo generates from the IAST (`tools/sutra-voice/`). Voice: a blend of Kokoro's Hindi voice Alpha (70%) and Japanese voice Alpha (30%). Published before the cutoff, so they stay under the MIT License with the rest of that code.
- `sounds/om.m4a`, the chanted Om: "Om.ogg" by Tito Dutta, Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Om.ogg), CC0 1.0 Universal Public Domain Dedication. Converted to AAC. It is atmosphere added by this app, not part of the 1965 book.

Copyright (c) Madhav Srinivasan.
