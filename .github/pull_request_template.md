## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] Checks pass: `python3 build.py --out /tmp/vm-site` and `node --test 'test/**/*.test.{js,mjs}'`
- [ ] Behavior changes update or add the matching Playwright test in `e2e/`, and `npx playwright test` passes
- [ ] Rules tests pass if I changed `cloud/` (`cd cloud/test && npm test`)
- [ ] Tokens only, no raw hex
- [ ] Tested in Daybreak (light) and Deep Space (dark), each play mode, and at 390px wide
- [ ] Content corrections: I checked the math and explained the fix above
- [ ] No em dashes in anything I wrote
- [ ] Licensing: I have read the Licence section of CONTRIBUTING.md (code is proprietary after the cutoff commit named in LICENSE; up to it, MIT)
