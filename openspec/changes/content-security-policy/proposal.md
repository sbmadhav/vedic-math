# Proposal

## Why

A security review of sbmadhav.com found that no page sends a Content-Security-Policy (finding F3). Vedic Math is the page on the site with accounts (anonymous Firebase sign-in for World boards), so a script injected through a future bug or a compromised third party could act as a Player. GitHub Pages cannot send response headers, so the only way to ship a policy is a `<meta http-equiv="Content-Security-Policy">` in the page. The same review moved GoatCounter's `count.js` onto the main site (`/assets/count.js`, sbmadhav.github.io), so no third-party script needs to be allowed for analytics.

## What Changes

- `build.py --out` writes a Content-Security-Policy `<meta>` and an explicit `<meta name="referrer" content="strict-origin-when-cross-origin">` into the published `index.html`, right after `<meta charset>`. Inline scripts (the color scheme script, the color mode buttons and the import map) are allowed by their sha256, which the build computes. The source in git carries no policy, and the build fails if it does.
- The policy allows this origin, and only these others: the Firebase SDK, Firestore, Auth, App Check and reCAPTCHA hosts (taken from `js/cloud-config.js`, none when leaderboards are off), YouTube's privacy-enhanced player and thumbnails for the Watch shelf and the Star round player, and GoatCounter's beacon host.
- The build fails on inline event handler attributes (`onclick="..."`) and `javascript:` URLs, which the policy would block.
- The test fixtures also answer `/assets/count.js` locally, as they did `gc.zgo.at`.

Out of scope:

- `frame-ancestors`, `report-uri` and `sandbox`, which a `<meta>` policy cannot carry (they need a CDN in front of GitHub Pages).
- Removing `'unsafe-inline'` from `style-src` (views build markup with `style=""` attributes; see design).
- The natural voice worker's own policy: a worker started from a URL gets its policy from its own response, which GitHub Pages sends without one.
- The main site's pages and the vendored `count.js` (sbmadhav.github.io).

Affected: every Mode (Explorer, Challenger, Pro) and every Player. Nothing a Player sees or does changes; nothing new is sent or kept, so `parentNote()` and `cloud/README.md` are unchanged.

## Capabilities

### New Capabilities

- `content-security`: the published page carries a Content-Security-Policy that allows only the origins the app uses, with inline scripts allowed by hash.

### Modified Capabilities

None.

## Impact

- `build.py` (policy, hashes, checks), `test/build.test.mjs`, `.github/workflows/ci.yml` (checks `_site/index.html` carries the policy).
- `e2e/tests/csp.spec.ts` (new), `e2e/tests/leaderboard.live.spec.ts` (also fails on a violation from the real SDK), `e2e/tests/fixtures.ts`.
- Merge after the sbmadhav.github.io change that self-hosts `count.js`: until then the live `analytics.js` loads `https://gc.zgo.at/count.js`, which this policy blocks (analytics would stop; nothing else breaks).
