# Monetization plan (owner)

How learnvedicmath.com could earn money without breaking the promise that makes it worth using: free, no ads, no accounts, under-13 Players post nothing, progress stays on the device. Drafted 2026-10-31 from the second Muse review (`_handoff/feedback/2026-10-31-muse-review-2.md`, "How to monetize this in future"), checked against the code, the plan (`docs/PLAN.md`, section 11 and "Not doing"), the ADRs and the draft legal pages. Like `docs/launch.md`, every step here is the owner's: nothing here is built, priced or promised by an agent. The first stream has an OpenSpec change, `openspec/changes/school-pilot/`, which needs the owner's approval and a lawyer's sign-off before any build.

## 1. What the site can support today

| Fact | Where it is decided | What it means for a paid plan |
| --- | --- | --- |
| No accounts, no sign-in, progress on the device only; a backup code moves it | ADR 0002, ADR 0005, `js/store.js`, `js/backup.js` | Nothing can be sold "per account". A purchase has to attach to a grown-up outside the game (a school, a parent's email with the payment provider), never to a Player record. |
| Players whose Age answer is under 13 post nothing and load no Firebase; the Age answer never leaves the device | ADR 0006, ADR 0008 | A classroom of 8 to 12 year olds cannot send progress to a server under the current rules. Any teacher view of class progress either stays on the devices in the room or needs a new ADR and a lawyer (section 3). |
| World boards are off (`FIREBASE = null` in `js/cloud-config.js`) | learnvedicmath task 8.5 | Turning them on is a privacy change in its own right, never a paid feature (section 5). |
| Privacy policy and terms are drafts "under review" | `docs/legal/`, learnvedicmath tasks 13.1, 13.3, 14.5 | Nothing is sold, and no school is approached, before the lawyer review (ADR 0006: "Get a lawyer's opinion before any paid plan or school outreach, including whether the site is primarily directed to children"). |
| Cloudflare Workers Free; Workers Paid ($5 a month) is owner task 0.8 | ADR 0004, `docs/PLAN.md` section 7 | A checkout page, a licence check or any server-side class store needs the Paid plan (10 ms CPU a request on Free). |
| The plan says no classroom tools in 2026 (teacher dashboard, curriculum tags, CSV export) and no paid plans, checkout or parent accounts until the lawyer review, and ads never | `docs/PLAN.md`, "Not doing" | A school pilot in 2026 has to work with what exists: the projector warm-up, the Trick pages, printable packs, the device's own progress. A dashboard is a plan change the owner makes on purpose, not a side effect of a pilot. |
| Growth plans ready to build: Trick pages (`trick-pages`), the projector warm-up (`teacher-warm-up`), the Arena challenge link (`arena-challenge-link`) | `openspec/changes/` | These are the free, teacher-facing surface a pilot stands on. Build them first. |
| Analytics are cookieless counts in fixed words, off with DNT or GPC | `js/analytics.js`, `docs/launch.md` | A pilot can be measured by which pages open and which Tricks are practised, never by who. |
| The Family helpers, Math Lens and the Calm music run on the device; the studio voice is prerecorded (R2 not yet set up) | ADR 0014, ADR 0015, `docs/agent/studio-voice.md` | Running costs are near zero today. The first paid stream does not need to cover infrastructure; it needs to cover the owner's time and the lawyer. |

## 2. The streams, in the order Muse proposed

The order holds up: the school licence is the only stream whose buyer is an adult institution with its own privacy review, the family supporter needs a parent to be identifiable (which the game has no way to do today), one-time packs need almost no code, and donations need the least of all. Each stream below says what has to be true first (legal, infrastructure, product), the smallest pilot, what to measure, the price question to answer, and who decides.

### 2.1 Schools, tutors and homeschool groups (first)

**What has to be true first.**
- Legal, owner: task 13.1 (lawyer review of privacy, terms, retention, security) with the questions the privacy draft already lists: school use, teacher or school authorization, FERPA and state student-privacy laws (`docs/legal/privacy-policy.md`, open question 11); whether the site is "primarily directed to children" (ADR 0006); the operator details (13.3). The pages published without the draft note (14.5).
- Product: `trick-pages` and `teacher-warm-up` live, since they are what a teacher puts on the projector and sends home. The `school-pilot` change for the class code, the seat number and the class report (section 3).
- Infrastructure: none for the free pilot (everything stays on the devices in the room). Workers Paid before any licence check or server-side class store.

**The smallest pilot.** 5 to 10 classrooms, free, for one term, with a named teacher each, found by the owner (section 6). The teacher gets: the projector warm-up, the Trick pages with a "practice at home" address, a printable pack per Trick (section 2.3, which the pilot also tests), the class code and the class report sheet from `school-pilot`. The students get the free game, unchanged. The owner gets a 20-minute call with each teacher after weeks 2 and 8.

**What to measure.** With the fixed analytics words only: `math/teachers/warmup/start/<trick>` and `done/<trick>` (how many warm-ups run to the end), `math/tricks/calc/<trick>` and `practice/<trick>` (which Tricks go home), and the teacher calls: which report they would open, which they would pay for, who signs off a purchase at their school, and whether a privacy review was asked for and what it needed. Never a count of students, never anything per child.

**The price question to answer.** Per classroom per year, or per school? Muse says do not set it before the pilot; the pilot's job is to learn what a teacher opens and what a school will approve. The comparison points a teacher will name are the class tools they already pay for; ask them.

**Owner-only.** The lawyer, pilot recruitment, the price, the payment provider and invoicing, any contract with a school. The agent can draft the pilot pack and the report sheet.

### 2.2 Family supporter (second)

An optional, adult-paid subscription that adds grown-up value and locks nothing a child uses today.

**What has to be true first.**
- Legal: 13.1 plus a parent account design the lawyer has seen: a paid subscription is a parent's contact details and a payment record, and ADR 0006 names "a card transaction once paid plans exist" as a possible verifiable parental consent method later, with a lawyer, as part of a parent account. That is a new ADR, not a setting.
- Product: the Sparks history and the award messages (`muse-review-polish` D4) are the raw material of a progress report, and they stay on the device. A "weekly parent summary" that leaves the device is the thing that needs the account and the consent; a summary the parent reads on the child's device needs neither. Start with the second.
- Infrastructure: Workers Paid, a payment provider, an email sender for receipts. None of it exists.

**The smallest pilot.** A waitlist line on `/parents/` ("Would you pay for a weekly summary and printable packs? Leave an email.") after 14.5, so the demand is measured before anything is built. No supporter features ship before the school pilot has run.

**What to measure.** The waitlist count against `/parents/` page views; later, how many supporters open the summary.

**The price question.** Monthly or yearly, and what the free version keeps (everything that exists today; the plan's "Not doing" list and section 5 below).

**Owner-only.** The lawyer, the parent account ADR, the provider, the price. The agent can draft the on-device weekly summary (a Me page section) as a free feature, which both the family and the school streams use.

### 2.3 One-time digital packs (third, but the cheapest to try)

Printable workbooks, offline practice packs and a companion guide for parents and teachers. They fit the content without changing the game's economy, and a one-time purchase is easier for a school to approve than a subscription.

**What has to be true first.** The terms (13.1) covering a sale; a storefront outside the game (a print-on-demand or digital-goods shop the owner picks), so the site never holds card details and no purchase can start from inside the game. The packs themselves: the Trick pages' worked examples and the Katas' problem generators (`js/levels.js`) already produce the problems; the generator writes a PDF per Trick with the method on page one and 30 problems with answers.

**The smallest pilot.** One free pack (one Trick) on the Trick page and in the school pilot, to see whether anyone prints it; two more as the first paid packs if they do.

**What to measure.** Downloads of the free pack (a fixed event, `math/tricks/pack/<trick>`), and in the pilot, whether teachers hand it out.

**The price question.** Per pack, or a bundle per Belt; whether a school buys a site licence to print.

**Owner-only.** The shop, the price, the terms. The agent can build the generator and the free pack.

### 2.4 Donations, "keep it free" (in parallel)

A grown-up only supporter page: a short explanation that the site is free and ad free for every child and that a contribution keeps it that way, a link to a donation provider outside the site, and no recognition that touches the game (no badges, no Sparks, no name anywhere a child sees).

**What has to be true first.** 13.1 (the terms say what a donation is and is not), and the tax question for the owner (a donation to a sole proprietor is not a charitable gift; say so plainly).

**The smallest pilot.** The page, linked from the footer's grown-up links and from `/parents/`, nothing inside `/play/`.

**What to measure.** Page views and the provider's own count. Nothing else.

**Owner-only.** The provider, the wording the lawyer approves.

### 2.5 Licensing and workshops (later, only if demand proves it)

Content licensing or white labelling for other platforms, and live workshops or classes. High effort, and both depend on the school pilot showing that teachers value the content. The code's licence (`LICENSE`: MIT up to commit 2a8b7a3 of 2026-10-28, all rights reserved after) means the pre-cutoff copies cannot be withdrawn; anything licensed is the content and code written since, plus the recordings. Not before the school pilot has a result.

## 3. The teacher view of class progress, honestly

A "teacher dashboard" is what every school product sells, and it is the one thing this site cannot build as the others do. Under ADR 0006 a Player under 13 sends nothing anywhere, and under ADR 0008 even the Grade answer never leaves the device; a server that holds "seat 12 in class ABC solved 40 problems this week" is a record about a child kept by the operator, which is personal information in the school context. COPPA lets a school consent on a parent's behalf for an educational service, but only under a contract with the school, only for the school's purposes, and under FERPA and the state student-privacy laws the privacy draft already flags. That is an ADR and a lawyer, not a feature flag.

So `openspec/changes/school-pilot/` designs the pilot in two phases:

- **Phase 1, nothing leaves the room.** A class code the teacher makes and the students type once (it only tags the device), a seat number the student picks (the teacher keeps the paper list of who is which seat), and a class report code the student's device shows at the end of a session: a short code that holds counts only (Stars lit, Katas done, Skills mastered, Sparks this week), which the teacher types or scans into a teacher page that aggregates on the teacher's own device and stores nothing anywhere else. The student shows the teacher a code the way they show a worksheet. ADR 0006 and ADR 0008 hold unchanged; the Age answer is never involved.
- **Phase 2, a class store, only after an ADR and a lawyer.** The same report, posted by the device to a Worker keyed by the class code, so the teacher page fills itself. The design says what the record would hold (class code, seat number, the counts, a week), what it would never hold (nickname, Age answer, Grade answer, device id), the retention (one term), and the school contract it needs. It is marked not buildable until the owner records the ADR and the lawyer signs off.

## 4. Sequence

1. Fix read aloud and backup (done in the `muse-round-2` pull request: the backup code is shown and restored through a field; read aloud's code path was verified on the live site, which has no studio voice until R2 is set up).
2. Lawyer review and the published legal pages (13.1, 13.3, 14.5). Nothing below starts before this.
3. Build the free teacher surface: `trick-pages`, `teacher-warm-up`, the free printable pack, the on-device weekly summary.
4. Run the free school pilot (`school-pilot` phase 1) for a term; measure; decide the licence and its price.
5. Launch school licences (payment provider, invoicing, contract).
6. The family supporter waitlist, then the tier if the waitlist says so (parent account ADR first).
7. Donations page in parallel with step 3; packs as the pilot shows demand.

## 5. Never

Written as rules the code can be checked against, not preferences:

- No third-party ads, behavioural tracking, data sale or sponsored content, anywhere, and none inside a kids' game above all. `docs/PLAN.md` already says "ads never"; `e2e/tests/third-party.spec.ts` fails a first visit on any host not on the list.
- No loot boxes, energy timers, pay to continue, or Sparks for money. Sparks stay earned only (`js/store.js` has no way in but play; the 150 a day cap on experiences stays).
- No paywall on accessibility or safety: read aloud, the studio voice, Calm, Pause motion, text size, the Family helpers' listening, the backup code and restore stay free for every Player.
- No purchase a child can start. Every payment happens outside `/play/`, on a grown-up page, through a provider that holds the card; the game stores no card, no receipt and no account.
- No paywall on anything that is free today: every Trick, Star, Kata, game, experience, Sutra deep dive, Lost Scroll chapter and video stays free, for existing and new Players alike. A paid tier adds grown-up things (reports, summaries, printables, class tools), never removes child things.
- World boards do not turn on as a paid feature or as a pilot perk. Turning them on at all needs a fresh privacy review, the age gating the ADRs already require, moderation for Nicknames, and the final, non-draft privacy policy and terms.
- No telling a school it needs no privacy review (`docs/launch.md`, section 6, and the `teacher-warm-up` proposal). Say what the site does and link the policy; the review is the school's call.
- No progress of an under-13 Player on a server without an ADR and a lawyer (section 3). Phase 1 of the school pilot is designed so this never comes up.

## 6. Owner-only items

- [ ] **[OWNER]** Lawyer review (13.1), with the school and paid-plan questions in `docs/legal/privacy-policy.md` (open questions 10 to 12) and the "primarily directed to children" question from ADR 0006.
- [ ] **[OWNER]** Operator details (13.3) and the published legal pages (14.5).
- [ ] **[OWNER]** Pilot recruitment: 5 to 10 teachers (tutors and homeschool groups count), one term, free. Where to find them is in `docs/launch.md` section 6, after 13.1.
- [ ] **[OWNER]** Pricing for every stream, after the pilot; nothing is priced by an agent.
- [ ] **[OWNER]** Payment and donation providers, the shop for packs, invoicing and the school contract template (with the lawyer).
- [ ] **[OWNER]** Workers Paid (task 0.8) before any checkout, licence check or class store.
- [ ] **[OWNER]** The decision to change `docs/PLAN.md`'s "no classroom tools in 2026" if the pilot asks for phase 2 of `school-pilot`, and the ADR that comes with it.
- [ ] **[OWNER]** The R2 voice host (`docs/agent/studio-voice.md`), so the studio voice reads on the live site before any paid plan is promoted with read aloud as a feature.
