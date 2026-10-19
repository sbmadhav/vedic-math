# Language and decisions

- Domain terms are defined in `GLOSSARY.md` (Player, Mode, League, Rating, Ranked round, Practice, Score, Sparks, Title, Medal, Board, Verse and more). Use those words in code comments, docs and plans, and update the glossary when a term changes.
- Decisions that are hard to reverse are recorded in `docs/adr/`. Read them before changing who can post, what is sent, or when an identity is created.
- `docs/PLAN.md` is the product plan.
- Changes are planned with OpenSpec (`openspec/`, CLI `openspec`, Claude commands `/opsx:propose`, `/opsx:apply`, `/opsx:archive`). Every non-trivial behavior change starts as a change in `openspec/changes/<name>/` (proposal, spec deltas, design, tasks), is implemented with `/opsx:apply` once the owner approves it, and is archived after release so `openspec/specs/` describes what is live. Run `openspec validate --strict` before committing a change; `openspec validate --all --strict` checks every change and spec at once.
- Archiving (`openspec archive <name> -y`) merges the deltas into `openspec/specs/`; the same commit adds the coverage specs in `e2e/tests/cov/` for the scenarios that become live (see `docs/agent/e2e.md`).
- Honest framing is a rule, not a preference: the 16 sutras come from Bharati Krishna Tirtha's 1965 book, not the Vedas; older Indian mathematics (Śulba Sūtras, Āryabhaṭa, Bhāskara, Mādhava, Kaṭapayādi) is named accurately. `test/copy.test.mjs` and the honest-framing specs enforce the wording.
