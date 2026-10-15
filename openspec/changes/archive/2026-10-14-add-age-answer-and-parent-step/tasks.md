# Tasks

## 1. Rules: signed-out reads

- [x] 1.1 In `cloud/firestore.rules`, allow `list` on `boards/{board}/scores` without `request.auth` (keep `validBoard()` and `limit <= 20`). Keep `get` and all writes as they are. Verify: rules emulator tests in `cloud/test/` pass a signed-out top-20 query and refuse signed-out writes, oversized limits and invalid Board ids.
- [x] 1.2 Deploy the rules and confirm the live ruleset matches the file. Verify: a signed-out REST `runQuery` with `limit 20` on today's Arena Board returns 200.

## 2. Reading without identity

- [x] 2.1 Split `boot()` in `js/cloud.js` into `bootRead()` (app, Firestore, App Check; no Auth) and `bootWrite()` (adds Auth and anonymous sign-in). `top()` uses `bootRead()`. Verify: node test with a stubbed SDK shows `top()` never imports Auth or calls `signInAnonymously`.
- [x] 2.2 Mark "me" in Board rows without an identity: compare against the identity only if one already exists, else none. Verify: node test; the e2e leaderboard spec shows rows for a fresh device with no sign-in request (assert no request to identitytoolkit or securetoken).

## 3. Posting consent

- [x] 3.1 Add `age` and `parentOk` to the per-Player record in `js/store.js`, with setters, removed with the Player. Verify: node tests for set, read, Player switch and removal.
- [x] 3.2 Add the `canPost(player)` gate inside `cloud.submit`. Return `needs-age` or `needs-parent` with nothing loaded or sent; only a permitted call reaches `bootWrite()`. Verify: node tests for every combination (no answer, under 13 without and with the step, 13+, adult), checking no SDK import on refusal.
- [x] 3.3 Route the weekly XP post through the same gate. Verify: node test that XP earned by an under-13 Player without the Parent step sends nothing; the e2e privacy spec asserts no write-shaped request.

## 4. Age question and Parent step UI

- [x] 4.1 Age question sheet after a Ranked round when `submit` returns `needs-age`: neutral wording for each Mode through `fx.t()`, dismissible, re-offered at the next would-be post. Verify: Playwright spec in `e2e/` covering answer, dismiss and re-offer in all three Modes, plus axe with no serious issues.
- [x] 4.2 Parent step on the Me page: adult check, then a per-Player "Allow World boards" switch that can be turned off. Verify: Playwright spec in which an under-13 Pro Player posts nothing, then after the step posts (write intercepted, never sent live), then after withdrawal posts nothing again.
- [x] 4.3 After a refused post, show where the Score went ("Saved on this device") and, for under-13s, how a grown-up turns on World boards. Verify: Playwright assertions on the toast text in each Mode.

## 5. Parent note and docs

- [x] 5.1 Rewrite `parentNote()` in `js/app.js` to meet the parent-note spec for all three Modes, including the under-13-without-Parent-step variant. Verify: the e2e privacy spec checks every required statement and that each kind of post the app makes is named.
- [x] 5.2 Update the Privacy section of `cloud/README.md`, and the rules description in it, to match. Verify: a reviewer reads both side by side with `parentNote()`.
- [x] 5.3 Update GLOSSARY.md only if a term changed during implementation. Verify: `git diff GLOSSARY.md` is empty or reviewed.

## 6. Release check

- [ ] 6.1 Full unit, rules emulator and e2e runs pass locally against a built `_site`, then live after deploy. Verify: CI and the post-deploy E2E workflow are green, and a manual check on a phone shows the age sheet after an Arena round on a fresh browser.
  - Status at archive (2026-10-14): unit 64/64, rules emulator 28/28 and local e2e (chromium 115, mobile 62, webkit 53 passed) green against a built `_site`; CI and the post-deploy E2E (live site) run for 0295106 green, including the live World board read with no sign-in. Still open: the manual check on a real phone (the Playwright Pixel 7 project shows the age sheet after an Arena round).

## Workflow follow-up

- Archive this change with `/opsx:archive` after release, so the three capabilities move into `openspec/specs/`.
- One World board entry per Player on shared devices is proposed separately as `separate-identity-per-player`.
