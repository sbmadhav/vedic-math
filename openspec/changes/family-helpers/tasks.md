# Tasks

Tasks marked **[OWNER]** can only be done by the owner. "Verify:" says how a task is checked. Playwright specs run on chromium, webkit and mobile against the local server (`python3 build.py && node e2e/local-server.mjs <port> _site`, `BASE_URL=http://localhost:<port>`).

## 0. Before building

- [x] 0.1 **[OWNER]** Approve the change. Approved 2026-10-21 in the grilling session ("Yes to all"): every decision in `design.md` (D1 to D17).

## 1. Step 1: the plan and a look-and-listen prototype

- [x] 1.1 This change: proposal, design, spec deltas (`family-helpers`, `helper-listening`, `helper-conversation`, `calm`, `analytics`, `star-round`), tasks. Verify: `openspec validate family-helpers --strict`.
- [x] 1.2 ADR 0015 (proposed): the AI conversation layer and on-device listening, what is sent, 13 and over only, never audio, the caps. Verify: read with ADRs 0006, 0008 and 0014.
- [x] 1.3 GLOSSARY: Family helper, Shunya, Nava, Eka, Visit, Help signal, the Nikhilam Family entry updated (it now also helps in the game). Verify: no word Bolt's entry forbids is used for Bolt.
- [x] 1.4 Prototype `docs/prototypes/family-helpers/index.html`: the three walking in, perching, bubbles, escalation 1, 2 and 3, a cheer, Calm still mode, both color schemes, a 320 px frame; it runs the real modules from `js/`. Verify: open it from a local server at the repository root (`python3 -m http.server 8371`, then `/docs/prototypes/family-helpers/`).
- [x] 1.5 Voice sample tool `tools/voice/family-samples.mjs` (a few lines per friend and band, Puck, Leda, Charon; prints the cost and stops unless `GO=1`; inside the spend guard; writes git-ignored files) and the listening page `docs/prototypes/family-helpers/listen.html`; README step. Verify: `test/voice-tools.test.mjs` (the plan and the cost, with no network); nothing spends money in CI.
- [ ] 1.6 **[OWNER]** Run the voice samples: `GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token) GOOGLE_CLOUD_PROJECT=<project> GO=1 node tools/voice/family-samples.mjs` (36 lines, about 1,550 characters, about $0.05 at list price; without `GO=1` it only prints the plan), then open `docs/prototypes/family-helpers/listen.html` from a local server at the repository root.
- [ ] 1.7 **[OWNER]** Pick the three voices on the listening page (keep Puck, Leda, Charon or swap any of them); note the pick here with the date. Verify: `FRIENDS[*].voice` in `js/family-helpers.js` matches.

## 2. Step 2: the scripted Family in the Legacy views (behind the switch)

- [x] 2.1 Pure engine `js/family-helpers.js`: friends, bands (Grade answer when it exists, else the Mode), the help signals, escalation, the 3 minute rule, Not now, Only when I ask, the race hold, memory, placement, the worked example on different numbers, peer mistakes (Growing and Fluent, never the Player's question). Verify: `test/family-helpers.test.mjs`.
- [x] 2.2 Line table `js/family-lines.js` per friend, kind and band: no em dashes, no digits, Early at most 8 words a sentence and 2 sentences, Growing at most 14, honest framing, placeholders only `{name}`, `{sutra}`, `{meaning}`, `{idea}`, `{title}`. Verify: `test/family-lines.test.mjs`.
- [x] 2.3 Art: `friendSVG(id)` in `js/family.js`, each friend cut from the brand drawing, tokens only, `aria-hidden`. Verify: `test/brand.test.mjs`.
- [x] 2.4 Overlay `js/family-view.js`: one layer above toasts (`--vm-z-family`), walk or hop in from the nearest edge, perch, bubble with Show me, Another hint, Not now, Next between turns, close and Escape, focus never taken, the live region, motion off under Calm, Pause motion and reduced motion, everything through `js/life.js`. Verify: `test/lifecycle-scan.test.mjs`; `e2e/tests/family-helpers.spec.ts`.
- [x] 2.5 The hook `js/family-hook.js` and the calls in `js/app.js` (Practice, Katas, the Star end through `runStar`'s new `onEnd`), Ask a friend. Verify: `e2e/tests/family-helpers.spec.ts`; `star.spec.ts` and `practice.spec.ts` unchanged.
- [x] 2.6 Me: the switch "Try the Nikhilam Family helpers" (off by default) and "When they help" (Always, Only when I ask, Off). Verify: `e2e/tests/family-helpers.spec.ts`.
- [x] 2.7 Analytics: `metrics.family()` with fixed words. Verify: `test/metrics.test.mjs`; `e2e/tests/family-helpers.spec.ts`.
- [x] 2.8 Layer tokens in `math.css` (`--vm-z-toasts`, `--vm-z-sparkles`, `--vm-z-confetti`, `--vm-z-family`), noted in the design for the design system's owner. Verify: `test/family-helpers.test.mjs` reads `math.css`.
- [x] 2.9 Coverage specs, one per scenario of this change's live capabilities (`family-helpers`, `calm`, `analytics`, `star-round` deltas), in `e2e/tests/cov/family-helpers-1.spec.ts` to `-12` (one file per requirement, one test per scenario), `calm-3-family`, `analytics-12-family` and `star-round-17-family` (the suffix keeps them clear of other changes' deltas to the same specs); shared steps in `e2e/tests/family-kit.ts`, and the behaviors beyond the scenarios in `e2e/tests/family-helpers.spec.ts`. The `helper-listening` and `helper-conversation` scenarios get theirs with step 3. Verify: they pass on the three projects.
- [x] 2.10 First-load budget: the baseline grows by the new modules (every module is precached), with the reason in the PR. Verify: `python3 build.py --voice off` passes the budget.
- [ ] 2.11 **[OWNER]** Phone check: on the PR preview (or the live site after merge), Me, turn on "Try the Nikhilam Family helpers", then miss a Practice question twice, wait 20 seconds on one, and open a Star and miss two. Note what to change here.

## 3. Step 3: after react-typescript phase 2 ships (held for its task 0.8, Workers Paid)

- [ ] 3.1 Port the overlay into the React root layout: one component over the router outlet, the same engine and line table (moved to TypeScript), the Legacy hook replaced by a store event. Verify: the family-helpers specs and cov specs unchanged.
- [ ] 3.2 **[OWNER]** Full re-record: every line per friend and band with the picked voices (`tools/voice/`), published as a voice release. Verify: the voice coverage test includes every Family line.
- [ ] 3.3 Wire the Family's voices (each friend's voice, only with Read aloud or sound on, through the existing voice order). Verify: e2e with the voice host; the "Text now, voices once recorded" scenario updated.
- [ ] 3.4 The Family in the Arena after a race and on content pages (Skill pages, Sutra deep dives) when asked. Verify: new scenarios and specs.
- [ ] 3.5 Listening (`helper-listening`): push-to-talk in Pro, the opt-in listening mode, help phrases only, nothing stored or sent. Verify: e2e with a fake `SpeechRecognition`; `privacy.spec.ts`; cov specs.
- [ ] 3.6 **[OWNER]** Go for the AI conversation layer: accept ADR 0015, confirm the $5 a day and $50 a month caps and the model provider's key as a Cloudflare secret.
- [ ] 3.7 The conversation endpoint (`helper-conversation`): the Worker route, its own limit in `VoiceLedger`, the 13 and over gate, the fallback to scripted help. Verify: Worker tests (a cap load test as for the server voice), e2e with a fake endpoint, `privacy.spec.ts`; cov specs.
- [ ] 3.8 3D Family on React Three Fiber (react-typescript Phase 7, ADR 0013): loaded late on routes that show them, the 2D art as the fallback and under no motion. Verify: the scenes-3d budget checks.
- [ ] 3.9 Flip `FAMILY_DEFAULT` and remove the try switch once the owner releases the Family; archive this change with its coverage specs.
