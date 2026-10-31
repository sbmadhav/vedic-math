# Design

Every call below is **owner-delegated, 2026-10-29** (the owner shared the UX audit, asked to act on it and to make executive decisions). Each says why.

## D1. Zone names: Home, Learn, Arcade, Watch; Explorer: Play, Learn, Me

The audit suggests Path (Learn + Sutras), Arcade (Dojo + Arena + Games), Watch and Me for Challenger and Pro, and Learn, Play and My Stars for Explorer.

- **Learn, not Path.** "Path" already means something here: Bolt's path, the suggested order of Stars (`GLOSSARY.md`, Sutra door, Sky). A second Path would read as the Sky. Learn is the word the menu, the landing page and the guide already use for the teaching side (landing-pages: "Learning is the top-level word"), and `#/learn` is already its route. The Sutras sit inside it as its first card, so the `sutras-first` direction holds: the Sutras are the first thing Learn shows, the first card on Home, and still first after Home in Find's list.
- **Arcade** for the playing side. It is the audit's word, it is short, and it collides with nothing in the glossary. "Play" would collide with `/play/` (the game's own path) and with Explorer's Play tab, which opens a different page.
- **Home stays a zone and Me stays the Player chip.** The brand opens the landing page (`/?home`), so Home needs its own place in the bar; the chip already opens Me in every Mode and shows the bar to the next Title, so a Me tab beside it would be two ways to one page in a row of five.
- **Explorer: Play, Learn, Me.** Play is Explorer Home ("What do you want to play?", its picture tiles), Learn is the Skill map of counting, adding and shapes with the Sutras card, Me is the Me page. **Me, not My Stars**: a Star is a defined thing (a two-minute round on one Trick) that Explorer is never offered (star-round spec), so "My Stars" would name something an Explorer cannot have; Me is what the page is called everywhere else.

## D2. One page per new zone, routes unchanged

The Arcade is a page at `#/arcade` (a Legacy view in `js/app.js`, like every other view until the React shell of `react-typescript` phase 2 exists): three cards in the style of Home's doors (the Dojo with belts and Stars lit, not in Explorer; the Arena; Games), each with its section's plain line from `sectionLines()`, then Party Mode and the challenge tower as tiles. Learn keeps `#/learn` and its levels, with one card to the Sutras above them. No route changes or moves: a deep link to `#/dojo`, `#/arena/party` or `#/sutras/s1` opens what it opened before, and the zone that holds it is marked current. A Trick page (`#/skill/v-...`) belongs to the Arcade, since its breadcrumb is the Dojo's; every other Skill page to Learn; the guide to Find.

The menu's model is `js/nav.js` (pure: the tabs per Mode, the routes each holds, the HTML). `play/index.html` holds the Challenger and Pro links as the first paint (a unit test keeps them equal to `navHTML('big')`), and `syncNav()` in `js/app.js` draws Explorer's three tabs when the Player's Mode is Explorer, on every route and every Player change (switch, add, Mode pick on Me).

## D3. Nothing becomes unreachable

| Reached before by the menu | Now |
| --- | --- |
| Home | Home zone; Explorer: Play |
| Sutras | Learn's first card; Home's Sutra door and Your sutras; Find; Explorer: More places, Home's sutra card |
| Learn | Learn zone |
| Dojo | Arcade's first card; Home's Sutra door (Open the Dojo) |
| Arena | Arcade; Home's Arena door; Explorer: Race the clock tile |
| Games | Arcade; Home's More ways to play; Explorer: More places (All games) |
| Watch | Watch zone; Explorer: Watch and sing |
| Guide | Find's help card; the footer's How to use this app; Explorer: More places (How to play) |
| Find | Find trigger (and Ctrl K, Cmd K, `/`); Explorer: More places |
| Me | Player chip; Explorer: Me tab |

`test/nav.test.mjs` checks every route against the zones, and Find's browse list still lists every section the Mode has.

## D4. Explorer's tabs speak after the view draws

A tap on an Explorer tab with Read aloud on says the tab's name. The router stops every voice when a route renders, so the word is held (`navSay`) and spoken after the new view has drawn; a tap on the tab of the page already open speaks at once. The words come from `NAV_LINES` in `js/nav.js`, not from literal `speak('...')` calls, so `fixedLines()` in `tools/voice/lines.mjs` does not take them into the hard Explorer coverage gate; `lines.mjs` lists them as whole lines for the owner's recording, and a todo test in `test/voice-coverage.test.mjs` becomes the gate after the re-record. Until then they play in the Built-in voice. Reading on hover is left out: a hover is not a choice, and a child's hand rests on a touch screen.

## D5. Find is the help; Ctrl K and Cmd K

The audit asks for one finder that also covers the Guide. Find already indexes every guide section; with the box empty it now shows a small help card first (Read the guide, Take the tour), then the browse list. The trigger is the last item of the Challenger and Pro menu, with a magnifying glass, the word Find and the shortcut as a `kbd` (Ctrl K, or ⌘ K where the platform is a Mac; shown above 900px wide with a fine pointer, and always named by `aria-keyshortcuts`). Ctrl K or Cmd K opens Find from any page, also from a text field (a modifier key is never typing), but not while a dialog or a header menu is open, and not during a round in the play shell, where a stray key must not end the round; the `/` key keeps its rules and gains the same round guard. Explorer has no Find trigger in its bar (three tabs, nothing more); Find is under More places on its Play page, and the keys work there too.

## D6. The Mode picker asks one question

The picker had three Mode cards and, under each, a primary Try a trick button (six buttons, three of them primary), plus links to the guide and Find. The audit's point is that a new visitor cannot tell whether Try a trick skips choosing a Mode. Now the three cards are the only buttons, each ending in "Start as <Mode>" (the landing page's Mode card wording, so the two read the same), and one quiet line keeps the guide link ("Not sure which? See how it works."). Picking a card still opens that Mode's Home, as before, where the Try a trick card waits until it is finished and the tour plays on a first visit: one step, then the next. The hero keeps its words ("One trick, two minutes, no sign-up."), which Home's Try a trick card keeps true. The menu still appears only once a Mode is picked.

Considered and left out: opening Try a trick straight from a card on a first visit. It would make the card do two different things depending on the device, and a Player who wants Home first (a returning family adding a Player) would be taken into a lesson.

## D7. Calm and sound in one control

The header's Music pill becomes the Calm and sound control: the same pill and note (visible word "Calm", accessible name "Calm and sound"), filled while music plays and with a teal edge while Calm is on. Its panel: the Calm switch with its one line, Pause motion, then Calm music (the four soundscapes, Stop, Volume), the Moving background and its notes. One click opens it and one more turns any of the three on. Calm is a switch, not the pill itself, so the pill never changes a setting by surprise and a Player always sees what Calm does before it does it. The play shell's header gets the same control in a smaller pill, with Pause motion and the music (Calm already has its switch there). Every Calm and Pause motion switch on the page (Me, the panels, the shell) shows the same state at once. `js/ambient.js` `mountSound()` draws both, with every listener on a signal from `js/life.js` (the page's lifetime in the header, the round's in the shell). There is still no kid mode switch, and the game still writes only the page-local `kidmode` body class, never the site-wide setting.

## D8. A lesson ends in its practice (audit task 3.4)

What exists: a Skill page puts its practice card beside the lesson, and a practice question starts at once; a Trick page also lists its three Stars; the Deep dive's "Try it yourself" lists each Trick as a primary link to its Trick page; Try a trick's end card offers Star 1. What changes:

- Each lesson (a Skill's "How it works" and "Watch me do one", a Trick's "Watch it work") ends with "Practice it now" (Explorer: "Now you try"). It scrolls this Skill's practice card into view (at once under no motion) and focuses its answer, so on a phone, where the card is below the lesson, the practice is one tap away. It is not a primary button: the practice's own Check is the page's primary action.
- In a Deep dive, each Trick's primary button starts a round on that Trick: its first Star not yet lit (Challenger and Pro; four questions, a miss replays the Trick on its own numbers), else the Trick page, whose practice starts at once (Explorer, who has no Stars, and a Trick with all three lit). "See how the trick works" opens the Trick page. Its progress line stays.
- A Star started from a Deep dive offers "Back to the sutra" and returns to it; the Deep dive opened that way closes to the Sutras page, never back into the round.

## D9. Spoken lines

New: "Play", "Learn", "Me" (D4). Changed explanation lines (the guide and the tour, which Listen reads and the studio voice records whole): listed in `tasks.md` for the owner's re-record. The explanation coverage check is already a todo until `explanation-audio` 4.6, so nothing claims audio that is not recorded.

## D10. Tests

Specs that expected the nine-item menu, the Guide link in the bar, the picker's Try a trick buttons or the Music word change in the same commit, each listed with its reason in the pull request. New specs: `e2e/tests/nav-by-mode.spec.ts` (zones, Explorer tabs and speech, Arcade, Learn's Sutras card, More places, Ctrl K, Find's help, Calm and sound in the header and the shell, lesson practice, Deep dive rounds), and coverage specs for the new scenarios.

## Archiving

`learnvedicmath` and `sutras-first` add site-header requirements that list the old menu ("The header is the Learn Vedic Math header", "Sutras come first in the menu"); this change's "The menu follows the Mode" replaces both lists. Archive `learnvedicmath` and `sutras-first` first, then this change, and remove "Sutras come first in the menu" in that commit.
