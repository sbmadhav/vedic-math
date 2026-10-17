# Proposal

## Why

The owner asked for two things in the Sutras tab's Deep dive (the `dialog.sutra-modal` that opens from a card's Learn more):

1. "Add more than one example to teach it." Four of the 29 Sutras and sub-sutras had a single Worked example (Sopāntyadvayamantyam, Antyayoreva, Samuccayaguṇitaḥ, Lopanasthāpanābhyām) and 17 had two. One example shows an answer; it does not show a pattern a Player can repeat. Several examples were also notes rather than problems (no result to check).
2. "The bottom where we can navigate to other sutras ... should be overlayed and not be part of the scroll." The previous and next links sat at the very end of a long dialog, so a Player had to scroll past everything to reach them, and the close button scrolled away at the top.

## What Changes

- Every Sutra and sub-sutra has at least three Worked examples, ordered from easy to harder, each with the short steps the Sutra uses and the result highlighted. Where the Sutra allows it, the first is a plain-number case a young Player can follow (25², 100 − 43, 12 × 13, 9 × 11, 14 × 16, 1/3, 13/26 and so on). Existing examples are kept; four gained a highlighted result so they can be checked, and three entries were reordered so the easiest comes first.
- Worked examples are shown as a numbered list of disclosures ("Example 2 of 4" and the question): the first is open, the others are opened by the Player after trying them. A one-line tip above the list says so, worded per Mode.
- The footer with the previous and next Sutra is pinned to the bottom of the dialog over the scrolling content, with the page background and a top border, and the content ends above it. On narrow screens each link keeps to one line (the name is shortened with an ellipsis; its accessible name is "Previous: <name>" or "Next: <name>").
- The close button is pinned to the top right corner of the dialog while it scrolls.
- A unit test checks every Worked example's result with exact arithmetic and that every entry has at least three.
- GLOSSARY.md gains "Deep dive" and "Worked example".

Out of scope:

- The animated diagrams, the "Why it works" text and the rest of the Deep dive content.
- Read aloud: Worked examples are not spoken anywhere (`js/voice.js` reads questions in rounds only), so nothing changes there.
- The Sutra cards on `#/sutras` and their one-line `example` in `js/sutras.js`.
- The `sutra-pronunciation` change (Say it button in the Deep dive header): it can add its button next to the title as planned; the close button now lives in its own pinned bar.

Affected: every Mode (Explorer, Challenger, Pro) and every Player who opens a Deep dive. Nothing new is stored or sent; `parentNote()` and `cloud/README.md` are unchanged; analytics events are unchanged (opening a disclosure records nothing).

## Capabilities

### New Capabilities

- `sutra-deep-dive`: the Deep dive's Worked examples (count, order, correctness, presentation) and its pinned close button and footer.

### Modified Capabilities

None.

## Impact

- `js/sutra-details.js` (examples), `js/app.js` (`sutraHTML()`), `math.css` (`.sd-*`), `GLOSSARY.md`.
- New `test/sutra-examples.test.mjs`; new `e2e/tests/sutra-modal.spec.ts`; `e2e/tests/a11y.spec.ts` gains the Deep dive.
