# Design

## Context

`openSutra()` in `js/app.js` fills one `dialog.sutra-modal` with `sutraHTML(c)`: a header (tag, name, meaning, close button), a two-column body (sticky diagram on the left, text on the right) and a footer of previous and next links. The dialog itself is the scroll container (`overflow: auto`, `max-height: 92dvh`). Content comes from `DETAILS` in `js/sutra-details.js`, where `examples` is a list of `[question, steps]` pairs with the result in `hl()`.

## Decisions

**1. Disclosures, first one open.** Each Worked example is a `<details>` inside a numbered `<ol>`: the `<summary>` shows "Example k of n" and the question, the body shows the steps. The first is open so a Player sees how the Sutra works straight away; the rest are closed so a Player can try them before looking. Native `<details>` needs no script (nothing for `js/life.js` to clean up), is a button for assistive tech with the summary text as its name, opens with Enter or Space, and keeps every example in the tab order. A "Next example" stepper was considered: it hides all but one example, needs state and listeners, and makes it harder to compare two examples, so it was not used.

**2. Examples are plain HTML strings, unchanged in shape.** `examples` stays `[question, steps]`. The steps stay one short line of sentences ending in the result in `hl()`, the same style as before. Every example now has at least one `hl()`, so the test can find its result.

**3. Checked by a table, not by parsing prose.** `test/sutra-examples.test.mjs` holds, per Sutra and in order, the question (HTML stripped, fractions as `(a)/(b)`), the expected highlighted result, and a check written with exact arithmetic: BigInt for integers, exact fractions for rational answers, and polynomials compared at many integer points (one or three variables) for factorings and expansions. The test fails if an example is added, removed, reordered or reworded without updating the table, if a result changes, or if a check is false. It also fails on fewer than three examples or an em dash.

**4. Pinned footer with `position: sticky`.** The footer is the last child of `.sd-inner`, whose box spans the whole scroll height, so `position: sticky; bottom: 0` keeps it at the dialog's bottom edge at every scroll position, and at the end of the scroll it sits in its own space below the last text (nothing is hidden under it, with no padding to guess). It bleeds to the dialog edges with negative margins (`--sd-pad`), has `background: var(--bg)`, a `var(--line)` top border, `z-index: 3` and bottom padding for `env(safe-area-inset-bottom)`. `position: fixed` was not used: the dialog is animated with a transform when it opens, which would make a fixed footer jump.

**5. One-line footer links.** Both links stay on one row at 320px: each is at most half the row and the name inside is truncated with an ellipsis. The full name is in the accessible name ("Previous: Ekādhikena Pūrveṇa"), and the name keeps `lang="sa-Latn"`.

**6. Pinned close button.** The close button moves from the header into a zero-height sticky bar at the top of `.sd-inner` (`top: 10px`, right aligned), so it floats over the content at the top right as the dialog scrolls. The header keeps 52px on the right so the title never runs under it. It keeps its class (`.sd-x`), label and the focus it gets when the dialog opens; it is still the first focusable element. It gets a small shadow so it reads over content in both schemes.

**7. Motion.** Nothing new moves: the disclosures open without animation, and sticky positioning is not motion, so Calm, Pause motion and reduced motion need no twin rules.

## Checked

Chromium, `node e2e/local-server.mjs`: 1280x800, 768x900, 375x740 and 320x640, Daybreak and Deep Space, at the top, middle and bottom of the scroll (`e2e/tests/sutra-modal.spec.ts` asserts the footer's box is at the dialog's bottom edge at the top, middle and bottom, that the last text ends above it, that the close button stays in view and that nothing scrolls sideways; a Deep Space plus Calm plus reduced motion run checks the footer is opaque). axe on `#/sutras/u9` with every example open, scrolled to the middle, at 1280 and 375px in both schemes.

## Mathematics notes

- Sopāntyadvayamantyam: for 1/(AB) + 1/(AC) = 1/(AD) + 1/(BC) with A, B, C, D in arithmetic progression (step s), clearing denominators leaves 3sA + 7s² = 0, which is D + 2C = 0. The third example uses step 2 to show the rule does not depend on step 1.
- Antyayoreva: each equation is N/D = n/d with N = x·n + a and D = x·d + b; cross-multiplying leaves a·d = b·n, so the last terms alone give n/d = a/b. The steps state that structure (x² + 2x = x(x + 2)) before using it, and the test checks both the structure and the solution.
- Śeṣāṇyaṅkena Carameṇa: "the last digit of remainder × divisor" gives the decimal digit only for divisors ending in 3 or 7 (where divisor² ends in 9); the examples use 3, 7 and 13 only.
- Yāvadūnaṃ Tāvadūnīkṛtya Vargaṃ ca Yojayet: the existing 104² and 1012² are above the base (the same recipe with "add instead"); two below-base examples (7², 98²) now come first, matching the meaning "lessen by the deficiency".
