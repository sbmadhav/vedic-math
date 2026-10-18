/* The in-app guide (#/guide) and the first-visit tour (openspec in-app-guide): data and pure logic only, so it can
   be tested in Node. js/app.js draws the guide page (guideView), js/guide-art.js draws each section's picture and
   js/tour.js draws the tour. Wording comes in three versions, one per Mode: a string is the same for everyone, and
   w(explorer, challenger, pro) gives simpler words for Explorer. `covers` lists sample routes each section explains;
   test/guide.test.mjs checks that together they cover every route in js/app.js, and that every Try it link opens a
   real route with a real catalog id. Counts come from the catalogs through `n`, never typed into the copy. */

/* w(explorer, challenger, pro): pro defaults to the challenger wording */
export const w = (explorer, challenger, pro = challenger) => ({ explorer, challenger, pro });
/* Resolve a string or a w(...) object for a Mode; no Mode yet reads as Challenger */
export const say = (v, mode) => (v && typeof v === 'object' && !Array.isArray(v) ? v[mode] ?? v.challenger : v);
export const MODES = ['explorer', 'challenger', 'pro'];

/* Groups, in page order */
export const GROUPS = [
  { id: 'start', title: w('Start here', 'Getting started') },
  { id: 'learn', title: w('Learn', 'Learn and practice') },
  { id: 'tricks', title: w('Speed tricks', 'Speed tricks and sutras') },
  { id: 'play', title: w('Play and race', 'Games, races and leaderboards') },
  { id: 'extras', title: w('More things to try', 'Settings, extras and privacy') }
];

/* n holds live counts from app.js: skills (topics, without the tricks), tricks, belts, katasPer, kataCount, sutras,
   subsutras, games, levelsPerGame, chapters, perChapter, challenges, badges, videoMinutes, starsPerBelt */
export function sections(n) {
  const fmt = x => Number(x).toLocaleString('en-US');
  return [
    { id: 'around', group: 'start', art: 'nav', covers: ['#/', '#/guide', '#/guide/around'],
      title: w('Find your way', 'Getting around'),
      what: w('The menu at the top takes you to every part of the app.', 'The menu bar at the top takes you to every part of the app. Your Me page is the round avatar at its right end.'),
      how: [
        w('Tap Home, Learn, Arena, Games, Watch or Guide in the menu.', 'Pick Home, Learn, Dojo, Arena, Games, Sutras, Watch or Guide in the menu bar.'),
        w('On a phone, slide the menu sideways to see the rest.', 'On a phone, swipe the menu bar sideways to reach the music button and your Me page.'),
        w('Daybreak makes the page light. Deep Space makes it dark.', 'Daybreak (light) and Deep Space (dark) at the top change the colors; System follows your device.'),
        w('The links above a page title take you back a step.', 'The trail of links above each page title (Vedic Math / Games / ...) takes you back a step.'),
        w('The Star map button at the top shows the rest of this website.', 'The Star map button at the top opens a map of every page on sbmadhav.com.', 'Explore, at the top, opens a map of every page on sbmadhav.com.')
      ],
      tip: w('Lost? Tap Home. This guide is always in the menu.', 'Keyboard friendly: Tab moves between buttons, Enter checks an answer, and Escape closes any pop-up.'),
      try: { action: 'tour', label: w('Show me around', 'Take the tour') } },

    { id: 'modes', group: 'start', art: 'modes', covers: [],
      title: 'Play modes',
      what: w('Explorer, Challenger and Pro are three ways to play. Explorer has big buttons and pictures.', 'Three modes set the words, the questions and your league on the leaderboards: Explorer (about 4 to 7), Challenger (about 8 to 12) and Pro (13 to adult). A mode says nothing about your real age.'),
      how: [
        'You pick a mode on your first visit.',
        w('To change it, open Me and tap a different mode.', 'To change it later, open Me and choose under Play mode, or press Reset play mode at the bottom of any page.'),
        w('Explorer: big answer buttons, pictures and questions read out loud.', 'Explorer: big answer buttons, pictures, read-aloud and a shorter menu. Challenger: speed tricks, belts and daily races. Pro: algebra to calculus, sutra deep dives and today\'s leaderboard on Home.')
      ],
      tip: w('Your Sparks and badges stay when you change modes.', 'Your progress stays when you switch modes, and each player on the device keeps their own mode.'),
      try: { href: '#/me', label: w('Change my mode', 'Change mode on Me') } },

    { id: 'home', group: 'start', art: 'home', covers: ['#/', '#/tiles'],
      title: w('Home and Sparks', 'Home, Sparks and daily quests'),
      what: w('Home shows your name, your Sparks and fun things to play.', 'Home shows your nickname, Title, Sparks, day streak and badges, plus the best next things to play.'),
      how: [
        w('Every right answer gives you Sparks.', 'A right answer on the first try earns 10 Sparks, plus up to 5 more for answers in a row; after a hint or a second try it earns 5. Games, katas, races and quests earn Sparks too.'),
        w('Sparks fill your bar. A full bar gives you a new Title, like Digit Dasher.', 'Sparks fill the bar to your next Title, from Number Rookie to Vedic Legend.'),
        w('Little goals each day give you bonus Sparks.', 'Daily quests set three small goals each day, worth 25 bonus Sparks each. Challenger and Pro see them on Home.'),
        w('The Keep going button takes you back to what you did last.', 'The Keep going card jumps back to the last skill you practiced.')
      ],
      tip: w('Come back every day. Seven days in a row earns a badge!', 'A few minutes every day beats one long session. Practicing seven days in a row earns the Week warrior badge.'),
      try: { href: '#/', label: 'Go to Home' } },

    { id: 'me', group: 'start', art: 'me', covers: ['#/me', '#/progress'],
      title: w('Me and badges', 'Me page and badges'),
      what: w('Your own page: your name, your color and your badges.', `Your profile: nickname, avatar color, Title, ${n.badges} badges, progress by level and settings.`),
      how: [
        w('Tap your round picture at the top right to open Me.', 'Tap your avatar at the right end of the menu bar. Its small bar fills toward your next Title.'),
        w('Tap New nickname for a new silly name. Tap a color dot to change your color.', 'New nickname picks another made-up name; the color dots change your avatar.'),
        w('Badges you do not have yet say how to win them.', 'Badges you have not earned yet say exactly how to earn them.'),
        w('Settings turn sounds, read-aloud and Calm on or off.', 'Settings: sound effects, read-aloud and its voice, Calm, the moving background and text size.')
      ],
      tip: w('Names are made up for you, so you never type your real name.', 'Nicknames come from fixed word lists and are never typed, so no real names are needed anywhere.'),
      try: { href: '#/me', label: 'Open Me' } },

    { id: 'skills', group: 'learn', art: 'rings', covers: ['#/learn', '#/grade/3', '#/mix/3', '#/run/3'],
      title: 'Skill map',
      what: w('Lots of math to learn, from counting all the way up. Each skill has a ring to fill.', `${fmt(n.skills)} skills from counting to calculus, grouped by level from K to 12, plus ${n.tricks} speed tricks.`, `${fmt(n.skills)} skills from counting to calculus, grouped by level from K to 12, plus ${n.tricks} speed tricks. Each one makes new questions forever.`),
      how: [
        w('Tap Learn, then pick a level.', 'Open Learn and pick a level. Levels suggested for your mode come first; the rest are under All other levels.'),
        w('Practice a skill to fill its ring. A full ring means you got it!', 'Practice a skill to fill its ring. It counts as mastered after at least 8 problems at 85% or better, weighted toward recent answers.'),
        w('Endless practice mixes all the skills in a level.', 'Endless practice mixes every skill in a level, with hints, and favors skills you are still learning.'),
        w('Endless run gives you 3 lives. How far can you go?', 'Endless run gives you 3 lives and counts how far you get. Beat your best.')
      ],
      tip: w('Mixed questions feel harder. That is how your brain gets stronger.', 'Mixed practice feels harder than one topic at a time, and that is exactly why it makes learning stick.'),
      try: { href: '#/learn', label: 'Open the skill map' } },

    { id: 'practice', group: 'learn', art: 'practice', covers: ['#/skill/3-mult'],
      title: w('Practice', 'Lessons and practice'),
      what: w('Each skill shows you how, then lets you try.', 'Every skill has a picture-first lesson next to practice that never runs out.'),
      how: [
        w('Look at How it works. Watch me do one shows an example.', 'Read How it works, then Watch me do one. Another example shows a fresh one.'),
        w('Tap your answer. Not right? Try again, and a hint comes to help.', 'Type your answer and press Check (or Enter). Miss once: try again. Miss twice: a hint appears. Miss a third time: the worked steps appear.'),
        w('Hint gives a clue. Show me shows all the steps. Hear it reads the question.', 'Hint gives a clue at any time, Show me reveals the worked steps, and Hear it reads the question aloud.'),
        w('Small answers come as big number buttons to tap.', 'When a question needs symbols, keys like x, ^, √, π or < appear under the answer box. Some lessons end with Watch it explained videos.')
      ],
      tip: w('Try first before you ask for a hint. You get the most Sparks that way!', 'First-try answers count most toward mastery and earn the most Sparks. Hints still teach the strategy, so use them when stuck.'),
      try: { href: w('#/skill/k-add10', '#/skill/3-mult', '#/skill/9-factor'), label: w('Try an adding skill', 'Try a practice skill', 'Try factoring practice') } },

    { id: 'dojo', group: 'tricks', art: 'belts', covers: ['#/dojo', '#/tricks', '#/skill/v-from9'],
      title: w('Dojo and speed tricks', 'Dojo: speed tricks and belts'),
      what: w('Fast math tricks. Each trick has a page that shows how it works.', `${n.tricks} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in ${n.belts} belts from white to black.`),
      how: [
        w('The Dojo is not in the Explorer menu, so use the button below.', 'Open the Dojo from the menu bar.'),
        w('Tap a trick to open its page.', `Each belt has three tricks. Light all ${n.starsPerBelt} Stars of a belt's three tricks to earn it.`),
        w('Watch it work shows each step. Tap Next step to go on.', 'On a trick page, Watch it work runs the trick step by step: type your own numbers and press Show steps, or tap New numbers. Use Back, Next step or Show all.'),
        w('Then practice the trick under it.', 'Then practice the trick in the box beside it, just like any skill.')
      ],
      tip: w('Watch a trick to its last step for 5 Sparks!', 'Watching a trick to its last step earns 5 Sparks once and counts for the Watch a speed trick quest.'),
      try: { href: '#/dojo', label: 'Open the Dojo' } },

    { id: 'stars', group: 'tricks', art: 'stars', covers: ['#/star/from9/1'], modes: ['challenger', 'pro'],
      title: 'Stars',
      what: `Every trick has three Stars, from easier to harder. A Star is a short round of four questions on that trick, and every Star is open from the start.`,
      how: [
        'Open a Star from a trick page, the Dojo or the Sky.',
        'Earn 40 Sparks in one round to light it. Each right answer is worth 10.',
        'Miss one and the trick plays on your own numbers, then you get a rematch. Getting it right is a Comeback, worth 15.',
        'From the second question a Dare may appear: a harder question worth 20 Sparks. A miss costs nothing.',
        'Not ready? Skip this Star marks it skipped. Lighting it later clears the mark.'
      ],
      tip: 'A mistake is worth more than you think: a Comeback pays more than a first-time right answer.',
      try: { href: '#/star/from9/1', label: 'Play the first Star' } },

    { id: 'sky', group: 'tricks', art: 'sky', covers: ['#/places'], modes: ['challenger', 'pro'],
      title: 'The Sky',
      what: w('An optional Home made of Stars: one Constellation for each sutra, three Stars for each trick, and Bolt the robot to show the way.', 'An optional Home made of Stars: one Constellation for each sutra, three Stars for each trick, and Bolt the robot to show the way.', 'An optional Home map: every trick\'s three Stars, grouped by sutra, with a suggested path in belt order.'),
      how: [
        'Turn it on in Me, under Settings: Try the new Sky.',
        'Bolt waits at the suggested Star, with a dotted path to the next two. Tap any Star to play it.',
        'The places on the edge (Arena, Party, Games, Watch and the Skill map) take you there.',
        'All places shows the same Stars and places as a plain list, which suits a keyboard or a screen reader.'
      ],
      tip: 'Prefer the old Home? Switch the Sky off on Me, or open The tile home from All places.',
      try: { href: '#/places', label: 'Open All places', more: { href: '#/me', label: 'Turn on the Sky' } } },

    { id: 'katas', group: 'tricks', art: 'katas', covers: ['#/katas/from9', '#/kata/from9/1'],
      title: 'Katas',
      what: w('Short drills for each trick. Finish one to open the next.', `${n.katasPer} numbered drills for every trick, ${fmt(n.kataCount)} in all. Each kata is 5 to 8 problems, and they get harder as you climb.`),
      how: [
        w('Open the Dojo and tap Katas under a trick.', 'In the Dojo, tap Katas under any trick.'),
        w('Get most of them right to finish a kata and open the next one.', 'Get at least 60% right to finish a kata and unlock the next. Each one shows a par time to aim for.'),
        w('You get one try for each question. A miss shows you the answer.', 'One try per question: a miss shows the answer and the first steps. Each right answer earns 5 Sparks, and finishing adds 10.')
      ],
      tip: w('Learn the trick first, then do katas to get fast.', 'Learn the trick on its own page first, then use katas to build speed.'),
      try: { href: '#/katas/from9', label: 'Try the first katas' } },

    { id: 'sutras', group: 'tricks', art: 'card', covers: ['#/sutras', '#/sutras/s1'],
      title: w('Sutra cards', 'Sutra cards and deep dives'),
      what: w('Cards with short math sayings. Flip them to collect them.', `The ${n.sutras} sutras and ${n.subsutras} sub-sutras from Bharati Krishna Tirtha's 1965 book: short word formulas, each a whole method in a phrase, as cards to collect.`),
      how: [
        w('Sutras is not in the Explorer menu, so use the button below.', 'Open Sutras from the menu bar.'),
        w('Tap a card to flip it. That collects it!', 'Tap a card to flip it and collect it (5 Sparks the first time).'),
        w('Learn more shows a moving picture that explains it.', 'Learn more opens a deep dive: an animated diagram, why it works, worked examples, where it is used and Try it yourself buttons.'),
        w('Close it with the X button.', 'Move to the next sutra with the buttons at the bottom. Close with the X button or Escape.'),
        w('At the bottom are real old math poems in Sanskrit. Tap Listen to hear one.', 'At the end of the page, Mathematics in Sanskrit verse has real verses from older texts (Āryabhaṭa, Brahmagupta, the Līlāvatī and more), each with its meaning, the math, a word-by-word reading and a Listen button.')
      ],
      tip: w('Learning a trick well collects its card too.', 'Mastering a trick collects its sutra card for you. The top of the page tells where Vedic math comes from and what the moving background shows.'),
      try: { href: '#/sutras', label: 'See the sutra cards', more: { href: '#/sutras/s1', label: 'Open a deep dive' } } },

    { id: 'games', group: 'play', art: 'dial', covers: ['#/games', '#/game/make-ten', '#/game/make-ten/1'],
      title: 'Games',
      what: w(`${n.games} number games. They get harder when you do well.`, `${n.games} games, each with ${n.levelsPerGame} levels and its own leaderboard. Every game adapts to you.`),
      how: [
        w('Open Games and tap one. Games for you come first.', 'Open Games. Games picked for your mode come first.'),
        w('Ranked round is a real race. Endless practice has no rush: tap Finish when you are done.', 'Choose Ranked round (a fixed length, counts for the leaderboard) or Endless practice (no clock; press Finish when you are done).'),
        w('The level bar goes from 1 to 20. Right answers make it harder, misses make it easier.', 'Your Rating in each game runs from 1 to 20: right answers raise it, misses lower it, and points are worth more when it is higher, so the leaderboard stays fair.'),
        w('Below the game is a map of levels with Medals to win.', `Below each game, ${n.levelsPerGame} levels open up as your Rating grows. Each level has bronze, silver and gold Medal goals.`)
      ],
      tip: w('Play every game once to earn a badge.', 'Play every game once for the Game explorer badge.'),
      try: { href: '#/games', label: 'Open Games' } },

    { id: 'arena', group: 'play', art: 'timer', covers: ['#/arena'],
      title: w('Race the clock', 'Arena: the daily race'),
      what: w('Answer as many as you can in 60 seconds.', '60 seconds, and the same questions for everyone in your league today, so it is a fair race.'),
      how: [
        w('Tap Start. Wait for 3, 2, 1, then go!', 'Pick Daily challenge (counts for the leaderboard), Practice round (adapts to your Arena Rating) or Practice, no clock. Then press Start.'),
        w('Each right answer gives points. Right answers in a row give extra points.', 'Each right answer is worth 10 points, and answers in a row add a combo bonus.'),
        w('The race fills the screen. Stop ends it early.', 'The round fills the screen with the keypad in view. Stop ends it early, and nothing is saved.'),
        w('See who is the fastest on the boards below.', 'Below: today\'s board, this week\'s board and Most Sparks this week.')
      ],
      tip: w('Play the daily race on 3 days to earn a badge.', 'Finish the daily challenge on 3 different days for the Daily habit badge. Score 200 in one round for Arena star.'),
      try: { href: '#/arena', label: 'Open the Arena' } },

    { id: 'tower', group: 'play', art: 'tower', covers: ['#/tower', '#/tower/1', '#/challenge/1'],
      title: 'Challenge tower',
      what: w('Lots of short challenges. Climb as high as you can.', `${fmt(n.challenges)} challenges in ${n.chapters} chapters of ${n.perChapter}, in five kinds: Sprint, Sharpshooter, Survival, Time attack and Boss round.`),
      how: [
        w('In the Arena, tap Challenge tower.', 'In the Arena, tap the Challenge tower banner.'),
        w('Pick a chapter. Finish a challenge to open the next one.', 'Pick any chapter. Inside it, clear each challenge to unlock the next.'),
        w('Win a bronze, silver or gold Medal on each one.', 'Each challenge says its goal and the score or time for a bronze, silver or gold Medal.')
      ],
      tip: w('A Boss round is hard and gives you only two lives.', 'Boss rounds mix hard questions and give you only two lives. Warm up on a Sprint first.'),
      try: { href: '#/tower', label: 'Open the tower' } },

    { id: 'party', group: 'play', art: 'duel', covers: ['#/arena/party'], /* #/duel redirects here */
      title: w('Party time', 'Party Mode'),
      what: w('Two to four players on one screen. Everyone gets questions just right for them!', 'Two to four players on one screen, each answering at their own play mode, over six kinds of rounds that end on a podium. It took the place of the Duel.'),
      how: [
        w('In the Arena, tap Party Mode. Pick a name and a color for each player.', 'In the Arena, open Party Mode. Each player picks a name from the lists, a color and a level.'),
        w('Each player has a buzz key. Buzz, then answer!', 'Each player has a buzz key (Q, P, Z or M) or a corner of the screen. Buzz, then answer on the big choices.'),
        w('Wrong answers let others steal the point.', 'A wrong answer locks you out and lets the others steal. The last round is double or nothing.')
      ],
      tip: w('Grown-ups and little ones can play together. The game keeps it fair!', 'Leave the handicap on when a grown-up plays a young player: each scores by their own level.'),
      try: { href: '#/arena/party', label: 'Start a party' } },

    { id: 'playmore', group: 'play', art: 'dial', covers: ['#/dojo/spells', '#/dojo/locks', '#/arena/ghosts', '#/arena/daily-number', '#/games/tala', '#/games/art', '#/games/wall', '#/games/apprentice', '#/games/bets', '#/games/lens', '#/sutras/lost-scroll'],
      title: w('More ways to play', 'Play experiences'),
      what: w('Music, art, races and number puzzles. Find them on the Games and Arena pages.', 'Twelve ways to play where math is what you do: cast tricks as spells, crack locks, clap rhythms, paint mandalas, solve the Daily Number, race your ghost and more. Each lives on its section\'s page.'),
      how: [
        w('Open Games or the Arena and look for the cards under the title.', 'Open the Dojo, Arena, Games or Sutras page and pick a card from its shelf.'),
        w('Each one shows you what to do. Try, play and make things!', 'Each one starts by showing, not telling. Share a Daily Number grid, a ghost or a mandala with a link.'),
        w('Playing them earns Sparks too.', 'Finishing a puzzle, lock, round or chapter earns Sparks, up to 150 a day.')
      ],
      tip: w('Tala Lab and Mandala Studio play music. Turn the sound on!', 'Tala Lab and Mandala Studio sound best with headphones. Math Lens can use the camera, but typing the digits works too.'),
      try: { href: '#/games/tala', label: 'Open Tala Lab' } },

    { id: 'boards', group: 'play', art: 'board', covers: [],
      title: 'Leaderboards',
      what: w('Lists of the top scores. Only your made-up name shows.', 'Boards for the daily race, each game\'s ranked rounds and weekly Sparks. Your league follows your play mode.'),
      how: [
        w('World shows everyone. This device shows the players here.', 'World shows players everywhere; This device shows the players on this device, even offline.'),
        w('Your row is the one that stands out.', 'Your row is highlighted. Only nicknames, colors and scores ever appear.'),
        w('Practice rounds do not go on the boards.', 'Practice rounds and endless practice never post scores.'),
        w('Before your first score goes on the World board, a grown-up may need to help.', 'Before a first score goes on a World board, there is one question about age. For players under 13, a grown-up turns on World boards on the Me page.')
      ],
      tip: w('A grown-up can tap For grown-ups to see what is saved.', 'The For parents note under each board explains exactly what is stored.', 'The Privacy note under each board explains exactly what is stored.'),
      try: { href: '#/arena', label: 'See the boards' } },

    { id: 'watch', group: 'extras', art: 'video', covers: ['#/watch'],
      title: w('Watch and sing', 'Watch shelf'),
      what: w('Fun math videos and songs that play right here.', `Short videos picked by hand and matched to the skills and tricks they teach. None is longer than ${n.videoMinutes} minutes.`),
      how: [
        w('Tap a video. It plays right on this page.', 'Every video plays inside the page. Close it with the X button or Escape.'),
        w('The buttons at the top show fewer videos, like only Shorts.', 'The filter buttons narrow the shelf: Skill area, Tricks only, Length, and Videos or Shorts.', 'The filter buttons narrow the shelf: Skill area, Tricks only, Length, and Videos, Shorts or Links. Links are sites and games, which open in a new tab.'),
        w('Lessons have videos too, under Watch it explained.', 'Lessons and tricks link matching videos under Watch it explained.')
      ],
      tip: w('Watch with a grown-up nearby.', 'Watching a video for a whole minute earns the Video learner badge.', 'Videos use YouTube\'s privacy-enhanced mode. Watching one for a whole minute earns the Video learner badge.'),
      try: { href: '#/watch', label: 'Open the Watch shelf' } },

    { id: 'calm', group: 'extras', art: 'calm', covers: [],
      title: w('Calm and big text', 'Calm and text size'),
      what: w('Calm takes away the clock when you practice and stops things moving.', 'Calm is a setting for play with no clocks in Practice and no motion. Ranked rounds keep their clock, so races stay fair.'),
      how: [
        w('Turn on Calm at the top of any game or race, or on Me.', 'Turn Calm on with the switch at the top of any game, race or Star, or on Me under Calm and motion.'),
        w('Tap A+ to make the numbers bigger.', 'A and A+ next to it make the question, answers and keypad bigger.'),
        w('Untick Moving background to keep the page still.', 'Moving background, on Me and in the music panel, turns the slow drawings behind the page on or off.', 'Moving background, on Me and in the music panel, turns the slow drawings behind the page on or off. Pause motion in the Explore menu stops motion on every page of sbmadhav.com.')
      ],
      tip: w('In Calm you still win Sparks!', 'In Calm you still earn Sparks. Medals measured against the clock need Calm off.'),
      try: { href: '#/me', label: w('Find Calm on Me', 'Calm on Me') } },

    { id: 'voice', group: 'extras', art: 'voice', covers: [],
      title: w('Read aloud', 'Read-aloud voice'),
      what: w('The app can read the questions to you.', 'The app can read questions out loud, saying math the natural way ("3 fourths", "x squared").'),
      how: [
        w('On Home, tap Read questions aloud.', 'Explorer Home has a Read questions aloud button, and read-aloud starts on in Explorer.'),
        w('Tap Hear it to hear a question again.', 'In any practice, Hear it reads the current question.'),
        w('A grown-up can pick a voice on the Me page.', 'On Me, tick Read questions aloud, choose a built-in voice and press Test voice. The natural voice is an optional download of about 100 MB, once.')
      ],
      tip: w('Turn the sound up a little to hear it.', 'Sound effects and read-aloud are separate switches on Me.'),
      try: { href: '#/me', label: 'Voice settings on Me' } },

    { id: 'music', group: 'extras', art: 'music', covers: [],
      title: w('Calm music', 'Calm music and background'),
      what: w('Soft music and a slowly moving picture behind the page.', 'Gentle music made live in your browser, and a slow background that draws real pieces of early Indian mathematics.'),
      how: [
        w('Tap the music note button in the menu.', 'Tap the music note at the right of the menu bar.'),
        w('Pick a sound. Tap Stop to stop it.', 'Pick Singing bowls, Tanpura drone, Himalayan dawn or Temple chimes. Tap it again or press Stop to end it, and set the Volume.'),
        w('Untick Moving background to keep the page still.', 'What is in the background? explains each drawing.')
      ],
      tip: w('Music never starts by itself.', 'Music never starts by itself, pauses when you switch tabs and stops when a video plays.'),
      try: { action: 'music', label: 'Open the music panel' } },

    { id: 'players', group: 'extras', art: 'players', covers: [],
      title: w('More players', 'Players and backups'),
      what: w('Everyone in the family can have their own player on this device.', 'A family can share one device: each player keeps their own progress, mode and nickname.'),
      how: [
        w('On Me, tap Add a player.', 'On Me, under Players on this device: Add a player, Switch or Remove.'),
        w('Tap Switch to change who is playing.', 'Copy backup code saves your progress as text. Restore from code brings it back, even in another browser.'),
        w('A grown-up can make a backup code on the Me page.', 'Reset this player starts over from zero.')
      ],
      tip: w('Progress is saved in this browser.', 'Progress lives in this browser. Clearing site data erases it, so copy a backup code now and then.'),
      try: { href: '#/me', label: 'Manage players' } },

    { id: 'offline', group: 'extras', art: 'offline', covers: [],
      title: w('No internet? No problem', 'Offline and install'),
      what: w('After one visit, the app works even with no internet.', 'After one visit online, the app works without a connection, and you can install it like an app.'),
      how: [
        w('Open it once while online.', 'Open the app once while online. It saves itself for offline use.'),
        w('Videos and World boards need the internet.', 'Offline, boards show this device\'s scores, and videos wait for a connection.'),
        w('A grown-up can add it to the home screen.', 'To install, use your browser\'s Install app option, or Share then Add to Home Screen on iPhone and iPad.')
      ],
      tip: w('It gets new things by itself.', 'Updates arrive by themselves the next time you open it online.'),
      try: null },

    { id: 'parents', group: 'extras', art: 'shield', covers: [],
      title: w('For grown-ups', 'For parents and teachers', 'Privacy'),
      what: w('A note for grown-ups about what is saved.', 'No account, no sign-up and no real names. Here is what is stored and where.', 'No account, no sign-up and no personal data. Here is what is stored and where.'),
      how: [
        'Progress, badges and players stay in this browser only.',
        'Nicknames are made up from fixed word lists and never typed.',
        'World boards keep only the nickname, an avatar color, a score and when it was saved and expires. Players under 13 post nothing until a grown-up turns World boards on.',
        'Videos use YouTube\'s privacy-enhanced mode, and music and voices are made in the browser.'
      ],
      tip: w('Open the note below for every detail.', 'The full note below says exactly what the leaderboard keeps and how to have an entry removed.'),
      parentNote: true,
      try: null }
  ];
}

/* The sections a Mode sees: a section with `modes` is left out of the others (no Stars and no Sky in Explorer).
   No Mode yet reads as Challenger. */
export const sectionsFor = (mode, n) => sections(n).filter(s => !s.modes || s.modes.includes(mode || 'challenger'));
/* The Try it link of a section for a Mode: { href, label, more } or { action, label }, or null */
export function tryFor(s, mode) {
  if (!s.try) return null;
  const t = s.try, out = { label: say(t.label, mode) };
  if (t.action) out.action = t.action; else out.href = say(t.href, mode);
  if (t.more) out.more = { href: say(t.more.href, mode), label: say(t.more.label, mode) };
  return out;
}

/* ---------- First-visit tour ---------- */
/* Each step points at real UI. Its options are tried in order and the first whose element is on screen wins, so one
   step can say the right thing on the Explorer, tile and Sky homes; a step with no match is left out. The last step
   points at the Guide link so the Player knows where to find this again. */
export const TOUR_STEPS = [
  { id: 'me', options: [{ sel: '.me-strip',
    title: w('This is you!', 'This is you'),
    body: w('Your made-up name and your Sparks. Right answers fill the bar.', 'Your nickname, Title and Sparks. Right answers, games and races all earn Sparks and fill the bar to your next Title.') }] },
  { id: 'play', options: [
    { sel: '.quest-card', title: 'Daily quests', body: 'Three small goals every day, worth 25 bonus Sparks each. New ones come at midnight.' },
    { sel: '#skyHome .sky-bolt', title: 'Your Sky', body: 'Every Star is a short round on one trick. Bolt waits at a good one to start with, and every Star is open.' },
    { sel: '#skyHome .sky-frame', title: 'Your Sky', body: 'Every Star is a short round on one trick. Bolt shows a good one to start with, and every Star is open.' },
    { sel: '.play-tile', title: w('Tap to play', 'Pick something to play'), body: w('Tap a picture to start. Have fun!', 'Each tile opens a game, a skill or a race.') }] },
  { id: 'nav', options: [{ sel: '.mq-nav',
    title: w('Go anywhere', 'The menu'),
    body: w('Learn, races, games and videos are all up here.', 'Learn skills, train tricks in the Dojo, race in the Arena, play Games and watch videos. On a phone, swipe it sideways.') }] },
  { id: 'music', options: [{ sel: '#vmMBtn',
    title: w('Calm music', 'Music and background'),
    body: w('Tap the note for soft music. It never starts by itself.', 'Calm music made in your browser, and the switch for the moving background. It never starts by itself.') }] },
  { id: 'chip', options: [{ sel: '#mqChip a',
    title: w('Your page', 'Your Me page'),
    body: w('Tap here to see your badges and change your name or color.', 'Badges, nickname and color, play mode, players on this device, Calm and sound settings.') }] },
  { id: 'guide', options: [{ sel: '.mq-nav a[href="#/guide"]',
    title: w('Need help?', 'The guide'),
    body: w('The Guide shows how everything works. You can see this tour again there.', 'Everything the app can do, with a link to each part. You can replay this tour from there any time.') }] }
];
/* The option of a step to show: the first whose selector finds an element on screen (has(sel) says so), or null */
export const resolveStep = (step, has) => step.options.find(o => has(o.sel)) || null;
/* The steps to show, resolved once when the tour starts: [{ id, sel, title, body }] in the Mode's words */
export const resolveTour = (has, mode, steps = TOUR_STEPS) => steps.map(s => { const o = resolveStep(s, has); return o && { id: s.id, sel: o.sel, title: say(o.title, mode), body: say(o.body, mode) }; }).filter(Boolean);

/* Tour state, once per device (like Calm): vm.tour is 'shown' while it is open, then 'done' or 'skipped'.
   Absent means the tour has never been shown here. storage: localStorage, or a stand-in in tests. */
export const TOUR_KEY = 'vm.tour';
const store = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
export function tourState(ls = store()) { try { return (ls && ls.getItem(TOUR_KEY)) || null; } catch (e) { return null; } }
export function setTourState(v, ls = store()) { try { if (ls) ls.setItem(TOUR_KEY, v); } catch (e) {} }

/* Show the tour on Home for a Player with a Mode and no Sparks yet, on a device that has never shown it */
export const tourDue = ({ mode, state, hash, fresh }) => !!mode && !state && !!fresh && /^#?\/?$/.test(hash || '');
