# Spec Delta

## ADDED Requirements

### Requirement: Every screen has a path under /learn/
Every screen of the game SHALL have one path under `/learn/`, made from its route with the same parts in the same order and no trailing slash (`/learn/arena`, `/learn/sutras/s1`, `/learn/game/times-sprint/12`, `/learn/kata/sq5/12`), with Home at `/learn/` and the Skill map at `/learn/skills`. The address bar SHALL show that path whenever the screen is shown. Back and Forward SHALL move between screens as they do today, without loading a page.

#### Scenario: Opening the Arena from the nav
- **WHEN** a Player taps Arena in the game's nav
- **THEN** the address bar shows `https://learnvedicmath.com/learn/arena`, the Arena is shown, and no page is requested from the server

#### Scenario: A cold load of a deep path
- **WHEN** a returning Challenger Player opens `https://learnvedicmath.com/learn/game/times-sprint` in a new tab
- **THEN** the response is 200 and the Times sprint game is shown

#### Scenario: Back after a Star
- **WHEN** a Player opens the Dojo, then a Star, then presses Back
- **THEN** the Dojo is shown at `/learn/dojo`

#### Scenario: A link in a view
- **WHEN** a Player opens the context menu on a Skill card on a level page
- **THEN** the link's address is `https://learnvedicmath.com/learn/skill/<id>`, not a `#/` address

### Requirement: Aliases answer with their screen's one address
`/learn/tricks`, `/learn/progress`, `/learn/duel` and `/learn/learn` SHALL answer with a 301 to `/learn/dojo`, `/learn/me`, `/learn/arena/party` and `/learn/skills`, and a path with a trailing slash SHALL be redirected to the path without it.

#### Scenario: An alias
- **WHEN** a visitor opens `/learn/progress`
- **THEN** the response is a 301 to `/learn/me` and the Me page is shown

### Requirement: Old /play/ links reach the same screen, forever
Every address under `/play/` SHALL be answered with a 301 to the same path under `/learn/`, keeping the query, by a rule that runs no server code, and the move's `/vedic-math/` rules SHALL end at `/learn/`. These rules SHALL never be removed.

#### Scenario: The old game address with a query
- **WHEN** a visitor opens `https://learnvedicmath.com/play/?mode=explorer`
- **THEN** the response is a 301 to `/learn/?mode=explorer` and Explorer is picked as today

#### Scenario: An old hash link to the old address
- **WHEN** a visitor opens `https://learnvedicmath.com/play/#/arena`
- **THEN** the response is a 301 to `/learn/`, the address becomes `/learn/arena` and the Arena is shown

### Requirement: Old hash links reach the same screen, forever
A page load under `/learn/` or at the landing page whose fragment starts with `#/` SHALL be sent to the matching path under `/learn/` before anything is painted, keeping the query. While the game is open, a fragment change to one starting with `#/` SHALL become the matching path without a reload. Other fragments SHALL be left alone. This SHALL never be removed.

#### Scenario: A bookmark from before the switch
- **WHEN** a Player opens `https://learnvedicmath.com/play/#/sutras/s1`
- **THEN** the address becomes `/learn/sutras/s1` and the Deep dive opens, with no flash of Home or of the Mode picker

#### Scenario: A link that reached the landing page
- **WHEN** a visitor opens `https://learnvedicmath.com/#/games`
- **THEN** the address becomes `/learn/games` before the landing page paints, and Games is shown

#### Scenario: Old code that sets a hash
- **WHEN** a Legacy view sets `location.hash` to `#/me`
- **THEN** the address becomes `/learn/me` without a reload and the Me page is shown

#### Scenario: A skip link
- **WHEN** a keyboard Player follows "Skip to content", whose target is `#view`
- **THEN** focus moves to the view and the route does not change

### Requirement: Share links with codes open their experience
A path under a play experience that carries parameters (a Ghost race code, an Art piece, a Wall card, a Locks chapter, an Arena challenge link) SHALL be answered with status 200 and that experience's page, by a rule that runs no server code, and the experience SHALL read its parameters from the path as it reads them today.

#### Scenario: A Ghost race link
- **WHEN** a friend opens a Ghost race link `/learn/arena/ghosts/r/<code>` on a cold load
- **THEN** the status is 200 and the race with that code is offered

### Requirement: Unknown paths open Home with a 404 status
A path under `/learn/` that names no screen and matches no rule SHALL be answered with status 404 and the game's shell, which carries `noindex` and shows Home, or the Mode picker on a first visit. A miss for a script, style or image SHALL still get the site's 404 page.

#### Scenario: A typo in a path
- **WHEN** a visitor opens `/learn/arnea`
- **THEN** the status is 404, the page carries `noindex`, and the game's Home (or the Mode picker on a first visit) is shown with its nav

### Requirement: Public pages open without a Mode
A first-time visitor (no Mode picked) who opens a public page SHALL see that page, worded for a visitor, with no Mode stored. The public pages are the indexed pages of the `search-pages` capability, plus Find. Every control on a public page that starts a round, a Practice question or a game SHALL instead read "Pick who is playing" and open the Mode picker, and after a pick the Player SHALL return to the same page.

#### Scenario: A Skill lesson from a search result
- **WHEN** a first-time visitor opens `/learn/skill/v-sq5`
- **THEN** the lesson for squaring numbers ending in 5 is shown, not the Mode picker, and the Practice card offers "Pick who is playing"

#### Scenario: Picking from a public page
- **WHEN** that visitor taps "Pick who is playing" and picks Challenger
- **THEN** the lesson is shown again at `/learn/skill/v-sq5` with its Practice question ready

#### Scenario: A crawler that runs scripts
- **WHEN** a crawler with an empty browser renders `/learn/games/tala`
- **THEN** the rendered page holds Tala Lab's title and description, not the Mode picker

### Requirement: Other deep links ask for a Mode, then open the target
A first-time visitor who opens a page that is not public SHALL see the Mode picker first, and after a pick SHALL be taken to the page that was asked for, whenever it is a screen of the game, not only when it is a Find entry. The target SHALL then apply its own lock or Mode rule. The target SHALL be kept in memory only.

#### Scenario: A Kata link on a first visit
- **WHEN** a first-time visitor opens `/learn/kata/sq5/1` and picks Pro
- **THEN** Kata 1 of squaring numbers ending in 5 opens at `/learn/kata/sq5/1`

#### Scenario: A locked target on a first visit
- **WHEN** a first-time visitor opens `/learn/kata/sq5/12` and picks Challenger
- **THEN** the Locked screen for Kata 12 is shown at `/learn/kata/sq5/12`

### Requirement: A locked link shows the Locked screen
A link to a Kata, tower challenge or game Level that is not yet open for the current Player, by the same rules that lock it on its map, SHALL keep its address and show the Locked screen: a heading saying the step is locked, one line with the rule that opens it, a primary button to the first open step on the way, and a link back to its map. It SHALL never show an empty view or silently change the address, and a shared link SHALL never unlock a step.

#### Scenario: A Kata ahead of the Player
- **WHEN** a Player who has done Katas 1 to 3 of `sq5` opens `/learn/kata/sq5/12`
- **THEN** the address stays `/learn/kata/sq5/12`, the heading reads "Kata 12 is locked", the line reads "Finish Kata 11 to open it.", and the primary button goes to `/learn/kata/sq5/4`

#### Scenario: A tower challenge
- **WHEN** a Player with no Medal in chapter 2 opens `/learn/challenge/30`
- **THEN** the heading reads "Challenge 30 is locked", the line reads "Win a Medal on Challenge 29 to open it.", and the primary button goes to `/learn/challenge/26`

#### Scenario: A game Level
- **WHEN** a Player whose open Levels of Times sprint end at 8 opens `/learn/game/times-sprint/40`
- **THEN** the Locked screen names Level 40, and the primary button goes to `/learn/game/times-sprint/8`

#### Scenario: An open step
- **WHEN** a Player opens the Kata that follows the last one they did
- **THEN** the Kata opens as today

### Requirement: A deep link never loads Firebase for a Player under 13
No prerendered page, deep link, Locked screen or problem link SHALL load Firebase for a Player whose Age answer is under 13 or who has no Age answer, and none SHALL ask for the Age answer; Boards SHALL behave as they do today.

#### Scenario: An Arena link for a young Player
- **WHEN** an Explorer Player whose Age answer is under 13 opens `/learn/arena` on a cold load
- **THEN** no request goes to a Firebase or Google host, and the Device board is shown

### Requirement: Exact problem links
`/learn/skill/<id>?problem=<level>-<seed>`, with `<level>` from 1 to 3 and `<seed>` of 1 to 8 lowercase letters and digits, SHALL open that Skill's lesson with one question first in its Practice card: the question the Skill's generator makes at that level from the seed, the same for everyone, every time. Practice SHALL then continue as usual. A malformed `problem` SHALL open the lesson as usual.

#### Scenario: The same question for two people
- **WHEN** two Players on different devices open `/learn/skill/3-mult?problem=2-k7f9`
- **THEN** both see the same multiplication question first in Practice

#### Scenario: A broken problem
- **WHEN** a visitor opens `/learn/skill/3-mult?problem=9-%%`
- **THEN** the lesson opens as usual, with no error

### Requirement: Copy link to a question
For each Skill whose questions reproduce from a seed, the Practice card SHALL offer "Copy link to this question", which copies a problem link to the question on screen and says "Link copied". A problem link SHALL carry nothing about the Player.

#### Scenario: Copying a question
- **WHEN** a Player presses "Copy link to this question" on a Practice question of `v-near-base`
- **THEN** the clipboard holds `https://learnvedicmath.com/learn/skill/v-near-base?problem=<level>-<seed>`, and opening it shows that same question first

### Requirement: The game opens offline at any path
The service worker SHALL control `/learn/`. Offline, a navigation to any path under `/learn/` SHALL be answered with the saved game shell, which shows the screen for that path; no prerendered route page SHALL be precached. The same worker loaded under the old `/play/` scope SHALL keep no cache of its own and SHALL answer each navigation with a redirect to the same path under `/learn/`, leaving the saved voice and sound caches in place.

#### Scenario: Offline deep link
- **WHEN** a Player who opened the game online loses the connection and opens `/learn/games` from history
- **THEN** Games is shown

#### Scenario: An app installed before the switch
- **WHEN** a Player opens an app installed before the switch, which starts at `/play/?source=pwa`
- **THEN** the address becomes `/learn/?source=pwa`, Home is shown, and Studio voice lines heard before still play offline
