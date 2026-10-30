# Proposal

## Why

On 2026-10-29 the owner shared an outside UX audit of the site (`_handoff/feedback/2026-10-29-ux-audit.md`, outside the repo) and said "analyze this feedback and act on it", and earlier "Make executive decisions. Merge things quickly". That message is the owner's approval of this change; the calls it needed were delegated to the builder and are recorded in `design.md` as "owner-delegated, 2026-10-29".

This change takes the audit's items about the game's header, its menu, the first visit and Home (audit section 4 rows 1, 2 and 4; section 5 A.1, B.1, C.3 and C.4; section 6 tasks 2.2, 2.3 and 3.4). Checked against `main` and the live site first:

- **Nine top-level menu items.** True: Home, Sutras, Learn, Dojo (not in Explorer), Arena, Games, Watch, Guide and Find, the same flat list in every Mode, with Explorer's children (4 to 7) reading the same eight words as an adult. Learn, Sutras and the Dojo all teach; the Dojo, Arena and Games all play.
- **"The first screen shows the 9-tab bar".** Wrong: before a Mode is picked the menu is hidden (`site-header`, "Tabs appear after a Mode is picked"). What is true: the Mode picker offers six buttons of two kinds (three Mode cards and three Try a trick buttons, all three Try a trick buttons primary) and two more links (the guide and Find), so a new visitor has to choose how to choose.
- **"Calm and soundscapes are hidden in menus".** Partly: the header already has a Music pill whose panel holds the four soundscapes, the Moving background and Pause motion; Calm is only on Me and inside a round's play shell, and a round's screen has no way to Pause motion or the music.
- **"No Ctrl K finder".** True: Find exists (`#/find`, the `/` key) but is the ninth item, and the Guide is a separate tenth way to get help.
- **"Lessons do not end in practice".** Partly: a Skill page already has its practice beside the lesson, and the Deep dive's "Try it yourself" links each Trick's page; but nothing at the end of a lesson starts the practice, and from a Deep dive the Player lands on a long Trick page, not in a round.
- **Passing the Mode from the landing page** (audit task 2.1) is already done (`landing-modes-and-return`, `/play/?mode=<id>`).

## What Changes

- **The menu follows the Mode.** Challenger and Pro: four zones, **Home**, **Learn** (the Sutras and the Skill map), **Arcade** (the Dojo, the Arena and Games), **Watch**, then one **Find** trigger with its shortcut (Ctrl K, Cmd K on a Mac), which is also the way to the Guide. Me stays the Player chip at the end of the bar. Explorer: three big picture tabs with their names, **Play** (Home), **Learn** and **Me**, and each says its name when tapped with Read aloud on.
- **Every route stays.** Hash routes and deep links are unchanged; each zone is marked current on every route inside it. The Arcade is a new page at `#/arcade` with a card for the Dojo, the Arena and Games, then Party Mode and the challenge tower. Learn's page gains one card to the 29 Sutras above its levels. Explorer Home gains a row of "More places" (All games, The sutras, How to play, Find), so nothing the old menu reached is more than a tap or two away.
- **Find is the menu's help.** With nothing typed it shows the guide and the tour first, then the browse list of every section (now with the Arcade, in zone order). Ctrl K or Cmd K opens it from any page, also from a text field, but not over a dialog or a round.
- **One step at a time on a first visit.** The Mode picker asks one question, "Pick who is playing", and its three Mode cards are its only buttons, each ending in "Start as <Mode>". Its Try a trick buttons go: each Mode's Try a trick stays on that Mode's Home, as now, until it is finished. One quiet link to the guide stays.
- **Calm and sound in one place, on every screen.** The header's Music pill becomes the **Calm and sound** control (visible word "Calm"): one panel with the Calm switch, Pause motion and the Calm music picker, then the Moving background. The play shell's header gets the same control (Pause motion and the music; its own Calm switch is beside it). The header still has no kid mode switch and the game never writes the site-wide `kidmode` setting.
- **A lesson ends in its practice.** Each Skill and Trick lesson ends with "Practice it now" (Explorer: "Now you try"), which brings that Skill's own practice into view with the answer in reach. Each Trick in a Deep dive's "Try it yourself" starts a round on that exact Trick: its first Star not yet lit (Challenger and Pro), else its page with its practice; "See how the trick works" still opens the Trick page. A Star started from a Deep dive goes back to it.
- **Words.** The guide's and the tour's lines about the menu, Find and the music follow; the tour's last step points at Find (Explorer: How to play under More places).
- One route view more, `math/view/arcade`. No other event changes; Try a trick is counted from its Home card only.

Unchanged: the brand, the color scheme button and the Player chip; every route and its page; Home's doors, its one primary button and its tour; the `/` key; Calm, Pause motion and the music themselves; what is stored and sent.

## Spoken lines (owner re-record)

- New, Explorer tabs (Built-in voice until recorded; `test/voice-coverage.test.mjs` has a todo for them, listed by `tools/voice/lines.mjs`): "Play", "Learn", "Me".
- Changed explanation lines (Listen, recorded whole; the explanation check is already a todo until `explanation-audio` 4.6): the guide's "Getting around", "Find", "Me page and badges", "Dojo", "Sutras" and "Calm, music and background" sections, and the tour's "The menu", "Calm and sound" and "Find and help" steps (listed in `tasks.md` 4.2).

## Capabilities

### New Capabilities

- `lesson-practice`: a lesson's last button starts its own practice; a Deep dive's Try it yourself starts a round on each Trick.

### Modified Capabilities

- `site-header`: the menu by Mode, Explorer's speaking picture tabs, the Find trigger and its shortcut, the Calm and sound control, current zone marking, the small screen rules for the new menu.
- `first-visit`: the Mode picker's cards are its only buttons; Try a trick is reached from Home; Explorer Home's More places.
- `find`: the Find trigger and Ctrl K or Cmd K; Find's help card; the browse list in zone order.
- `guide`: the guide is reached through Find, the footer and Explorer's More places; the tour's last step.
- `calm`: the Calm switch in the Calm and sound panel of every page and in the play shell.
- `analytics`: Try a trick counted from its Home card.
