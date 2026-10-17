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
The play level a Player chooses: Explorer (about 4 to 7), Challenger (about 8 to 12) or Pro (13 to adult). It sets the wording, the grade range and the controls. It says nothing about the Player's real age.
_Avoid_: difficulty, age group, kid mode (Explorer is not the site-wide kid mode)

**League**:
The group a Player competes against on Boards. Always the same as their Mode.
_Avoid_: division, bracket, tier

**Age answer**:
A Player's reply to one neutral question about their age. It is the only thing that decides whether the Parent step is needed.
_Avoid_: age gate, age check, birthday

**Parent step**:
A grown-up's one-time permission, on this device, for a Player under 13 to post to World boards. Without it, nothing the Player does leaves the device.
_Avoid_: opt-in, consent screen, parental gate

## Learning

**Skill**:
One topic in the learning map, from counting to calculus. There are 135.
_Avoid_: lesson, topic, unit

**Trick**:
A Vedic method that turns a kind of problem into an easier one, such as squaring numbers ending in 5.
_Avoid_: shortcut, hack, strategy

**Sutra**:
One of the short named rules from Bharati Krishna Tirtha's 1965 book. Tricks are grouped under the Sutra they come from.
_Avoid_: formula, verse, Vedic sutra (never "from the Vedas")

**Say it**:
The button beside a Sutra name that plays its Name clip. It only ever plays after a tap, whether read aloud is on or off. (Proposed in the `sutra-pronunciation` change.)
_Avoid_: pronounce button, audio button

**Name clip**:
A short prerecorded clip of one Sutra name, made once with a free voice model from the name's checked spelling. There are 29, one per Sutra and sub-sutra.
_Avoid_: recording (it is not a human voice), sample

**Respelling**:
A Sutra name written so an English reader can say it: syllables joined by hyphens, long vowels spelled to be held, and one light beat per word part in capitals ("ay-kah-dhi-KAY-nuh poor-VAY-nuh").
_Avoid_: phonetic spelling, transliteration (that is the IAST)

**Sutra ambience**:
Very quiet sound on the Sutra pages: a soft bowl strike when a page opens, an optional low hum, or an opt-in chanted Om instead. Never over Calm music and silent when Sound effects is off. (Proposed in the `sutra-pronunciation` change.)
_Avoid_: background music, chanting (unless the Om is meant)

**Kata**:
A fixed practice problem for one Trick, numbered from easy to hard. Stars draw their questions from them; a Kata has no rating of its own.
_Avoid_: drill, exercise

**Belt**:
A rank, white to black, earned by lighting every Star of its three Tricks. The Sky's suggested path follows Belt order.
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
The opening of a new Player's first Star: a dare to beat the calculator, a short reveal of the Trick, then quick wins.
_Avoid_: first run, onboarding, tutorial

**Placement**:
A short check after the Hook that sets a new Player's starting Ratings and Belt, and the first Star Bolt suggests.
_Avoid_: test, quiz, assessment

**Bolt**:
The robot co-pilot who shows each Trick and reacts to the Player's answers. A teacher, never a pet: nothing to feed, dress or keep happy.
_Avoid_: mascot, buddy, pet, avatar

**Magic moment**:
A Trick learned and then used correctly in a timed round. The thing the product exists to produce.
_Avoid_: aha, win

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
The setting that speaks questions, hints and praise. On by default for Explorer, off for Challenger and Pro. Speech only ever follows a tap.
_Avoid_: TTS, narration, voice mode

**Built-in voice**:
The speech voice that comes with the Player's browser or device. The fallback for anything the Studio voice cannot say.
_Avoid_: system TTS, robot voice, default voice

**Studio voice**:
The default read-aloud voice: one paid neural voice recorded ahead of time and served as audio files, whole lines for Explorer and short clips joined at play time for the rest. Nothing is sent to say a line, and it plays offline once saved.
_Avoid_: TTS, cloud voice (it is not called at play time), recorded voice (no person recorded it)

**Natural voice**:
The opt-in voice that runs the Kokoro model on the device after a one-time download of about 100 MB. It can say any line whole.
_Avoid_: AI voice, neural voice, premium voice

## Rounds and results

**Ranked round**:
A round whose result counts on Boards: an Arena daily round, a ranked game round, the first attempt at the Daily Sutra, or a challenge-link round.
_Avoid_: competitive round, official round

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
_Avoid_: Duel (retired), versus, battle, multiplayer

**Play experience**:
One of the twelve pages where math is the way you play (Sutra Spellbook, Tala Lab, Daily Number and the rest), each inside a section: Dojo, Arena, Games or Sutras. A section lists its play experiences on its **Shelf**. Defined in `js/play/catalog.js`.
_Avoid_: mini-game, playground, Vedic Play

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
A Board shared with every Player online. A Player only appears on it after posting a Score or weekly Sparks total.
_Avoid_: global leaderboard, online board

**Device board**:
A Board made only from the Players on this device. Always available, offline included.
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
The page at `#/guide` that explains every part of the app in the words of the Player's Mode, one section per feature with a link to it.
_Avoid_: help, manual, FAQ, tutorial

**Tour**:
Up to six coach marks over Home, shown once per device on the first visit and replayable from the Guide. Not the Hook.
_Avoid_: onboarding, walkthrough, tutorial

**All places**:
The Sky as a plain list: every Constellation with its Stars and their states, every Landmark and every other place. The keyboard and screen reader way round the Sky.
_Avoid_: sitemap, menu, index

**Comeback**:
Getting the rematch right after a mistake in a Star. It pays more Sparks than a first-time right answer, at most once per kind of question in a round.
_Avoid_: retry, second chance, redemption
