# Launch checklist (owner)

Public promotion of learnvedicmath.com: where to post, what to say, and what has to be true first. Drafted 2026-10-30 from outside feedback the owner shared (`_handoff/feedback/2026-10-30-growth-playbook.md`, Part 2, engine 4). Every step here is the owner's: nothing is posted by an agent. Each draft uses only claims checked against the site on 2026-10-30 (the table below); change a draft only with claims from that table, or check the new claim first.

## 1. Before anything is posted

Public promotion waits for the legal items, unless the owner decides otherwise and notes the date here:

- [ ] **[OWNER]** Lawyer review of the privacy policy, terms, retention and security pages (learnvedicmath task 13.1). The task says "before the site is promoted, before any school outreach and before any paid plan".
- [ ] **[OWNER]** Operator details for the privacy notice, required by COPPA §312.4(d) (learnvedicmath task 13.3).
- [ ] **[OWNER]** Privacy policy and terms published without the "Draft under review" note (learnvedicmath task 14.5).
- [ ] **[OWNER]** GoatCounter set up (learnvedicmath task 1.9), so the launch can be measured: which Tricks and games people open and replay (route views, `math/star/*`, `math/q_answered/*`), and from Gate C the share rate (`share_click` over `round_end`).
- [ ] **[OWNER]** Search Console: submit the sitemap (owner setup section 16, task 1.11), ideally after the Trick pages (`openspec/changes/trick-pages/`) are live.
- [ ] Recommended, not required: the Arena share button (`openspec/changes/arena-challenge-link/`) is live, so visitors from a post can challenge a friend.

Already done (no action): the landing page's 98 × 97 click-through (PR #172) and the menu that follows the Mode with a one-question first visit (PR #174), the feedback's "fix the first 30 seconds".

## 2. Claims we can make, and ones we cannot

| Say this | Not this | Why (checked 2026-10-30) |
| --- | --- | --- |
| No accounts and no sign-in. Progress stays on your device. | "Zero data collection" | Anonymous page and event counts are sent (below). Players 13 and over who post to a World board send a made-up Nickname, avatar color and Score (privacy policy; World boards are switched off at launch). |
| Cookieless, anonymous counts only (GoatCounter and Cloudflare Web Analytics), and none with Do Not Track or Global Privacy Control on. | "Zero tracking", "no analytics" | `js/analytics.js`, the analytics spec, the privacy policy. |
| Players under 13 post nothing online; their scores stay on the device. | "No under-13 data", "COPPA compliant", "no IT approval needed" | ADR 0006. Compliance and school reviews are for the lawyer and the school (task 13.1). Anonymous counts are still sent for every visitor unless DNT or GPC is on. |
| Math Lens reads the digits in a camera picture on your device (Tesseract.js); the picture is never uploaded. | "AI vision", "handwriting recognition" | `js/play/exp/lens-cam.js`. It reads digits from a camera frame or typed digits; there is no handwriting input. |
| The singing bowls and the tanpura drone are made live in the browser with Web Audio. | "Recorded temple bowls", "Vedic chant" | `js/ambient.js`, `js/sutra-ambience.js`. The chanted Om is an opt-in CC0 recording "added here for atmosphere. It is not part of the 1965 book." (honest-framing spec). |
| The speed tricks use sutras from Bharati Krishna Tirtha's 1965 book. | "Ancient Vedic sutras", "from the Vedas", "Vedic sutras" | honest-framing spec; the landing page says they are not found in the Vedas. |
| Mandala Studio draws Meru-prastāra (Piṅgala's triangle of binomial numbers). | "Pascal's triangle invented in India first" as a slogan | `js/play/exp/art-core.js`. Name the older mathematicians accurately (CODING_STANDARDS, Words and copy). |
| Sutra Spellbook: trace the method on the digits with your finger. | "Finger-drawn answers" | `js/play/catalog.js`. |
| Works offline after one visit. | | The game's service worker (offline spec). |
| Free, no ads. | "Free forever", "nonprofit" | PLAN.md: no ads ever; a paid family or classroom plan may come later, after the lawyer review. |
| Calm turns off clocks in Practice and motion; Pause motion stops movement site-wide. | "Built for ADHD", "reduces math anxiety" | No medical or clinical claims: the site has no study behind them. Say what the setting does; let parents judge. |

Not to say either: "open source" (code after 2026-10-28 is all rights reserved, `LICENSE`), "the same questions for everyone" without "in a Mode" or "in a League" (each League has its own daily round), and any number of Players or schools.

Copy rules for every post: the words in `GLOSSARY.md` (Trick, Sutra, Mode, Arena, Practice, Score, Sparks, Board), commas, colons or parentheses instead of an em dash, and the 1965 book named wherever the sutras' source comes up.

## 3. Show HN

- [ ] **[OWNER]** Post on a weekday morning US time, from your own account, and stay to answer comments for the first few hours. Read the Show HN guidelines first (it must be something people can try; no sign-up walls, which fits).

Title (under 80 characters):

> Show HN: Learn Vedic Math, a no-login math game with Web Audio bowls and on-device OCR

Text:

> I built Learn Vedic Math (https://learnvedicmath.com/) to teach the speed tricks from Bharati Krishna Tirtha's 1965 book Vedic Mathematics: 98 × 97 is 95 | 06, so 9506, in one line instead of two rows and an add. There are 21 Tricks, a skill map from counting to calculus, an Arena with a daily round, and three Modes (Explorer for about 4 to 7, Challenger for 8 to 12, Pro for 13 and up) that change the wording and the controls.
>
> Some things that were fun to build:
>
> - No accounts and no sign-in. Progress stays in the browser; a backup code moves it between devices.
> - Players under 13 post nothing online. The site asks one neutral age question before a first post, the answer never leaves the device, and for under-13 Players nothing loads Firebase at all.
> - Math Lens: point the camera at a number plate or a receipt and play puzzles made from its digits. Tesseract.js runs on the device, served from the site; the picture is never uploaded.
> - The Calm music (singing bowls, a tanpura drone) is synthesized live with Web Audio, not recordings.
> - Mandala Studio draws times-table mandalas and Meru-prastāra, Piṅgala's triangle of binomial numbers.
> - Analytics are cookieless counts in fixed words (GoatCounter and Cloudflare Web Analytics), off with Do Not Track or GPC.
> - Plain ES modules today, moving to React and TypeScript one view at a time, on Cloudflare Workers static assets, with a strict CSP built per page.
>
> The sutras are from the 1965 book, not the Vedas; every page credits the book. Feedback on which Tricks click and which do not is very welcome.

## 4. Reddit

- [ ] **[OWNER]** Before each post, read the subreddit's rules on self-promotion (some allow it only in a weekly thread, some not at all) and post only where allowed, as yourself, saying you made it. One subreddit a day, not all at once. Answer replies.

### r/homeschool

Title: "I made a free, no-login site for mental math speed tricks (ages 4 to adult)"

> I'm the developer. Learn Vedic Math (https://learnvedicmath.com/) teaches the speed tricks from Bharati Krishna Tirtha's 1965 book, things like squaring 65 in your head (6 × 7 = 42, then 25, so 4225), alongside practice from counting to calculus.
>
> For homeschool use: there are no accounts, progress stays on your device, and there are three Modes with different wording (Explorer, about 4 to 7; Challenger, 8 to 12; Pro, 13 and up). Each Trick has a short lesson and a step-by-step "Watch it work" on any numbers you type. Children under 13 never post anything online. It works offline after one visit.
>
> It's free with no ads. I'd love to hear what works and what doesn't for your kids.

### r/Parenting

Title: "A free math game where the method is the point, with a Calm setting (no clocks, no motion)"

> I'm the developer. My aim with Learn Vedic Math (https://learnvedicmath.com/) was a math game that teaches a method, not just speed: short Tricks from Bharati Krishna Tirtha's 1965 book, worked left to right in a line or two, with a robot teacher, Bolt, who replays a missed question step by step on the child's own numbers.
>
> There's a Calm setting that removes clocks from Practice and stops motion, and the sounds can be turned off. No accounts, no sign-in, no ads; children under 13 post nothing online and their scores stay on the device.
>
> Happy to answer questions about how it handles privacy.

### r/ADHDers

- [ ] **[OWNER]** Post only if the rules allow self-promotion, and frame it as a question, not a claim that it helps ADHD.

Title: "Does working math left to right in one line help you? I built a site around it and want honest feedback"

> I'm the developer of Learn Vedic Math (https://learnvedicmath.com/). It teaches Tricks that work a sum left to right in one or two lines instead of long carrying, for example 98 × 97: 98 is 2 below 100 and 97 is 3 below, 98 − 3 = 95, 2 × 3 = 06, so 9506. Each step stays on screen so you don't have to hold the last one in your head.
>
> It has a Calm setting (no clocks in Practice, no motion) and Pause motion. No accounts or sign-in.
>
> I'm not claiming it helps with ADHD; I'd like to know from people who've struggled with long multiplication whether this way of writing it is easier or not.

## 5. Shorts and Reels

- [ ] **[OWNER]** Record 15-second vertical screen captures, silent with on-screen captions, no faces or voices of children. Decide with the lawyer whether to mark them "made for kids" on YouTube (the owner setup section 16 covers only the site's embedded videos). Use real timings: record both ways at a normal pace and show the real seconds, rather than "45 s of carrying" versus "3 s".

Script, "Two ways to do 98 × 97":

1. Caption "98 × 97, the school way". Split screen, left: 98 × 7 = 686, 98 × 90 = 8820, 686 + 8820 = 9506, written at a normal pace. A real stopwatch in the corner.
2. Right: caption "the sutra way", the landing page's click-through: 98 is 2 below 100, 97 is 3 below; 98 − 3 = 95, 2 × 3 = 06; 9506.
3. End card: "Speed tricks from Bharati Krishna Tirtha's 1965 book. learnvedicmath.com". No other claim.

More in the same shape, one Trick each: 65² (6 × 7 = 42, then 25), 1000 − 368 (all from 9 and the last from 10: 632), 23 × 11 (2, 2 + 3, 3: 253).

## 6. Teachers

- [ ] **[OWNER]** Teacher groups (Facebook groups, TeacherTok) only after task 13.1, which names school outreach, and once the projector warm-up (`openspec/changes/teacher-warm-up/`) is live. Do not say a school needs no privacy review: say what is true ("no sign-in and no student accounts; nothing about students is stored") and link the privacy policy.

## 7. After the posts

- [ ] **[OWNER]** A week after each post, note in `_handoff/IDEAS.md` what was asked and which Tricks and games were opened and replayed (GoatCounter), so the next changes follow what people use.
