# Handoff: star-round

Stopped early (machine reboot). Only reading was done; no code has been written.

## Tasks

- Done: none.
- In progress: none.
- Not started: all of tasks.md (1.1 through 6.1).

## Read so far

CLAUDE.md, proposal.md, design.md, tasks.md, all four spec deltas, `openspec/specs/accessibility/spec.md`,
GLOSSARY.md (first half), `js/levels.js`, `js/life.js`, `js/fx.js`, `js/adapt.js`, `js/store.js`.
Not yet read: `js/app.js` (practice, kataView, skillView, dojoView, router, BOLT, mountAnimator), `js/metrics.js`,
`index.html`, `js/check.js`, `js/vedic.js` (problemFor, steps), the prototype
`docs/prototypes/star-quest/index.html`, `docs/star-quest.md`, `docs/adr/0003`, the archived `sparks-replace-xp`
change, `test/lifecycle-scan.test.mjs`, `e2e/tests/fixtures.ts`.

Notes for the implementer:
- `fx.js` already has `motionOff()` (reduced motion or `html.motion-paused`); `noMotion()` can extend it with
  `localStorage['vm.calm'] === '1'`, and `confetti()` should use it.
- `store.record(id, correct, hintsUsed)` needs a 4th `{ sparks = true }` option; `blank()` needs `sky: { lit: {}, skipped: {}, last: {} }`.
- `kata()` in `js/levels.js` builds problems via `withPlain(byId['v-' + trickId], problemFor(t, vals))`; attach `vals` there.

## Decisions made so far

None.

## Tests

Not run (no changes).

## Resume

```
cd /Users/sbmadhav/Documents/codebase/wt-star-round
git fetch && git rebase origin/main
git config core.hooksPath .githooks
node --test 'test/**/*.test.{js,mjs}'
```
Then work through `openspec/changes/star-round/tasks.md` in order. Avoid js/resources.js, js/related.js,
js/videos.js and the Watch views in js/app.js (watch-shelf is being built in parallel); use `findVideo = async () => null`.
