# Tasks

Tasks marked **[OWNER]** can only be done by the owner. "Verify:" says how a task is checked. Playwright specs run on chromium and mobile against the local server (`python3 build.py && node e2e/local-server.mjs <port> _site`, `BASE_URL=http://localhost:<port>`).

## 0. Before building

- [x] 0.1 **[OWNER]** Approve the direction. Approved 2026-10-26: design D1 to D14.

## 1. The plan

- [x] 1.1 This change: proposal, design, spec deltas (`word-problems`, `analytics`), tasks. Verify: `openspec validate word-problems --strict`.
- [x] 1.2 GLOSSARY: Word problem; the Skill count (136). Verify: the words are used in the change and the code comments.
- [x] 1.3 The Family chat note: a task in `openspec/changes/family-helpers/tasks.md` (step 3) that the conversation may help read a Word problem, never give the answer (D14). Verify: `openspec validate family-helpers --strict`.

## 2. The stories

- [x] 2.1 `js/stories.js`: the names and settings (D8), the templates by Mode with Sutra-friendly numbers (D5, D6), the two hints (D7), the Star wrappers on a Trick's own numbers, the hand-written stories (D9), the slot plan (D2, D3, D4). Pure, no DOM. Verify: `test/stories.test.mjs`: every template's answer is right and in range across thousands of seeded draws; no hint contains the answer; the first hint starts "What is it asking?"; money in words, metric units, names from the list; the slot positions per Mode, the 20-answer wait, a due slot carried to a Skill that has stories.
- [x] 2.2 `3-twostep` draws from the Challenger two-step stories; new Skill `8-reallife` (D10); Trick Skills keep their numbers on the problem (`vals`). Verify: `test/stories.test.mjs`; `test/guide.test.mjs` counts 115 school Skills.

## 3. The rounds

- [x] 3.1 Practice: the slot plan in `practice()`, the "Word problem" / "Story time" label, the unit beside the box. Verify: `e2e/tests/word-problems.spec.ts` and `e2e/tests/cov/word-problems-1.spec.ts` to `-7`, `-10` and `-11` (one file per requirement, one test per scenario).
- [x] 3.2 Star rounds: the Word problem at question 3 (Challenger) or 2 (Pro), the rematch, the Dare bare, the replay's first step (D1, D7). The engine takes the wrapper as an option. Verify: `test/star.test.mjs`; `e2e/tests/cov/word-problems-8.spec.ts` and `-9`; the existing Star specs unchanged.
- [x] 3.3 Analytics: `math/story/<area>/<right|miss>` and `math/story/asking` (D12). Verify: `test/metrics.test.mjs`; `e2e/tests/cov/analytics-14-word-problems.spec.ts`.
- [x] 3.4 Styles in `math.css` (tokens only, both color schemes): the label and a Star's story question. Verify: the specs above on chromium and mobile.

## 4. Voice

- [x] 4.1 Read aloud through the existing path (D11): `tools/voice/lines.mjs` lists the Word problem lines for the next recording; `test/voice-coverage.test.mjs` leaves them out of the Explorer gate with a todo for the re-record. Verify: `pnpm test`.
- [ ] 4.2 **[OWNER]** Re-record and publish (`tools/voice/lines.mjs`, `record.mjs`, `publish.mjs`) so Word problems play in the Studio voice; then remove the todo in `test/voice-coverage.test.mjs`.

## 5. Budget and release

- [x] 5.1 First-load budget: `js/stories.js` is precached; `docs/perf/baseline.json` `firstLoad` and `firstLoad.changes` and `docs/perf/baseline.md` record the growth and why. Verify: `python3 build.py --out /tmp/wp --voice off` passes the budget.
- [ ] 5.2 **[OWNER]** Phone check on the preview: as each Mode with 20 answers, a Word problem in Practice, Hint twice, and (Challenger, Pro) a Star; note what to change here.
- [x] 5.3 After release: archive this change with its coverage specs (`openspec archive word-problems -y`).
  - Done 2026-10-31 (`archive-sweep`): archived with `e2e/tests/cov/word-problems-1` to `-11` and `analytics-14-word-problems`; 4.2 (the re-record) and 5.2 (the phone check) stay with the owner.
