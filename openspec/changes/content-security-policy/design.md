# Design

## Context

- GitHub Pages serves the site and cannot set response headers, so a policy can only be a `<meta http-equiv>`. A `<meta>` policy ignores `frame-ancestors`, `report-uri`/`report-to` and `sandbox`.
- `index.html` has three inline scripts in the build: the color scheme script in `<head>`, the import map (`build.py` adds it), and the color mode buttons before `</body>`. Browsers check an inline import map against `script-src` like any inline script.
- Views build markup with `innerHTML`, some of it with `style=""` attributes (progress bars, positions); `index.html` has a `<style>` block for the font faces. There are no inline event handlers.
- Origins the page itself uses (inventory, October 2026):
  - this origin: the app, `/design-system/`, `/assets/` (Explore menu, analytics, `count.js`, fonts, icons), the manifest, `sw.js`, the voice worker;
  - `https://www.gstatic.com/firebasejs/` (SDK modules via `import()`), `https://firestore.googleapis.com`, `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com` (anonymous sign-in, only when posting);
  - App Check with reCAPTCHA Enterprise: `https://content-firebaseappcheck.googleapis.com`, `https://www.google.com/recaptcha/` (script, frame, requests), `https://www.gstatic.com/recaptcha/`, `https://recaptcha.google.com/recaptcha/` (Google's documented list);
  - Firebase Auth's popup and redirect helper, which Safari and mobile browsers start as soon as Auth starts: `https://apis.google.com` (script) and a hidden frame on the `authDomain` (`https://sbmadhav-vedic-math.firebaseapp.com`). Seen in WebKit only;
  - `https://www.youtube-nocookie.com` (player frame), `https://i.ytimg.com` (thumbnails);
  - `https://sbmadhav.goatcounter.com` (beacon: `sendBeacon`, or an `<img>` when that fails);
  - `data:` (the favicon, and SVG data URLs).
- The natural voice worker (`js/voice-worker.js`) imports kokoro-js from jsDelivr and downloads the model from Hugging Face, and runs WebAssembly. A dedicated worker started from a URL gets its policy from its own response (CSP Level 3, and both Chromium and WebKit do this), and GitHub Pages sends none, so the page's policy does not reach it.

## Decisions

**1. Build-time only, not in the source.** The hashes change with every edit of an inline script, and the import map exists only in the build, so a policy in git would be wrong or need hand-kept hashes. `build.py` computes them, like the other stamps. Serving the source locally therefore runs without a policy; `e2e/tests/csp.spec.ts` skips there and runs against the live site or a local build (`node e2e/local-server.mjs 8171 _site`).

**2. Hashes for scripts, `'unsafe-inline'` for styles.** Script hashes keep injected inline code from running, which is the protection that matters. Styles cannot do the same without moving every `style=""` the views build into classes or CSSOM calls; style injection is far less dangerous than script injection. Rejected: nonces (a static site cannot make a fresh nonce per response).

**3. Firebase hosts from `js/cloud-config.js`.** `firebase_sources()` reads `authDomain` and whether `appCheckSiteKey` is set, so turning leaderboards or App Check off removes those hosts, and a new Firebase project updates the frame host on its own. Script hosts are path-limited where Google publishes a stable path (`/firebasejs/`, `/recaptcha/`).

**4. No `'wasm-unsafe-eval'`.** The page itself compiles no WebAssembly; only the voice worker does, under its own (empty) policy. Checked in Chromium and WebKit with the worker importing the real kokoro-js and fetching from Hugging Face under the page policy.

**5. Tests.** Node tests in `test/build.test.mjs` check the policy's shape and hashes, the leaderboards-off case and the build failures. `e2e/tests/csp.spec.ts` uses the main routes, a World board (through the fake SDK, served from its real gstatic URL), the Watch player, the Explore menu, the voice worker and GoatCounter, failing on any `securitypolicyviolation` event or CSP console message, plus a negative control. The real SDK, App Check and reCAPTCHA only run in `leaderboard.live.spec.ts` (chromium, read-only), which now also fails on a violation. Posting (anonymous sign-in and the Firestore Write channel) cannot be tested against production; it uses the same hosts as reading plus `identitytoolkit` and `securetoken`, which the policy lists.

## Risks / Trade-offs

- A new third-party origin (another video host, a new Firebase product) is blocked until it is added to `build.py`. The e2e spec and the console make that visible at once.
- Google could move reCAPTCHA or Auth helpers to new hosts. The live leaderboard spec runs daily and would fail.
- Merge order: the main site must serve `/assets/count.js` first (see proposal).

## What would tighten it later

- Move `style=""` attributes to classes and hash the `<style>` block, then drop `'unsafe-inline'` from `style-src`.
- Headers through a CDN in front of GitHub Pages: `frame-ancestors 'none'`, `report-to`, HSTS.
