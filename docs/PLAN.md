# Vedic Math for Everyone: Product Plan

Updated Oct 23, 2026 · Owner: Madhav Srinivasan

Terms are defined in [GLOSSARY.md](../GLOSSARY.md); decisions are in [docs/adr/](adr/).

The move to its own site, https://learnvedicmath.com/, is the `learnvedicmath` change (`openspec/changes/learnvedicmath/`): hosting ([ADR 0004](adr/0004-host-on-cloudflare-workers.md)), the move in three phases with the Hand-off on the device ([ADR 0005](adr/0005-phased-move-and-progress-hand-off.md)), Boards for Players under 13 ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)) and analytics (its design D11). The hosting, Boards and analytics lines below point there.

This plan rebases the Oct 13 review and action plan (a six-persona age panel plus an adversarial plan review) onto what has shipped since. The diagnosis carries over; the order of work changes, because world leaderboards and adaptive games are already live.

## TL;DR

- **Big idea: "Become the human calculator."** Learn a trick in 60 seconds, then out-race your phone, your parents and your friends. Every feature serves one loop: **Dare → Reveal → Prove → Race → Brag → Return**.
- **Primary audience for the next 90 days:** ages 9 to 14 and their parent. Explorer (about 4 to 7) and Pro (13 to adult) get targeted fixes, no new tracks.
- **Next 3 weeks:** fix the 12 trust bugs, add the Age answer before anything from a Player goes online (in every Mode; under-13 Players use Device boards only, [ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)), instrument hash routes, then ship "Beat the calculator" as the Hook.
- **Gates are real-kid sessions first, metrics second.** Traffic is too low for percentage gates to be more than directional.

## Where things stand

| Area | Oct 13 review | Now |
| --- | --- | --- |
| Overall (age panel) | 5.9/10; motivation to return 4.7/10 | Unchanged until Phase 0 ships |
| World leaderboards | "Coming soon" | Live on Firebase: Arena daily and weekly, a daily and weekly board per game, weekly Sparks (formerly XP). Rules enforce the nickname word list, score caps, date bounds, query limits. App Check registered, not enforced. On learnvedicmath.com the Boards start fresh in a new Firebase project with App Check enforced and entries that expire after 30 days (change `learnvedicmath`, design D14); Players under 13 use Device boards only and the Parent step is retired ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)). The site launched with Device boards only until the project exists (tasks 1.8 and 8.5). |
| Difficulty fit | Wrong for 5 of 6 personas | Games adapt on a 1 to 20 Rating (right answers raise it, misses lower it), start by Mode (Explorer 1, Challenger 5, Pro 9), remember each Player's Rating, and score by difficulty. The Arena and Practice use Ratings too: an Arena Rating per League sets where Arena Practice rounds start and adapt, and a Rating per Skill picks each Practice question's generator level (1 to 3). Daily Arena rounds stay identical for a League on a fixed difficulty ramp. The Pro Arena is mental arithmetic only (2-digit products, squares, percents, near-base products, division), with Pro daily rounds switching over on Monday 2026-10-19 so no Board mixes question sets. |
| Repeats | Many | No repeats within a game round |
| Offline | Root service worker could mix module versions | Own repo and service worker, every module pinned with a `?v=` hash |
| Hosting | GitHub Pages at sbmadhav.com/vedic-math/, sharing the design system, fonts and analytics with the main site; no response headers | https://learnvedicmath.com/ on Cloudflare Workers static assets, deployed by CI from `main`, with real response headers and everything served from its own origin (change `learnvedicmath`, [ADR 0004](adr/0004-host-on-cloudflare-workers.md)). The old address hands progress over on the device, in three phases ([ADR 0005](adr/0005-phased-move-and-progress-hand-off.md)). |
| Trust bugs | 12 open | 12 open (verified in code, see Phase 0) |
| Analytics | Hash routes not counted | On learnvedicmath.com: GoatCounter with its own site code, `count.js` served from this site by `js/analytics.js`, plus Cloudflare Web Analytics for page loads and Core Web Vitals (change `learnvedicmath`, design D11). Events keep their `math/...` names through `window.siteTrack`; no user IDs, never Google Analytics. Route counting is still the Phase 0 item below. |
| Privacy | Plan required a parent gate before any online feature | The Age answer decides, in every Mode: a Player 13 or over posts under an anonymous identity created at the first post ([ADR 0002](adr/0002-no-identity-until-the-first-post.md)); a Player under 13 uses Device boards only and posts nothing ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)). |

**Keep and amplify:** content depth (135 skills, 21 tricks, 29 sutra deep dives, 1,050 katas, 1,000 tower challenges, 14 games with 72 levels each), the two tries, then hint, then worked reveal scaffold, the trick animator, honest history of the sutras, and privacy by design.

**Panel insight that drives everything:** every persona's best moment was seeing a trick work (75² = 7 × 8, then 25). Nobody's best moment was XP or a badge.

## Phase 0: trust, privacy and instruments (about 1.5 weeks)

All items are S (under a day). Line numbers are as of commit `97181d9`.

| # | Fix | Where | Who it hurts |
| --- | --- | --- | --- |
| 1 | Arena keypad enters every tap twice from round 2: the click listener is added to the same root on every round. | `js/arena.js:66`, `:140` | Everyone in the Arena |
| 2 | Practice symbol keys and the hint link repeat once per answered question: same cause. | `js/app.js:311` | Ages 11 and up |
| 3 | Mixed numbers like `1 3/4` are marked wrong. Normalize `a b/c` to `a+b/c` before stripping spaces. | `js/check.js` `normalize()` | Grades 3 to 5 |
| 4 | Fraction answers display as rounded decimals (1.666667). Render fractions for fraction skills. | `js/app.js` reveal | Grades 3 to 5 |
| 5 | Factoring answer key reads `(x+-1)(x+-2)`. Normalize signs and drop `1x`. | `js/skills/high.js:25` | Teens |
| 6 | Quests show 0.9999/1 on day 1 (baseline `0.0001`) and are keyed by position. Use a 0 baseline, key by id, floor the display, rotate from a pool. | `js/gamify.js:57`, `:66` | Everyone |
| 7 | Some games show the previous explanation under the new question. Hold the answered item for 1.2s. | `js/games.js` | Everyone |
| 8 | Typing `44*72` counts as an answer. Accept plain numbers only for arithmetic skills. | `js/check.js` | All stats |
| 9 | Duel deals each player a different question; Explorer Duel shows no dots. Deal the same question to both sides and render `viz`. | `js/arena.js:86` | Families |
| 10 | Badges for pressing Start or opening a page. Award on completion or correct use. | `js/app.js` | Ages 11 and up |
| 11 | Game prompts render at 15px grey. Scope the selector to `.g-shell .g-q`. | `math.css` | Ages 4 to 7 |
| 12 | Copy bugs: "Welcome back" on a first visit, "3th", the hundredths grid, a Numberblocks match on "Dis*count*s", and the footer's "traditional Vedic mathematics sutras". | `js/app.js:120`, `js/skills/middle.js`, `index.html:58` | Trust |

Also in Phase 0:

- **View cleanup contract.** Every view returns `{ destroy }` and gets an `AbortSignal` for each listener, timer and animation-frame loop. This removes the root cause of bugs 1, 2 and 7 instead of patching each one.
- **Age answer for World boards** ([ADR 0001](adr/0001-parent-step-follows-the-age-answer.md); its Parent step is superseded by [ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)). Ask one neutral age question at the end of the first Ranked round, before a Score or weekly Sparks total could be posted; until it is answered only the Device board is shown. Players under 13, in any Mode, keep everything on the device: Device boards only, no Parent step, because a toggle on the device is not verifiable parental consent under the amended COPPA Rule and a persistent identifier counts as personal information. A Player 13 or over sees a World board after a Show World board tap and gets an identity only at the first post ([ADR 0002](adr/0002-no-identity-until-the-first-post.md)). Get a legal read before any paid plan or promoting the site to schools.
- **No identity until the first post** ([ADR 0002](adr/0002-no-identity-until-the-first-post.md)). Viewing World boards reads without signing in; the anonymous ID is created only when something is actually posted.
- **Parent note says exactly what is sent.** For a Player 13 or over, Sparks from all play, Practice included, adds up to one weekly total that is posted; a Player under 13 posts nothing; Practice Scores never leave the device. Update `parentNote()` and `cloud/README.md` together.
- **Pro Arena becomes mental arithmetic.** Replace algebra and logs in the Pro Arena sets with 2 × 2 digits, squares, percents, near-base products and division. Extend Ratings to Arena and Practice.
- **Honest framing everywhere.** Footer and share text say "sutras from Bharati Krishna Tirtha's 1965 book", never "from the Vedas".
- **Analytics.** Count hash routes as page views, plus anonymous `q_answered`, `round_end`, `first_win`, `share_click` and `return_d7` events through `window.siteTrack`. No user IDs.
- **Regression net.** Node tests for `check.js` (mixed numbers, signs, plain-number rule) and seeded generators. Playwright specs in this repo's `e2e/` for 2 Arena rounds, 5 Practice questions and day-1 quests.
- **Layout shift.** `#view { min-height: 100svh }` to bring mobile CLS from 0.33 to under 0.1.

**Gate A:** no P0 bugs open, events flowing, baselines recorded.

## Hook test (runs alongside Phase 0)

Paper or Figma prototype of "Beat the calculator" with 3 to 5 kids aged 9 to 14, parent present. Run it after bugs 1 to 6 are fixed so the test measures the idea, not the bugs. Record time to the first "whoa" and unprompted replays.

**If kids shrug:** change the hook before Phase 1, not after.

## Phase 1: the magic moment (weeks 3 to 5)

The game-world direction (Star Quest) and its decisions so far are in `docs/star-quest.md`, with a playable prototype in `docs/prototypes/star-quest/`. Settle its open questions before writing Phase 1 changes; it may absorb some items below.

| Item | Effort | What it does | Tradeoff |
| --- | --- | --- | --- |
| Beat the calculator Hook | M | First screen dares "Square 85 before the calculator does". The player loses, sees a 20-second reveal, then wins 3 times. The mode question comes after. | The race must be honest (0.45s per key plus "="), using only problems humans really win |
| Placement | S | One step after the Hook: the Age answer, a grade picker and 3 quick items set the starting Rating for every game and the Belt. League stays equal to Mode. Replaces the separate "light placement" and "full adaptive placement" items, since games already adapt. | Coarse, but the Rating corrects it within a round |
| Trick page: When, Why, Prove it | S | Rename "How it works" to "When to use it". Pull the proof and scene from `DETAILS[sutra].why`. Add 3 check items before speed drills. | Keep it to 3 items so it never feels like a quiz wall |
| Mistake Museum | S | Every round ends with missed items and a link to the right trick. Replaying them clears them for Sparks. | One more screen per round |
| Game shell and Calm mode | M | Full-screen fixed layout for every timed activity, keypad always visible on phones and Chromebooks. Calm toggle (no clocks, ghost race) and A/A+ text size. | Touches every game; needs the Phase 0 tests first |
| Explorer narration | S | Explorer gets only Explorer sets and every prompt is read aloud. | Needs a content tag per skill set |

**Gate B:** 5 observed kid sessions where most players get a first win within 90 seconds and choose to play a second round. Directional metrics: `first_win` under 90s, round-2 completion.

## Phase 2: brag and return (weeks 6 to 9)

| Item | Effort | What it does | Tradeoff |
| --- | --- | --- | --- |
| Challenge-a-friend link | S to M | `#/c/<seed>/<score>/<nickname>` replays the same seeded questions. Share card via canvas and `navigator.share`. Posts to the existing boards when allowed. | Link scores can be faked; boards keep their own rules |
| Daily Sutra | S | One 10-question set per local date, first attempt counts, Wordle-style share grid. Its own daily board on the existing rules. | Same-day replays are labeled practice |
| Fair same-screen Duel | S | Builds on Phase 0 bug 9: keyboard sides (QWER and UIOP), handicap by mode for parent vs kid. | Narrow audience |
| Spaced warm-up | M | Leitner boxes per trick and fact. Mastery rings fade based on `last`. Home shows "Today: 12 items, 3 min". | Needs per-answer timing; mastery can feel lost |
| Sutra cards earned by use | S | A card unlocks after 5 correct uses of its trick. The only collection system. | Slower to collect |

**Gate C:** kids or parents share without being asked in observed sessions, and returns after 7 days trend up from the baseline.

## Phase 3: grow the boards (only after Gate C)

- Friend boards from challenge links and weekly leagues.
- Enforce App Check for Firestore and Authentication after a week of clean metrics. On learnvedicmath.com this comes with the new Firebase project (change `learnvedicmath`, design D14, owner task 1.8).
- Turn on TTL (needs the Blaze plan and a budget alert), then restore the 30-day deletion promise in `parentNote()`. Same: the new project runs on Blaze with a $5 budget, the rules never list an expired entry, and the copy says "stops being shown after 30 days and is then deleted automatically" (design D14, owner answer L3).
- A Cloud Function that replays seeds to verify scores, only if cheating is actually seen.

## Not doing in 2026

- Classroom tools: teacher dashboard, CCSS tags, CSV export.
- Other languages.
- New audience tracks: adult interview, SAT, teen swipe feed.
- Extra reward systems: sticker book, animal buddy, cosmetics, boss battles, streak freeze.
- Framework rewrite or a bundler. Revisit lazy routes (`import()` per route) only if mobile LCP stays above 4s after Phase 0.

## Measurement

The north star is **weekly magic moments**: a trick learned and then used correctly in a timed race.

| Metric | Definition | Role |
| --- | --- | --- |
| Time to first win | Share of new sessions with `first_win` under 90s, bucketed | Directional, Phase 1 |
| Round-2 completion | `round_end` with round 2 or later / `round2_start` | Directional, Phase 1 |
| Share rate | `share_click` / `round_end` | Directional, Phase 2 |
| D1 and D7 return | Any return on day 1, and on days 7 to 13, fired once per device | Directional, Phase 2 |
| Retained accuracy | Spaced-review accuracy 7 days after mastery | Learning quality |
| Speed gain | Median seconds per answer per trick, week 1 vs week 4 | Tracking only |

**Rules**

- **Real kids decide the gates.** 5 observed 30-minute sessions with 9 to 14 year olds before each gate, parent present, consent given, no face recording. These outrank the AI panel and the metrics.
- **Metrics are directional** until a cohort has a few hundred new players. Note the known undercount (cleared storage, device switches) next to every baseline.
- **Gate-fail rule:** a missed gate gets one 2-week fix pass on the biggest drop. Missed again, change the hook instead of moving on. Overrides need a written reason.

## Privacy and integrity (every phase)

- Generated nicknames only; links and share text carry only the nickname and a score.
- No Score, Sparks total or identity from a Player under 13 goes online, in every Mode (by the Age answer, never by Mode): Device boards only, the Parent step retired; like every Player's, their visits send only anonymous page counts and fixed-word events (no IDs, nothing typed) ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)).
- No user IDs in analytics: cookieless, aggregate events only (GoatCounter from this site and Cloudflare Web Analytics; PostHog only cookieless, in a later change; never Google Analytics: change `learnvedicmath`, design D11).
- `parentNote()` and `cloud/README.md` always describe exactly what is sent and kept.
- Honest Vedic framing on every surface, share cards included. Sanskrit names come from `js/sutras.js` only.

## Technical approach

- **Stay vanilla JS** with the view cleanup contract (recommended over Preact + htm or a framework rewrite: smallest change, fixes the root cause, keeps the build-free code).
- **Seed everything with versions** (`v2:daily:2026-10-20`), so editing a generator never silently changes today's challenge. The same seeds power challenge links, the Daily Sutra and the fair Duel.
- **Every behavior change ships with a test:** node tests in `test/`, Playwright specs in `e2e/`.
- **Hosting:** Cloudflare Workers static assets at learnvedicmath.com, deployed by CI from `main`, real response headers, before a Player acts (plays a video, opens or posts to a World board) only analytics reach another site (GoatCounter counts and Cloudflare Web Analytics, after the page is idle) ([ADR 0004](adr/0004-host-on-cloudflare-workers.md)); the move from sbmadhav.com runs in three phases with the Hand-off on the device, no server in any of it ([ADR 0005](adr/0005-phased-move-and-progress-hand-off.md); change `learnvedicmath`).

## Risks

| Risk | Mitigation |
| --- | --- |
| Kids shrug at beating the calculator | Hook test during Phase 0, before building it |
| Solo time alongside a full-time role | Phase 0 plus the hook is the minimum (about 3 weeks); Phase 2 social features wait for Gate B |
| Child privacy on live boards | Age answer in Phase 0; under-13 Players use Device boards only ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)); legal read before any paid plan or school outreach |
| Cheating on public boards | Rules already cap scores and rate-limit; enforce App Check; Cloud Function only if needed |
| AI panel overstates or misses fun | Real-kid sessions gate every phase |
