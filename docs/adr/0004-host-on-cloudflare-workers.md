# Host learnvedicmath.com on Cloudflare Workers static assets

Vedic Math moves from `sbmadhav.com/vedic-math/` (GitHub project Pages) to its own domain, learnvedicmath.com, and will one day carry a paid plan. GitHub Pages cannot send response headers, so the CSP lives in a `<meta>` that cannot carry `frame-ancestors` or reporting, and there is no HSTS. It rate limits our own end-to-end runs (HTTP 429), and its terms exclude sites "primarily directed at ... commercial transactions". We host on Cloudflare Workers static assets (Free plan) with DNS moved to Cloudflare and registration kept at Squarespace, deployed from GitHub Actions with a narrowly scoped API token. Static requests are free and unlimited, `_headers` and `_redirects` are served without running code, previews come per branch, and DNSSEC, CAA, Email Routing, Web Analytics and the WAF sit in the same account. The site also stops loading anything from sbmadhav.com: the design system (v2.1.0), fonts, analytics wrapper and Firebase SDK are vendored and pinned, and the Explore menu is dropped.

Status: accepted 2026-10-17 (owner decisions 7 and 11). Change: `openspec/changes/learnvedicmath/`.

## Considered Options

- **Firebase Hosting**: one vendor with the leaderboards, DNS could stay at Squarespace, headers in `firebase.json`. Rejected as the main host because the Spark plan disables the site for the month if transfer passes 10 GB, and the Cloudflare edge features (Email Routing, DNSSEC, WAF, Web Analytics) would need Cloudflare in front anyway.
- **Stay on GitHub Pages with Cloudflare in front** (Transform Rules for headers): keeps the current deploy, but leaves the commercial-use exclusion and two systems to keep in step.
- **Netlify Free**: `_headers` and previews, but the credit plan (300 credits a month since 2025-09-05) runs out at about 20 production deploys.
- **Vercel Hobby**: forbids commercial use.
- **Cloudflare Pages**: Cloudflare's own docs now say to start new projects on Workers, which supports the same `_headers` and `_redirects`.
- **Cloudflare Workers Builds** (Cloudflare builds from the repo, no token in GitHub): fewer secrets, but our build and checks already run in Actions, and decision 7 asks for the GitHub deploy. It stays the fallback if the token becomes a burden.

## Consequences

- `wrangler.jsonc`, `_headers` (written by `build.py`) and a small Worker for CSP reports are now part of the repo; the policy moves from `<meta>` to a header and gains `frame-ancestors 'none'` and `report-to`.
- Every path drops the `/vedic-math/` prefix; the game is at `/play/` and a static landing page is at `/`. The CLAUDE.md path rules change with it.
- The service worker precaches only this repo's files, all hashed (no unhashed shared files).
- A Cloudflare API token is a new secret to rotate yearly; it can edit only Workers scripts in one account.
- Moving to Workers Paid ($5 a month) is expected once there is revenue or Worker code beyond the report endpoint.
- Leaving later is cheap: the build output is plain static files plus two text files of rules.
