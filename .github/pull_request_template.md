## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] Checks pass: `pnpm typecheck`, `pnpm lint`, `pnpm test` and `python3 build.py` (what the pre-commit hook runs)
- [ ] Behavior changes update or add the matching Playwright test in `e2e/`, and `pnpm exec playwright test` passes there
- [ ] Rules tests pass if I changed `cloud/` (`cd cloud/test && npm test`)
- [ ] Tokens only, no raw hex
- [ ] Tested in Daybreak (light) and Deep Space (dark), each play mode, and at 390px wide
- [ ] Content corrections: I checked the math and explained the fix above
- [ ] No em dashes in anything I wrote
- [ ] Licensing: I have read the Licence section of CONTRIBUTING.md (code is proprietary from the cutoff commit named in LICENSE; earlier commits stay MIT)
