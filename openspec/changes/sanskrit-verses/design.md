# Design

## Sources and verification

The dataset (`js/slokas.js`) was built from a research pass that read each text in at least one primary source (GRETIL e-texts, TITUS for the Vājasaneyi Saṃhitā, archive.org scans of R. S. Sharma's Brāhmasphuṭasiddhānta, K. V. Sarma's Līlāvatī with Kriyākramakarī, Kuppanna Sastry and Sarma's Pañcasiddhāntikā, Rangacharya's Gaṇitasārasaṃgraha, and Tirtha's Vedic Mathematics) and in scholarship (Plofker, Datta and Singh, INSA editions, arXiv papers, INDOLOGY list posts). Every numeric claim and every Kaṭapayādi or word-numeral decoding was recomputed (and is retested in `test/slokas.test.mjs`). Each card lists only the pages actually read. Two items have medium confidence (Piṅgala, from secondary sources; Āryabhaṭīya Gaṇitapāda 2, where the e-text drops two particles) and say so in their notes.

Variant readings are stated, not hidden: the Vedāṅga Jyotiṣa verse reads jyotiṣaṃ in the printed recensions, while the popular gaṇitaṃ is a variant; Baudhāyana's numbering differs between Thibaut and Sen and Bag; Līlāvatī numbering varies by edition.

## Honesty

The section opens by saying the Sutras are not verses and no older text contains them. The 1965 verse is labelled as Tirtha's own with its problems. The Īśa / Bṛhadāraṇyaka "pūrṇam adaḥ" is labelled as philosophy, not mathematics. Dates carry their uncertainty. The copy test (`test/copy.test.mjs`) still passes: nothing says the Sutras come from the Vedas.

## Pronunciation

Respellings are generated from the IAST (one stressed syllable in capitals per word). Listen prefers a Hindi or Sanskrit system voice reading Devanagari, which most phones and computers have (Hindi voices read Sanskrit Devanagari closely, schwa deletion aside); without one, an English voice reads the respelling. This keeps the page free of audio files and works offline. When the sutra-pronunciation change lands with recorded name clips, verses can move to the same player.

## Placement

A section at the end of `#/sutras` with three subsections (h3) instead of new routes: the Sutras page has no sub-routes besides deep dives (`#/sutras/<id>`), and verse cards are short enough to read in place. Cards have ids (`verse-<id>`) for future deep links.
