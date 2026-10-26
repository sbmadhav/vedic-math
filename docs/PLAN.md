# Vedic Math for Everyone: Product Plan

Updated 2026-10-25 · Owner: Madhav Srinivasan

Terms are defined in [GLOSSARY.md](../GLOSSARY.md); decisions are in [docs/adr/](adr/); every behavior change is an OpenSpec change in `openspec/changes/`. Statuses below are **shipped** (on `main` and live), **in a PR** (open pull request), **planned** (a change or task exists, not built), and **owner** (waiting on something only the owner can do).

## The vision, in the owner's words

> "Make math fun even better than Duolingo. Best in the world. So it has to be a unique way to learn." (2026-10-20)

> "It is important to make the sutras and the new method the focus of the app." (2026-10-21)

> "I want this to be more interactive, like the kids are inside a game, instead of tasks and tabs... teaching should be more instant. made a mistake, learn and earn. Incentivize the learners to make mistakes, try harder things keep making mistakes and learning. like different levels in a game." (2026-10-15)

What that means for every decision below:

1. **The Sutras are the product.** A Player learns the Sutra way (98 × 97 is 95 | 06, not two rows and an add), sees which Sutra a method comes from, and grows Sutra by Sutra. Speed and Scores serve that, never the other way round.
2. **Learning happens inside a game.** The Sky is the world, Stars are its levels, a mistake is followed at once by the lesson on the Player's own numbers and a Comeback that pays more than a first right answer.
3. **Help is a friend, not a button.** The Nikhilam Family notice when a Player is stuck and give a clue, the method or an example on other numbers, never the answer. Bolt is the teacher.
4. **The math fits the child.** Placement finds the Player's level, the Reading band fits the words and the answers to how they read, and Mode stays a free choice.
5. **Honest and private by design.** The sutras come from Bharati Krishna Tirtha's 1965 book, not the Vedas. No Score, Sparks total or identity from a Player under 13 goes online; for every Player, a visit's analytics are anonymous counts and fixed-word events, and the features named below (Friend Duels, voice, talking with the Family for 13 and over) send only what their sections list.

The north star stays the **Magic moment**: a Trick learned and then used correctly in a timed round. The Hook still says it in one line: "Become the human calculator."

## Where things stand

| Area | Status |
| --- | --- |
| Trust bugs (the 12 from the Oct 13 review) | **Shipped**, all 12, with the view cleanup contract, by 2026-10-15 (archived changes `answer-checking-fixes`, `quests-and-badges-fixes`, `view-cleanup-contract`, `fair-duel`, `copy-and-honest-framing`) |
| The game world (Star Quest) | **Shipped**: Sparks ([ADR 0003](adr/0003-sparks-replace-xp.md)), Star rounds with Comebacks and Dares, the Sky home, Belts, Calm, celebrations, twelve Play experiences ([star-quest.md](star-quest.md)) |
| Content | **Shipped**: 135 Skills, 21 Tricks, 29 Sutra deep dives with pronunciation and Verses, 1,050 Katas, 14 games, 285 videos on the Watch shelf, Try a trick inside each Mode on one Sutra (#128) |
| Sutras first | **In a PR**: Sutra tags (#126), Sutra progress and Sutras first in the menu (#129), Home and the landing page lead with the Sutras (#133) |
| Family helpers | **In a PR** (#131): the scripted Family behind an off-by-default switch in Me. The React port, recorded voices and talking with the Family are planned |
| learnvedicmath.com | **Shipped**: live on Cloudflare Workers since 2026-10-20 (#82), the old address hands progress over (#99), Learn not Play (#107), the Nikhilam Family brand (#101), the YouTube facade (#135). Boards are Device boards only until the new Firebase project exists (**owner**, task 1.8) |
| Studio voice | **Shipped in the repo, not heard on the site**: the site plays the Built-in voice until R2 is set up (**owner**, learnvedicmath 7.8) |
| React and TypeScript | Phase 1 **shipped** (#114, #115: workspaces, strict TypeScript, Vitest, lint, budgets). Phase 2 **in a PR** (#127), held for Workers Paid (**owner**, task 0.8) |
| Install as an app | **Shipped** (#132): manifest, Install guide, Install nudge. Owner device checks left (`install-app` 7.1 to 7.4) |
| Performance budgets | **Shipped**: first load may not grow past `docs/perf/baseline.json`; previews run load and interaction checks against production in the same job (#115, #130, #134, #139) |
| Placement, Reading bands, online Duels, more 3D | **Planned**, re-planned for React (#120, #123, #124, #125), built after the migration |
| Real-kid sessions | **Not yet run.** No gate below has been passed by observed sessions |

**Keep and amplify:** the two tries, then hint, then worked reveal; the trick animator; the honest history of the sutras; privacy by design. Every persona's best moment in the Oct 13 panel was seeing a Trick work (75² is 7 × 8, then 25). Nobody's best moment was a badge.

## 1. Sutras first

The owner's "new method" is the **Sutra way**. A Player should never meet a method without its Sutra.

| Piece | Status |
| --- | --- |
| A Sutra tag (kind, name, meaning, one link to its Deep dive) wherever a method is taught: Star rounds, Katas, the Arena, Watch, the Answer checker | In a PR (#126) |
| Sutra progress, worked out on the device from mastery, Stars, Katas and cards; Sutras first in the menu | In a PR (#129) |
| Home and the landing page open on the Sutras | In a PR (#133) |
| Try a trick: one short lesson per Mode, each on one Sutra | Shipped (#128) |
| Every explanation can be heard (`explanation-audio`) | In progress: 8 of 15 tasks, the rest in #143 and owner listening |

## 2. The game: Stars, Comebacks, levels

Star Quest is the shape of "learn inside a game": the Sky is the world, each Sutra a Constellation, each Trick three Stars of rising difficulty. A miss replays the Trick on the Player's own number, then a rematch; a Comeback pays 15 Sparks against 10 for a first right answer; a Dare pays double and costs nothing. Every Star is open and skipping is marked, never punished. All of this is shipped; the decisions are in [star-quest.md](star-quest.md).

Still to do here:

- **Star Quest on phones** is redone when the Star view moves to React (`react-typescript` 7.2; the owner signs off from phone screenshots). Planned.
- **The Hook** ("Square 85 before the calculator does") opens the first Star that Placement points to. It moved from `hook-first-star` into `placement`. Planned.

## 3. The Nikhilam Family: study friends, with Bolt as the teacher

Change `family-helpers` (#131), approved by the owner 2026-10-21; talking with the Family settled 2026-10-24 (design D15, D18).

- **Who.** Shunya (Zero, funny), Nava (Nine, witty) and Eka (One, a little serious, names the Sutra). Fellow students who learned from Bolt. Their tone follows the Reading band. Bolt stays the teacher in Star rounds and the Arena.
- **When.** A Help signal (2 misses in a row on one Skill, 3 in a round, about 20 seconds idle, Hint pressed twice, leaving early after misses) can start a Visit: one friend for a first stumble, two for repeated trouble, all three for a real block. At most one Visit every 3 minutes unless asked, never mid-question in a timed race, never over the question, the answer or the buttons.
- **Never the answer.** A hint, the method, or a worked example on other numbers. The answer comes only through the round's own Show me.

| Step | What | Status |
| --- | --- | --- |
| 1 and 2 | Prototype, then the scripted Family in Practice, Katas and the Star end screen, behind "Try the Nikhilam Family helpers" in Me | In a PR (#131) |
| 3a | Port into the React root layout | Planned, after `react-typescript` phase 2 (owner task 0.8) |
| 3b | Recorded voices (Shunya Puck, Nava Leda, Eka Charon; text until then) | Owner: samples, voice pick, recording |
| 3c | **Talking with the Family**, for Players 13 and over only, opt-in | Planned (D15, D18, ADR 0015 proposed in #131) |
| 3d | Listening: push-to-talk in Pro, and an opt-in mode that only listens for help phrases | Planned |
| 3e | The Family as 3D characters on React Three Fiber | Planned, after the Sky (ADR 0013) |

**Talking with the Family (D15, D18).** Never for a Player whose Age answer is under 13 ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)). Bolt joins the three and answers every why or how. One call per turn to Claude Haiku 4.5 on our own Worker route returns at most two short replies. Four checked actions (an example on other numbers, pointing at a part of the question, the Sutra, a pose), none of which shows the answer. Clues are limited, like Duolingo's hearts: 3 per question (proposed), and at zero the speakers explain the method in general; talk about the method or the Sutra is free. Only the Skill id, the question's numbers, this Visit's words and a short-lived session ticket from Turnstile are sent; no Nickname, no Player id, nothing kept. Contact details are stripped in the browser (the Worker does not re-check them), a server check swaps a bad reply for a scripted line, Turnstile runs once per visit, about 20 turns an hour per address, and spend is capped at $5 a day and $50 a month. Text only at first. **CopilotKit was weighed and rejected** (293 to 732 KB gzipped client, a 1 MB Worker runtime, full history and telemetry by default).

## 4. Fit the child: Placement and Reading bands

Both are re-planned for React (#123) and built after the migration, in this order (`react-typescript` D3).

- **Placement** (`placement`, [ADR 0007](adr/0007-placement-level-sets-practice-only.md)). After the Mode pick, an optional untimed climb of up to about 12 questions finds a Placement level (a school grade, K to 12). It sets where Practice, Stars and the suggested Skills start, never the League, Ranked rounds or Boards, so failing it on purpose gains nothing. Explorer answers with 3 big choices and hears every question. Retake any time from Me; it can only raise saved Ratings. Planned.
- **Reading bands** (`age-bands`, [ADR 0008](adr/0008-grade-answer-stays-on-device.md)). One question, "What grade are you in?", sets one of three Reading bands (about 4 to 6, 7 to 9, 10 and up) in every Mode: read aloud, wording, picture or typed answers, timers, number of choices, Bolt's and the Family's tone. Never math difficulty. The Grade answer stays on the device and is never in any request; an age given instead is also the Age answer. Planned.

## 5. Play together: online Duels, then Live sessions

- **Same-screen Duel**: shipped (`fair-duel`; both sides get the same question).
- **Online Duels** (`duel-online`, [ADR 0009](adr/0009-cloudflare-durable-objects-for-realtime-play.md), re-planned in #124). Phase 1, Friend Duels by a 6-letter Duel code, for every Player. Phase 2, Random Duels in the same League, for Players whose Age answer is 13 or over. A Durable Object referee deals the same question to both at the same moment and decides who was right first. No chat and no typed text, only preset Reactions; generated Nicknames; Report and Block. Under-13 results stay on the device. Planned; **owner** approval (task 0.0), open questions and the lawyer's answer (0.4) first, on Workers Paid.
- **Live sessions** (`react-typescript` 12.4): a grown-up host starts a quiz, Players join by code, scores update live, on the same room engine as Duels. A new change after `duel-online` is approved. Planned.

## 6. Technical direction

### React Router v7 and TypeScript on Cloudflare Workers ([ADR 0012](adr/0012-react-and-typescript-for-the-game.md))

The earlier plan said "Stay vanilla JS" and "Framework rewrite: not doing in 2026". Both are withdrawn. On 2026-10-18 and 2026-10-20 the owner chose React 19 and strict TypeScript, with React Router v7 in framework mode rendered on the server in our Cloudflare Worker, because the template-string views invite cross-site scripting (about 120 `innerHTML` assignments) and every planned feature would add more of them. Not Next.js: it is built for Vercel, whose Hobby plan forbids commercial use.

- The move is one view at a time: Legacy views and React views share one router, each migration PR names its Locked views and changes no behavior, and the Playwright suite stays green.
- Game paths move from `/play/#/...` to `/learn/...`; old links redirect forever.
- Player data stays on the device: routes have no server loaders, and anything that reads the Player renders in the browser.
- Progress: 20 of 76 tasks. Phase 1 shipped; phase 2 (#127) waits for **Workers Paid** (owner task 0.8), because the Free plan's 10 ms CPU per request is too tight for a React render.

### 3D decoration with three.js ([ADR 0011](adr/0011-webgl-only-for-decoration.md), [ADR 0013](adr/0013-three-js-for-3d-decoration.md))

On 2026-10-15 the owner said "I dont want full 3D game rendering that will be a lot". That view changed on 2026-10-17 and 10-18 ("We need to add Three.js as well for things like illustrations and sky view"), and on 10-21 the owner asked for the Family to become detailed React Three Fiber characters too. What made it acceptable is that it is not a 3D game: the game stays HTML, and 3D is decoration only (no information, no input), through React Three Fiber, loaded late on the routes that show it, outside every first load, under 170 KB Brotli, paused in a hidden tab, a still frame under Calm or reduced motion, and the 2D drawing as the fallback. Order: the Sky (inside `react-typescript` phase 7), then Sutra deep-dive illustrations, game effects and Mandala (`gpu-effects`, re-planned in #125; **owner** approval, task 0.0), then the 3D Family.

### Server voice with an R2 cache ([ADR 0014](adr/0014-server-side-voice-synthesis-with-an-r2-cache.md))

Fixed lines are recorded in the Studio voice (Chirp 3 HD, Aoede) and served from R2. Sentences with a question's own numbers become Server lines: the game sends a template id and numbers, never free text; the Worker voices each sentence once, keeps it in R2 forever, and a Durable Object ledger caps spend at $5 a day and $150 a month. The Built-in voice takes over at the cap, offline or when slow. Turnstile and a per-address limit will cover it (family-helpers D18). Planned as `react-typescript` phase 8; needs R2 (learnvedicmath 7.8), the Google key as a Cloudflare secret (11.7) and Workers Paid.

### Hosting, install and speed

- **learnvedicmath.com** on Cloudflare Workers static assets ([ADR 0004](adr/0004-host-on-cloudflare-workers.md)), deployed by CI from `main`, with real response headers. Before a Player acts (plays a video, opens or posts to a World board), only analytics reach another site (GoatCounter counts and Cloudflare Web Analytics, after the page is idle). The old address moves in three phases with the Hand-off on the device ([ADR 0005](adr/0005-phased-move-and-progress-hand-off.md)); Phase B is live.
- **Install as an app**: shipped (#132). The service worker stays hand-written, scoped to the game.
- **Performance budgets**: first load may not grow (758,499 bytes on `main` when last set) and previews are compared with production in the same job. The baseline (2026-10-21) is far from the goal: first contentful paint 1,923 ms, largest 5,420 ms. `render-performance` (re-planned in #120; **owner** approval) adds the absolute budgets: first contentful paint under 1.5 s on a mid phone over 4G, under 150 KB of compressed JS before play.
- **Backend**: TypeScript Workers, Durable Objects for live rooms, R2 for voice; Rust only if a profile shows the need ([ADR 0010](adr/0010-typescript-not-rust-for-the-backend-now.md)). Firebase stays for Boards for now.
- **Every behavior change ships with a test**: Vitest and node tests, Playwright specs in `e2e/`, one coverage spec per live scenario.
- **Seeds carry versions** (`v2:daily:2026-10-20`) so editing a generator never silently changes today's challenge.

## 7. Build order

Each step starts only when the one before it allows; owner blockers are in the next section.

1. Merge what is in review: Sutras first (#126, #129, #133), Family helpers (#131), launch docs (#136), backup codes (#141), explanation audio (#143).
2. `react-typescript` phases 2 to 6 (the shell on Workers, then every view), after Workers Paid. Phase 8, the server voice, can start after phase 2.
3. `placement`, then `age-bands`, then `render-performance`.
4. `duel-online` (Friend Duels, then Random Duels), then Live sessions.
5. The Sky in 3D (`react-typescript` phase 7), then `gpu-effects`, then the 3D Family.
6. Family helpers step 3 runs alongside from step 2: the React port, the recording, talking with the Family, listening.

## 8. Waiting on the owner

| Blocker | What it unblocks | Task |
| --- | --- | --- |
| Workers Paid ($5 a month) | React phase 2 in production, the server voice, talking with the Family, Duels | `react-typescript` 0.8 |
| New Firebase project (Blaze, $5 budget, App Check) | World boards on learnvedicmath.com | `learnvedicmath` 1.8, then 8.5 and 8.7 |
| R2 bucket on `voice.learnvedicmath.com` | The Studio voice heard on the site; Server lines | `learnvedicmath` 7.8 |
| Voice recording runs | The re-record (about 394 lines), new Worked examples, the Family's voices | `better-voice` 2.6, `learnvedicmath` 7.5 and 7.6, `explanation-audio` 4.6, `family-helpers` |
| Licence cutoff commit and go-ahead | MIT up to the cutoff, proprietary after it (draft in #136) | `learnvedicmath` 12.3 |
| Lawyer review | Promoting the site, schools, any paid plan, Friend Duels | `learnvedicmath` 13.1, `duel-online` 0.4 |
| Approvals | Building `duel-online`, `render-performance`, `gpu-effects`; the go for talking with the Family | each change's 0.0 |
| Account settings | GoatCounter site code, DNSSEC, CAA, the `www` rule, an uptime monitor | `learnvedicmath` 1.4, 1.6, 1.9, 1.13, 5.5 |
| Repo and voice storage questions (P1 to P8) | Going private, where voice archives live | not yet recorded |

## 9. Gates: real kids first

The loop every feature serves: **Dare, Reveal, Prove, Race, Brag, Return**.

- **Gate A** (trust and instruments): the 12 bugs are fixed and the events exist (`first_win`, `round_end`, `share_click`, `return_d7`, route views). Left: analytics on learnvedicmath.com needs its GoatCounter code (owner), then baselines are recorded.
- **Gate B** (the Magic moment): 5 observed sessions where most Players get a first win within 90 seconds and choose a second round. Run it on the Hook and the first Star after Placement ships, not on a prototype of an idea that has since changed.
- **Gate C** (brag and return): kids or parents share without being asked, and returns after 7 days trend up. Online Duels and challenge links are measured here.

**Rules**

- **Real kids decide the gates.** 5 observed 30-minute sessions with 9 to 14 year olds before each gate, parent present, consent given, no face recording. These outrank any AI panel and the metrics.
- **Metrics are directional** until a cohort has a few hundred new Players; note the undercount (cleared storage, device switches) next to every baseline.
- **Gate-fail rule:** a missed gate gets one 2-week fix pass on the biggest drop. Missed again, change the Hook instead of moving on. Overrides need a written reason.

| Metric | Definition | Role |
| --- | --- | --- |
| Time to first win | Share of new sessions with `first_win` under 90 s | Gate B |
| Round-2 completion | `round_end` with round 2 or later over `round2_start` | Gate B |
| Share rate | `share_click` over `round_end` | Gate C |
| D1 and D7 return | Any return on day 1, and on days 7 to 13, once per device | Gate C |
| Retained accuracy | Accuracy 7 days after mastery | Learning quality |
| Speed gain | Median seconds per answer per Trick, week 1 against week 4 | Tracking only |

## 10. Privacy and integrity (every step)

- **The Age answer decides, never the Mode.** It is asked once, neutrally, at the end of the first Ranked round before a Score or weekly Sparks total could be posted (up front once Placement or the grade question ships), and never leaves the device. A Player under 13 uses Device boards only and posts nothing, in every Mode; nothing for them loads Firebase ([ADR 0006](adr/0006-under-13-players-use-device-boards-only.md)). A Player 13 or over sees a World board after a Show World board tap.
- **No identity until the first post** ([ADR 0002](adr/0002-no-identity-until-the-first-post.md)), a Score or the weekly Sparks total; viewing a World board needs none, and voice, Duels and talking with the Family never create one.
- **The Grade answer stays on the device** ([ADR 0008](adr/0008-grade-answer-stays-on-device.md)).
- Generated Nicknames only; share text carries only the Nickname and a Score.
- Analytics are cookieless and aggregate: GoatCounter from this site and Cloudflare Web Analytics, fixed event words, no user IDs, never Google Analytics.
- `parentNote()`, `cloud/README.md` and the privacy policy say exactly what is sent, and change before anything new is sent (Server lines, Duels, talking with the Family).
- Honest framing on every surface, share cards included; Sanskrit names come from `js/sutras.js` only.

## 11. Later: a family and classroom plan

The owner, 2026-10-17: "Make that a fun website but it will more like an eventual for profit thing." learnvedicmath.com is meant to carry a paid family or classroom plan one day ([ADR 0004](adr/0004-host-on-cloudflare-workers.md)); that is why it is on its own domain and host. Nothing is designed yet: no pricing, no checkout, no parent accounts. **A lawyer reviews first**: the privacy policy and terms, whether the site is "primarily directed to children", Friend Duels, and any verifiable parental consent method. No ads, ever.

## Not doing

- **Next.js, Vercel**, or any framework adapter between React and the Worker (ADR 0012). No big-bang rewrite, no micro-frontends, no Redux, Zustand, Tailwind, CSS-in-JS or Workbox.
- **CopilotKit** or any hosted chat runtime for the Family (family-helpers D18).
- **Interface in WebGL**, a 3D game engine, a hand-written WebGL engine, or 3D in any first load (ADR 0011, 0013).
- **A Rust backend** (ADR 0010) or a second cloud vendor for real-time play (ADR 0009).
- **Calling a speech provider from the browser**, a general text-to-speech endpoint, or any free text sent for voice (ADR 0014).
- **Anything online for under-13 Players beyond Friend Duels**: Friend Duels are open to them with no lasting identifier and results on the device; no World boards, no Random Duels, no talking with the Family, no grown-up override until a verifiable consent method exists, as its own change and ADR.
- **Chat between Players** of any kind; Duels have preset Reactions only.
- **Always-on listening**: listening only looks for help phrases, opt-in, and never stores audio or words.
- **Paid plans, checkout, parent accounts and ads** until the lawyer review, and ads never.
- **Classroom tools in 2026**: teacher dashboard, curriculum tags, CSV export. Live sessions are the one classroom-shaped feature planned.
- **Other languages** in 2026.
- **New audience tracks**: adult interview, SAT, teen swipe feed.
- **Extra reward systems**: sticker book, pets, cosmetics, boss battles, streak freeze. Bolt and the Family are never pets.
- **The Mistake Museum**: the in-Star replay and rematch replaced it.
- **Kid voices** for now, and a separate repo for the voices.

## Risks

| Risk | Mitigation |
| --- | --- |
| Kids shrug at the Hook or the Sky | Gate B with real kids before the next step; the gate-fail rule |
| The Family become Clippy | Never over the question, one-tap close, "Not now" mutes for the session, at most one Visit every 3 minutes, off by default until phone checks |
| A model gives the answer or hears something personal | Fixed instructions, the server check with a scripted fallback, contact details stripped in the browser, 13 and over only, nothing kept |
| The migration stalls feature work | One view at a time, Locked views only; content changes never wait |
| First load grows with React and 3D | The build fails on growth; 3D is never in a first load |
| Spend runs away | Server ledgers ($5 a day and $150 a month for voice, $5 and $50 for talking), Google budget alerts as the outer stop |
| Child privacy | ADRs 0002, 0006 and 0008; the lawyer before promotion, schools or a paid plan |
| Cheating on public boards | Rules cap Scores and rate-limit; App Check enforced on the new project; the Duel referee is the server |
| Solo time alongside a full-time role | Owner tasks are listed in one table; agents build in parallel, the owner approves |
