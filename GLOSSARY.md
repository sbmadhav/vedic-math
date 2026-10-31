# Vedic Math for Everyone

A mental math learning game for ages 4 to adult, built around Vedic tricks: learn a trick, see why it works, then use it against the clock and against other players.

## Players

**Player**:
One person playing in one browser, known only by a Nickname. A device can hold several Players.
_Avoid_: user, account, kid, student

**Nickname**:
A made-up name built from fixed word lists (adjective, noun, number). Never typed by anyone.
_Avoid_: username, display name, handle

**Mode**:
The play level a Player chooses: Explorer (about 4 to 7), Challenger (about 8 to 12) or Pro (13 to adult). It sets the wording, the grade range and the controls. It says nothing about the Player's real age. Once a Player has a Placement level, that level, not the Mode, sets where Practice starts; and a Reading band adjusts wording and answers within the Mode. (Both proposed in the `placement` and `age-bands` changes.)
_Avoid_: difficulty, age group, kid mode (Explorer is not the site-wide kid mode)

**League**:
The group a Player competes against on Boards. Always the same as their Mode.
_Avoid_: division, bracket, tier

**Age answer**:
A Player's reply to one neutral question about their age. It is the only thing that decides whether a Player may post to World boards: 13 or over posts, under 13 uses Device boards only (`docs/adr/0006`). Kept only on the device and never sent.
_Avoid_: age gate, age check, birthday

**Grade answer**:
A Player's reply to "What grade are you in?" (Pre-K to 12 or Grown-up), or their age if they chose to give it instead. Kept only on the device and never sent. It decides the Reading band and nothing else. (Proposed in the `age-bands` change.)
_Avoid_: grade level, age gate, school grade (in code), grade (alone: that is a Skill map page)

**Reading band**:
How much reading help a Player gets, from their Grade answer: Early (about 4 to 6), Growing (about 7 to 9) or Fluent (10 and up). It changes read aloud, wording, answer buttons, the number of choices, Practice timers and Bolt's tone, in every Mode, and never math difficulty. A Player with no Grade answer has no band. Never shown to the Player. (Proposed in the `age-bands` change.)
_Avoid_: age band (in copy), age group, reading level, kid mode

**Parent step** (retired):
On sbmadhav.com, a grown-up's one-time permission, on the device, for a Player under 13 to post to World boards. Retired on learnvedicmath.com: Players under 13 use Device boards only, nothing writes `parentOk`, a record that still has one is ignored, and the Hand-off never carries it (`docs/adr/0006`).
_Avoid_: opt-in, consent screen, parental gate

## Learning

**Skill**:
One topic in the learning map, from counting to calculus. There are 136.
_Avoid_: lesson, topic, unit

**Trick**:
A Vedic method that turns a kind of problem into an easier one, such as squaring numbers ending in 5.
_Avoid_: shortcut, hack, strategy

**Sutra**:
One of the short named rules from Bharati Krishna Tirtha's 1965 book. Tricks are grouped under the Sutra they come from.
_Avoid_: formula, verse, Vedic sutra (never "from the Vedas")

**Sutra way**:
Working a sum with one Sutra's short rule in a line or two, the method the app teaches in place of school's long one (98 × 97: 95 | 06, not two rows and an add). The owner's "new method" (`sutras-first` change).
_Avoid_: Vedic method (it sounds like it is from the Vedas), shortcut, hack

**Sutra tag**:
The line that names the Sutra a Trick, Star, Try a trick, Kata, Arena question, video or game uses: its kind word (Sutra, Sub-sutra, Special case of, Uses the idea of), its name and its meaning in the Mode's words, as one link to its Deep dive. Never spoken. The map and the words are in `js/sutra-tag.js` (`sutras-first` change).
_Avoid_: badge (a badge is earned), label, chip

**Sutra progress**:
How far a Player is with one Sutra, worked out on the device from its Tricks' mastery, Stars lit, Katas done and whether its card is collected. A Sutra is started once one of its Tricks is practiced (it has a Skill record), one of its Stars is lit or one of its Katas is done; a collected card alone does not start it. Never stored on its own and never sent (`sutras-first` change).
_Avoid_: sutra score, sutra level, mastery (that is one Skill's)

**Verse** (śloka):
A genuine Sanskrit verse, prose rule (sūtra) or Vedic mantra about mathematics from an older text, shown in Mathematics in Sanskrit verse at the end of the Sutras page (`js/slokas.js`). Verses are not the source of the Sutras; the only verse in the 1965 book (gopī bhāgya, π/10) is the Swami's own.
_Avoid_: calling a Sutra a verse; "ancient" without a date

**Deep dive**:
The dialog that opens from a Sutra card's Learn more (route `#/sutras/<id>`): the plain explanation, an animated diagram, why it works, Worked examples, where it is used and further reading. Its close button and the footer to the previous and next Sutra stay pinned while it scrolls.
_Avoid_: modal, popup, detail page

**Worked example**:
One solved problem in a Deep dive: a question and the short steps the Sutra uses, ending in the result. Each Sutra and sub-sutra has at least three, from easy to harder; the first is shown open and the Player opens the others after trying them.
_Avoid_: sample, demo, Kata (a Kata is a practice problem the Player answers)

**Say it**:
The speaker button beside a Sutra name that plays its Name clip (its accessible name is "Hear how to say <name>"; in the deep dive and on Trick pages it shows the words "Hear how to say"). It only ever plays after a tap, whether read aloud is on or off, and a second tap stops it.
_Avoid_: pronounce button, audio button

**Name clip**:
A short prerecorded clip of one Sutra name, made once with a free voice model (Kokoro, the Alpha kid blend) from the name's checked spelling. There are 29, one per Sutra and sub-sutra, in `sounds/sutras/`.
_Avoid_: recording (it is not a human voice), sample

**Respelling**:
A Sutra name written so an English reader can say it: syllables joined by hyphens, long vowels spelled to be held, and one light beat per word part in capitals ("ay-kah-dhi-KAY-nuh poor-VAY-nuh").
_Avoid_: phonetic spelling, transliteration (that is the IAST)

**Sutra ambience**:
Very quiet sound on the Sutra pages: a soft bowl strike when a page opens (on by default), an optional low hum, or an opt-in chanted Om instead. Never over Calm music (if the music is already playing, it is the ambience), silent with Sound effects off, Calm or Pause motion, and it stops when the Player leaves the Sutra pages or the tab.
_Avoid_: background music, chanting (unless the Om is meant)

**Word problem**:
A question told as a short everyday story (a shop, a kitchen, a game, a trip) whose answer is one number. A share of every Mode's Practice questions and one question of a Star round are Word problems, more as the Mode grows: picture stories for Explorer, one and two steps for Challenger, multi-step real-life problems for Pro. Its first hint asks "What is it asking?"; no hint gives the answer. (`word-problems` change.)
_Avoid_: story question, puzzle, real-world problem (in copy, Explorer's label is "Story time")

**Kata**:
A fixed practice problem for one Trick, numbered from easy to hard. Stars draw their questions from them; a Kata has no rating of its own.
_Avoid_: drill, exercise

**Belt**:
A rank, white to black, earned by lighting every Star of its three Tricks. The Sky's suggested path follows Belt order. Belts and Stars come with Challenger and Pro: Explorer's Dojo shows the Tricks grouped by belt, with no Star counts or belt progress, and the Me page lists a belt badge to Explorer only once it is earned.
_Avoid_: level, rank, grade

**Rating**:
A Player's 1 to 20 number for one game, the Arena, or one Skill (each Trick is a Skill, and its Stars use its Rating). Right answers raise it, misses lower it, and it picks how hard the next question is.
_Avoid_: skill (that is a topic), dial, difficulty, level

**Level**:
One of the 72 numbered stages of a game, opened as the Player's Rating grows. A Level earns a Medal.
_Avoid_: stage, round, Star (a Star is not a Level)

**Medal**:
The bronze, silver or gold result for one game Level.
_Avoid_: stars (a Star is a Star Quest step), trophy, grade

**Hook**:
The opening of a new Player's first Star (the one Placement points to): a dare to beat the calculator, a short reveal of the Trick, then quick wins.
_Avoid_: first run, onboarding, tutorial

**Placement**:
The optional, untimed climb offered right after the Mode pick: one question per Step from school Skills, starting at the Mode's first grade, climbing on each right answer and ending at the second miss on a Step or after 12 questions. It finds the Placement level. Skippable and retakable from Me. (Proposed in the `placement` change.)
_Avoid_: test, quiz, assessment, intro challenge (in code)

**Placement level**:
The school grade, K to 12, that a Placement found: the highest Step answered right. It sets where Practice starts (Ratings with no saved value), the suggested Skills and the first Star; never the League or a Ranked round. The Player sees Steps climbed; grown-ups see "about grade N". Kept on the device. (Proposed in the `placement` change.)
_Avoid_: Level (that is a game stage), grade level, rank, placement score

**Step**:
One grade on the Placement climb. "You climbed 7 steps" counts the right answers.
_Avoid_: level, stage, question

**Bolt**:
The robot co-pilot who shows each Trick and reacts to the Player's answers. A teacher, never a pet: nothing to feed, dress or keep happy.
_Avoid_: mascot, buddy, pet, avatar

**Nikhilam Family**:
The brand mark: the Devanagari digits 1, 0 and 9 drawn as a family (a tall One, a baby Zero and a Nine), in the header, the hero picture on the landing page and the app home (where it is the site's mascot, `celebrations` change), the favicon (the baby Zero's face) and the app icons. Sources in `brand/nikhilam-family/`. Bolt teaches in the game; the Nikhilam Family is the site's name in pictures, and in the game they can also be the Player's Family helpers (proposed in the `family-helpers` change).
_Avoid_: logo Bolt

**Family helper**:
One of the Nikhilam Family as the Player's friend in the game: Shunya, Nava or Eka. Fellow students who learned from Bolt too, never teachers: they hop in when a Player is stuck and give a hint, the method or a worked example on other numbers, never the answer. Off until turned on in Me ("Try the Nikhilam Family helpers"), then set by "When they help". (Proposed in the `family-helpers` change.)
_Avoid_: tutor, assistant, AI helper, pet, teacher (that is Bolt)

**Shunya**:
The baby Zero of the Nikhilam Family as a Family helper: the funny one. Sometimes makes a playful mistake on another example for the others to catch (never for Early readers).
_Avoid_: Zero (in copy, as a name), baby

**Nava**:
The Nine of the Nikhilam Family as a Family helper: witty, the nodder with comebacks, the one who encourages.
_Avoid_: Nine (as a name)

**Eka**:
The tall One of the Nikhilam Family as a Family helper: a little serious, names the Sutra and works the steps through with the Player as a peer ("Bolt showed us this one...").
_Avoid_: One (as a name), the teacher

**Visit**:
One appearance of the Family helpers: one friend for a first stumble (a light hint), two for repeated trouble (the method and encouragement), all three for a real block (a short skit on other numbers) or a breakthrough cheer. At most one every 3 minutes unless the Player asks; it never covers the question, the answer or the round's buttons, and closes in one tap.
_Avoid_: popup, interruption, intervention

**Help signal**:
Something that may start a Visit: 2 misses in a row on one Skill, 3 misses in a round, about 20 seconds idle on one question, Hint pressed twice, leaving a round early after misses, or a help phrase in listening mode. Never acted on mid-question in a timed race.
_Avoid_: trigger (in copy), frustration detection

**Clue**:
In talking with the Family (13 and over), one reply that hints at the question on screen, or points at a part of it. Each question has a few; at zero the speakers explain the method in general. Talk about the method or the Sutra in general uses none, and the first clue on a question counts as the round's Hint. (Proposed in the `family-helpers` change, design D18.)
_Avoid_: hint token, credit

**Celebration**:
What the app does when something good happens (`js/celebrate.js`, `celebrations` change). The big confetti is only for a true win (a Star lit, a Medal, a Belt, a badge, a new Title, a first Sutra card, a personal best, a game won); everyday moments (picking a Mode, a right answer, a streak) get a small one, such as a card pop, a few sparkles or a bounce. None moves under reduced motion, Pause motion or Calm.
_Avoid_: reward animation, juice

**Magic moment**:
A Trick learned and then used correctly in a timed round. The thing the product exists to produce.
_Avoid_: aha, win

**Try a trick**:
A short lesson inside each Mode, at `#/try`: one Trick taught under the Sutra it belongs to, on one worked example with every step shown, then three questions and an end card with the next step. Explorer's is the 11 sandwich (Ūrdhva-Tiryagbhyām), Challenger's squares ending in 5 (Ekādhikena Pūrveṇa), Pro's multiplying near 100 (Nikhilaṃ Navataścaramaṃ Daśataḥ). It is reached from a card on each Mode's Home until it is finished (and from Find); the Mode picker's cards are its only buttons (`play-nav-by-mode`; before it, a Try a trick button under each Mode card). Right answers earn Sparks; it changes no Rating, mastery, Keep going, Star or Belt. (`try-trick-in-modes` change; before it, one Try a trick above the cards guessed Challenger and opened a Star.)
_Avoid_: demo, trial mode, guest mode

**Mode guess**:
A Mode set by the earlier Try a trick rather than picked (`modeGuess` on the Player record). Nothing sets one now (`try-trick-in-modes`); a record that still has one shows it on Home ("our guess for a first try") beside Change until any pick clears it. Kept on the device only.
_Avoid_: default mode, auto mode

**Door**:
One of the three cards at the top of Challenger and Pro Home, in both Modes the **Sutra door**, the Arena and the Skill map, each with one plain line that says what its word means. The other tiles wait under **More ways to play**.
_Avoid_: tile (that is what is under More ways to play), hero, CTA

**Sutra door**:
The first Door on Challenger and Pro Home (`sutras-first`): the next Star on Bolt's path shown as its Sutra's tag, "Next Star: <Trick>, Star n", Play this Star (Home's one primary button), Learn the sutra (its Deep dive), Open the Dojo with the belts in its foot, and one line saying what a Sutra and a Star are. After the doors, **Your sutras** lists the next Star's Sutra and up to three the Player has started, each with its Sutra progress. Explorer Home has no doors; its **A sutra to say** card names one Sutra a day with Say it and its Explorer meaning.
_Avoid_: Dojo door, Dojo card (the belts now sit in the Sutra door's foot)

**Find**:
The page at `#/find` (the **Find trigger**; the `/` key; Ctrl K or Cmd K) with one box over every named thing: sections, Play modes, grades, Skills, Tricks, Sutras, games, play experiences, guide sections and videos, by name or a plain word. Results match a share of the words typed (question words like how and what are ignored), more words matched first. Built in the page from the catalogs (`js/find.js`); nothing typed is stored or sent. Its browse list gives each section's one-line description, the same line the menu shows as a tooltip.
_Avoid_: search engine, site search, lookup

**Find trigger**:
The last item of the Challenger and Pro menu: a magnifying glass, the word Find and its shortcut (Ctrl K, or ⌘ K on a Mac). It is also the menu's way to the Guide: with nothing typed, Find offers the guide and the tour first. Explorer reaches Find under **More places**. (`play-nav-by-mode` change.)
_Avoid_: search bar, command palette, spotlight

**Best match**:
The first group of Find results when the query is a known question or phrase ("how does it work", "for kids", "what is vedic math"): the entries that answer it, listed before every kind and not repeated below. The phrases are `INTENTS` in `js/find.js`.
_Avoid_: top hit, featured result

**Watch shelf**:
The checked list of videos, Shorts and (for Pro) Links in `js/videos.js`, shown on the Watch page and in each Skill or Trick's "Watch it explained". Every video plays in the page.
_Avoid_: resources, library, feed

**Short**:
A vertical video of a minute or so, shown as a tall tile and played one at a time in the page. Never a swipe feed.
_Avoid_: reel, clip

**Link**:
A website or game on the Watch shelf that opens in a new tab. Pro only, like every link that leaves the site.
_Avoid_: resource, external site

**Read aloud**:
The setting that speaks questions, hints and praise. On by default for Explorer, off for Challenger and Pro. Speech only ever follows a tap. (Proposed in the `age-bands` change: a choice per Player, on by default for the Early Reading band in every Mode.)
_Avoid_: TTS, narration, voice mode

**Copy table**:
The one list of app wording that varies by Mode or Reading band (`app/src/logic/copy.ts`): each line with its Mode variants or a default, and Early and Growing variants. (Proposed in the `age-bands` change.)
_Avoid_: strings file, translations, i18n

**Built-in voice**:
The speech voice that comes with the Player's browser or device. The fallback for anything the Studio voice cannot say.
_Avoid_: system TTS, robot voice, default voice

**Studio voice**:
The default read-aloud voice: one paid neural voice recorded ahead of time and served as audio files, whole lines for Explorer and short clips joined at play time for the rest. Nothing is sent to say a line, and it plays offline once saved.
_Avoid_: TTS, cloud voice (it is not called at play time), recorded voice (no person recorded it)

**Natural voice**:
The opt-in voice that runs the Kokoro model on the device after a one-time download of about 100 MB. It can say any line whole.
_Avoid_: AI voice, neural voice, premium voice

**Listen**:
The button beside an explanation (a Skill's idea, a Sutra deep dive section, a Guide section) that reads it aloud with the Studio voice, else the Built-in voice. It only plays after a tap, also with Read aloud off, and one plays at a time.
_Avoid_: play button, speaker, read-aloud button (Read aloud is the setting)

## Rounds and results

**Ranked round**:
A round whose result counts on Boards: an Arena daily round, a ranked game round, the first attempt at the Daily Sutra, or a Challenge link's round on its own date in its League (then it is that day's daily round; on any other day or in another League the friend's round is Practice).
_Avoid_: competitive round, official round

**Challenge link**:
An Arena daily challenge link, `#/arena/day/<YYYY-MM-DD>/<league>/<score>`, carrying the date, the League and the Score to beat and nothing else (no Nickname, Rating or Player id). Made by **Challenge a friend** (Send to family in Explorer) on a daily result, with three lines of words. It opens the Arena lobby ready to Start, never a round: on its date in its League, Start plays that day's daily challenge, a Ranked round; on another day or in another League the friend's round plays as Practice, with today's challenge beside it. Defined in `shared/src/challenge.ts`.
_Avoid_: invite link, challenge code, share code (Ghost Races and Daily Number have their own share links)

**Calm**:
A setting for play with no clocks in Practice and no motion. Ranked rounds keep their clock. It is saved per device, like sound.
_Avoid_: zen mode, relaxed mode, reduced motion (that is the device setting)

**Practice**:
Any round that is not a Ranked round, including every Star and replays of the same Daily Sutra. Its Score never leaves the device; the Sparks it earns still count.
_Avoid_: training, free play, unranked

**Run**:
An Endless run: questions until three lives are lost, scored by how far the Player gets. A kind of Practice.
_Avoid_: first run, streak

**Party Mode**:
Two to four Players on one screen, each answering questions at their own Mode, over a set of rounds that ends on a podium. It replaced the Duel; `#/duel` opens it.
_Avoid_: Duel (retired for the same-screen game; `duel-online` proposes it for the online game), versus, battle, multiplayer

**Play experience**:
One of the twelve pages where math is the way you play (Sutra Spellbook, Tala Lab, Daily Number and the rest), each inside a section: Dojo, Arena, Games or Sutras. A section lists its play experiences on its **Shelf**. Defined in `js/play/catalog.js`.
_Avoid_: mini-game, playground, Vedic Play

**Duel**:
Two Players on two devices racing the same question online at the same time. The server decides who answered right first, and the first to 10 points wins. Played with a friend (Friend Duel) or, for Players 13 and over, with someone new in the same League (Random Duel). Never posted to a Board. (Proposed in the `duel-online` change, not yet approved. Live today, the same-screen Duel is retired: Party Mode replaced it and `#/duel` opens Party Mode. Whether the word comes back for the online game is an open question in `duel-online`.)
_Avoid_: versus, battle, multiplayer, match (fine in code, not in copy)

**Friend Duel**:
A Duel with someone the Player knows, joined by a Duel code or its link. Open to every Player, under 13 included; nothing about either Player is kept more than 10 minutes after it (reports aside).
_Avoid_: private match, invite game

**Random Duel**:
A Duel with another waiting Player in the same League, found by Find a player. Only for Players whose Age answer is 13 or over.
_Avoid_: matchmaking (fine in code), ranked duel, public match

**Duel code**:
Six letters from 20 consonants (no vowels, so never a word) that let a friend join a Friend Duel for 10 minutes. Also carried in the hash of a Duel link.
_Avoid_: room code, PIN, invite code

**Reaction**:
One of six preset messages a Player can send during a Duel (Nice one!, Good game, Wow!, Oops!, Rematch?, Thanks!). The only thing one Player can send another; there is no chat.
_Avoid_: emote, chat, message, sticker

**Report**:
Telling the service, with one of four fixed reasons and no text, that something was wrong in a Duel. It ends the Duel for the Player who reports and blocks the other.
_Avoid_: flag, complaint

**Block**:
Ending a Duel so the two Players are not paired again: for a week in Random Duels, and by closing the room in Friend Duels (there is no friend list to remember).
_Avoid_: ban, mute (mute only hides Reactions)

**Duel key**:
A random key made on the device for a Player 13 or over at their first Random Duel and replaced every week (the old one is kept 7 more days so a Block lasts its full week). Only its hash is sent, and only Block and the automatic limits use it. Under-13 Players never have one.
_Avoid_: user id, device id, account

**Title**:
A name a Player earns from their total Sparks, from Number Rookie to Vedic Legend. It has no number.
_Avoid_: level, rank, player level

**Score**:
The points from one Ranked round, weighted by how hard each question was.
_Avoid_: points total, result, Sparks

**Sparks**:
Progress points a Player earns from everything they do, Practice included. They add up to one weekly total, and in a Star they light it. The only progress number besides Score.
_Avoid_: XP, experience, points, score

**Board**:
A ranked list for one League and one period (a day or a week). Arena, each game, the Daily Sutra and weekly Sparks each have their own Boards.
_Avoid_: leaderboard (fine in copy, not in this glossary), ranking, table

**World board**:
A Board shared with every Player online. A Player only appears on it after posting a Score or weekly Sparks total. Shown only to a Player whose Age answer is 13 or over, after a tap on Show World board; a World board is listed for 28 days after its day or week begins, and each entry expires 30 days after its last update and is then deleted (in the background, usually within a few days).
_Avoid_: global leaderboard, online board

**Device board**:
A Board made only from the Players on this device. Always available, offline included. The only Board a Player under 13, or without an Age answer, sees.
_Avoid_: local leaderboard, offline board

## Star Quest

**Sky**:
The home map. Every Constellation in it, open from the start, with a suggested path between Stars.
_Avoid_: world map, level map, home screen

**Constellation**:
The Stars of the Tricks that come from one Sutra.
_Avoid_: chapter, world, unit

**Star**:
One of three steps of rising difficulty for one Trick, played as a short round. It lights up when the Player earns enough Sparks in one go. Every Star is open; none is locked.
_Avoid_: level (that is a game stage), stage, node

**Skip**:
Passing over a Star without lighting it. A skipped Star is marked as skipped and earns nothing; lighting it later clears the mark.
_Avoid_: fail, give up, unlock

**Dare**:
An optional harder question offered during a Star. Right pays double; a miss costs nothing and still shows the Trick.
_Avoid_: challenge, boss, bonus question

**Landmark**:
A place on the edge of the Sky that leads somewhere else in the app, such as the Arena, Party Mode, Games, Watch or the Skill map.
_Avoid_: tab, menu item, building

**Guide**:
The page at `#/guide` that explains every part of the app in the words of the Player's Mode, one section per feature with a link to it. Reached from Find, the footer and Explorer's More places (How to play).
_Avoid_: help, manual, FAQ, tutorial

**Zone**:
One item of the game's menu, holding a group of routes and marked current on every route inside it (`js/nav.js`, `play-nav-by-mode` change). Challenger and Pro: Home, Learn (the Sutras first, then the Skill map), **Arcade** and Watch, then the Find trigger; Me is the Player chip. Explorer: Play (Home), Learn and Me, as big picture tabs that say their names with Read aloud on. A zone changes how a page is reached, never its route.
_Avoid_: tab (in specs), section (that is a Find kind), hub

**Arcade**:
The zone and page at `#/arcade` for playing: a card each for the Dojo (solo practice of the Tricks; not in Explorer), the Arena (the daily timed race) and Games, then Party Mode and the challenge tower.
_Avoid_: Play (that is Explorer's Home tab), hub, games page

**More places**:
The row under Explorer Home's picture tiles with the places Explorer's three-tab menu leaves out: All games, The sutras, How to play (the Guide) and Find.
_Avoid_: menu, more

**Calm and sound**:
The header control on every page of the game (visible word "Calm", a note icon) whose panel holds the Calm switch, Pause motion, Calm music and the Moving background; the play shell has the same control with Pause motion and Calm music beside its own Calm switch. It never starts anything by itself. (`play-nav-by-mode` change; before it, the Music pill.)
_Avoid_: music button, focus mode, zen

**Tour**:
Up to six coach marks over Home, shown once per device on the first visit and replayable from the Guide. Not the Hook.
_Avoid_: onboarding, walkthrough, tutorial

**All places**:
The Sky as a plain list: every Constellation with its Stars and their states, every Landmark and every other place. The keyboard and screen reader way round the Sky.
_Avoid_: sitemap, menu, index

**Installed app**:
The game opened from its home screen, dock or app list icon rather than in a browser tab: a standalone window (or `navigator.standalone` on iPhone and iPad) with the scope `/play/`. Links that leave the scope open in the browser. (`install-app` change.)
_Avoid_: PWA (in copy), native app, the app (when the browser tab is meant too)

**Install guide**:
The dialog that tells a Player how to install the game on the device in hand, with one tap where the browser offers it, and says plainly where it cannot be installed. Opened from the Me page, the footer, the Guide and the Install nudge. (`install-app` change.)
_Avoid_: wizard (in copy), installer, popup

**Install nudge**:
The small card in Home's one slot for it that offers the Installed app, on a Player's second day of play, where the browser can install. "Not now" puts it off for 7 days, at most three times. Not a dialog. (`install-app` change.)
_Avoid_: banner, popup, prompt (the browser's own install dialog is the prompt)

**Prompt slot**:
The rule that at most one prompt or visitor asks for a Player's attention at a time (`js/prompt-slot.js`): the Install nudge and the tour claim it, and later prompts (the Family helpers' visitors) wait for it, as they wait while a dialog, a toast or a round is on screen. (`install-app` change.)
_Avoid_: queue, z-index (a layer is not the rule)

**Comeback**:
Getting the rematch right after a mistake in a Star. It pays more Sparks than a first-time right answer, at most once per kind of question in a round.
_Avoid_: retry, second chance, redemption

**Decoration**:
Moving pictures that carry no information and take no input: the Sky in 3D, Sutra deep-dive illustrations, the Moving background, celebrations and Mandala Studio's glow. The only thing WebGL may draw (ADR 0011), as 3D scenes (ADR 0013). With reduced motion, Pause motion or Calm it holds a still frame and celebrations do not run. (The Sky in `react-typescript`; the rest proposed in the `gpu-effects` change.)
_Avoid_: effects, animations (too broad), graphics

**Performance budget**:
The written limits a build or pull request must meet: under 150 KB of Brotli-compressed JS before play, first contentful paint under 1.5 s on a mid phone over 4G, and the rest in `docs/perf/baseline.md`. CI fails when one is missed. (Proposed in the `render-performance` change.)
_Avoid_: target, goal (a budget fails the build)

## The move to learnvedicmath.com

Proposed in the `learnvedicmath` change (`openspec/changes/learnvedicmath/`, ADRs 0004 to 0006).

**Landing page**:
The static page at `https://learnvedicmath.com/` that says what Vedic Math is and leads into the app at `/play/` (its Start learning button; the header and footer link is Learn). A device that already has Players goes straight past it into the game.
_Avoid_: home (Home is the game's first view), splash, homepage

**Mode card** (landing page):
One of the three links under "Pick how you learn" on the Landing page, one per Mode, each with its call to action ("Start as Explorer"). It is a Mode link. (`landing-modes-and-return` change.)
_Avoid_: tile (tiles are on the game's Home)

**Mode link**:
`/play/?mode=<id>`: opens the game with that Mode set as if it were picked on the Mode picker, then drops `mode` from the address. An unknown id changes nothing.

**Welcome back** (landing page):
The Landing page's version for a device that already has Players, seen only through `/?home` (the brand link in the game): the hero greets the active Player by Nickname, its button reads Keep playing, and the Player's Mode card is marked Your Mode. It only reads storage; the first-visit version is the page's HTML.
_Avoid_: returning user page, logged-in view

**Hand-off**:
Moving one device's Players, progress and settings from sbmadhav.com/vedic-math/ to learnvedicmath.com, once, on the device, after the Player says yes. World board identities and the Parent step never move.
_Avoid_: migration (that is a schema upgrade), sync, transfer, import (the import page is where a Hand-off lands)

**Moved page**:
The page that replaces sbmadhav.com/vedic-math/ during Phase B of the move. It retires the old service worker and starts the Hand-off.
_Avoid_: redirect page, splash

**Export page**:
The permanent page at sbmadhav.com/vm-export/ that hands a device's old progress to learnvedicmath.com in a popup, for Players who come back after the redirect is permanent.
_Avoid_: backup page, old site

## The React migration

Proposed in the `react-typescript` change (`openspec/changes/react-typescript/`, ADRs 0012, 0013 and 0014).

**Legacy view**:
A screen still drawn by the old template-string code, mounted by the router through the adapter that gives it its root element and signal. Every Legacy view becomes a React view during the migration.
_Avoid_: old page, vanilla view

**Locked view**:
A view that a migration pull request is moving. Feature pull requests that touch it wait until that pull request is merged; content changes never wait.
_Avoid_: frozen view, blocked view

**3D scene**:
A decoration drawn with three.js behind the interface, such as the Sky in 3D. It carries no information, takes no input, and falls back to a still frame or the 2D drawing.
_Avoid_: 3D mode, WebGL view

**Server line**:
A spoken sentence that holds a question's own numbers ("What is 47 plus 38?"), built from one of the game's sentence templates, voiced once by the server and kept in a cache, so every later Player hears the same file. Lines whose words never change keep their Studio voice recordings. A Server line never holds a name, a Nickname or anything typed.
_Avoid_: TTS line, dynamic clip, live audio

**Live session**:
Reserved for a follow-on change after Duels: a grown-up host starts a quiz, Players join by code with their generated Nicknames, and scores update live for everyone in the room. Not built in `react-typescript`.
_Avoid_: classroom mode, multiplayer, live game

