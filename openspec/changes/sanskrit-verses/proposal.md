# Proposal

## Why

The owner: "check in google drive for all vedic math sources. are there vedic slokas related to this? If there are I would like to add them with pronunciation and meaning as new subsections under sutras", and "do a detailed research online".

The research answer, from the owner's Drive sources (Tirtha's book as quoted by Kandasamy and Smarandache 2006, Williams' Manual 1, the Nicholas, Pickles and Williams lectures, Kapoor 1989, Muehlman) and from scholarship online:

- The 16 Sutras and 13 sub-sutras are short phrases, not verses (ślokas). The book's General Editor says the list was "compiled from stray references in the text" and that their style points to "their discovery by Sri Swamiji himself"; K. S. Shukla reports the Swami told him in 1950 that they were in "his own Pariśiṣṭa", not the Atharvaveda Pariśiṣṭas. So there are no verses behind the Sutras.
- The 1965 book does contain one verse, "gopī bhāgya madhuvrāta ...", which Tirtha decodes as π/10 to 32 places. It reads left to right (standard Kaṭapayādi reads right to left), T. Hayashi calls it "a quite new production", and its last digit is wrong (2, not 5).
- India has a long, genuine tradition of mathematics in verse. Eighteen items were verified against primary texts (GRETIL, TITUS, printed editions, Wisdom Library) and scholarship.

## What Changes

- A new section at the end of the Sutras page, **Mathematics in Sanskrit verse**, with an honest introduction and three subsections: From the Vedic texts (5), From India's great mathematicians (9), Numbers hidden in words (4).
- Each verse card: kind and meter, title, Devanagari (`lang="sa"`), IAST (`lang="sa-Latn"`), a respelling ("Say it"), a **Listen** button, the meaning, the math in plain words with the formula, and a details panel with word-by-word glosses, the source with honest dating, a note, and the pages it was checked against (links for Pro only, as everywhere).
- **Listen**: a Hindi or Sanskrit system voice reads the Devanagari; without one, an English voice reads the respelling. A second tap stops; leaving the page stops. The page says it is a guide to the sounds, not a recitation. No audio files, nothing downloaded.
- A Sutra deep dive shows a verse that has a real mathematical link to it (today: Yāvadūnam and Līlāvatī 20).
- One anonymous event per Listen tap: `math/sloka/listen`.
- GLOSSARY gains **Verse (śloka)**; the guide's Sutras section mentions the verses.

Out of scope: recorded chanting, clips (the sutra-pronunciation change owns name clips), verses for the Sky or games.

## Capabilities

### New Capabilities

- `sanskrit-verses`: the section, the cards and their fields, Listen, the deep-dive link, honesty rules.

### Modified Capabilities

- `analytics`: ADDED "Listening to a verse is counted".

## Impact

- New `js/slokas.js` (data), `test/slokas.test.mjs`, `e2e/tests/verses.spec.ts`.
- `js/app.js`: `versesHTML()`, `verseHTML()`, `sayVerse()`, `wireVerses()`; `sutrasView` takes the view signal; `sutraHTML` shows related verses.
- `math.css`: verse styles (device Devanagari fonts, no download). `js/guide.js`, `GLOSSARY.md`.
- Nothing new is sent beyond the one fixed-word event; `parentNote()` needs no change.
