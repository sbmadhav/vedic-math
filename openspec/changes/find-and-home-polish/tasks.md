# Tasks

The audit script and its numbers are in `design.md`. Playwright specs run on chromium, webkit and mobile against the local server (`node e2e/local-server.mjs 8174`, `BASE_URL=http://localhost:8174`).

## 1. Find ranking (`js/find.js`, pure)

- [x] 1.1 `STOP` gains question and size words; `tokenize` drops them. Verify: `test/find.test.mjs` "tokenize drops question and size words".
- [x] 1.2 `score()` sums matching tokens with kind words at 6; `share()`; `listed()` (every word, or half with a title, synonym or kind hit); `rank()` orders by share, then score, groups by their best share then kind order. Verify: `test/find.test.mjs` "a share of the words is enough", "score", the old ranking tests ("arena" first, eight per kind, "take away", "settings").
- [x] 1.3 `INTENTS`, `intentsOf()` and the Best match group (`top`), pinned entries not repeated. Verify: `test/find.test.mjs` "questions about the app ... Best match" and "intents and modes".
- [x] 1.4 `MODE_LINES` and the `mode` kind (opening `#/me`), `KIND_WORDS`, new Trick synonyms (multiply, multiplication, times, divide). Verify: `test/find.test.mjs` (index counts, Mode lines match `fx.MODES`, every synonym and intent names an entry).

## 2. Find page (`js/app.js`, `math.css`)

- [x] 2.1 Best match group drawn first with its own border; hint line names "multiply", "for kids", "how it works". Verify: `e2e/tests/find.spec.ts` "questions and phrases"; `e2e/tests/cov/find-2.spec.ts` for each new scenario; axe on a Best match page in both schemes.
- [x] 2.2 Analytics unchanged: following a Best match result sends exactly one `math/find/go` and never the text. Verify: `e2e/tests/find.spec.ts`.

## 3. Home on a phone (`js/app.js`, `math.css`)

- [x] 3.1 `keepGoingSkill()`: Challenger leaves out Keep going when it offers the first door's Trick. Verify: `e2e/tests/first-visit.spec.ts` "after the trial Star, no Keep going"; `e2e/tests/cov/first-visit-2.spec.ts`.
- [x] 3.2 Compact Player strip under 600 px; Play this Star on screen at 390 by 844 after Try a trick. Verify: `first-visit.spec.ts` (strip height, button bottom, no sideways scroll), both schemes.
- [x] 3.3 "New here?" note: one Quick tour control, solid background; fainter background drawing under 600 px. Verify: `e2e/tests/guide.spec.ts` "New here?"; `e2e/tests/cov/guide-5.spec.ts`.
- [x] 3.4 Header rows packed under 600 px. Verify: `e2e/tests/header.spec.ts` (390 px: at most 132 px, every link on screen and at least 24 px tall; the 320, 375 and 768 px checks unchanged); `e2e/tests/cov/site-header-4.spec.ts`.

## 4. Toasts (`js/fx.js`, `math.css`)

- [x] 4.1 `toastSide()`, `PADS`, `PRIMARY`; the box placed on each toast and again after 300 ms. Verify: `test/toast.test.mjs`; `e2e/tests/cov/page-layout-3.spec.ts` (a badge toast in a Star round at 390 by 844 does not overlap the pad; on Home it stays at the bottom); `e2e/tests/arena.spec.ts` still pins a toast over a choice and the tap goes through.

## 5. Words, docs and checks

- [x] 5.1 `GLOSSARY.md`: Best match; Find matches a share of the words. No spoken line changes (no studio voice re-record). `openspec validate --all --strict`.
- [x] 5.2 Re-run the audit script and put the before and after numbers in the pull request.
