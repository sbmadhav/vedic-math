# Tasks

Approved for building once merged (proposal.md). Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`), with the Firebase fake only: never production Firestore, never a live Score.

## 1. Logic (`js/arena.js`)

- [ ] 1.1 `challengeText({ league, day, score, right, wrong, bestCombo, mode })`: the three lines of design D4 plus the link from `challengeUrl()`, in GLOSSARY words, no emoji, no em dash, no Nickname. Verify: `test/arena.test.mjs` checks the exact text for each Mode, and that no output contains an emoji code point, an em dash (U+2014), a Nickname from the word lists, or a Sutra or Trick name from `js/vedic.js` and `js/sutras.js`.
- [ ] 1.2 `parseChallenge(parts, today, league)`: date (a real `YYYY-MM-DD`), League (`explorer`, `challenger`, `pro`), Score (whole number 0 to 9999, else null); returns `{ day, league, score, ranked }` with `ranked` true only for today and the same League, or null when the date or League does not parse. Verify: unit tests for each branch of design D2 and D3, and that `dailySet(parsed.league, parsed.day)` equals the sharer's set.

## 2. The result and the lobby (`js/app.js`, `math.css`)

- [ ] 2.1 The Challenge a friend button on the daily result only ("Send to family" in Explorer), importing `share()` from `js/play/kit.js` on the first tap (design D8) and calling `metrics.shareClick('result')`. Verify: new `e2e/tests/cov/arena-8.spec.ts` (Sharing a daily result with a stubbed `navigator.share`; No share sheet with the clipboard; Practice has no button; Explorer); `e2e/tests/arena.spec.ts` result screen.
- [ ] 2.2 The route `#/arena/day/<date>/<league>/<score>` before the play experience pattern (design D9), and the lobby line for D2's two cases (Ranked friend's round; Practice friend's round beside today's challenge), Calm included, no autoplay. Verify: new `e2e/tests/cov/arena-9.spec.ts` (Same day, same League: the question list equals the sharer's; Another League; Another day posts nothing, checked on the Firebase fake), `arena-10.spec.ts` (No Mode yet, A broken link, No autoplay).
- [ ] 2.3 The Practice friend's round: `runArena` with the friend's set and no posting, its Score kept on the device. Verify: `arena-9.spec.ts` checks no write reaches the Firebase fake; `test/arena.test.mjs`.
- [ ] 2.4 Under-13: the button for every Player, nothing loads Firebase. Verify: new `e2e/tests/cov/arena-11.spec.ts` (Under-13 Player: no request to a Google host while sharing and while playing a challenge link, Device board only).
- [ ] 2.5 Styles for the button row and the lobby line in `math.css`, tokens only, Daybreak and Deep Space, 320 px wide without overflow. Verify: `a11y.spec.ts` on the result and the lobby with a challenge link; screenshots at 375 and 1280 px in both schemes, checked by eye.

## 3. Analytics (`js/metrics.js`)

- [ ] 3.1 The route view `math/view/arena/day` (no date, League or Score). Verify: new `e2e/tests/cov/analytics-15-challenge-link.spec.ts` (The button, Opening a link: no request contains the fragment or the Score); `test/metrics.test.mjs`.

## 4. Words and docs

- [ ] 4.1 `GLOSSARY.md`: a **Challenge link** entry (an Arena daily challenge link carrying the date, League and Score to beat; Ranked only on that date in that League, otherwise Practice), and "Ranked round" reworded to match. Verify: copy test, no em dash.
- [ ] 4.2 `docs/PLAN.md` Gate C: the share rate now has a surface. `parentNote()`, `cloud/README.md` and the privacy policy: nothing new is sent, so no change; say so in the PR.
- [ ] 4.3 First-load: `python3 build.py`; if the total moves, a `firstLoad.changes` entry in `docs/perf/baseline.json` with the reason.

## 5. Owner

- [ ] 5.1 **[OWNER]** Add to the lawyer's questions (learnvedicmath task 13.1): "Is offering the device's share sheet to a Player whose Age answer is under 13 fine, given the site sends nothing and the text holds nothing personal?" Does not block building (design D6).
- [ ] 5.2 **[OWNER]** After release, try the button on your phone in WhatsApp and iMessage (one share each), and open the link on a second device. Say if the text reads well.

## 6. Checks and follow-ups

- [ ] 6.1 `openspec validate arena-challenge-link --strict`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py`; the touched specs plus `a11y.spec.ts` on chromium, webkit and mobile with `--retries=0`.
- [ ] 6.2 Follow-up, not in this change: Daily Number's share grid (`daily-core.js` `shareText()`) uses emoji with no words; propose a words-first version as its own change.
- [ ] 6.3 After release: archive this change with its coverage specs.
