# Tasks

Tasks marked **[OWNER]** can only be done by the owner (accounts, payments, DNS, legal, anything needing a login or a hardware key). Click paths for them are in `docs/owner-setup-learnvedicmath.md`; the matching wizard is `docs/tools/setup-learnvedicmath.sh`. Every other task is for a builder. "Verify:" says how a task is checked. Security checklist items from `_handoff/learnvedicmath-research.md` §6 are tagged **(sec P0/P1/P2)**.

## 0. Before building (ordering)

- [ ] 0.1 Merge, on the current site, better-voice Part B (PR #55, about 23,700 voice files: see design D17) with explanation audio, PR #47 (Play) and PR #49 (sutra pronunciation), and confirm the live E2E run after each (owner decision 6). Decide PR #50 (Sanskrit verses): merge before the move, or rebase it after (design open question 7).
- [ ] 0.2 Archive `content-security-policy` and `site-header` (this change modifies their specs), and any other change whose release check is done. Verify: `openspec list` shows neither, and `openspec validate learnvedicmath --strict` reports no "Archive would refuse" notice.
- [x] 0.3 **[OWNER]** Answer the open questions L1 to L8 in `design.md` (World board viewing, going private route, Blaze plan, licence of new code, brand name and icons, credit link, PR #50, where the Studio voice files live). Defaults are written into this change; a different answer is folded in with `/opsx:update`.
  - Done 2026-10-17: L2 GitHub Pro, L6 no credit line, the rest as the defaults in design.md.
- [ ] 0.4 Rebase this change onto `main` after 0.1 and update file paths in `design.md` D2 for anything the merged work added under `/vedic-math/`.

## 1. Owner setup, Phase A (can start now, in parallel with 0)

- [ ] 1.1 **[OWNER]** (sec P0) Passkey or hardware-key 2FA on Squarespace, GitHub, the Google account that will own Firebase, and the new Cloudflare account; registrar lock and auto-renew on at Squarespace. Steps 1 and 2 of the owner guide.
- [ ] 1.2 **[OWNER]** Create the Cloudflare account, add `learnvedicmath.com` (Free plan), delete the imported Squarespace parking records, then change the nameservers at Squarespace to Cloudflare's two. Verify: Cloudflare shows the zone Active; `dig NS learnvedicmath.com +short` lists Cloudflare.
- [ ] 1.3 **[OWNER]** Read the Cloudflare self-serve subscription agreement for commercial use, and note the answer in `docs/owner-setup-learnvedicmath.md`.
- [ ] 1.4 **[OWNER]** (sec P1) DNSSEC: enable in Cloudflare, add the DS record at Squarespace. Verify: `dig +dnssec learnvedicmath.com` has the `ad` flag through a validating resolver, and DNSViz shows a secure chain.
- [ ] 1.5 **[OWNER]** Email Routing for `privacy@`, `hello@` and `security@` to the owner's Gmail; then DMARC `p=reject` (sec P1). Verify: a test mail to each arrives; `dig TXT _dmarc.learnvedicmath.com` shows `p=reject`.
- [ ] 1.6 **[OWNER]** (sec P1) CAA records (`letsencrypt.org`, `pki.goog`, plus whatever Cloudflare adds; `iodef` to `security@`). Verify: the Cloudflare edge certificate is still active after a day.
- [ ] 1.7 **[OWNER]** Create the `production` (branch `main` only) and `preview` environments first, then two Cloudflare API tokens for CI (permissions in the owner guide §8, this account and zone only, 1 year): the production one with `gh secret set CLOUDFLARE_API_TOKEN --env production`, the preview one with `gh secret set CLOUDFLARE_PREVIEW_TOKEN --env preview`; the account id with `gh variable set CLOUDFLARE_ACCOUNT_ID`. Never pasted into chat, never stored at repository scope while environments exist. Verify: `gh secret list --env production` and `--env preview` show one name each, and `gh secret list` shows neither.
- [ ] 1.8 **[OWNER]** New Firebase/GCP project (D14): Blaze plan with a $5 budget and alerts (if open question 3 is yes), then run `bash cloud/setup.sh <project-id>` after task 8.4 lands, and the App Check and API key steps of the owner guide.
  - Not needed for launch: the site launches with Device boards only (see 8.5). World boards turn on when this and 8.5 are done, in a later PR.
- [ ] 1.9 **[OWNER]** New GoatCounter site code `learnvedicmath` (same login as `sbmadhav`), settings: no IP collection, ignore the owner's own visits.
- [ ] 1.10 **[OWNER]** (sec P0) Verify `learnvedicmath.com` in GitHub account Settings > Pages > Verified domains (TXT host `_github-pages-challenge-sbmadhav`, host part only). Verify: GitHub shows it Verified.
- [ ] 1.11 **[OWNER]** Search Console: add the domain property (TXT), and mark the site as directed to children where Google's tools ask (YouTube embeds, decision 10).
- [ ] 1.12 **[OWNER]** Cloudflare Web Analytics: add the site with the manual snippet (not automatic injection) and give the site token to the builder (it is public).
- [ ] 1.13 **[OWNER]** (sec P2) Uptime monitor (UptimeRobot or Better Stack free) on `https://learnvedicmath.com/`, `/play/` and `/sw.js`, alerting the owner's email; Cloudflare notifications for certificate and DNS changes.

## Phase A: build and launch

## 2. Layout and build

- [x] 2.1 Move `index.html` to `play/index.html`; module, style, font and icon paths drop the `/vedic-math/` prefix (`/js/`, `/css/`, `/math.css`); `BASE`, the import check and every `/vedic-math/` string in `build.py` follow D2. Verify: `test/build.test.mjs` builds `_site` and finds `play/index.html`, `index.html`, `js/app.js`, and no `/vedic-math/` outside `_redirects`.
- [ ] 2.2 `build.py`: `--dev` (no stamps, `'dev'` worker), `--preview` (adds `X-Robots-Tag`), `--target moved` (D8, old origin). Verify: build tests for each target; `--target moved` output has `index.html`, `404.html`, a KILL `sw.js` with a hashed `VERSION`, and only `/vedic-math/` paths.
  - Built 2026-10-19: `--dev`, `--preview` and `--target moved` (build tests for the first two); the moved output needs `moved/` from task 10.4, so this is checked with 10.4.
- [x] 2.3 `build.py` writes `_redirects` (`/vedic-math/* /play/ 301`, `/vedic-math /play/ 301`), `robots.txt`, `sitemap.xml`, `404.html`, and fails on the host limits (hosting spec). Verify: build tests, including an oversized-file case.
- [x] 2.4 `build.py` fails on any `sbmadhav.com` reference in a published file except the export-page URL, any `https://` module import, and any third-party host not in `THIRD_PARTIES` (D10). Verify: build tests with one failing case each.
- [x] 2.5 `wrangler.jsonc` as in D1, wrangler pinned in a new `deploy/package.json`; `_config.yml` `exclude:` gains `wrangler.jsonc`, `worker/`, `deploy/`, `vendor/**/SHA256SUMS`, `tools/`, `site/` sources (the build renders them). Verify: `npx wrangler deploy --dry-run` from `deploy/` succeeds; CI's repo-only check lists the new paths.
  - Dry run passes locally with wrangler 4.151.2 (also in CI). `run_worker_first` accepts the path array; `wrangler dev` applies `_headers`, `_redirects` and auto-trailing-slash (`/play` answers 307 to `/play/`).
- [x] 2.6 Update `CLAUDE.md` (paths, no Explore rule, `/js/analytics.js`, Cloudflare deploy, `wrangler dev`, the moved target, the new cache prefix), `README.md` and `CONTRIBUTING.md`.

## 3. Vendored assets and theme

- [x] 3.1 Vendor design-system v2.1.0 into `vendor/design-system/2.1.0/` with `SHA256SUMS`; the build publishes it at `/ds/2.1.0/`. Verify: a node test checks the sums; editing a file fails it.
- [x] 3.2 `theme/learnvedicmath.css`: Harbor values plus the brand accent and five distinct category colours, both schemes, existing token names only. Verify: a node test checks every property is in the pinned `tokens.css`; an e2e test compares the five computed colours in each scheme (site-assets spec).
  - Distinct `--sky` (blue) and `--plum` (purple) with strong variants in both schemes; `test/vendor.test.mjs` and `e2e/tests/load.spec.ts`.
- [x] 3.3 `theme/header.html` from v2.1.0 without Explore, brand "Learn Vedic Math" linking to `/?home`; compose every page with the vendored `compose.py`; CI runs `compose.py --check`. Verify: `e2e/tests/header.spec.ts` updated (no Explore, order, sticky).
  - `theme/header.html` is `md-header md-header--tabs` (every nav wraps instead of hiding below 1180px, since there is no Explore menu to list hidden links); the theme button carries `data-track="math"`.
- [x] 3.4 Fonts to `fonts/` with OFL texts, one `theme/fonts.css`, preload Nunito Sans and Fredoka, remove the inline duplicate `@font-face` block, mono weights to 500 (design-audit items 2 and 3). Verify: e2e checks every font request is same-origin and no faux bold (computed weight 500 on mono).
- [x] 3.5 Remove `/assets/explore.js` and the Explore button; add the Pause motion switch on the Me page and in the music panel, applied before paint (accessibility spec). Copy in `js/guide.js` (lines about the Star map and Explore) and `js/app.js` (Me page note) changes for each Mode. Verify: `e2e/tests/cov` accessibility scenario rewritten for the Me page; `test/guide.test.mjs` has no "sbmadhav.com" or "Explore".
  - The switch is `#setMotion` on Me and `#vmMotion` in the music panel (`fx.setMotionPaused`, key `motion-paused`).
- [x] 3.6 New icons in `icons/` (192, 512, maskable 512, Apple touch, favicon SVG) from Bolt, after open question 5; `theme-color` from the theme's `--bg` in both schemes.
  - Icons drawn from Bolt on the Daybreak background (`icons/`, favicon SVG); `theme-color` is kept on the current `--bg` by the design system header script.
- [x] 3.7 `THIRD-PARTY-NOTICES.md` published at `/licenses/`; the build fails on a vendored or font file without an entry. Verify: build test.

## 4. Landing and grown-up pages

- [x] 4.1 `site/index.html`: landing page (Bolt, what it is, three Modes, Play, grown-up links), the pre-paint redirect script (D3), no game modules. Verify: `e2e/tests/landing.spec.ts`: first visit shows the page and writes no storage; a device with Players goes to `/play/`; `/?home` stays; `/#/arena` goes to `/play/#/arena`; JavaScript off shows the text.
- [ ] 4.2 `site/parents/`, `site/teachers/`, `site/privacy/`, `site/terms/` from the reviewed `docs/legal/` drafts (only after task 13.1). Verify: copy tests (no em dashes, honest framing, the contact address on parents and privacy); a test that the privacy page's last-updated date and headings match `docs/legal/privacy-policy.md`.
  - Built 2026-10-19 from the drafts, rendered at build time (`<!-- include-md: -->`), with a "Draft under review" note; copy tests and e2e pass. Left open until 13.1: then remove the note (14.5).
- [x] 4.3 Footer in the game: "For grown-ups" and "Privacy" links. No "Made by" credit on any page (owner, L6). Verify: e2e per Mode, and a build test that no published page links to `sbmadhav.com` except the export popup.
- [x] 4.4 Canonical links, Open Graph tags and image, `sitemap.xml` entries for every static page. Verify: build test.

## 5. Headers, CSP and reports

- [x] 5.1 `build.py` writes `_headers` (D4): common headers on `/*`, per-page CSP built from each page's inline script hashes and `THIRD_PARTIES`, the Report-Only stricter policy, COOP `same-origin-allow-popups` on `/import/`; no CSP `<meta>` in published pages; fails on more than 100 rules or a line over 2,000 characters. Verify: `test/build.test.mjs` (policy per page, hashes match, no unsafe script source, the landing policy has no Google host, `frame-ancestors 'none'`, `report-to`).
- [x] 5.2 `worker/csp.js` (D5) with node tests for what it logs and refuses (GET, oversized, wrong type). Verify: `node --test` with a fake `env` and `console`; nothing personal in the logged line.
- [x] 5.3 `.well-known/security.txt` (expires in 11 months), and the build fails under 30 days. Verify: build test with a fake date.
- [x] 5.4 `e2e/tests/csp.spec.ts` against `wrangler dev` and production: every main route, a playing video, a World board for a 15-year-old Player, the voice worker, no violation; the negative control still fires. `e2e/tests/headers.spec.ts`: every header and value on `/`, `/play/`, `/import/`, `/parents/`, a JS file and the 404.
  - Specs written (`csp.spec.ts` reads the header now; `headers.spec.ts`); green against a local `_site` served with its `_headers` on chromium, webkit and mobile. The production run is task 14.1.
  - Done 2026-10-23: `csp.spec.ts` walks the spec's whole route list (Home, Learn, a Grade, a Skill, the Dojo, the Arena, Games, a game, the Sutras, Watch, Me and a Star round), opens a video on its facade and presses play before the frame is checked, starts the voice worker, keeps the negative control, and skips the World board test through the fixtures' `needsWorldBoards` while `js/cloud-config.js` has `FIREBASE = null` (`boards-off.spec.ts` covers that state). Green with `headers.spec.ts` on chromium, webkit and mobile against `_site` served by `e2e/local-server.mjs` on port 8690. The `wrangler dev` and production runs stay with task 14.1 (the World board case runs once 8.5 serves a config).
- [ ] 5.5 **[OWNER]** (sec P1) Cloudflare zone settings: Always Use HTTPS on, minimum TLS 1.2, the `www` Single Redirect rule, and a rate-limiting rule on `/_csp` and `/import/` (owner guide step 11). Workers have no separate origin, so there is no SSL mode to choose.

## 6. Service worker and manifest

- [x] 6.1 `sw.js`: cache prefix `lvm-`, scope `/play/`, every precache entry hashed, the shared-file branch removed (D7); `js/app.js` registers `/sw.js` with scope `/play/`. Verify: `test/build.test.mjs` (every entry has a hash); `e2e/tests/offline.spec.ts` against `wrangler dev` on `_site` (chromium and mobile only, as today).
  - Verified against `_site` served by `e2e/local-server.mjs` (chromium and mobile), which applies `_headers` like `wrangler dev`.
- [x] 6.2 `manifest.webmanifest` as in D7. Verify: e2e reads the manifest; Chromium's installability check passes on `/play/`.

## 7. Third parties (decision 10)

- [x] 7.1 `tools/fetch-thumbs.mjs` and `thumbs/<id>.webp` for every `js/videos.js` entry; `thumbSrc()` returns `/thumbs/<id>.webp`. Verify: `test/videos.test.mjs` fails on a missing thumbnail; `e2e/tests/watch.spec.ts` sees no `i.ytimg.com` request.
- [x] 7.2 YouTube facade: no iframe until play is pressed (watch-shelf spec), in the Watch shelf, a Skill's Watch section and the Star round's video. Verify: e2e counts frames and YouTube requests before and after the tap.
  - Done 2026-10-23: `js/watch.js` `facade()` is this site's thumbnail behind a play button (`.vp-play`); `js/app.js` `openPlayer()` opens every player (shelf cards, a Skill's Watch it explained buttons, Find hits, the Sutra deep dive, the Star round's offer) on it, and `playVideo()` writes the `youtube-nocookie.com` frame, counts the view (`watched`, `math/watch/<kind>`) and starts the Video learner minute only on the press; `js/star.js`'s inline fallback shows the same facade and writes its frame on the press. `e2e/tests/watch.spec.ts` (the shelf and a Skill's Watch section) and `star.spec.ts` count frames and YouTube or Google requests before and after the tap (one frame and none, then two frames and `www.youtube-nocookie.com` only); `csp.spec.ts`, `progress.spec.ts`, `find.spec.ts` and the coverage specs press play where they need the frame. The first-load baseline grew by 689 bytes Brotli for that code (`docs/perf/baseline.json`, its change log).
- [ ] 7.3 `tools/vendor-firebase.mjs` and `vendor/firebase/<v>/` (current major, imports rewritten, Apache-2.0 licence); `js/cloud.js` loads from there; the build fails if a vendored file names `gstatic.com/firebasejs`. Verify: `test/cloud.test.mjs` loader paths; `e2e/tests/fixtures.ts` `FIREBASE_SDK` matches `/vendor/firebase/`; `leaderboard.live.spec.ts` passes against production with the real vendored SDK (reads only).
  - Done 2026-10-19: Firebase 13.0.0 vendored, `cloud.js` loads `/vendor/firebase/13.0.0/`, fixtures and loader tests follow. Open until 8.5: `leaderboard.live.spec.ts` against production needs the new project (owner 1.8).
- [ ] 7.5 Re-record for PR #44's new Worked examples (better-voice's `tools/voice/lines.mjs`, `record.mjs`, `publish.mjs`), then commit `js/voice-index.js` and `tools/voice/manifest.json`. **[OWNER]** runs `record.mjs` with their own gcloud sign-in (no key is created). Verify: `test/voice-coverage.test.mjs` passes with every explanation and Worked example line recorded; the character ledger stays under the free million for the month.
- [ ] 7.6 Move recording to the new GCP project (Text-to-Speech API on, the same spend guards) before task 19.2 deletes `sbmadhav-vedic-math`; `tools/voice/record.mjs` and the README name the new project. **[OWNER]** enables the API and confirms the budget.
- [ ] 7.7 Studio voice hosting per design D17 and decision L8 (default (a1), R2 on `voice.learnvedicmath.com`): `tools/voice/r2-upload.mjs` (hash check against the manifest, upload only missing objects, `Cache-Control: public, max-age=31536000, immutable`, never delete), a `voice-upload` job in `ci.yml` that runs on every push to `main`, uploads missing objects and then checks that every object the committed index and manifest name exists in the bucket, with `deploy` set to `needs: [check, voice-upload]` so a failed or skipped upload stops the deploy (deploy-pipeline spec), `js/voice-index.js` gains the base URL, `voice.js` fetches from it, the worker's voice cache is renamed `lvm-voice` and kept by the clean-up, the play CSP adds the voice host to `media-src` and `connect-src`, and `build.py` fails if any voice file is in `_site`. Verify: `test/voice-tools.test.mjs` (wrong hash refused, existing object skipped, nothing deleted); `e2e/tests/voice.spec.ts` against `wrangler dev` with the base URL pointed at a local fake; `offline.spec.ts` plays a heard line offline; `test/build.test.mjs` file count under 20,000; a workflow test that `deploy` needs `voice-upload`. If L8 is (b), this task becomes: keep `ci-fetch.mjs` unpacking into `_site/voice/` (with `--voice static`, below), the file limit check uses 100,000, and the owner moves to Workers Paid before the first deploy with voice.
  - Built 2026-10-19: `tools/voice/r2-upload.mjs` (archive SHA-256 and hashed names checked, only missing objects uploaded with `If-None-Match: *` and the immutable `Cache-Control`, never a delete, then every file checked in the bucket; a minimal SigV4 client checked against AWS's own example), `test/voice-r2.test.mjs`, the `voice-upload` job and `deploy` needing it in `ci.yml`, `js/voice-index.js` names `https://voice.learnvedicmath.com/`, the worker caches CORS responses from that host in `lvm-voice`, the play CSP lists it in `media-src` and `connect-src`, and the build fails on a `voice/` folder in `_site`. Open until the owner's R2 setup (7.8): the first real upload and the e2e run against the live voice host.
- [ ] 7.8 **[OWNER]** (only for L8 (a1)) R2: enable R2 (asks for a payment method even on the free tier), create bucket `learnvedicmath-voice` (Standard), Settings > Custom Domains > `voice.learnvedicmath.com`, CORS rule (GET from `https://learnvedicmath.com`), a Cache Rule for that host (Eligible for cache; Edge TTL from the objects' `Cache-Control`; status-code TTL 1 year for 200 and 206, no store for 404 and errors), a Transform Rule for the response headers in D17, and an R2 API token with Object Read & Write on that bucket only, saved with `gh secret set R2_ACCESS_KEY_ID --env production` and `gh secret set R2_SECRET_ACCESS_KEY --env production`, account id as `gh variable set R2_ACCOUNT_ID`. Owner guide §8b.
- [x] 7.4 `e2e/tests/third-party.spec.ts`: the full first visit of the third-party spec makes no Google or YouTube request; every request goes to a host in `THIRD_PARTIES`.
  - Done 2026-10-23: the spec reads `THIRD_PARTIES` from `build.py` in the checkout (a constant name resolved to its value) and walks the scenario as a first-time visitor (the landing, `/play/`, a Mode picked, a Star lit, the Watch shelf and a video's player before play): no request to a `google.com`, `gstatic.com`, `googleapis.com`, `googlevideo.com`, `ytimg.com`, `youtube.com` or `youtube-nocookie.com` host, and none outside this origin and the list. Green on chromium, webkit and mobile against `_site` on port 8690; against production the analytics hosts are on the list, and a Firebase host would fail it.

## 8. Boards (decisions 9 and 10)

- [x] 8.1 `js/cloud.js` `canPost()`: `'device-only'` for an Age answer under 13; `parentOk` ignored; nothing loaded for those Players. Verify: `test/cloud.test.mjs` (under 13 in every Mode never loads the SDK; 13 and adult post).
- [x] 8.2 `js/app.js`: remove the Parent step dialog, its switch and its `parent-step/*` events; under-13 Me page sentence per Mode; World boards only for 13 and over behind a "Show World board" tap; no weekly Sparks queue for under-13 Players. Verify: `e2e/tests/consent.spec.ts` and `privacy.spec.ts` rewritten; cov scenarios for posting-consent and board-identity regenerated.
  - World boards appear only for an Age answer of 13 or over, behind Show World board; under 13 and no Age answer see the Device board only. `consent.spec.ts`, `privacy.spec.ts` and the posting-consent, board-identity and parent-note coverage specs rewritten (posting-consent-3 now covers "Players under 13 use Device boards only").
- [x] 8.3a `cloud.top()` drops entries whose `exp` has passed before showing a Board (TTL is asynchronous). Verify: `test/cloud.test.mjs` with a fake row whose `exp` is in the past.
- [x] 8.3 `cloud/firestore.rules`: `exp` 29 to 31 days ahead; list only while `request.time < boardStart() + 28 days` (D14). Verify: `cloud/test/rules.test.js` new cases (`exp` 45 days and 2 days ahead refused, 30 accepted; a Board 28 days and 1 minute old refused to a signed-out list; 27 days old allowed; an entry written at the earliest open time of a daily or weekly Board still unexpired at the last listable moment), all old cases still pass.
  - Rules and emulator tests written (plus `firestore.rules.frozen` for task 16.3 and its test). No Java on the build machine: the CI `rules` job runs them.
- [x] 8.4 `cloud/setup.sh` takes the project id and domains as arguments and turns on the TTL policy; `cloud/README.md` rewritten for the new project, domains, TTL, App Check enforcement and the device-only rule. Verify: `bash -n cloud/setup.sh`; a dry-run flag prints the commands without running them.
  - `bash cloud/setup.sh [--dry-run] <project-id> [domain ...]`; `test/setup-sh.test.mjs` runs the dry run.
- [ ] 8.5 `js/cloud-config.js` with the new project's web config and App Check key (after 1.8). Verify: build's CSP lists the new `authDomain`; `leaderboard.live.spec.ts` reads a Board of the new project.
  - Launch without Firebase (2026-10-20): the owner wants the site live before 1.8 can be done, so `js/cloud-config.js` ships with `FIREBASE = null` and `appCheckSiteKey = ''` (the old project's key and App Check key only allow sbmadhav.com). `cloud.enabled()` is false: every Player sees the Device board, the age question is never asked, nothing loads Firebase, and the CSP lists no Google host. World-board e2e specs skip while the served config is null (`needsWorldBoards` in `fixtures.ts`) and `e2e/tests/boards-off.spec.ts` checks the device-only state instead; `test/build.test.mjs` builds with a sample config to keep the Firebase CSP covered. This task then also removes the "Launch state" comment in `js/cloud-config.js`, and the boards-off specs skip by themselves once a config is served.
- [x] 8.6 `parentNote()` in `js/app.js` (parent-note spec: under 13 never posts, 30-day deletion, `privacy@learnvedicmath.com`, videos sentence, links to `/privacy/` and `/parents/`), replacing the LinkedIn removal link. Verify: `test/copy.test.mjs` checks each sentence per Mode; the parent-note cov scenarios.
- [ ] 8.7 **[OWNER]** (sec P0) Firebase: enforce App Check for Firestore once 8.5 is live and the App Check metrics show verified requests; confirm the API key's referrers and API list; budget alert. Owner guide step 9.

## 9. Analytics (decision 12)

- [ ] 9.1 `js/analytics.js` replaces `/assets/analytics.js` (same behaviour, site code `learnvedicmath`, idle load, Do Not Track and GPC off, queue); `vendor/goatcounter/count.js` pinned with its licence. `js/metrics.js` comments and the theme event name (`math/theme/<scheme>`). Verify: `e2e/tests/analytics.spec.ts` and `analytics-gpc.spec.ts` against the new endpoint (still answered locally in tests).
  - Done 2026-10-19 (`js/analytics.js`, `vendor/goatcounter/count.js`, events specs stub `/js/analytics.js`). Open only for the GoatCounter site code (owner 1.9); the code `learnvedicmath` is already in place.
- [ ] 9.2 Hand-off events (analytics spec). Verify: e2e on `/import/` sees exactly one event after the fragment is gone.
- [ ] 9.3 Cloudflare Web Analytics manual snippet, loaded by `js/analytics.js` under the same off switch; try serving `beacon.min.js` from this site in Report-Only first; add the chosen hosts to `THIRD_PARTIES`. Verify: e2e sees no beacon with GPC on; production dashboard shows page loads.

## 10. Hand-off, new side (decisions 3 and 8)

- [x] 10.1 `js/handoff-schema.js`: the allow-list, the excluded list, the caps and the validator; `js/handoff.js` for `/import/` (fragment first, decompress with a cap, validate, prompt, replace or keep, `vm.migratedAt`, route). Verify: `test/handoff.test.mjs` with valid, oversized, unknown-key, wrong-type, script-in-Nickname, bad version, too many entries and old single-Player cases; a test that every `vm.*` key in `js/` is in one of the two lists.
  - Done 2026-10-20 (owner R1, redirect first): `test/handoff.test.mjs` covers these, plus decompression bombs, malformed base64 and gzip, `__proto__` keys, hostile routes, play records with markup, Keep both and Use the old site's. The import page is `site/import/index.html`; its export-popup button is in 10.2 (deferred).
- [ ] 10.2 `site/import/index.html` with the export popup button (`postMessage` to and from `https://sbmadhav.com` only). Verify: `e2e/tests/import.spec.ts` (first hand-off, existing progress kept, existing progress replaced, invalid link, fragment gone before any request, popup flow against a local fake export page).
  - Part done 2026-10-20: the page and `e2e/tests/import.spec.ts` (first hand-off, Not now, existing progress kept, replaced, kept both, invalid and crafted links, no fragment, dropped parts named, fragment gone before any request, axe). Deferred: the "Bring my progress from sbmadhav.com" popup and its spec, until the export page exists (16.2).
- [ ] 10.3 `js/store.js`: all-Players backup code and a strict `importData` through the validator and prompt (Me page). Verify: `test/store.test.mjs`; `e2e/tests/progress.spec.ts` restore cases.
  - Deferred (not needed to redirect). Until it lands, a device whose progress is too big for a link keeps it on the old site, and the moved page says so instead of showing a code.
- [x] 10.4 `js/handoff-pack.js` and the moved page source `moved/index.html` (D9), built by `--target moved`. Verify: `e2e/tests/moved.spec.ts` against `node e2e/local-server.mjs 8124 _moved`: workers unregistered, only `vedic-math-*` caches deleted (a `madhav-test` cache survives), payload under the cap redirects, over the cap shows the code, empty device goes to `/play/`, a device with only a bare `mathquest.v1` record is packed as `p1` and not treated as empty, noscript refresh present.
  - Done 2026-10-20: the packer is `moved/handoff-pack.js` (published at `/vedic-math/js/handoff-pack.js`). `e2e/tests/moved.spec.ts` (runs when `MOVED_URL` is set) covers the list above plus deep paths through `404.html`, the one count, and no request outside the packer and schema; `test/build.test.mjs` covers the `--target moved` output.

## 11. CI/CD

- [ ] 11.1 `ci.yml`: new stamp checks (`/js/app.js` pinned, `/play/` shell precached, `_headers` present and within limits), `compose.py --check`, then the `main`-only `deploy` job (`needs: [check, voice-upload]`, task 7.7) with `wrangler deploy` from `deploy/` using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; the GitHub Pages deploy job removed. Verify: a push to a test branch runs checks only; `main` deploys.
  - Written 2026-10-19 (`ci.yml`: checks, wrangler dry run, `voice-upload`, `deploy`; the Pages deploy is gone and `moved.yml` publishes Phase B by hand). The deploy runs once `vars.CLOUDFLARE_ACCOUNT_ID` exists (owner 1.7), so the Verify (a push to main deploys) waits on the owner. R2 (7.8) is optional for it since 2026-10-20: with `vars.R2_ACCOUNT_ID` empty the site is built with `build.py --voice off` and deployed with the device voice (design, "Changes made while building").
- [ ] 11.2 `preview.yml`: same-repo pull requests build with `--preview`, upload with `--preview-alias pr-<n>`, comment the URL, run e2e chromium against it. Verify: a test PR gets a comment and a green run; a fork PR gets neither secret nor deploy.
  - Written 2026-10-19 (`preview.yml`); runs once the owner has saved `CLOUDFLARE_PREVIEW_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (1.7).
- [ ] 11.3 `e2e.yml`: base URL `https://learnvedicmath.com`; the deploy wait checks `/play/`, `/sw.js`, `/js/app.js`; daily and manual runs; comments about 429 rewritten (D12). `playwright.config.ts` and `fixtures.ts` follow (`APP = '/play/'` helper; the 208 `/vedic-math` references in 73 test files move to it). Verify: the suite passes against `wrangler dev` and against a preview.
  - Written 2026-10-19: `e2e.yml`, `playwright.config.ts`, `fixtures.ts` (`APP = '/play/'`) and every spec moved to the root paths; the suite passes against a local `_site` (all three projects). The preview run waits on 11.2.
- [x] 11.4 `.github/dependabot.yml` (github-actions, npm in `/e2e`, `/cloud/test`, `/deploy`; weekly, grouped). (sec P1)
- [ ] 11.5 **[OWNER]** (sec P1) Turn on CodeQL default setup, secret scanning and push protection, and Dependabot alerts in the repo's Settings > Code security, while the repo is public.
- [x] 11.6 CI check that `CLOUDFLARE_API_TOKEN` is named only by the `deploy` job (environment `production`) and `CLOUDFLARE_PREVIEW_TOKEN` only by the preview job (environment `preview`, `pull_request` event). Verify: a test workflow naming either secret elsewhere fails the check.

## 12. Docs and copy

- [ ] 12.1 `SECURITY.md`: scope `https://learnvedicmath.com/`, contact `security@learnvedicmath.com` and the advisory form (while public).
- [ ] 12.2 `GLOSSARY.md`: Hand-off, Moved page, Export page, Landing page; Parent step marked retired; World board and Device board wording for under-13 Players. (Proposed entries are added by this change's planning PR.)
- [ ] 12.3 `LICENSE-CONTENT.md`, `LICENSE` header and `CONTRIBUTING.md` (D16), after open question 4. Verify: copy tests (no em dashes).
- [ ] 12.4 `docs/PLAN.md`: hosting, Boards and analytics sections point to this change and ADRs 0004 to 0006.
- [ ] 12.5 `openspec/config.yaml` context: new domain, Cloudflare, self-hosted SDK, under-13 device-only.
- [ ] 12.6 Manual checks recorded in this file before launch: COOP on `/import/` keeps the popup link in Chromium and WebKit; YouTube plays with `strict-origin-when-cross-origin`; `auto-trailing-slash` serves `/play` and `/import`; the Report-Only policy does not break anything.

## 13. Legal and security program (decisions 13 and 14)

- [ ] 13.1 **[OWNER]** Lawyer review of `docs/legal/privacy-policy.md`, `terms.md`, `data-retention.md` and `security-program.md` (drafts in this PR) before the site is promoted, before any school outreach and before any paid plan. Also the lawyer questions listed at the end of the privacy draft.
- [ ] 13.2 **[OWNER]** Name the information security coordinator (the owner), put the annual risk assessment, the quarterly SDK and dependency check and the monthly CSP report review on the calendar (`security-program.md`).
- [ ] 13.3 **[OWNER]** Operator details for the privacy notice (name, postal address, phone, email), required by COPPA §312.4(d). A PO box or registered agent address is fine; this is a decision for the owner and the lawyer.

## 14. Pre-launch checks (Phase A gate)

- [ ] 14.1 Production deploy reachable on `learnvedicmath.com` and `www`; `e2e.yml` green against production, all three projects.
- [ ] 14.2 Header scan (securityheaders.com or `curl -sI`) shows every header; Mozilla Observatory grade recorded.
- [ ] 14.3 `leaderboard.live.spec.ts` green against the new project with App Check enforced (reads only).
- [ ] 14.4 **[OWNER]** Phone and Chromebook check: landing, Play, a Star, a video, a 15-year-old posts once by hand, an under-13 Player's Me page, offline after one visit, install.
- [ ] 14.5 **[OWNER]** Privacy policy and terms published (after 13.1; until then the pages say "draft under review" and the site is not promoted).

## 15. Hardening, first month (sec P1/P2)

- [ ] 15.1 Review the Report-Only reports after 4 weeks; propose enforcing or dropping each stricter directive in a new change.
- [ ] 15.2 **[OWNER]** HSTS preload: decide after 3 months with every subdomain on HTTPS (not before).
- [ ] 15.3 **[OWNER]** Incident plan rehearsal: rotate the Cloudflare token and the GoatCounter settings once, following `security-program.md`.
- [ ] 15.4 Monthly CSP report review (security program) for the first three months, noted in this file.
- [ ] 15.5 Firebase usage and budget alerts confirmed after the first week.
- [ ] 15.6 Registration transfer to Cloudflare Registrar: **[OWNER]** optional, after about 2026-12-16.
- [ ] 15.7 **[OWNER]** Bot Fight Mode: turn on, run the production e2e and the owner's older iPad check; turn off again if either is challenged.

## Phase B: hand-off window (starts on launch day, 3 months, then month by month)

## 16. Old origin

- [ ] 16.1 Build `_moved` and publish it at `https://sbmadhav.com/vedic-math/` (by this repo's Pages, which keep serving after the repo goes private on GitHub Pro). Verify: `e2e/tests/moved.live.spec.ts` against `https://sbmadhav.com` (payload, KILL worker installed, `madhav-*` untouched).
  - Ready 2026-10-20: `moved.yml` (confirm `MOVED`) builds and publishes it once the hand-off PR is merged and learnvedicmath.com serves `/import/`. `e2e/tests/moved.live.spec.ts` checks the live redirect, the payload and that `/vedic-math/sw.js` is the KILL worker; the `madhav-*` and worker-unregistration checks run locally in `moved.spec.ts` (Chromium). Not ticked until the owner has run `moved.yml` and the live spec passes.
- [ ] 16.2 User-site repo (`sbmadhav.github.io`) PR: home page and Explore menu link to `https://learnvedicmath.com/`; `/vm-export/` page (export spec) with its e2e; the root worker keeps `/vedic-math/` network only and adds `/vm-export/`; the copy of `handoff-schema.js` checked against this repo's. Not merged without the owner.
- [ ] 16.3 **[OWNER]** Old Firebase project: deploy write-deny rules (the builder prepares `cloud/firestore.rules.frozen`), keep reads for open tabs.
- [ ] 16.4 `e2e.yml` gains the daily moved-page check for the length of Phase B.
- [ ] 16.5 Weekly look at `math/handoff/*`, `move/handoff/*` and `move/export/*`; at month 3, apply the rule in D13 (below 5 a week for 2 weeks: go to Phase C; else extend a month). Noted in this file.

## 17. Old app retirement

- [ ] 17.1 Remove Firebase referrers, authorized domains and App Check domains for `sbmadhav.com` from the old project (moot if it is deleted in 19.2).
- [ ] 17.2 The sbmadhav.com GoatCounter keeps counting the main site only; remove `vedic-math` notes from the main site's analytics docs.

## Phase C: permanent

## 18. Redirect and going private

- [ ] 18.1 **[OWNER]** Confirm 1.10 (domain verified) before anything else in this section.
- [ ] 18.2 **[OWNER]** Subscribe to GitHub Pro, then (any time from the start of Phase B, after 16.1) make `sbmadhav/vedic-math` private and keep its Pages (D13 "Going private", owner guide). Verify: `https://sbmadhav.com/vedic-math/` still serves the moved page.
- [ ] 18.3 **[OWNER]** Settings > Pages of the repo that serves `/vedic-math/`: custom domain `learnvedicmath.com` (leave "Enforce HTTPS" off; it cannot be issued). Gate (D13): within 24 hours `curl -sI https://sbmadhav.com/vedic-math/x?y=1` and `https://sbmadhav.github.io/vedic-math/x` answer 301 to `learnvedicmath.com/x...`. If not, remove the custom domain (the moved page keeps serving) and go to 18.3a.
- [ ] 18.3a **[OWNER]** Only if 18.3's gate fails: decide on the fallback redirect (sbmadhav.com DNS to Cloudflare, proxied, plus one Single Redirect rule; D13). Until then the moved page stays and Phase C is not done.
- [x] 18.4 Not needed: on GitHub Pro the repo keeps its name, so no remotes change (owner, L2).
- [ ] 18.5 `e2e.yml`: replace the moved-page check with the daily 301 check (deploy-pipeline spec).
- [ ] 18.6 Private repo follow-ups (D12): secret back to a repository secret if no environments; Semgrep and gitleaks steps in `ci.yml`; cov weekly; `paths-ignore` for docs-only pushes; preview e2e chromium only. Verify: one week of Actions minutes stays under 450.

## 19. Close out

- [ ] 19.1 Remove the moved target code from `build.py` only after the export page has been live for 12 months (it never depends on this repo); until then keep it.
- [ ] 19.2 **[OWNER]** Delete the old Firebase project `sbmadhav-vedic-math` (entries are purged by Google after 30 days).
- [ ] 19.3 Archive this change (`/opsx:archive`), so `openspec/specs/` describes the live site.
