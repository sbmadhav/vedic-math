# Tasks

## 1. The shelf

- [x] 1.1 `js/app.js` `watchView`: start on `level: 'all'` when `W.MODE_SEES[m].length > 1`, and on `kind: 'video'`; the kind chips are Videos, Shorts and (Pro) Links, with no Everything; "Sites and games" only when `kind === 'link'`. Verify: `e2e/tests/watch.spec.ts` per Mode: Both pressed on open (Challenger, Pro), the own-Mode chip narrows to it, no Mode chip for Explorer; Videos pressed on open, no Short tile until Shorts is picked, then only Shorts; Pro: no "Sites and games" until Links, Links shows no video tile, Videos hides the links again.
- [x] 1.2 `js/guide.js` Watch shelf card says the shelf opens on both Modes and on Videos. Verify: `e2e/tests/guide.spec.ts` passes.

## 2. Tests that assumed the old defaults

- [x] 2.1 `e2e/tests/cov/watch-shelf-3`, `-5`, `-6`, `-8`, `-9`: no Everything click; the own-Mode case clicks Challenger; Pro clicks Links to see sites and games; Explorer's full list is Videos plus Shorts. Verify: `grep -rn "Everything" e2e/tests` finds no Watch chip.

## 3. Release check

- [x] 3.1 Node tests, `build.py --out`, `openspec validate --strict`, and Playwright `watch cov/watch-shelf guide` on a local server pass.
