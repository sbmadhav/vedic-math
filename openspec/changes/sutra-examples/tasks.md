# Tasks

## 1. Worked examples

- [x] 1.1 `js/sutra-details.js`: at least three Worked examples for all 29 entries, easy to harder, a plain-number one first where the Sutra allows it, every example ending in its result in `hl()`; existing examples kept (four gained an `hl()` result, three entries reordered). Verify: new `test/sutra-examples.test.mjs` (at least three per entry; every question and highlighted result matches a checked table in order; each check passes with BigInt, exact fractions or polynomial identities; no em dashes). Mutating a result or a check makes it fail.
- [x] 1.2 `GLOSSARY.md`: "Deep dive" and "Worked example". Verify: read through against the Deep dive.

## 2. Deep dive

- [x] 2.1 `js/app.js` `sutraHTML()`: Worked examples as a numbered `<ol>` of `<details>` (first open, "Example k of n" and the question in the `<summary>`), a Mode-worded tip above; the close button in a pinned `.sd-bar`; footer links with "Previous: / Next: <name>" accessible names. No new listeners. Verify: `node --test 'test/**/*.test.{js,mjs}'` (lifecycle scan); `e2e/tests/sutra-modal.spec.ts` "at least three worked examples, the first one open" (all 29) and "open and close by keyboard".
- [x] 2.2 `math.css`: sticky footer (`var(--bg)`, `var(--line)` top border, bleeding to the dialog edges, safe-area padding, one-line ellipsis links), sticky close bar, disclosure styles (44px summaries, plus and minus marker, focus ring from `--focus`), tokens only. Verify: `sutra-modal.spec.ts` "footer and close button stay in view" at 1280, 768, 375 and 320px (top, middle and bottom of the scroll; last text above the footer; no sideways scroll; Next works from the bottom) and "opaque and pinned in Deep Space and with Calm on".
- [x] 2.3 Accessibility. Verify: `e2e/tests/a11y.spec.ts` "sutra deep dive" (axe, `#/sutras/u9`, every example open, scrolled, 1280 and 375px, both schemes).

## 3. Checks

- [x] 3.1 Related specs still pass on chromium, webkit and mobile against `node e2e/local-server.mjs`: `routes`, `watch`, `read-aloud`, `voice`, `wcag`, `a11y`, `header`, `load` and the sutra-related `cov/` specs (`analytics-6`, `board-identity-1`, `-5`, `-7`, `honest-framing-1`, `-2`, `sparks-2`, `-4`, `-5`, `-6`, `watch-shelf-5`). The failures seen (`read-aloud` on webkit, `cov/sparks-6` on mobile) fail the same way on `main`.
- [x] 3.2 `python3 build.py --out <tmp>` succeeds; `openspec validate sutra-examples --strict`.

## 4. Release

- [ ] 4.1 Owner review of the examples and of the phone and desktop screenshots in the PR.
- [ ] 4.2 After the deploy, the daily E2E run passes against https://sbmadhav.com/vedic-math/. Then archive this change.
