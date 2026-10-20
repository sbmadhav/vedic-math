# Design

## Context

- Today: `sbmadhav/vedic-math` is a GitHub project Pages site under the user site's custom domain, served at `https://sbmadhav.com/vedic-math/`. `build.py --out _site` stamps an import map, `math.css`, the worker's `VERSION` and `PRECACHE`, and a CSP `<meta>`. Shared files (`/design-system/*`, `/assets/fonts/*`, `/assets/icons/*`, `/assets/explore.js`, `/assets/analytics.js`) come unhashed from other repos.
- Owner decisions 1 to 14 (`_handoff/learnvedicmath-decisions.md`) are requirements. Research with sources: `_handoff/learnvedicmath-research.md`. ADRs written with this change: `docs/adr/0004-host-on-cloudflare-workers.md`, `0005-phased-move-and-progress-hand-off.md`, `0006-under-13-players-use-device-boards-only.md`.
- Built after better-voice Part B and explanation audio, PR #47 (Play: adds `css/play/*.css` loaded on demand through a `#vm-css` JSON block in the import map section of `build.py`) and PR #49 (sutra pronunciation: Name clips under `audio/`). Anything those add under `/vedic-math/` moves to the root like everything else.

## Goals

- One self-contained site: every file the page loads is served by learnvedicmath.com, hashed and pinned by the build, except the few third parties a Player chooses to reach (video, World boards, natural voice download) and two cookieless analytics endpoints.
- Real headers, a strict CSP with reporting, and the security basics of a children's site.
- Nobody loses progress in the move, and nothing untrusted from a URL ever lands in storage without validation and a question.
- Under-13 Players never post anything online.

## Non-goals

See the proposal's Out of scope. Also: no framework, no bundler (the house rule stands for this move; vendored files are copied, not bundled). After the move, `react-typescript` (ADR 0012, owner 2026-10-19) supersedes this rule for the game at `/play/`: React, Vite and TypeScript, with path routes in `/play/` and the hash shim forever.

## Decisions

### D1. Cloudflare Workers static assets, configured in the repo

`wrangler.jsonc` (new, repo root, repo-only):

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "learnvedicmath",
  "compatibility_date": "2026-10-01",
  "main": "worker/csp.js",              // only runs for /_csp (run_worker_first); every other path is a static asset
  "assets": {
    "directory": "./_site",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",   // /404.html with status 404; not "single-page-application": routes are hash routes
    "run_worker_first": ["/_csp"]
  },
  "routes": [
    { "pattern": "learnvedicmath.com", "custom_domain": true },
    { "pattern": "www.learnvedicmath.com", "custom_domain": true }
  ],
  "workers_dev": true,
  "preview_urls": true,
  "observability": { "enabled": true, "head_sampling_rate": 1 }
}
```

- `_headers` and `_redirects` are written by `build.py` into `_site/` (static assets honour both without running the Worker script, so static requests stay free and unlimited).
- The Worker script runs only for `/_csp`, well inside the Free plan's 100,000 invocations a day; a Cloudflare rate-limiting rule on `/_csp` and `/import/` caps abuse.
- `www` to apex is a zone Single Redirect rule (owner task, dynamic: `https://learnvedicmath.com${http.request.uri.path}`, 301, keep query), because `_redirects` cannot match on host.
- Unverified until tried (each has a task): auto-trailing-slash behaviour for `/play` and `/import`; whether `run_worker_first` accepts a path array on the wrangler version we pin; the 2,000-character `_headers` line limit with our CSP.
- Workers Free is enough until there is revenue or a Worker needs more (checkout webhooks); then Workers Paid ($5/month). Read the Cloudflare self-serve subscription agreement for commercial use before launch (owner task).

### D2. Source layout and URLs

| Published path | Source | Notes |
|---|---|---|
| `/` | `site/index.html` | Landing page, static, prerendered at build |
| `/parents/`, `/teachers/`, `/privacy/` (with `/privacy/retention/` and `/privacy/security/`), `/terms/` | `site/<page>/index.html` | Grown-up pages, from the reviewed `docs/legal/` drafts |
| `/play/` | `play/index.html` (moved from `index.html`) | The game shell; all hash routes as today (`/play/#/arena`) |
| `/import/` | `site/import/index.html` + `js/handoff.js` | Hand-off import (D9) |
| `/js/**`, `/css/**`, `/math.css`, `/audio/**` | same paths in the repo | Modules and assets at the root (no `/vedic-math/` prefix) |
| `/ds/2.1.0/*` | `vendor/design-system/2.1.0/*` | Pinned design system (D5) |
| `/theme/learnvedicmath.css` | `theme/learnvedicmath.css` | Brand theme on the same tokens |
| `/fonts/*.woff2`, `/icons/*` | `fonts/`, `icons/` | Self-hosted, with licences |
| `/vendor/firebase/<v>/*.js`, `/vendor/goatcounter/count.js` | `vendor/...` | Self-hosted third-party code (D10) |
| `/thumbs/<youtube id>.webp` | `thumbs/` | Video thumbnails (D10) |
| `https://voice.learnvedicmath.com/<hash>.m4a` | R2 bucket `learnvedicmath-voice`, filled by CI from the voice Release | Studio voice files, about 23,700 (D17); not static assets |
| `/sw.js` | `sw.js` | Registered with scope `/play/` (D7) |
| `/manifest.webmanifest` | `manifest.webmanifest` | Scope `/play/` |
| `/.well-known/security.txt`, `/robots.txt`, `/sitemap.xml`, `/404.html` | `site/` | Written or copied by the build |

- `build.py` keeps one `BASE = "/"` and an `APP = "/play/"`; the import check becomes "relative or absolute path inside `/js/`". The CLAUDE.md rule "Every page URL starts with `/vedic-math/`" becomes "Module imports are relative or absolute paths inside `/js/`; the game is at `/play/`".
- PR #47's on-demand stylesheets keep working: `play_css` keys change from `/vedic-math/css/...` to `/css/...`.
- Why not keep `index.html` at the root and serve the game at `/`? Decision 2 puts a static landing page at `/`, and a separate shell at `/play/` keeps the landing page free of the 34-module graph.

### D3. Old links reach the same screen

Three kinds of old link:
1. `sbmadhav.com/vedic-math/#/arena`. In Phase C GitHub answers `301 http://learnvedicmath.com/` with the repo prefix stripped, and the browser carries the fragment over (RFC 9110 §10.2.2). It arrives at `/` as `https://learnvedicmath.com/#/arena`.
2. `learnvedicmath.com/vedic-math/...` (typed or rewritten by hand): `_redirects` has `/vedic-math/* /play/ 301` and `/vedic-math /play/ 301`; the fragment rides along.
3. A home-screen app installed from `/vedic-math/` opens `/vedic-math/?source=pwa`, which in Phase B is the moved page and in Phase C a 301.

The landing page carries one small inline script (allowed by hash), run before paint:
- if `location.hash` starts with `#/`, `location.replace('/play/' + location.hash)`;
- else if this device has Players (`vm.players` in localStorage) and the URL has no `?home`, `location.replace('/play/')` ("returning Players go straight into the game", decision 2);
- links from the game to the landing page use `/?home`, so a returning Player can still read it.
Crawlers and first-time visitors (no storage) see the landing page. The script reads storage and writes nothing.

### D4. Response headers (`_headers`, written by the build)

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=(), browsing-topics=(), fullscreen=(self "https://www.youtube-nocookie.com"), autoplay=(self "https://www.youtube-nocookie.com"), encrypted-media=(self "https://www.youtube-nocookie.com"), picture-in-picture=(self "https://www.youtube-nocookie.com")
  Reporting-Endpoints: csp="/_csp"
/play/
  Content-Security-Policy: <built for play/index.html>
  Content-Security-Policy-Report-Only: <the stricter variant, see below>
/import/
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Content-Security-Policy: <built for import/index.html>
/  (and each landing page path)
  Content-Security-Policy: <built for that page>
```

- The build computes each HTML page's policy the way `csp()` does today (fixed sources plus the sha256 of each inline script, import map included), so the policy moves from a `<meta>` into the header and gains `frame-ancestors 'none'`, `report-to csp`, `report-uri /_csp` (Safari and Firefox), `base-uri 'none'` and `upgrade-insecure-requests`. `check_source()` still fails on a CSP `<meta>` in the source; the published pages carry none (one policy, one place).
- Cloudflare matches `_headers` by path, and several rules can apply to one path; the build emits per-page CSP lines only on exact paths and fails if any line is over 2,000 characters or there are more than 100 rules. If the play policy outgrows a line, the theme pre-paint script moves to a blocking external file so only the import map needs a hash.
- Launch enforces the policy that the live site already enforces as a `<meta>` (adjusted for the new origins), so there is no Report-Only period for it. The **stricter variant** runs as Report-Only for at least 4 weeks: `style-src 'self'` (no `'unsafe-inline'`, today needed for `style=""` in view markup), and `require-trusted-types-for 'script'`. It is enforced, or dropped with a note, in a later change.
- Previews (D12) add `X-Robots-Tag: noindex, nofollow` on `/*`.
- HSTS `preload` is not set. Adding it is a later owner decision once every subdomain is HTTPS for good (it cannot easily be undone).
- COOP `same-origin` everywhere except `/import/`, which opens the `/vm-export/` popup and needs its `window.opener` link to survive (`same-origin-allow-popups`). To verify in WebKit and Chromium (task 12.6).
- Referrer stays `strict-origin-when-cross-origin`, not `no-referrer`: YouTube's embedded player has been reported to fail (error 153) without a referrer (to verify, task 12.6).

### D5. CSP report endpoint (`worker/csp.js`)

- Accepts `POST /_csp` with `application/reports+json` or `application/csp-report`, at most 8 KB, else 413 or 415.
- For each report it logs one line to Workers Logs: the effective directive, the blocked URL reduced to its origin (or `inline`, `eval`), the document path without query or fragment, the disposition (enforce or report) and the browser family. Never the IP, the full URL, `referrer`, `sample` or anything else. Workers Logs keep these for a few days (verify retention on Free).
- Returns 204. Every other path never reaches the script (`run_worker_first` lists only `/_csp`).
- Reviewed monthly (security program).

### D6. Vendored design system, theme, header, fonts, Explore and Pause motion

- `vendor/design-system/2.1.0/` holds `tokens.css`, `components.css`, `header.html`, `header.js`, `music.html`, `compose.py` and `LICENSE` copied from `https://sbmadhav.com/design-system/v/2.1.0/` (immutable), with `SHA256SUMS`. A test checks the sums; CI does not fetch. Moving to a new version is a deliberate PR (copy, update sums, review the diff).
- `theme/learnvedicmath.css` loads after `tokens.css` and only reassigns existing tokens (same names; no new token names in app CSS). Its first version equals Harbor except the brand accent and the category colours the design audit found collapsed (`--sky` equal to `--teal`, `--plum` equal to `--coral`; design-audit item 1, owner-approved D1 to D6). Both schemes (Daybreak, Deep Space) are defined, with the `:root:not([data-theme="light"])` dark guard the design system uses.
- `theme/header.html` is derived from v2.1.0's `header.html` with two edits: no Explore button, and the brand's label says "Learn Vedic Math, home" and links to `/?home`. The pages compose it with the vendored `compose.py`; CI runs `compose.py --check` on every page. The header records the upstream version it came from.
- Fonts: the five `woff2` files move to `fonts/` with their SIL Open Font License texts; one `@font-face` set in `theme/fonts.css` (the duplicate inline block in today's `index.html` goes, design-audit item 2); `index.html`s preload Nunito Sans and Fredoka.
- Explore menu: removed with `/assets/explore.js`. Its Pause motion switch (WCAG 2.2.2, `html.motion-paused`) moves into the app: a switch on the Me page and in the music panel, saved on the device under `motion-paused`, applied before paint by the same inline script that applies the theme. `fx.motionOff()` keeps reading the class.
- The CLAUDE.md rules about the Explore button and `/assets/explore.js` are removed; the rule about `/assets/analytics.js` becomes "`/js/analytics.js`".
- No "Made by" credit line on any page (owner, L6). The operator is named only where the law needs it: the operator details in the privacy policy.

### D7. Service worker re-scoped

- `sw.js` stays at the repo root, is published at `/sw.js` and is registered from `/play/` with `{ scope: '/play/' }`. The landing pages are not controlled (they need no offline copy, and a returning Player opens `/play/` from the home screen anyway).
- Every file it precaches now belongs to this repo, so every entry has a hash and is checked on install: the shell `/play/`, `math.css`, every module at its import-map URL, PR #47's stylesheets, `/ds/2.1.0/*`, `/theme/*`, `/fonts/*`, `/icons/*`, the manifest. The stale-while-revalidate branch for shared files is removed. Audio clips stay runtime-cached as better-voice designs them.
- Cache names become `lvm-<VERSION>`; the worker only deletes its own older `lvm-*` caches. The `'dev'` and `KILL` branches stay as they are.
- `manifest.webmanifest`: `name` "Learn Vedic Math", `short_name` "Vedic Math", `id` `/play/`, `start_url` `/play/?source=pwa`, `scope` `/play/`, new icons in `/icons/`. A Player who installed the old app has to install the new one; the moved page and the import page say so.

### D8. Build targets

- `python3 build.py --out _site` builds the new site (the default target). New steps: render `site/` pages (compose the header, fill `{{year}}`, `{{updated}}`), copy vendored files, write `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, the per-page CSPs, and the worker precache. It fails on: any reference to `sbmadhav.com` in a published file other than the credit link and the import page's export-page URL; any `https://` module import; any `/vedic-math/` path in a published file other than the `_redirects` lines; a third-party host not in `THIRD_PARTIES` (D10); more than 20,000 files or a file over 25 MiB (Workers limits).
- `python3 build.py --dev --out _dev` builds the same layout without stamps and with the `'dev'` worker, for local runs (the source tree is no longer servable as is, because the landing pages and `_headers` are generated).
- `python3 build.py --target moved --out _moved` builds the Phase B output for the old origin: `index.html` and `404.html` (the moved page), `js/handoff-pack.js` (stamped), and `sw.js` with `KILL = true` and a stamped `VERSION` (the KILL branch only runs when `VERSION` is not `'dev'`). Paths in this output stay under `/vedic-math/`, because that is where it is served.
- Local runs: `npx wrangler dev` serves `_site` or `_dev` with `_headers` and `_redirects` applied (Miniflare), so local tests see the real headers. `e2e/local-server.mjs` stays for the moved page (it serves `_moved` at `/vedic-math/`) and drops its proxy to sbmadhav.com.

### D9. Progress hand-off

**What moves** (one module, `js/handoff-schema.js`, is the allow-list used by the packer, the validator and a test):
- `vm.players`: `active`, and per Player `id` (`^p[0-9a-z]{1,12}$`), `name` (matches `NAME_RE` and the word lists), `avatar` (one of `AVATARS`), `mode` (`explorer`, `challenger`, `pro` or null), `created` (a time), `age` (an integer 1 to 120, `'adult'` or null). Not `parentOk`.
- `mathquest.v1.<id>` for each listed Player: the progress record, every field typed and bounded (skills keyed `^[\w-]{1,64}$` with `n`, `c` integers, `m` 0 to 1, `streak`, `last`; `sparks` 0 to 10,000,000; `days` keyed by date; `best`, `medals` 0 to 3, `katasDone`, `ratings` 0 to 20, `weekSparks`, `badges`, `counts`, `seen`, `sky`, `belts`, `grade`, `questDay`), at most 5,000 keys in total.
- Settings: `theme`, `vm.text`, `vm.calm`, `vm.tour`, the voice and music settings as listed in the schema when this change is built.
- **Not**: `vm.cloudUids`, `vm.cloudUid`, `vm.cloudForget`, Firebase's IndexedDB, `vm.board` (Device boards start fresh like World boards), `vm.metrics`, `vm.firstSeen` (analytics milestones start fresh on the new site), anything not in the allow-list. A test fails when a `vm.*` key used in `js/` is in neither list.

**Oldest saved format**: a device last used before Players existed has a bare `mathquest.v1` record and no `vm.players`; today `store.players()` converts it on the next load, but the moved page does not load `store.js`. So `handoff-pack.js` does the same conversion in memory (never writing it on the old origin): one Player `p1` with a Nickname from the word lists, avatar `teal`, Mode null, and the bare record as `p1`'s progress. A device counts as empty only when it has neither `vm.players` nor a bare `mathquest.v1` with progress. The export page uses the same packer.

**Payload**: `{ v: 1, from: 'sbmadhav.com', at: <ms>, players, records, settings }`, JSON, then `CompressionStream('gzip')`, then base64url. Fragment: `#v=1&d=<payload>&r=<route>`, where `r` is the original hash route if it matches `^#/[\w/-]{0,80}$`. Cap: 32 KB of payload. Over the cap, the moved page does not redirect with data; it shows the all-Players backup code (Copy, then "Go to the new site") instead.

**Moved page (old origin, Phase B)**, in order: register nothing; `getRegistrations()` and unregister any worker whose scope is `/vedic-math/`; delete caches starting with `vedic-math-` (never `madhav-*`); read and pack; write `vm.migratedAt` on this origin; `location.replace('https://learnvedicmath.com/import/#...')`. With no Players stored it goes to `https://learnvedicmath.com/play/` plus the route. `<noscript>` has an instant `meta refresh` to `https://learnvedicmath.com/`; the page shows a visible link and has `<link rel="canonical" href="https://learnvedicmath.com/">`. It loads nothing from the app, no Firebase and no analytics except one `move/handoff/<sent|empty|too-big>` count through the sbmadhav.com analytics wrapper, sent before the redirect with `sendBeacon`.

**Import page (new origin, `/import/`)**:
1. First statement of its module: copy `location.hash`, then `history.replaceState(null, '', '/import/')`, before anything else loads. The page loads no analytics script until the fragment is gone, and sends only the result bucket (analytics D11).
2. Decode with `DecompressionStream`, stop at 256 KB decompressed, `JSON.parse` inside try, validate with the schema: unknown keys, wrong types, out-of-range numbers, too many entries, a `v` other than 1, or a Nickname not from the word lists make it invalid. Invalid: "This link did not carry progress we can use" and a button to play; nothing is written. No value from the payload is ever put into HTML; the summary is built with `textContent`.
3. Ask: "Bring your progress from the old site?" with a summary (each Player's Nickname and Sparks, and any optional parts left out to fit). Buttons: "Bring it" and "Not now".
4. If this device already has progress on learnvedicmath.com (a Player with Sparks, answers or play records; the blank p1 a first visit to `/play/` makes does not count): "This device already has progress here" with "Keep this device's", "Use the old site's" and "Keep both". Never a silent overwrite. "Keep both" adds the old site's Players next to these as separate Players (an id used here, or one with a World board identity here, gets a new id) and fills only settings not set here; one Player's progress is never merged with another's (two copies of one Player would get two different Ratings). "Use the old site's" removes this device's Players like the Me page does (records, play records, Device board; World board identities forgotten as `cloud.forget` would).
5. On "Bring it": write the allowed keys, set `vm.migratedAt`, then `location.replace('/play/' + route)`. The Player meets the Age answer again only if it was missing; `parentOk` is never written, so nobody under 13 posts.
6. "Not now" goes to `/play/` and leaves the old data on the old origin (a retry works from the export page).
7. The page also offers "Bring my progress from sbmadhav.com" (the export popup, below) when it is opened without a fragment.

**Export page (`https://sbmadhav.com/vm-export/`, user-site repo, permanent)**: opened only as a popup by a click on `/import/`. It checks `window.opener` exists and that a `{ type: 'lvm-export-request' }` message comes from `event.origin === 'https://learnvedicmath.com'`, packs the same payload with the same allow-list (a copy of `handoff-schema.js`, checked by a test in this repo against the published copy), posts it with `targetOrigin` `https://learnvedicmath.com` and closes. It is outside `/vedic-math/`, so it keeps working after the Phase C 301, and it reads the same localStorage (storage is per origin, not per path). It sends no analytics except a `move/export/<sent|empty>` count.

**Backup code**: Me page "Copy backup code" and "Restore from code" cover every Player on the device (the same payload, without the size cap, as text). `importData` stops accepting anything the schema rejects (today it only checks that `skills` is an object). Old single-Player codes are still accepted through the same validator.

**Old worker**: the Phase B deploy of the old origin ships the KILL `sw.js`. An online visit already gets the new page (the old worker fetches navigations network first, with a 3.5 s timeout), the moved page unregisters at once, and the browser's update check installs the KILL worker for tabs that never reach the page. After Phase C, a worker that never updated still forwards navigations to the network, which answers 301, so the browser follows it; offline it shows the old saved app, which is harmless.

**Safari**: ITP deletes script-writable storage after 7 days of browser use without a visit (home-screen apps are exempt). Phase B starts on launch day, and the moved page is shipped the same day.

### D10. Third parties: what is reached and when

`build.py` keeps one `THIRD_PARTIES` table used by the CSP builder, the "no unknown host" build check and `e2e/tests/third-party.spec.ts`:

| Host | Why | When it is first contacted |
|---|---|---|
| `https://www.youtube-nocookie.com` (frame) | A video plays in the page | After the Player taps play (facade); no frame before |
| `https://learnvedicmath.goatcounter.com` | Analytics beacons | After load and idle; never with Do Not Track or GPC |
| Cloudflare Web Analytics beacon (`static.cloudflareinsights.com`) and endpoint (`cloudflareinsights.com`) | Traffic counts | After load and idle, started by `js/analytics.js` with the manual snippet, never with Do Not Track or GPC. Automatic injection stays off, because it ignores those signals. Serving `beacon.min.js` from this site and using a same-origin `/cdn-cgi/rum` endpoint are to be tried in Report-Only first (task 9.3) |
| Firestore, App Check, reCAPTCHA (`www.google.com/recaptcha/`, `www.gstatic.com/recaptcha/`) | World boards | When a Player whose Age answer is 13 or over opens a World board or posts |
| Identity Toolkit, Secure Token, `apis.google.com`, the `authDomain` frame | Anonymous sign-in | At that Player's first post, never before (ADR 0002) |
| `https://cdn.jsdelivr.net`, `https://huggingface.co` (worker only) | Natural voice | After the Player opts in and confirms the ~100 MB download |

- Thumbnails: `tools/fetch-thumbs.mjs` (repo-only) saves `mqdefault.jpg` for each `js/videos.js` entry as `thumbs/<id>.webp` (320x180); a node test fails when an entry has no thumbnail. `thumbSrc()` returns `/thumbs/<id>.webp`. Copyright in thumbnails belongs to the channels: lawyer question; the fallback is a drawn title card with no image.
- Firebase SDK: `vendor/firebase/<version>/` holds `firebase-app.js`, `firebase-firestore.js`, `firebase-auth.js`, `firebase-app-check.js` from the gstatic ESM build, with their internal `https://www.gstatic.com/firebasejs/...` imports rewritten to relative paths by `tools/vendor-firebase.mjs`, plus the Apache-2.0 licence. A build check fails if any vendored file still names `gstatic.com/firebasejs`. Upgrade from 10.12.2 to the current major at vendoring time. `cloud.js` loads from `/vendor/firebase/<v>/`; the e2e fake SDK pattern moves with it.
- App Check moves out of `bootRead()`'s first call only as far as enforcement allows: with App Check enforced on Firestore, list reads need a token too, so reCAPTCHA loads when a World board opens. That is why opening a World board is a deliberate tap, and only for 13 and over.
- GoatCounter's `count.js` is vendored at `vendor/goatcounter/count.js` (pinned, with its licence) and loaded by the new `js/analytics.js`, which replaces `/assets/analytics.js` with the same behaviour (idle load, Do Not Track and GPC off switch, queue, `window.siteTrack`) and the new site code.

### D11. Analytics

- GoatCounter with a new site code (`learnvedicmath`) on goatcounter.com, script served from this site. Event names stay as they are (`math/...`), because the new site code starts empty. The theme event becomes `math/theme/<scheme>`.
- Cloudflare Web Analytics for traffic and Core Web Vitals: page loads only (hash route changes are not tracked by it, which is fine: GoatCounter counts routes).
- Hand-off buckets: `math/handoff/<accepted|replaced|merged|kept|declined|invalid|error|popup>` on the new site, `move/handoff/<sent|empty|too-big>` and `move/export/<sent|empty>` on sbmadhav.com. These decide when Phase B ends (D13).
- PostHog later, only cookieless (`cookieless_mode: 'always'`, `person_profiles: 'never'`, no autocapture, no replay, no surveys, no `identify()`, discard IP), and only after the privacy policy names it. A separate change.
- Never Google Analytics.

### D12. CI/CD

- `ci.yml` (push and pull request): unit tests, `build.py --out _site`, the stamp checks (updated paths), `compose.py --check`, `_headers` limits, then on `main` `wrangler deploy` with `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` (variable). The GitHub Pages deploy job is removed in Phase A for the new site; the old origin's Phase B deploy is a one-off (D13).
- Token scope (custom token, this account and the `learnvedicmath.com` zone only): Account > Workers Scripts > Edit, Account > Account Settings > Read, Zone > Workers Routes > Edit, Zone > Zone > Read, User > User Details > Read, User > Memberships > Read (the last two are what `wrangler` asks for to identify the account; drop any it turns out not to need). No DNS, firewall or billing permissions; the custom domains are attached once by the owner in the dashboard. Client IP filtering is not used (GitHub-hosted runner IPs vary). TTL: 1 year, renewal on the owner's calendar. Steps: `docs/owner-setup-learnvedicmath.md` §8.
- Two tokens, so preview runs never hold the production credential (deploy-pipeline spec):
  - `CLOUDFLARE_API_TOKEN` (production) in a `production` environment whose deployment branches are `main` only; only the `deploy` job of a push to `main` names that environment.
  - `CLOUDFLARE_PREVIEW_TOKEN` in a `preview` environment, used only by `preview.yml` on the `pull_request` event (never `pull_request_target`), which GitHub does not give secrets to for forks. Same permissions (Cloudflare cannot scope a token to "upload versions but never deploy"), so the boundary is who can trigger it: only people who can push branches to this repo, which is the owner. Revoking one never touches the other.
  - The owner creates the `production` environment before saving the token (owner guide §8), so the token is never stored at repository scope.
  - The repo goes private on GitHub Pro (owner, L2), which keeps environments and environment secrets on private repos, so this setup stays as it is after the repo goes private.
- `preview.yml` (pull requests from branches of this repo): build with `--preview` (adds `X-Robots-Tag: noindex`), `wrangler versions upload --preview-alias pr-<number>`, post the preview URL as a PR comment, then run the Playwright suite against it (`BASE_URL`). Preview URLs on `workers.dev` are public but not indexed; they never post (the fake SDK, and the Firebase key's referrers do not include `workers.dev`).
- `e2e.yml`: after a deploy, wait until the live `/play/`, `/sw.js` and `/js/app.js` match this commit's build (as today), then run the suite against `https://learnvedicmath.com`; daily at 06:23 UTC; on demand with `base_url`. Also: during Phase B, `moved.live.spec.ts` against `https://sbmadhav.com/vedic-math/`; from Phase C, a `curl -sI https://sbmadhav.com/vedic-math/x` step that expects a 301 to `learnvedicmath.com/x` (undocumented GitHub behaviour, so it is watched).
- The 429 notes: Cloudflare does not rate limit static assets the way GitHub Pages does, so the comments about 429 in `playwright.config.ts` and the cov split are rewritten. `serviceWorkers: 'block'` stays, for its first reason (WebKit does not route requests from a worker-controlled page, so the fake SDK and analytics answer would be bypassed). Bot Fight Mode on the zone could challenge runner traffic, and on Free it cannot be skipped by a rule: turn it on only after a production e2e run passes with it on (task 15.7); previews on `workers.dev` are outside the zone.
- `.github/dependabot.yml`: `github-actions` (weekly), `npm` in `/e2e`, `/cloud/test` and the new `/deploy` (wrangler pinned there), weekly, grouped.
- Code scanning: CodeQL default setup (JavaScript, Python, Actions) while the repo is public. CodeQL and secret-scanning push protection on a private repo need GitHub Advanced Security (paid); after the repo goes private, `ci.yml` runs Semgrep Community Edition with the `p/javascript`, `p/python` and `p/github-actions` rulesets instead, and `gitleaks` on pushes. Dependabot alerts and updates stay free on private repos.
- Actions minutes: GitHub Pro gives a private repo 3,000 Linux minutes a month (owner, L2). Today's runs (daily e2e up to 50 minutes including cov, one e2e per push, CI per push) come close. If a month's usage passes 2,500 minutes: cov runs weekly instead of daily, docs-only pushes skip e2e (`paths-ignore`), and the preview e2e runs chromium only.

### D13. Phases and the GitHub side

- **Phase A**: everything in tasks 2 to 15 lands on `main`, deploys to Cloudflare, and the production e2e run passes. sbmadhav.com still serves the old app until Phase B starts (same day if possible).
- **Phase B (start = launch day, 3 months, then month by month)**:
  - One deploy of the old origin: `build.py --target moved --out _moved`, published by this repo's existing Pages pipeline, which keeps working after the repo goes private on GitHub Pro.
  - sbmadhav.com home page and Explore menu link to `https://learnvedicmath.com/` (user-site repo PR). The root worker's `NETWORK_ONLY` list keeps `/vedic-math/`; `/vm-export/` is added to it.
  - The `/vm-export/` page goes live in the user-site repo (it is needed in Phase C, but shipping it in B lets `/import/` offer the popup from day one).
  - Old Firebase project: deploy deny-all rules for writes at the start of B (reads stay for the old app's tabs); the old app is gone, so nothing should post.
  - End of B: when `math/handoff/*` plus `move/handoff/sent` are below 5 a week for 2 weeks in a row after month 3, go to C; otherwise extend a month and look again.
- **Phase C** (done only when the 301 check passes; until then the moved page stays):
  - Set `learnvedicmath.com` as the custom domain of the Pages site that answers `/vedic-math/`. This changes nothing about where learnvedicmath.com is served: its DNS stays on Cloudflare and the Worker stays authoritative, so GitHub's "DNS check unsuccessful" notice is expected and harmless. GitHub then 301s `sbmadhav.com/vedic-math/*` and `sbmadhav.github.io/vedic-math/*` to `http://learnvedicmath.com/*` (repo prefix stripped, path and query kept; verified live on other sites, undocumented). Cloudflare "Always Use HTTPS" and HSTS turn `http://` into `https://`.
  - Gate: within 24 hours, `curl -sI https://sbmadhav.com/vedic-math/x?y=1` must answer 301 with `Location` `http(s)://learnvedicmath.com/x?y=1`, and the same for `sbmadhav.github.io/vedic-math/x`. GitHub documents only apex and `www` redirects, not this project-site behaviour (it was seen working on other sites on 2026-10-17), so it is treated as unproven until this check passes here.
  - If the check fails: remove the custom domain again (the moved page keeps working meanwhile) and use the fallback, which is documented by Cloudflare rather than GitHub: move sbmadhav.com's DNS to Cloudflare as a proxied zone (the user site stays on GitHub Pages behind it) and add one Single Redirect rule, `starts_with(http.request.uri.path, "/vedic-math/")` to `concat("https://learnvedicmath.com/", substring(http.request.uri.path, 12))`, 301, keep query. That is a real 301 to the Worker-hosted site. It is an owner decision because it touches the main site's DNS; until it is made, this repo's Pages keep serving the moved page, which still hands progress over (just not as a 301).
  - Verify `learnvedicmath.com` under GitHub account Settings > Pages > Verified domains first, so no other account can claim it on Pages (owner task; do it in Phase A).
  - Old Firebase project: delete it (Google keeps it 30 days, then purges). Remove `sbmadhav.com` from every key and App Check list of the new project (it was never added).
- **Going private** (decision 4; the owner chose GitHub Pro, L2). GitHub Pro publishes Pages from a private repo, so the repo keeps its name and its Pages site (the published site stays public; only the code goes private). No rename and no stub repo:
  1. The owner subscribes to GitHub Pro ($4/month).
  2. Any time from the start of Phase B (after `_moved` is live), the owner makes `sbmadhav/vedic-math` private. Its Pages site keeps serving `/vedic-math/`.
  3. Phase C sets the custom domain on this repo's Pages.
  What changes when the repo is private: CodeQL and push protection go away (they need GitHub Advanced Security; D12 replaces them), Actions minutes are metered (3,000 a month on Pro, D12), the SHA-pinning requirement for Actions keeps working, and `SECURITY.md`'s private vulnerability reporting link stops working for outsiders, so `security.txt` and `SECURITY.md` point to `security@learnvedicmath.com` instead. Environments, environment secrets, branch protection and rulesets keep working on Pro.

### D14. Firebase: new project, rules, retention

- New project (suggested id `learnvedicmath`, or `learnvedicmath-prod` if taken), owned by the owner's Google account for now (the business entity's account later, decision 9). Anonymous sign-in on; authorized domains `learnvedicmath.com`, `www.learnvedicmath.com`, `localhost`; the browser key restricted to HTTP referrers `https://learnvedicmath.com/*`, `https://www.learnvedicmath.com/*`, `http://localhost:*/*`, `http://127.0.0.1:*/*` and the project's `firebaseapp.com`, and to the five APIs used today; App Check with a reCAPTCHA Enterprise key for `learnvedicmath.com` (and `localhost` through debug tokens, not as a key domain), enforced for Firestore; budget alert.
- Retention needs the Firestore TTL policy on `exp`, which needs the Blaze plan (on Spark the TTL command fails). Blaze with the free quotas still costs nothing at this size; a $5 budget with alerts at 50, 90 and 100 percent guards it (open question 3).
- `cloud/setup.sh` takes the project id and the domains as parameters (today it hard-codes `sbmadhav.com`), and turns on TTL.
- Rules: unchanged except retention, and set so that **no expired entry can ever be listed**, by anyone, even while TTL has not yet deleted it:
  - `validEntry()` requires `exp` between 29 and 31 days ahead (was 1 to 60); the client sends 30 (`KEEP_DAYS`).
  - `allow list` also requires `request.time < boardStart() + duration.value(28, 'd')`.
  - Why that is enough: a write is accepted only while its Board is open, which starts at the earliest 15 hours before `boardStart()`. So every entry's `exp` is at least `boardStart() - 15h + 29d`, which is later than `boardStart() + 28d`, the last moment the Board can be listed. Both sides use server time (`request.time`), so a wrong device clock changes nothing. A list query cannot filter on `exp > request.time` itself (rules check query constraints, and the query orders by score), so the bound is made on the Board's age instead.
  - Daily Boards stay listable for 28 days and weekly Boards for 4 weeks from their Monday, more than the app ever shows.
  - TTL deletion is asynchronous (Firestore deletes expired documents in the background, typically within a day or so, with no guaranteed time). Until it does, an expired entry still exists but cannot be listed, and `get` needs that entry's own identity. `cloud.top()` also drops any entry whose `exp` has passed, as a second guard. The copy says "stops being shown after 30 days and is then deleted automatically", never "deleted at 30 days". Emulator tests cover the rules; `test/cloud.test.mjs` covers the client filter.
- Under-13 device-only boards are enforced in `cloud.canPost()` (a new reason, `'device-only'`), not in the rules: the Age answer never leaves the device (posting-consent), so the server cannot know it. ADR 0006 records why a self-asserted age field was rejected.
- `js/cloud-config.js` holds the new project's web config and App Check site key (public by design).

### D15. Under-13 Players use Device boards only (ADR 0006)

- `canPost(p)`: `'needs-age'` without an Age answer, `'device-only'` when the Age answer is under 13, else `'ok'`. `parentOk` is ignored and never written.
- The Me page's World boards section shows, for an under-13 Player, a plain sentence (for the Player's Mode) that their Scores stay on this device's board, and no switch. The Parent step dialog, its grown-up check and the `parent-step/on|off` events are removed.
- World boards (viewing) appear only for a Player whose Age answer is 13 or over, behind a "Show World board" tap; everyone else sees the Device board. The Age answer stays neutral: it is asked at the first Ranked round end as today, never framed as unlocking anything.
- Weekly Sparks are never queued for posting for an under-13 Player.

### D17. Studio voice files (better-voice Part B, PR #55)

PR #55 publishes the Studio voice into the site at `/vedic-math/voice/`: about 23,700 files (21,387 whole lines and 2,291 clips in five packs, about 414 MB), not in git, downloaded at deploy from a GitHub Release (`tools/voice/ci-fetch.mjs`, checked against the SHA-256 in `js/voice-index.js`). They are cache first in their own `vedic-math-voice` cache, which deploys never delete.

Cloudflare's limits (developers.cloudflare.com/workers/platform/limits, updated 2026-10-12): static assets allow **20,000 files per Worker version on Free** and **100,000 on Paid**, **25 MiB per file**, and no documented total size limit. So the site plus the voice (about 24,000 files with the app's own files) **does not fit on Free**. R2 (developers.cloudflare.com/r2/pricing, updated 2026-10-01): free tier 10 GB-month of Standard storage, 1 million Class A and 10 million Class B operations a month, **no egress fees**.

Options:
- **(a) R2 bucket `learnvedicmath-voice`.** CI uploads only files that are new (names are content hashes, so nothing is ever overwritten) and checks every file against the release manifest's SHA-256 before uploading. The static site keeps only `js/voice-index.js` (the tag, the archive hash, and now the voice base URL), so it stays at about 300 files. Two ways to serve it:
  - **(a1) public custom domain `voice.learnvedicmath.com`** on the bucket (default). Requests go through Cloudflare's cache and never run Worker code, so they do not count against the Free plan's 100,000 Worker requests a day. They also don't count as R2 Class B reads when they are cache hits (a Cache Rule for `voice.learnvedicmath.com` marks it **Eligible for cache** (`.m4a` is not cached by default), takes the Edge TTL from the objects' `Cache-Control`, and sets status-code TTLs of 1 year for 200 and 206 and no-store for 404 and other errors, so a file requested before its upload is never cached as missing). Object metadata sets `Cache-Control: public, max-age=31536000, immutable`, the files are public by design: an R2 custom domain makes the bucket readable by anyone who requests a URL, and that is acceptable because the recordings hold no personal data (they are all-rights-reserved content, like the rest of the site). A bucket CORS rule allows `GET` from `https://learnvedicmath.com`, which only stops other web pages from reading the files through scripts; it does not stop direct requests or plain `<audio>` hotlinking. If hotlinking ever costs anything, a WAF rule on that host can refuse requests whose `Referer` is another site (best effort). and a Transform Rule adds `Cross-Origin-Resource-Policy: same-site`, `X-Content-Type-Options: nosniff` and HSTS (which `includeSubDomains` covers anyway). The play CSP adds `https://voice.learnvedicmath.com` to `media-src` and `connect-src`. It is a first-party host (same site), listed in `THIRD_PARTIES` as "own".
  - **(a2) same domain, `/voice/*` through the Worker** (`run_worker_first: ["/_csp", "/voice/*"]`, an R2 binding, the Worker answers from `caches.default` or R2). One origin, no CORS or CSP change. But every clip a Player hears is a Worker request. A Player hears a few hundred clips a session, so about 300 daily Players would reach the Free plan's 100,000 requests a day, and then the voice stops working until the next day. It is fine on Workers Paid (10 million a month included).
- **(b) Workers Paid, $5 a month.** All files stay static assets at `/voice/` (100,000 files allowed, 25 MiB each covers the largest pack), same origin, no new moving parts, static requests free. The cost is $60 a year now rather than "once there is revenue". Each deploy uploads only changed assets, so the 414 MB is uploaded once per new recording.
- **(c) Pack lines into fewer files** (for example one file per Skill and Mode with a byte-range index). It fits on Free with no new service, but it means range requests, partial responses in the service worker cache and a rework of PR #55's player and tests. A Player would also download a whole pack to hear one line. Rejected unless (a) and (b) both fall through.

**Recommendation: (a1)**, R2 on `voice.learnvedicmath.com`. It is free at this size (414 MB of 10 GB, about 24,000 Class A writes once, cached reads), keeps the site far under the 20,000-file limit with room to grow, and keeps the audio release separate from code deploys. It stays free even if many Players listen, because cached requests run no Worker. (b) is the simple fallback, and the natural place to land once the site moves to Workers Paid anyway (then (a2) becomes free too).

Rules carried over from PR #55 (whatever the option):
- The deploy fails if any voice file does not match its manifest hash, and with no tag in the index nothing is uploaded and the device voice reads.
- Voice files are cache first in their own cache, now `lvm-voice`, which the worker's version clean-up never deletes (offline-app spec). Nothing is precached; the core clip pack loads while idle once read aloud is on.
- No voice file is ever in git, and `build.py` fails if any is in `_site`.
- Order on deploy: the `voice-upload` job runs on **every** push to `main` (it is quick when nothing is new) and the `deploy` job `needs` it, so a site that names new voice URLs is never published before they exist. The job uploads missing objects, then lists the bucket (about 24 list calls) and fails if any object the committed `js/voice-index.js` and manifest name is missing; a failed upload stops the deploy, and so does a skipped one while R2 is set up (see "Changes made while building" for the deploy without R2). With L8 (b) the job does the same check against `_site/voice/` instead.
- Upload credential: an R2 API token with Object Read & Write on that one bucket only (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`) in the `production` environment, used only by a `voice-upload` job on `main` that runs when `js/voice-index.js` changes. Uploads use the S3 API (`aws s3 cp --checksum-algorithm SHA256`, or `rclone copy --immutable`), never deleting.
- Re-recording: the recording project is the old `sbmadhav-vedic-math` GCP project (PR #55 used it through the owner's gcloud sign-in), which task 19.2 deletes. Recording moves to the new project first (enable Text-to-Speech, the same $300/month and $50/run guards), task 7.6.
- PR #44 (sutra-examples) merged after the recording, so its new Worked examples have no recording yet. The re-record (`lines.mjs`, `record.mjs`, `publish.mjs`, a few thousand characters, inside the free million a month) runs before launch, task 7.5, and `test/voice-coverage.test.mjs` must pass with the explanation lines included.

### D16. Licence

- `LICENSE-CONTENT.md`: from the change date, lessons, Kata and Worked example text, Bolt and all art, icons, Name clips, Studio voice clips and other audio are "all rights reserved". Copies of this repository published before that date stay under the licences they were published with: MIT for the software, including the learning content the old notice called part of it. The MIT grant for those copies cannot be withdrawn (lawyer to confirm).
- `LICENSE` keeps the MIT text with a header: "Applies to the code published in sbmadhav/vedic-math up to commit `<sha>` (`<date>`). Later code is proprietary unless a file says otherwise." (Open question 4: the owner may prefer to keep new code MIT.)
- `CONTRIBUTING.md`: outside contributions are no longer accepted once the repo is private.
- New `THIRD-PARTY-NOTICES.md`, published at `/licenses/`: design system (MIT), fonts (OFL), Firebase SDK (Apache-2.0), GoatCounter `count.js` (licence as published; to check), Kokoro and kokoro-js (Apache-2.0), voices used for audio (their terms).

## Risks and trade-offs

- **GitHub's custom-domain 301 is undocumented.** Mitigation: the daily check; the export page works whatever happens; if GitHub stops redirecting, remove the custom domain and let this repo's Pages serve a JS redirect page instead.
- **Safari players who stay away for 7 days during Phase B may already have lost progress** (ITP). Nothing on our side can fix that; starting B on launch day limits it.
- **A crafted hand-off link.** Anyone can build `/import/#...`. The schema, size caps, `textContent`-only rendering, the prompt and never overwriting without a choice keep the damage to "a Player can choose to import made-up progress", which they could do by playing.
- **Under-13 Players lose World boards they had.** Accepted (ADR 0006). The copy explains it plainly and nothing they earned on the device is lost.
- **Bot Fight Mode** could challenge older iPads or CI. It is on only after testing (task 15.7).
- **CSP line length** in `_headers`. The build fails before deploy; the fallback is moving the theme script out of line.
- **Firebase SDK vendoring** turns SDK upgrades into a manual step. Dependabot cannot see it; a quarterly check is on the security program's calendar.
- **Actions minutes** on a private repo. D12 trims runs; Pro is the fallback.

## Migration plan

Phase A (tasks 1 to 15), Phase B (16 to 17), Phase C (18 to 19), as in `tasks.md`. Rollback during Phase A is a DNS-free no-op (sbmadhav.com still serves the app). During Phase B, rollback is redeploying the old app to the old origin (the KILL worker unregisters itself either way; a new deploy registers a fresh one). Phase C is reversible by removing the custom domain, but browsers cache 301s, so it is treated as permanent.

## Owner answers (L1 to L8, all answered 2026-10-17)

Labelled L1 to L8 to match the owner's list.

- **L1. Who sees World boards**: answered 2026-10-17: the default, only Players whose Age answer is 13 or over, and only after a "Show World board" tap (because App Check makes a read reach Google). Alternative: anyone may view without posting.
- **L2. Going private**: answered 2026-10-17: GitHub Pro at $4/month. Pages from a private repo, no rename or stub repo, environments, 3,000 minutes (D12, D13).
- **L3. Blaze plan for Firestore TTL**: answered 2026-10-17: the default, yes, with a $5 budget and alerts. Without it, entries must be deleted by a scheduled job, which needs a service-account secret.
- **L4. Licence of new code**: answered 2026-10-17: the default, proprietary from the change date. Alternative: new code stays MIT and only content is reserved.
- **L5. Brand name**: answered 2026-10-17: the default, "Learn Vedic Math" for the site and the installed app ("Vedic Math" as the short name), and new icons drawn from Bolt. The owner may want a different name or art.
- **L6. "Made by Madhav"**: answered 2026-10-17: dropped everywhere. No credit line on any page; the operator is named only in the privacy policy, where the law needs it.
- **L7. PR #50 (Sanskrit verses)** is open and not in decision 6's list. Answered 2026-10-17: the default, it merges on the current site before the move if it is ready; otherwise it is rebased onto the new layout.
- **L8. Where the Studio voice files live**: answered 2026-10-17: the default, R2 on `voice.learnvedicmath.com` (D17 option a). Alternatives: Workers Paid (b), packing (c), or R2 behind the same domain through the Worker.

### Owner answers while building (2026-10-19)

- **Split**: #82 lands as five pull requests (CodeRabbit reviews at most 300 files): 1. thumbnails, 2. vendored design system, theme, fonts, icons and third-party code, 3. the inert Worker, deploy and workflow tools, 4. the Boards change, 5. the switch to learnvedicmath.com (#82, open until owner tasks 1.x).
- **The Boards change goes live early**: under-13 Players use Device boards only, the Parent step is removed, World boards are behind a tap and the retention rules are in place on sbmadhav.com ahead of the move (PR 4). Its parent note keeps the old keeping and removal lines until the move, because the 30-day deletion and privacy@learnvedicmath.com only become true with the new project and mailbox.
- **CSP reporting**: the Report-Only policy reports through `report-to` only, and `Reporting-Endpoints` is relative (`csp="/_csp"`).
- **Icons**: the icons drawn from Bolt are approved (L5).
- **Firebase SDK 13.0.0** may be vendored before the new Firebase project exists.

Not a decision, an interpretation: **GoatCounter** "self-hosted" is read as a new hosted site code with the script served from this site, not running a GoatCounter server.

## Changes made while building

Recorded by the builder (branch `learnvedicmath-build`). Each keeps the decision's intent; the owner may revert any of them.

- **Camera and microphone are allowed for this site on `/play/` only** (D4, security-headers spec). D4 turned both off on every response, but the game already uses them: Math Lens asks for the camera and Tala Lab for the microphone, each after a tap, and `camera=()` made the browser refuse without asking. `/*` no longer names them (Cloudflare would join a second value for the same feature); each page rule does: `camera=(self), microphone=(self)` on `/play/`, `camera=(), microphone=()` on every other page. Found in review (CodeRabbit on #82).
- **Policies and COOP sit on page paths only, never on `/*`** (D4). Cloudflare joins the values of every `_headers` rule that matches a path with a comma, so a policy on `/*` plus a page policy would be two policies, both enforced, and `same-origin, same-origin-allow-popups` is not a valid COOP. `/*` carries the common headers; each page path carries its own COOP, policy and Report-Only policy. The not-found page (served at any path) and non-HTML files get the common headers only. `/sw.js` needs no rule.
- **The published `/ds/2.1.0/tokens.css` drops its five `@font-face` lines** (D6). The vendored copy names the old site's `/assets/fonts/`; `theme/fonts.css` declares the fonts once from `/fonts/`. The vendored file stays byte for byte (its `SHA256SUMS` hold); only the published copy differs, and the precache hash is the published copy's.
- **`/privacy/security/` is a short public page, not `docs/legal/security-program.md`** (D2). The written program names where secrets live and the internal calendar; it stays internal. The page says how the site is protected and how to report a problem, and `security.txt`'s `Policy` points to it.
- **Grown-up pages render the `docs/legal/` drafts at build time** (`<!-- include-md: PATH -->`), without the title, the drafting note and the "For the reviewing lawyer" section, under a "Draft under review" note that stays until task 13.1 and 14.5. The headings and the last-updated line therefore always match the reviewed Markdown. The privacy draft's "sbmadhav.com/vedic-math/" became "sbmadhav.com" (no `/vedic-math/` path may be published).
- **The moved page's packer lives in `moved/handoff-pack.js`, not `js/`** (D9; written with the page in task 10.4). Everything in `js/` is published on learnvedicmath.com, where no `/vedic-math/` path may appear, and the packer must name the old scope. `build.py --target moved` publishes it at `/vedic-math/js/handoff-pack.js`.
- **Thumbnails are `thumbs/yt-<id>.webp`** (D10). Some YouTube ids start with `_` or `-`, and the build (like Jekyll before it) leaves out any path part starting with `.` or `_`.
- **`e2e/local-server.mjs` serves a build the way Cloudflare does** (`_headers`, `_redirects`, auto-trailing-slash, the 404 page; D8 said it would stay only for the moved page). It needs no install, so the suite runs against `_site` or `_dev` locally and in the hook-free loop; `wrangler dev` (checked: it accepts `run_worker_first` as a path array and applies the same headers and redirects) remains the reference. On plain http it leaves `upgrade-insecure-requests` out of the policy.
- **The report endpoint's logic is in `worker/csp-lib.js`**; `worker/csp.js` is only the entry (a Worker's entry module may export only handlers; wrangler refused the constant `MAX_BYTES`).
- **Pause motion is saved under `motion-paused` = `'1'`** and removed when off; every page's first inline script applies it with the scheme.
- **Page titles end with "· Learn Vedic Math"**, not "· Madhav" (L6: no credit line anywhere).
- **CI jobs that need the owner's accounts are inert until the owner's variables exist**: `voice-upload` needs `vars.R2_ACCOUNT_ID`, `deploy` needs `vars.CLOUDFLARE_ACCOUNT_ID` (and a successful `voice-upload` once R2 is set up), `preview.yml` and the live `e2e.yml` jobs need `vars.CLOUDFLARE_ACCOUNT_ID`. Merging early therefore deploys nothing and changes nothing on sbmadhav.com (its Pages keep the last deployed artifact). `e2e.yml` also carries the Phase B moved-page check and the Phase C 301 check, switched on by the repository variable `MOVE_PHASE` (`B` or `C`), and `moved.yml` publishes the moved page by hand.
- **`Reporting-Endpoints: csp="/_csp"` is relative, and the Report-Only policy reports through `report-to` only** (D4, security-headers spec). An absolute production URL made previews and local runs report to production (a test run in WebKit sent thousands of reports to learnvedicmath.com). `require-trusted-types-for 'script'` flags every `innerHTML` of a view; through `report-uri` each one is a request to `/_csp` (a Worker invocation), while `report-to` is batched by the Reporting API. The enforced policy keeps `report-uri` for Safari and Firefox. The e2e fixtures answer `/_csp` locally, and the `issues` fixture ignores WebKit's `[Report Only]` console lines (they block nothing).
- **Launch with Device boards only** (D14, tasks 1.8 and 8.5). The new Firebase project cannot be created before launch, and the old project's browser key and App Check key are restricted to sbmadhav.com, so `js/cloud-config.js` ships with `FIREBASE = null` and an empty `appCheckSiteKey`. The app already handles that state: no World board, no age question, no Firebase request, and the parent note and Me page say World boards are switched off; `build.py` leaves the Firebase and reCAPTCHA hosts out of the play CSP. World-board e2e specs skip until a config is served, `boards-off.spec.ts` covers the launch state, and the build test checks the hosts with a sample config. Task 8.5 restores the config.
- **R2 is optional for the first deploy** (D17, deploy-pipeline spec; approved by the owner). The deploy used to need the voice step, which is skipped until `vars.R2_ACCOUNT_ID` is set, so with Cloudflare ready and R2 not, nothing deployed. Now, while `R2_ACCOUNT_ID` is empty, the check job builds with `build.py --voice off`: the voice host is left out of the play policy (`media-src`, `connect-src`) and `THIRD_PARTIES` for that build, `sw.js` gets `VOICE_ORIGIN = null`, the published `js/voice-index.js` names no recording (so `js/voice.js` finds nothing recorded and every Listen button and read aloud use the device voice), and the build fails if any published file names the voice host. The deploy job runs with `always()` and explicit results: check and rules succeeded, and `voice-upload` succeeded, or was skipped with `R2_ACCOUNT_ID` empty; it also refuses an artifact that names the voice host when R2 is not set up. With R2 set up nothing changes: a failed or skipped upload deploys nothing. Recorded voice turns on by setting up R2 (owner guide section 8b): the next push to `main` uploads the voice files and deploys a build that names them.
- **`E2E_VOICE_ORIGIN`**: until the voice host is live, the e2e fixtures can answer `voice.learnvedicmath.com` from another copy of the same files (for example the old site's `/vedic-math/voice/`).
- **Redirect first, the rest of Phase B later** (owner R1, 2026-10-20). The old address hands each Player's progress over today, before the export page (16.2), the all-Players backup code (10.3) and the frozen Firebase rules (16.3). What shipped: `moved/index.html` and `moved/handoff-pack.js` (task 10.4), `js/handoff-schema.js` and `js/handoff.js` with `site/import/index.html` (tasks 10.1 and 10.2 without the export popup). Differences from D9, each recorded in the progress-handoff spec:
  - The prompt reads "Bring your progress from the old site?" and, with progress here, offers "Keep this device's", "Use the old site's" and "Keep both" (the owner asked for keeping both where it is safe: whole Players side by side, never one Player merged into another).
  - Play-experience records (`vm.play.<id>.<key>`) move too, checked as plain data (no markup characters, bounded depth and size). Over 32 KB the packer drops optional parts, the biggest first (play records, tips seen, days played, the last Sky rounds, today's quests), and the import page names them. Still over (never seen; a device would need thousands of Skills per Player): the moved page says the progress stays on the old site and links the new one; the backup code there waits for 10.3.
  - Settings moved: `theme`, `motion-paused`, `vm.text`, `vm.calm`, `vm.sound`, `vm.voice`, `vm.bg`, `vm.homeMore`, `vm.studioVoice`, `vm.sutraAmb`, `vm.sutraHum`, `vm.sutraOm`, `vm.tour`, `vm.track`, `vm.vol`. Left behind with the World board identities, the Device board and the analytics marks: `vm.voiceName`, `vm.naturalVoice`, `vm.naturalVoiceId` (this device's speech engine and its 100 MB download).
  - The moved page sends its one count straight to `sbmadhav.goatcounter.com` with `sendBeacon` (Do Not Track and GPC respected) instead of loading the main site's analytics script, and is styled by the main site's `/design-system/` (the one path outside `/vedic-math/` `build.py --target moved` allows).
  - The import writes all or nothing: every key it touches is saved first, and if a write fails (storage full) every one is put back as it was, the page says nothing changed, and the fragment returns to the address bar (after the error count is sent) so a reload tries again (CodeRabbit on #99).
  - The import page's first inline script takes the fragment out of the address bar; the page is `data-analytics="events-only"` and has `<meta name="referrer" content="no-referrer">`.
