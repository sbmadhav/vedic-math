# Proposal

> **Approval and sign-off.** This change is a plan, not an approval. Nothing in it is built until (1) the owner approves it, and (2) a lawyer has signed off the school questions in `docs/legal/privacy-policy.md` (open questions 10 to 12), the "primarily directed to children" question in ADR 0006, and the pilot pack's wording (learnvedicmath task 13.1, which names school outreach). Phase 2 (section "What Changes") also needs its own ADR. Drafted 2026-10-31 from the second Muse review and `docs/monetization.md`; the product calls are in `design.md`, each marked "owner-delegated, 2026-10-31"; the owner-only items are listed at the end.

## Why

`docs/monetization.md` puts schools, tutors and homeschool groups first: the buyer is an adult institution with its own privacy review, the student app stays free and ad free, and the pilot teaches what a teacher actually opens before anything is priced. The review suggested "a teacher dashboard, class codes instead of student emails, assignments, progress reports, printable worksheets, and support", with "a small paid pilot, for example 5 to 10 classrooms, before setting a final price". Checked against `main` and the plan on 2026-10-31:

- **There is no class anything.** The site has no accounts (ADR 0002), progress lives in the browser (ADR 0005), and a Player under 13 sends nothing anywhere (ADR 0006): no Firebase, no identifier, not even the Grade answer (ADR 0008). A teacher cannot see a student's progress except by looking at the student's screen.
- **The plan rules out classroom tools in 2026.** `docs/PLAN.md`, "Not doing": "Classroom tools in 2026: teacher dashboard, curriculum tags, CSV export." A dashboard that a server fills is also a record about a child kept by the operator (section "What Changes", phase 2), which the privacy draft flags for school authorization, FERPA and state student-privacy laws.
- **The free teacher surface is planned but not built.** `trick-pages` (15 static Trick pages with a calculator), `teacher-warm-up` (the projector warm-up at `/teachers/warm-up/`) and the `/teachers/` page (PR #171) are what a teacher would put in front of a class. They store nothing and need no Player.
- **What a pilot can measure already exists.** Analytics are fixed words (`math/teachers/warmup/start/<trick>`, `math/tricks/practice/<trick>`), cookieless, off with DNT or GPC. Nothing per child, and nothing new is needed to see which Tricks a class uses.

So the pilot is designed so that the first phase stays inside the rules the site already has, and the part that would change them is written down as what it is: a new ADR and a lawyer's question.

## What Changes

**Phase 1, nothing leaves the room (buildable after the owner's approval and the lawyer's sign-off on the pilot).**

- **A class code on the teacher page.** `/teachers/class/` makes a 6-character class code from a class name the teacher types (the name stays on the teacher's device; the code is a random word pair plus two digits, like `MAPLE-FOX-42`, never derived from the name). The page holds the teacher's class list: seat numbers 1 to 40 and, beside each, nothing until a report is entered. All of it stays in the teacher's browser (localStorage on `/teachers/`, a different origin path from `/play/`, so no Player data is touched).
- **A seat number in the game.** On the Me page, "Join a class" takes the class code and a seat number (1 to 40). They are stored with the Player on the device, shown on the Me page, removable in one tap, and never sent anywhere. They do not change what the Player sees or can do, do not touch the Age answer, the Mode, Placement or any Board, and do not load Firebase.
- **A class report code.** The Me page, for a Player with a seat, shows "Show my class report": a short code (under 24 characters, base32) that holds the class code, the seat number, the week, and counts only: Stars lit, Katas done, Skills mastered, Sparks this week, Tricks watched. No Nickname, no Age or Grade answer, no Player id, no device id, no timestamps finer than the week. The student shows it to the teacher as they would a worksheet, or the teacher scans it from the student's screen: the report is also shown as a QR code drawn on the device (a small QR encoder, no camera needed to show it).
- **The teacher page reads reports.** Typing or scanning a report code (the camera path uses the same on-device reader pattern as Math Lens, `readerAllowed()`, and keeps no frame) fills that seat's row for that week with the counts. The page shows the class as a table by seat and week, a per-Trick view (which Tricks the class has Stars in), and a print view; it exports nothing and sends nothing. Clear class removes everything.
- **The pilot pack.** A page on `/teachers/` with the pilot's words (what the site does, what it stores where, the privacy policy link, no claim that a school needs no review), a printable class list sheet with the class code and seat numbers, one printable practice pack per Trick (shared with `docs/monetization.md` 2.3), and the owner's contact for the pilot.
- **Counted with fixed words.** `math/teachers/class/make`, `math/teachers/class/report` (a report entered, no code or seat in it), `math/me/class/join`, `math/me/class/report`. Nothing names a class, a seat or a child.

**Phase 2, a class store (not buildable: needs an ADR and a lawyer).**

- The same report posted by the student's device to a Worker route keyed by the class code, so the teacher page fills itself. The record is the report code's fields and nothing more, kept for one term, with the school's signed authorization as the legal basis. ADR 0006 and ADR 0008 would need a successor that says when a Player under 13 may send counts to the operator and under whose consent. This proposal writes the record down (design D6) so the lawyer can answer about something concrete; it builds nothing.

Unchanged: who can post to Boards, the Age answer, World boards (off), every free feature, the game for a Player who joins no class.

## Capabilities

### New Capabilities

- `school-pilot`: class codes, seat numbers, class report codes, the teacher page, the pilot pack.

### Modified Capabilities

- `analytics`: new requirement "Class and report counts carry no class, seat or child".

## Impact

- New: `site/teachers/class/index.html` and `tools/teachers/class.ts` (the page's script, published at `/teachers/class.js` as `trick-pages` publishes its calculator), `tools/teachers/report-code.ts` (encode and decode, shared by the game through `/js/`), `tools/teachers/qr.ts` (a small QR encoder), `site/teachers/pilot/index.html`, `theme/class.css` (tokens only).
- `js/app.js` (the Me page's "Join a class" and "Show my class report" block), `js/store.js` (`class: { code, seat }` on the Player, inside the backup schema `js/handoff-schema.js` so a backup keeps it), `js/report-code.js`.
- `build.py`: the new pages join the page list; `_headers` gains two rules.
- Legal: the pilot pack's wording and the class report design go to the lawyer with task 13.1. The privacy policy gains a section "Classes" the lawyer writes or approves (what a class code and seat are, that they never leave the device, that the teacher holds the list).
- No spoken line changes in phase 1 (the Me page block is not read aloud; the teacher page has no voice).
- Tests: `test/report-code.test.mjs`, `test/teachers-class.test.mjs`, `e2e/tests/teachers-class.spec.ts`, `e2e/tests/cov/school-pilot-1.spec.ts` to `school-pilot-6.spec.ts`, `e2e/tests/cov/analytics-15-class.spec.ts`; `third-party.spec.ts` and `privacy.spec.ts` gain the class pages (no request leaves the site; no Firebase).

## Owner-only

- [ ] **[OWNER]** Approve or change the product calls in `design.md`.
- [ ] **[OWNER]** Lawyer sign-off on the pilot pack, the report code's fields, the privacy policy's "Classes" section and the school questions (13.1).
- [ ] **[OWNER]** Pilot recruitment: 5 to 10 classrooms, tutors or homeschool groups, one term, free.
- [ ] **[OWNER]** Pricing, after the pilot. Not before, and not by an agent.
- [ ] **[OWNER]** The ADR for phase 2, if the pilot asks for it, and the change to `docs/PLAN.md`'s "no classroom tools in 2026".
- [ ] **[OWNER]** Workers Paid before phase 2 (nothing in phase 1 needs it).
