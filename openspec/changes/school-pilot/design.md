# Design

## Context

- `docs/monetization.md` (2026-10-31) puts a school pilot first and explains why a teacher view of class progress cannot be built the way other products build it: ADR 0006 (a Player under 13 sends nothing), ADR 0008 (the Grade answer never leaves the device), ADR 0002 (no identity until a first post, and under 13 never), and `docs/PLAN.md`'s "no classroom tools in 2026".
- The free teacher surface the pilot stands on: `/teachers/` (PR #171), `teacher-warm-up`, `trick-pages`. The pilot adds a class code, a seat, a report code and a teacher page that aggregates on the teacher's own device.
- The owner delegated the product calls below (owner-delegated, 2026-10-31). The owner approves this change, and a lawyer signs off the pilot, before anything is built. Phase 2 (D6) is not buildable under this change.

## Decisions

### D1. A class is a code and a seat, held on the devices, never on a server (owner-delegated, 2026-10-31)

A class code is six characters the teacher page makes at random (two short words and two digits, `MAPLE-FOX-42`, from fixed word lists, so it is sayable across a room and never spells a child's name). The teacher types a class name for their own list; the name stays in the teacher's browser and is not part of the code. A student types the code and a seat number (1 to 40) once on the Me page; both are stored with the Player on the device (`class: { code, seat }`) and never sent. The seat is the only link between a report and a child, and the paper or on-screen class list that says who sits where is the teacher's, on the teacher's device, as a seating chart is today. The site never holds a name, a seat, or a class together.

Alternatives: student emails or usernames (rejected: accounts, and personal information from a child); a code derived from the class name (rejected: a code that leaks a school or class name onto a child's device and into a report); a seat chosen by the teacher page and handed out (rejected: it needs a channel between the two devices; the paper list is that channel).

### D2. The report code holds counts, a week and nothing else (owner-delegated, 2026-10-31)

`report-code` encodes, in order: a version, the class code's 24-bit value, the seat (6 bits), the ISO week (12 bits), Stars lit (6 bits, up to 63), Katas done (11 bits, up to 1,050), Skills mastered (8 bits, up to 136), Sparks this week (12 bits, capped at 4,095), Tricks watched (5 bits), and a 16-bit checksum: 100 bits, base32, 20 characters, shown as `XXXX-XXXX-XXXX-XXXX-XXXX` and as a QR code. It carries no Nickname, Player id, Age or Grade answer, Mode, Board entry, timestamp or device detail, and the decoder refuses a code that fails its checksum or names a seat over 40. The week is the current ISO week on the device; a report shown on Monday holds last week's counts if the Player asks for last week.

Alternatives: a JSON backup-style code (rejected: too long to type, and it would carry more than counts); a per-Trick breakdown (rejected for phase 1: 21 more fields; the teacher page's per-Trick view uses the Stars count per Belt the code already implies, and a fuller breakdown is a phase 2 question).

### D3. The teacher page is a static page that keeps its data in its own origin path (owner-delegated, 2026-10-31)

`/teachers/class/` is a site page like `/teachers/warm-up/`: no Mode, no Player, no Firebase, no analytics beyond the fixed events. It keeps the class list and every report in localStorage under its own keys, prefixed `lvm.class.`, so nothing in `/play/`'s storage is read or written, and Clear class removes every key. A report is entered by typing the code or by scanning the QR code from a student's screen with the camera, using the same on-device pattern as Math Lens (`readerAllowed()`, frames never leave the device, the camera stops on route change or a hidden tab); typing always works. The page shows a seat-by-week table, a per-Trick view (Stars per Belt), a print view, and nothing exports (no CSV, by the plan's "Not doing"; a print view is a page, not an export).

Alternatives: the teacher page inside `/play/` (rejected: it would share the Player's storage and the game's chrome, and a class list next to a child's Player is the wrong neighbour); a CSV export (rejected: the plan says not in 2026, and a file of seats and counts leaves the device by email next).

### D4. The game's side is one Me page block, removable in one tap (owner-delegated, 2026-10-31)

"Join a class" on the Me page takes the code and seat, validates the code's checksum, and shows "Class MAPLE-FOX-42, seat 12" with Leave class. "Show my class report" shows the code, the QR, and the counts it holds in words ("4 Stars, 9 Katas, 12 Skills, 310 Sparks this week, 3 Tricks watched"), so a child knows exactly what the teacher will see. Joining a class changes nothing else: the Age answer is not asked, Boards are unchanged, Placement and Mode are unchanged, and a Player under 13 still loads no Firebase. The class travels in the backup code (it is part of the Player's record, inside the schema), and leaving the class removes it.

Alternatives: a class setting that changes the Mode or hides features for the pilot (rejected: the pilot tests the game as it is).

### D5. The pilot pack says what is true and nothing more (owner-delegated, 2026-10-31)

`/teachers/pilot/` carries: what the site is (the 1965 book, named), what it stores and where (progress on the student's device, the class list on the teacher's device, anonymous page counts unless DNT or GPC is on), the privacy policy link, the line that a school decides its own review, the class list sheet to print, the free practice packs, and the owner's contact. No claim of "COPPA compliant" or "no IT approval needed" (`docs/launch.md`, section 2). The lawyer sees the page before it is published.

### D6. Phase 2, the class store, written down and not built (owner-delegated, 2026-10-31)

If the pilot shows that typing or scanning twenty reports a week is the thing teachers will not do, the next step is a Worker route the student's device posts the report to, keyed by the class code, and the teacher page reads. The record would be exactly the report code's fields plus a received week, kept one term, deletable by the teacher (whole class) and by the student (own seat), with no IP address stored and the class code as the only key. Even so it is a record about a child held by the operator: it needs a successor to ADR 0006 saying under which consent a Player under 13 may send counts (the school's authorization under a contract, which COPPA allows for the school's educational purposes), the lawyer's reading of FERPA and the state student-privacy laws, Workers Paid, and a change to `docs/PLAN.md`. This change lists it so the lawyer answers about something concrete; its tasks are marked not buildable.

## Risks

- A report code can be shown by one student for another (seat swapping). The paper list and the teacher's eyes are the check, as with a worksheet; the pilot pack says so.
- A class code is sayable, so a student in another class could join it; joining changes nothing on that device and sends nothing, so the harm is a report the teacher does not recognise, which the seat list catches.
- The camera path adds a QR decoder (a small library served from this site, pinned like Tesseract); typing is the fallback and the default where the policy does not allow the reader.
