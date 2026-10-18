# Tasks

## 1. Data

- [x] 1.1 `js/slokas.js` from the verified research (18 items). Verify: `test/slokas.test.mjs` (fields, Devanagari and IAST, refs, honest labels, no em dashes, the math of each verse recomputed, Kaṭapayādi check of the gopī bhāgya verse).

## 2. Page

- [x] 2.1 `js/app.js` section, cards, Listen and deep-dive verses; `math.css` styles. Verify: Playwright `e2e/tests/verses.spec.ts` (section, groups, 18 cards, lang attributes, details, Listen with a Hindi voice and without, the Yāvadūnam deep dive); `a11y.spec.ts` covers `#/sutras` in both schemes.
- [x] 2.2 Guide and GLOSSARY. Verify: `test/guide.test.mjs` passes.

## 3. After release

- [ ] 3.1 Owner listens on a phone and a laptop; a Sanskrit reader reviews the respellings; then archive this change.
