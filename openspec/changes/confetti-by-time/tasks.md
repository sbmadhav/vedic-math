# Tasks

Waits for the owner's approval of this plan. One pull request, with the e2e changes in the same commit as the code (CLAUDE.md).

## 1. The burst on time

- [ ] 1.1 `js/celebrate.js`: a named length (`110 * 1000 / 60`, 1,833 ms, with a comment naming its origin); the burst ends with `later(() => ctl.abort(), length, ctl.signal)` (design D2); the frame loop draws each piece at the burst's elapsed time with the closed-form path of design D3, exported for the unit test; start time from `performance.now()`. Unchanged: `still()`, `keep()`, `bursting`, the piece count, the colours, the canvas. Update the module's header comment (timers and frames still through `js/life.js`). Verify: `pnpm test` (`test/lifecycle-scan.test.mjs` passes with the new `later`).
- [ ] 1.2 `test/celebrate.test.mjs`: the path at `f × 1000 / 60` ms equals today's per-frame steps after `f` frames (f = 1, 30, 110) within 0.01 px; the path at 1,000 ms is the same whether it is reached in steps of 16.7 ms or 48 ms; the length is 1,833 ms; the list of `confetti(` calls is unchanged. Verify: `pnpm test`.

## 2. The e2e checks (in the same commit as 1.1)

- [ ] 2.1 `e2e/tests/celebrations.spec.ts`: `watchFx` also records `performance.now()` when a `fx-confetti` canvas is added and removed; the Star test drops its frame count and its 120 s budget (#149) and expects the burst to last 1,750 to 3,000 ms (design D4), on every project.
- [ ] 2.2 Same spec, motion allowed: an init script that paces `requestAnimationFrame` (every 48 ms, every 8 ms, and none at all); under each, lighting a Star gives a burst of 1,750 to 3,000 ms that removes itself; with no frames, a second burst can start straight after (the burst's own `confetti` call through `e2eMod('celebrate')`, `e2e/tests/fixtures.ts`).
- [ ] 2.3 Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py --out /tmp/vm-site`, then the local server and `cd e2e && BASE_URL=http://localhost:8124 pnpm exec playwright test tests/celebrations.spec.ts tests/cov/celebrations-1.spec.ts` on every project; the pull request's WebKit shard passes it.

## 3. Release

- [ ] 3.1 After release: `openspec archive confetti-by-time -y`, and in the same commit `e2e/tests/cov/celebrations-2.spec.ts`, one test per scenario of the two new requirements (the path scenario through `e2eMod('celebrate')` in `page.evaluate`; `docs/agent/e2e.md`).
