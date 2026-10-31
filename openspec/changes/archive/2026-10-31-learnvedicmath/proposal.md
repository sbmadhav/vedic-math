# Proposal

## Why

The owner bought learnvedicmath.com (registered 2026-10-17 at Squarespace Domains, parked) and wants Vedic Math to be its own site there: a fun place for kids that will one day carry a paid family or classroom plan, with professional security and better insight into how it is used. Today the app lives at `https://sbmadhav.com/vedic-math/` on GitHub Pages, which cannot send response headers (no real Content-Security-Policy, HSTS or `frame-ancestors`), rate limits our own tests (HTTP 429), and whose terms exclude sites "primarily directed at ... commercial transactions". It also borrows the design system, fonts, Explore menu and analytics from sbmadhav.com, so another site's change can restyle or break it.

The 14 owner decisions in `_handoff/learnvedicmath-decisions.md` (all approved on 2026-10-17) are the requirements for this change. The facts behind them, with sources, are in `_handoff/learnvedicmath-research.md`.

## What Changes

**Hosting (decision 7).** The site moves to Cloudflare Workers static assets on the Free plan, with DNS moved from Squarespace to Cloudflare (registration stays at Squarespace). A `wrangler.jsonc` in the repo describes the Worker; the build writes `_headers` and `_redirects` into its output. Real response headers: a Content-Security-Policy with `report-to` and `frame-ancestors 'none'`, HSTS, Permissions-Policy, Referrer-Policy, Cross-Origin-Opener-Policy, `nosniff`. A tiny Worker route (`/_csp`) collects CSP reports and keeps nothing personal. `www` redirects to the apex.

**Layout (decisions 1, 2, 11).**
- Everything is served from the root of learnvedicmath.com: no URL starts with `/vedic-math/`. Modules move from `/vedic-math/js/` to `/js/`.
- The game moves to `/play/`. `/` becomes a static, prerendered landing page with the Nikhilam Family as its hero (Bolt, the game's teacher, was the hero until `landing-hero-family`), plus `/parents/`, `/teachers/`, `/privacy/` and `/terms/`. A Player who already has progress on the device goes straight from `/` into `/play/`. Old deep links (`#/arena`, `/vedic-math/...`) reach the same screen.
- The build vendors a pinned copy of design-system v2.1.0 with a `learnvedicmath` theme on the same tokens, self-hosts the fonts, drops the sbmadhav.com Explore menu (and replaces its Pause motion switch with one in the app). There is no "Made by" credit line (owner, L6).
- A new manifest, icons and service worker for the new brand: the worker is re-scoped to `/play/` and precaches every file with a hash, because nothing is shared with another repo any more.

**The move, in three phases (decisions 3, 8).**
- **Phase A, launch:** the new site goes live and is checked end to end.
- **Phase B, hand-off window (3 months, extended a month at a time while hand-offs continue):** `sbmadhav.com/vedic-math/` and its `404.html` become a "Vedic Math has moved" page. It unregisters the old worker, clears only `vedic-math-*` caches, packs this device's progress into the URL fragment and replaces itself with `https://learnvedicmath.com/import/#...`. The old `sw.js` ships with `KILL = true`. The new `/import/` page reads the fragment, strips it before anything else runs, validates it against a strict schema and asks before importing ("Bring your progress from the old site?"), never overwriting silently.
- **Phase C, permanent:** `learnvedicmath.com` becomes the custom domain of the GitHub Pages site that answers `/vedic-math/`, so GitHub sends a real 301 from every old URL. A permanent `sbmadhav.com/vm-export/` page in the user-site repo lets a late visitor bring progress over with a popup and `postMessage`.
- Leaderboard identity stays behind: the new site uses a new Firebase project, so Boards start fresh and no old identifier moves.

**Boards and privacy (decisions 9, 10).**
- A new Firebase/GCP project for learnvedicmath.com: authorized domains, App Check (reCAPTCHA Enterprise, enforced), API key restricted to the new referrers, budget alert, TTL on `exp`.
- **Players whose Age answer is under 13 use Device boards only.** The Parent step is retired: it was a device toggle, which is not verifiable parental consent under the amended COPPA Rule. Players 13 and over keep posting to World boards, unchanged.
- The Firestore rules are unchanged except a retention rule: `exp` 29 to 31 days ahead, and a Board can be listed only until 28 days after it began, so the rules never serve an expired entry, even before TTL deletes it.
- Nothing reaches Google until a Player presses play on a video, opens a World board (13 and over only) or posts: YouTube thumbnails and the Firebase SDK are served from learnvedicmath.com, and reCAPTCHA loads only on those paths.

**Analytics (decision 12).** Cloudflare Web Analytics (cookieless) for traffic, plus a new GoatCounter site code with its script served from this site, keeping today's events. PostHog (cookieless, no person profiles) is a later change, after the privacy policy is published. Never Google Analytics.

**CI/CD.** GitHub Actions deploys to Cloudflare with a narrowly scoped API token stored as a GitHub secret; every same-repo branch gets a preview URL (not indexed); the Playwright suite runs against the preview on pull requests and against production after each deploy and daily; a daily check confirms the Phase C 301. External uptime monitoring watches `/`, `/play/` and the worker.

**Security program (decisions 13, 14).** DNSSEC, CAA, DMARC `p=reject`, `security.txt`, Dependabot, code scanning, secret scanning, hardware-key or passkey 2FA on every account, and the written documents in `docs/legal/` (privacy policy, terms, data retention, security program; drafts for a lawyer to review). Each item is a task, most of them owner-only.

**Repo and license (decision 4).** Lessons, art and audio become "all rights reserved" from the change date; code and content already published under MIT stay MIT. The repo goes private once nothing depends on its public GitHub Pages site (see design, "Going private").

## Order

This change is built only after the in-flight work is merged on the current site (decision 6): better-voice Part B with explanation audio, PR #47 (Play), PR #49 (sutra pronunciation). The `content-security-policy` and `site-header` changes must be archived first, because this change modifies their specs (both archived 2026-10-18). Owner setup (accounts, DNS, Firebase project) can start at once and runs in parallel.

## Out of scope

- Anything paid: checkout, accounts for parents, classroom plans (decision 5). No ads, ever.
- PostHog: a separate change once the privacy policy is live and reviewed.
- Verifiable parental consent for under-13 World boards. Under-13 Players are device-only instead; a lawyer is consulted before any paid plan or school outreach.
- Static content pages for Sutras, Tricks and Skills (SEO), module preloading and Speculation Rules prerender of `/play/` (see `_handoff/architecture-microfrontends-prerender.md`); separate changes.
- Transferring the registration to Cloudflare Registrar (possible after about 2026-12-16).
- Changes to the design-system repo itself; this change consumes the published v2.1.0.
- Carrying World board identities or entries across. They stay with the old project and expire or are deleted with it.
- A business entity (owner's call, needed before charging money).

## Modes and Players affected

Every Mode (Explorer, Challenger, Pro) and every Player. What changes for each:
- Every Player gets new URLs, a new home page, a one-time hand-off prompt and a new installable app.
- Players whose Age answer is under 13 no longer post to World boards on the new site, even if a grown-up gave the Parent step on sbmadhav.com; their Scores rank on the Device board as before.
- Players 13 and over post as before, under a new identity created at their first post on the new site.
- `parentNote()` in `js/app.js` and `cloud/README.md` change (what is sent, what is kept and for how long, the removal contact), together with the new privacy policy.

## Capabilities

### New Capabilities

- `hosting`: learnvedicmath.com on Cloudflare Workers static assets: paths, the landing-to-game redirect, old-link mapping, `www` and 404 handling, previews kept out of search.
- `security-headers`: response headers on every page (CSP with reporting, HSTS, Permissions-Policy, Referrer-Policy, COOP, CORP, `nosniff`), the CSP report endpoint and `security.txt`.
- `landing-pages`: the static landing, parents, teachers, privacy and terms pages, no credit line, no Explore menu.
- `site-assets`: the vendored, pinned design system with the learnvedicmath theme, the header partial, self-hosted fonts, the manifest and icons, third-party notices.
- `offline-app`: the service worker re-scoped to `/play/`, with every precached file hashed.
- `progress-handoff`: the moved page, the fragment payload, the import page with its schema and prompt, the export page, the all-Players backup code, the old worker's retirement and the Phase C redirect.
- `third-party-requests`: what may reach a third party, and when (nothing to Google or YouTube on load).
- `deploy-pipeline`: CI deploy to Cloudflare, previews, end-to-end runs against previews and production, the redirect and uptime checks, dependency and code scanning.

### Modified Capabilities

- `posting-consent`: under-13 Players are device-only; the Parent step and its withdrawal are removed.
- `board-identity`: no Parent step in the first-post rule; World boards open only for Players 13 and over; entries expire; a fresh start on the new project.
- `parent-note`: says under-13 Players post nothing, entries delete themselves after 30 days, the new removal contact, the new video wording, and links the privacy policy.
- `analytics`: the tools allowed (GoatCounter with a new code, Cloudflare Web Analytics), the fragment never counted, hand-off results counted.
- `watch-shelf`: thumbnails from this site and a YouTube frame only after a tap.
- `accessibility`: Pause motion moves from the Explore menu into the app.
- `content-security`: the policy is a response header with reporting and `frame-ancestors`, and allows a shorter list of origins.
- `site-header`: the header comes from the learnvedicmath partial, without Explore.

## Impact

- Build and hosting: `build.py`, `_config.yml`, new `wrangler.jsonc`, new `worker/csp.js`, new `site/` (landing and grown-up page sources), `play/` (the game page, moved from `index.html`), `sw.js`, `manifest.webmanifest`, new `vendor/` (design system 2.1.0, Firebase SDK, GoatCounter `count.js`), `fonts/`, `icons/`, `thumbs/`, `theme/learnvedicmath.css`, `.well-known/security.txt`.
- App code: `js/app.js` (paths, worker registration, Parent step removal, parent note, World board gate, Pause motion), `js/cloud.js` (SDK path, `canPost`, App Check only on the posting and World board paths), `js/cloud-config.js` (new project), `js/watch.js` (thumbnails, facade), `js/metrics.js` and a new `js/analytics.js`, `js/guide.js` (copy), `js/store.js` (all-Players backup code, strict import), new `js/handoff.js`, new `js/handoff-pack.js`.
- Rules: `cloud/firestore.rules`, `cloud/test/rules.test.js`, `cloud/setup.sh` (domains as parameters), `cloud/README.md`.
- Tests: most of `test/` and `e2e/` (208 `/vedic-math` references in 73 files), `e2e/local-server.mjs`, `e2e/playwright.config.ts`, `e2e/tests/fixtures.ts` (the Firebase SDK pattern moves to `/vendor/firebase/`).
- CI: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, new `.github/workflows/preview.yml`, new `.github/dependabot.yml`.
- Docs: `AGENTS.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE-CONTENT.md`, `GLOSSARY.md`, `docs/adr/0004` to `0006`, `docs/legal/`, `docs/owner-setup-learnvedicmath.md`.
- Other repos: `sbmadhav.github.io` (links to the new domain, `/vm-export/` page, the root worker's `NETWORK_ONLY` list). No new repos: on GitHub Pro this repo goes private and keeps its Pages for the Phase C redirect (owner, L2).
