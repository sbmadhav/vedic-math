# Tasks

## 1. Policy in the build

- [x] 1.1 `build.py`: `csp()`, `firebase_sources()` and `add_csp()` write the policy and the referrer `<meta>` after `<meta charset>` in the published `index.html`, with the sha256 of each inline script (import map included); `check_source()` fails on a policy in the source; the build fails on inline event handlers and `javascript:` URLs. Verify: `test/build.test.mjs` checks the policy comes first, every inline script's hash is listed, no unsafe script source, YouTube, ytimg and Firebase hosts are there and gc.zgo.at is not, the leaderboards-off build lists no Google host, and a committed policy, an `onclick` or a `javascript:` link fails the build.
- [x] 1.2 `.github/workflows/ci.yml` checks `_site/index.html` carries the policy.

## 2. End-to-end

- [x] 2.1 `e2e/tests/csp.spec.ts`: main routes, Arena World boards (fake SDK from its gstatic URL), the Watch player, the Explore menu, the voice worker and GoatCounter, with no `securitypolicyviolation`; a negative control. Skips on the unbuilt source. Verify: passes in chromium and webkit against `node e2e/local-server.mjs 8171 _site`, and fails when the YouTube, ytimg or Firebase host or `worker-src` is removed from the built policy.
- [x] 2.2 `e2e/tests/leaderboard.live.spec.ts` also fails on a violation from the real SDK, App Check or reCAPTCHA.
- [x] 2.3 `e2e/tests/fixtures.ts` answers `/assets/count.js` locally like `gc.zgo.at`.
- [x] 2.4 One-off check on the production origin (built files routed in as https://sbmadhav.com/vedic-math/, real Firestore reads with App Check, Auth started without signing in, the voice worker importing kokoro-js and fetching from Hugging Face): no violation in chromium or webkit; WebKit loads the Auth helper from apis.google.com and the authDomain frame.

## 3. Release

- [x] 3.1 Merge after sbmadhav.github.io serves `/assets/count.js`; after the deploy, the daily E2E run (with `leaderboard.live.spec.ts`) passes. Then archive this change. (Done: sbmadhav.com serves /assets/count.js (HTTP 200), merged in #32 on 2026-10-17, and the daily E2E run of 2026-10-17 (with leaderboard.live.spec.ts) was green. Archived in this PR.)
