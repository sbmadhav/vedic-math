# Language and decisions

- Domain terms are defined in `GLOSSARY.md` (Player, Mode, League, Rating, Ranked round, Practice, Score, Sparks, Title, Medal, Board, Verse and more). Update the glossary when a term changes.
- Decisions that are hard to reverse are recorded in `docs/adr/`.
- `docs/PLAN.md` is the product plan.
- Changes are planned with OpenSpec (`openspec/`, CLI `openspec`, Claude commands `/opsx:propose`, `/opsx:apply`, `/opsx:archive`). A change in `openspec/changes/<name>/` holds the proposal, spec deltas, design and tasks; `/opsx:apply` implements it once the owner approves it, and archiving after release keeps `openspec/specs/` describing what is live. Run `openspec validate --all --strict` (every change and spec at once) before committing a change.
- Archiving (`openspec archive <name> -y`) merges the deltas into `openspec/specs/`; the same commit adds the coverage specs in `e2e/tests/cov/` for the scenarios that become live (see `docs/agent/e2e.md`).
- Honest framing is a rule, not a preference: the 16 sutras come from Bharati Krishna Tirtha's 1965 book, not the Vedas; older Indian mathematics (Śulba Sūtras, Āryabhaṭa, Bhāskara, Mādhava, Kaṭapayādi) is named accurately. `test/copy.test.mjs` and the honest-framing specs enforce the wording.
