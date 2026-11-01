# Tasks

Not buildable until the owner approves `proposal.md` and `design.md` and the lawyer signs off section 0. Phase 2 (section 5) is not buildable under this change at all. Playwright runs against a local build (`python3 build.py && node e2e/local-server.mjs 8124 _site`, `BASE_URL=http://localhost:8124`).

## 0. Sign-off (owner, lawyer)

- [ ] 0.1 **[OWNER]** Approve the product calls D1 to D5, or change them here.
- [ ] 0.2 **[OWNER]** Lawyer sign-off (learnvedicmath 13.1): the pilot pack's wording (D5), the report code's fields (D2), the privacy policy's "Classes" section, the school questions in `docs/legal/privacy-policy.md` (10 to 12), and whether the site is "primarily directed to children" (ADR 0006).
- [ ] 0.3 **[OWNER]** `trick-pages` and `teacher-warm-up` live (the pilot's free surface).

## 1. Report code

- [ ] 1.1 `tools/teachers/report-code.ts` and `js/report-code.js` (one source, published to both): `encode({ code, seat, week, stars, katas, skills, sparks, tricks })` to 20 base32 characters with a 16-bit checksum, `decode(text)` that refuses a bad checksum, a seat over 40 or a version it does not know, and `wordsFor(report)` ("4 Stars, 9 Katas, 12 Skills, 310 Sparks this week, 3 Tricks watched"). Verify: `test/report-code.test.mjs` round-trips every field at its limits, refuses a flipped character, and checks that no field can hold a Nickname, id or age (the schema is numbers only).
- [ ] 1.2 Class code: `makeClassCode(random)` from two fixed word lists and two digits, `classValue(code)` (24 bits) and back. Verify: the same test file; no word list entry is a name.

## 2. The game's side (Me page)

- [ ] 2.1 `js/store.js`: `class: { code, seat }` on the Player, in the backup schema (`js/handoff-schema.js`) and the hand-off allow-list. Verify: `test/handoff-schema.test.mjs` round-trips it; `e2e/tests/progress.spec.ts` backup keeps it.
- [ ] 2.2 `js/app.js` (`meView()`): "Join a class" (code and seat, validated), the class line with Leave class, "Show my class report" (the code, a QR drawn on the device by `js/qr.js`, the counts in words), loaded like the backup module (after the view draws). Verify: `e2e/tests/teachers-class.spec.ts` joins, shows the report, decodes it with the Node encoder, leaves; `cloudLog` has no write and no Firebase request for a Player with an under-13 Age answer; the Age answer is never asked by joining.

## 3. The teacher page

- [ ] 3.1 `site/teachers/class/index.html`, `tools/teachers/class.ts` (published at `/teachers/class.js`), `theme/class.css` (tokens only): make a class, the seat list 1 to 40, enter a report by typing, the seat-by-week table, the per-Trick view, the print view, Clear class; storage under `lvm.class.` only. Verify: `e2e/tests/teachers-class.spec.ts` makes a class, enters three reports, sees the table and the per-Trick view, prints (media emulation), clears; `localStorage` holds no key outside `lvm.class.`; `third-party.spec.ts` and `privacy.spec.ts` gain the page.
- [ ] 3.2 Scan a report: the QR reader (a small decoder served from this site, pinned by a hash test as `lens-reader.test.mjs` pins Tesseract), the camera only where `readerAllowed()`, frames never kept, the camera stopped on route change and a hidden tab. Verify: the spec scans a QR drawn by the game's encoder from a fake camera (the Math Lens fake-camera pattern).
- [ ] 3.3 `a11y.spec.ts` gains `/teachers/class/` and `/teachers/pilot/` in both schemes; 360 px without overflow.

## 4. The pilot pack and the counts

- [ ] 4.1 `site/teachers/pilot/index.html` with D5's content, the class list sheet (print), the free practice packs (`docs/monetization.md` 2.3), the owner's contact; `/teachers/` links to it. Verify: `test/copy.test.mjs` (no em dash, the 1965 book named, no "COPPA compliant" or "no IT approval"), `e2e/tests/cov/school-pilot-6.spec.ts`.
- [ ] 4.2 Analytics: `math/teachers/class/make`, `math/teachers/class/report`, `math/me/class/join`, `math/me/class/report`, fixed words only. Verify: `e2e/tests/cov/analytics-15-class.spec.ts` (no code, seat or count in any event).
- [ ] 4.3 Privacy policy "Classes" section from the lawyer's text (`docs/legal/privacy-policy.md`, then `site/privacy/`). Verify: `privacy.spec.ts`.

## 5. Phase 2, the class store (not buildable under this change)

- [ ] 5.1 **[OWNER]** An ADR succeeding ADR 0006 for counts sent under a school's authorization; the lawyer's reading of FERPA and state student-privacy laws; a school contract template; Workers Paid; `docs/PLAN.md` "Not doing" changed on purpose. Only then a new OpenSpec change for the Worker route and the self-filling teacher page.

## 6. Done

- [ ] 6.1 `openspec validate --all --strict`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python3 build.py`, the Playwright suite. Archive after release with the coverage specs for the scenarios in `specs/school-pilot/spec.md`.
