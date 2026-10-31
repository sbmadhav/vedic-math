# Design

## What #171 shipped

`site/teachers/index.html` has a `lv-callout` box, "A 5-minute warm-up for today's class": put today's Arena daily challenge on the class screen, race it together or each on a device, then talk through one question; one button, Open the Arena (`/play/#/arena`); a note that the Mode picker comes first on a new device and that Calm starts the Arena untimed. Nothing else on the page is interactive. This change keeps that box and its Arena button, and puts the projector warm-up first.

## Decisions (owner-delegated, 2026-10-30)

### D1. A static page outside the game

Owner-delegated, 2026-10-30. `/teachers/warm-up/` is a site page like `/teachers/`, not a game route: a class screen has no Player and needs no Mode, so it must not open the Mode picker, write a Player, earn Sparks or touch any Board. It writes nothing to storage and loads no Firebase. It stays where it is through the React migration (the game moves to `/learn/`; site pages do not).

### D2. Five screens, one thing at a time

Owner-delegated, 2026-10-30. Today's trick (name, Sutra, idea, the worked example stepped with Next), Problem 1, Problem 2, Problem 3, Practice at home. A problem shows alone, in the largest type; Reveal shows the answer under it, and Show the steps then shows the Trick's own `steps()` for those numbers, so the teacher can talk the method through on the class's own problem. The steps build up and stay (the working-memory point the landing page's click-through follows). A progress line, "Problem 2 of 3", is a polite live region.

### D3. Three fixed problems per Trick, rising

Owner-delegated, 2026-10-30. The feedback asked for "3 progressively harder class problems". `js/vedic.js` has a `random()` per Trick but no difficulty, so the problems are data: `tools/trick-pages/warm-up-problems.ts`, three per Trick, each larger or with more digits than the one before. Fixed data means every problem is checked once (a unit test runs each through `valid()` and `answer()`), a teacher can prepare, and two classes on the same day get the same warm-up. The first set, checked against `js/vedic.js` on 2026-10-30 (all pass `valid()`):

| Trick | Problem 1 | Problem 2 | Problem 3 |
| --- | --- | --- | --- |
| `sq5` | 25² | 65² | 115² |
| `near-base` | 9 × 7 | 97 × 96 | 996 × 988 |
| `crosswise` | 21 × 13 | 34 × 52 | 123 × 321 |
| `from9` | 100 − 37 | 1000 − 368 | 10000 − 4729 |
| `by9s` | 7 × 9 | 46 × 99 | 358 × 999 |
| `ends10` | 23 × 27 | 64 × 66 | 112 × 118 |
| `square-near` | 9² | 97² | 1004² |
| `by11` | 23 × 11 | 78 × 11 | 4352 × 11 |
| `div9` | 23 ÷ 9 | 142 ÷ 9 | 3121 ÷ 9 |
| `check9` | 23 × 14 | 47 × 38 | 386 × 52 |
| `times5` | 46 × 5 | 36 × 25 | 48 × 125 |
| `sub-base` | 48 × 47 | 53 × 46 | 61 × 58 |
| `duplex` | 21² | 47² | 89² |
| `sqroot` | √144 | √2304 | √7569 |
| `cuberoot` | ∛4913 | ∛59319 | ∛357911 |

### D4. The Trick of the day, or the teacher's pick

Owner-delegated, 2026-10-30. The Trick rotates through the 15 by the local date (day number modulo 15, in the order of the `trick-pages` table), so the page is different each school day without anything stored. "Pick a trick" lists all 15 by name and changes it for this visit; a link `?trick=<id>` opens one directly, so a teacher can bookmark a lesson. An unknown id falls back to the Trick of the day.

### D5. Sized for a room and a clicker

Owner-delegated, 2026-10-30. The problem's numbers are at least 20% of the viewport height (`clamp()` over the design system's type tokens), with the page's normal contrast in both schemes. A Full screen button uses the Fullscreen API and is hidden where it is not supported. Keys: Right, Space and Page Down go on; Left and Page Up go back (presenter clickers send Page Down and Page Up); R reveals, then shows the steps. No clock (a class should think, not race), no sound, nothing moves by itself, and a step appears without motion under reduced motion or Pause motion.

### D6. Honest words for teachers

Owner-delegated, 2026-10-30. The page and the `/teachers/` box say what is true: "No sign-in and no student accounts. This page stores nothing on this device." with a link to the privacy policy. They do not say a school needs no privacy review, or that the site is COPPA compliant: that is for the school and the lawyer (ADR 0006, learnvedicmath task 13.1). The Sutra line credits Bharati Krishna Tirtha's 1965 book, as every page that names a Sutra's source does.

### D7. Shares the Trick pages' modules

Owner-delegated, 2026-10-30. The step board (inputs aside) is split out of the `trick-pages` calculator into `tools/trick-pages/step-board.ts` and used by both, and the 15 Tricks and their slugs come from `tools/trick-pages/pages.ts`. So this change is built after `trick-pages` or in the same PR, and the warm-up's last screen can name a page that exists. Its scripts are published the `trick-pages` way (its design D4): every runtime module in `tools/trick-pages/` (`warm-up.ts`, `step-board.ts`, `pages.ts`, `warm-up-problems.ts`) at `/tricks/<name>.js` with the types taken out, importing each other by those URLs; the page loads `/tricks/warm-up.js`. They are outside `/js/`, so the game's precache and first-load bytes do not change; it is covered by the same per-page budget as a Trick page.

## What the feedback had wrong or already done

- "Zero-IT-approval teacher route": not a claim the site can make (D6); outreach to teachers waits for the lawyer review.
- "Add a 1-click Smartboard Warm-Up on /teachers/": half done in #171 (a pointer to the Arena); this change adds the projector page itself.
- "Teachers spread it (Facebook groups, #TeacherTok)": an owner launch step, in `docs/launch.md`, after the legal items.
