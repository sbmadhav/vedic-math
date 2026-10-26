# Security policy

Thank you for helping keep Learn Vedic Math and its Players safe. Many Players are children, so please take extra care while testing.

## Report a problem privately

Please do not open a public issue, pull request or discussion for a security problem.

Email **security@learnvedicmath.com**, the address published in [security.txt](https://learnvedicmath.com/.well-known/security.txt). Say what is affected (a URL or a file), how to reproduce it, and what an attacker could do with it.

While this repo is public you can also use GitHub private vulnerability reporting: open the [Security tab](https://github.com/sbmadhav/vedic-math/security) and choose **Report a vulnerability**, or go straight to [the form](https://github.com/sbmadhav/vedic-math/security/advisories/new). Once the repo is private the form stops working for anyone outside it; email always works.

Only the owner reads the report. This is a personal project kept by one person, so a reply can take a few days. Once a fix is live, you are welcome to be credited. How the site is protected is described at https://learnvedicmath.com/privacy/security/.

## What is in scope

Everything served at https://learnvedicmath.com/, built from the default branch of this repo:

- The landing page, the grown-up pages and the game at `/play/`, with the response headers the build writes (`_headers`: Content-Security-Policy, HSTS, Permissions-Policy, COOP) and the service worker (`/sw.js`).
- The import page at `/import/`, where the Hand-off from sbmadhav.com lands (`js/handoff.js`, `js/handoff-schema.js`), and the Moved page this repo publishes at https://sbmadhav.com/vedic-math/ while the move lasts (`moved/`).
- The Worker (`workers/src/`). Its only route is `/_csp`, the policy-violation report endpoint; no other path runs code (`wrangler.jsonc`).
- The code served from this site instead of a third party: the Firebase SDK (`vendor/firebase/`), the design system and GoatCounter's `count.js`, each pinned with checksums, and Tesseract for Math Lens (`vendor/tesseract/`).
- The World boards: the browser client (`js/cloud.js`), the Firestore security rules (`cloud/firestore.rules`) and the setup script (`cloud/setup.sh`).

Only the live site is supported. Older commits are not patched. Cloudflare, Google (Firebase, YouTube) and GoatCounter run their own programs; a problem inside their services belongs with them.

## Please do not

- Test against other Players' entries, or try to deny service to the site.
- Use automated scanners that send large amounts of traffic.
- Post test Scores to a World board. A Device board, or a local build (see `CONTRIBUTING.md`), is enough.
