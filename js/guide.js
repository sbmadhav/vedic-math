/* The in-app guide (#/guide) and the first-visit tour: data and pure logic only, so it can be tested in Node.
   app.js draws the guide page and tour.js draws the tour. Wording comes in three versions, one per play mode:
   a string is the same for everyone, and w(explorer, challenger, pro) gives simpler words for Explorer.
   `covers` lists sample routes each section explains; test/guide.test.mjs checks that together they cover
   every route in app.js, and that every Try it link opens a real route. */

/* w(explorer, challenger, pro): pro defaults to the challenger wording */
export const w = (explorer, challenger, pro = challenger) => ({ explorer, challenger, pro });
/* Resolve a string or a w(...) object for a mode; no mode yet reads as Challenger */
export const say = (v, mode) => (v && typeof v === 'object' && !Array.isArray(v) ? v[mode] ?? v.challenger : v);

/* Groups, in page order */
export const GROUPS = [
  { id: 'start', title: w('Start here', 'Getting started') },
  { id: 'learn', title: w('Learn', 'Learn and practice') },
  { id: 'tricks', title: w('Speed tricks', 'Speed tricks and sutras') },
  { id: 'play', title: w('Play and race', 'Games, races and leaderboards') },
  { id: 'extras', title: w('More things to try', 'Extras, settings and privacy') }
];

/* n holds live counts from app.js: skills, tricks, belts, katasPer, kataCount, sutras, subsutras, games,
   levelsPerGame, chapters, perChapter, challenges, badges, videos */
export function sections(n) {
  const fmt = x => Number(x).toLocaleString('en-US');
  return [
    { id: 'around', group: 'start', art: 'nav', covers: ['#/', '#/guide', '#/guide/around'],
      title: w('Find your way', 'Getting around'),
      what: w('The menu at the top takes you everywhere. Your level badge sits at the right.', 'The menu bar at the top takes you to every part of the app. The level badge at its right end opens your Me page.'),
      how: [
        w('Tap Home, Learn, Arena, Games, Watch or Guide in the menu.', 'Pick Home, Learn, Dojo, Arena, Games, Sutras, Watch or Guide in the menu bar.'),
        w('On a phone, slide the menu sideways to see the rest.', 'On a phone, swipe the menu sideways to reach the music button and your level badge.'),
        w('Daybreak is light colors. Deep Space is dark colors.', 'Daybreak and Deep Space switch between light and dark colors. System follows your device.', 'Daybreak (light) and Deep Space (dark) override your device setting; System follows it.'),
        w('The trail of links under the menu takes you back a step.', 'The trail of links above each page title (Vedic Math / Games / ...) takes you back a step.')
      ],
      tip: w('A grown-up can press Tab to move around with the keyboard.', 'Keyboard friendly: Tab moves between buttons, Enter checks an answer, and Escape closes any pop-up.'),
      try: { action: 'tour', label: w('Show me around', 'Take the tour') } },

    { id: 'modes', group: 'start', art: 'modes', covers: [],
      title: 'Play modes',
      what: w('Pick how you want to play: Explorer, Challenger or Pro. Explorer has big buttons and pictures.', 'Three modes set the words, the questions and your leaderboard league: Explorer (about 4 to 7), Challenger (about 8 to 12) and Pro (13 to adult).'),
      how: [
        w('You pick a mode on your very first visit.', 'You pick a mode on your first visit.'),
        w('To change it, open Me and tap a different mode.', 'To change it later, open Me and choose under Play mode.'),
        w('Reset play mode at the bottom of the page shows the three choices again.', 'Reset play mode, at the bottom of every page, brings back the mode picker.'),
        w('Explorer: tap big answer buttons, hear the questions read out loud.', 'Explorer: big answer buttons, pictures, read-aloud and a shorter menu. Challenger: speed tricks, belts and daily races. Pro: algebra to calculus, sutra deep dives and the leaderboard on Home.')
      ],
      tip: w('Your stars and XP stay when you change modes.', 'Your progress stays when you switch modes, and each player on the device keeps their own mode.'),
      try: { href: '#/me', label: w('Change my mode', 'Change mode on Me') } },

    { id: 'home', group: 'start', art: 'home', covers: ['#/'],
      title: w('Home, XP and stars', 'Home, XP and daily quests'),
      what: w('Home shows your name, your level and fun things to play.', 'Home shows your nickname, level, XP, day streak and badges, plus the best next things to play.'),
      how: [
        w('Every right answer gives you XP. XP fills your level bar.', 'Every right answer earns XP: 10 plus a streak bonus on a first try, 5 after a hint. Games, katas, races and videos earn XP too.'),
        w('Fill the bar to reach a new level with a new title.', 'Fill the XP bar to level up. Each level brings a title, from Number Rookie to Vedic Legend.'),
        w('Play on more days in a row to grow your day streak.', 'Daily quests on Home give you three small goals each day, worth 25 bonus XP each.', 'Daily quests on Home set three goals a day, 25 bonus XP each. The day streak counts days in a row with practice.'),
        w('The Keep going card takes you back to what you did last.', 'The Keep going card jumps back to the last skill you practiced.')
      ],
      tip: w('Come back every day. Seven days in a row earns a badge!', 'A few minutes every day beats one long session. Seven days in a row earns the Week warrior badge.'),
      try: { href: '#/', label: 'Go to Home' } },

    { id: 'me', group: 'start', art: 'me', covers: ['#/me', '#/progress'],
      title: w('Me and badges', 'Me page and badges'),
      what: w('Your own page: your name, your color and your badges.', `Your profile: nickname, avatar color, level, ${n.badges} badges, progress by level and settings.`),
      how: [
        w('Tap your level badge at the top right to open Me.', 'Tap your level badge at the top right of the menu bar.'),
        w('Tap New nickname for a new silly name. Tap a color dot to change your color.', 'New nickname picks another made-up name; the color dots change your avatar.'),
        w('Gray badges are still locked. Each one says how to get it.', 'Locked badges say exactly how to earn them.'),
        w('Settings turn sounds and the moving background on or off.', 'Settings switch sound effects, read-aloud and the moving background, and pick a reading voice.')
      ],
      tip: w('Names are made up for you, so you never type your real name.', 'Nicknames come from fixed word lists and are never typed, so no real names are needed anywhere.'),
      try: { href: '#/me', label: 'Open Me' } },

    { id: 'skills', group: 'learn', art: 'rings', covers: ['#/learn', '#/grade/3', '#/mix/3', '#/run/3'],
      title: 'Skill map',
      what: w('Lots of math to learn, from counting all the way up. Each skill has a ring to fill.', `${fmt(n.skills)} skills from counting to calculus, grouped by level from K to 12, plus the speed tricks.`, `${fmt(n.skills)} skills from counting to calculus, grouped by level from K to 12, plus the speed tricks. Each one makes new questions forever.`),
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
        w('Tap your answer. If it is not right, you get another try and a hint.', 'Type your answer and press Check (or Enter). Miss once: try again. Miss twice: a hint appears. Miss a third time: the worked steps appear.'),
        w('Hint gives a clue. Show me shows all the steps. Hear it reads the question.', 'Hint gives a clue at any time, Show me reveals the worked steps, and Hear it reads the question aloud.'),
        w('Some questions have big number buttons to tap.', 'When a question needs symbols, keys like x, ^, √, π or < appear under the answer box. In Explorer, small answers become big buttons.')
      ],
      tip: w('Try first before you ask for a hint. You get the most XP that way!', 'First-try answers count most toward mastery and earn the most XP. Hints still teach the strategy, so use them when stuck.'),
      try: { href: w('#/skill/k-add10', '#/skill/3-mult', '#/skill/9-factor'), label: w('Try an adding skill', 'Try a practice skill', 'Try factoring practice') } },

    { id: 'dojo', group: 'tricks', art: 'belts', covers: ['#/dojo', '#/tricks', '#/skill/v-from9'],
      title: w('Dojo and belts', 'Dojo: speed tricks and belts'),
      what: w('Fast math tricks. Learn them to earn colored belts, like in karate.', `${n.tricks} speed tricks from the Vedic sutras in ${n.belts} belts, from white to black.`),
      how: [
        w('Open the Dojo. It is not in the Explorer menu, so use the button below.', 'Open the Dojo from the menu (or the Dojo card on Home).'),
        w('Master all three tricks in a belt to earn it.', 'Master all three tricks in a belt to earn it.'),
        w('Watch it work shows each step. Tap Next step to go on.', 'On a trick page, Watch it work runs the trick step by step: type your own numbers and press Show steps, or tap New numbers. Use Back, Next step or Show all.'),
        w('Then practice the trick below.', 'Then practice the trick in the box beside it, just like any skill.')
      ],
      tip: w('Watch a trick all the way to the end. It counts for a badge!', 'Watching a trick to its last step earns XP once and ticks the Watch a speed trick quest.'),
      try: { href: '#/dojo', label: 'Open the Dojo' } },

    { id: 'katas', group: 'tricks', art: 'stars', covers: ['#/katas/from9', '#/kata/from9/1'],
      title: 'Katas',
      what: w('Short drills for each trick. Win up to 3 stars on each one.', `${n.katasPer} numbered drills for every trick, ${fmt(n.kataCount)} in all. Each kata is 5 to 8 problems and they get harder as you climb.`),
      how: [
        w('In the Dojo, tap Katas under a trick.', 'In the Dojo, tap Katas under any trick.'),
        w('Finish one to open the next one.', 'Clear a kata to unlock the next. Each one has a par time.'),
        w('All right, fast and no hints gets 3 stars.', 'One try per question: a miss shows the answer and the first steps. Three stars means every answer right, inside par, with no hints. 85% gets two stars, 60% gets one.')
      ],
      tip: w('Learn the trick first, then do katas to get fast.', 'Learn the trick on its own page first, then use katas to build speed.'),
      try: { href: '#/katas/from9', label: 'Try the first katas' } },

    { id: 'sutras', group: 'tricks', art: 'card', covers: ['#/sutras', '#/sutras/s1'],
      title: w('Sutra cards', 'Sutra cards and deep dives'),
      what: w('Cards with old math sayings. Flip them to collect them.', `The ${n.sutras} sutras and ${n.subsutras} sub-sutras: short word formulas, each a whole method in a phrase, as cards to collect.`),
      how: [
        w('Open Sutras. It is not in the Explorer menu, so use the button below.', 'Open Sutras from the menu.'),
        w('Tap a card to flip it. That collects it!', 'Tap a card to flip it and collect it (5 XP the first time).'),
        w('Learn more shows a moving picture that explains it.', 'Learn more opens a deep dive: an animated diagram, why it works, worked examples, where it is used, Try it yourself buttons and further reading.'),
        w('Close it with the X button.', 'Move to the next sutra with the arrows at the bottom. Close with the X button or Escape.')
      ],
      tip: w('Mastering a trick collects its card too.', 'Mastering a trick in the Dojo collects its sutra card for you. The top of the page also tells where Vedic math comes from.'),
      try: { href: '#/sutras', label: 'See the sutra cards', more: { href: '#/sutras/s1', label: 'Open a deep dive' } } },

    { id: 'games', group: 'play', art: 'dial', covers: ['#/games', '#/game/make-ten', '#/game/make-ten/1'],
      title: 'Games',
      what: w(`${n.games} games for numbers. They get harder when you do well.`, `${n.games} games, each with ${n.levelsPerGame} levels and its own leaderboard. Every game adapts to you.`),
      how: [
        w('Open Games and tap one. Games for you come first.', 'Open Games. Games picked for your mode come first.'),
        w('Ranked round is a real race. Endless practice has no rush; tap Finish when you are done.', 'Choose Ranked round (fixed length, counts for the leaderboard) or Endless practice (no clock pressure; press Finish when you are done).'),
        w('The level bar goes from 1 to 20. Right answers make it harder, misses make it easier.', 'The difficulty dial runs from 1 to 20: right answers turn it up, misses turn it down, and points are worth more at higher difficulty, so the leaderboard stays fair.'),
        w('Below the game is a map of levels with stars to win.', `Below each game, a map of ${n.levelsPerGame} levels opens up as your skill grows. Each level has three star goals.`)
      ],
      tip: w('Play every game once to earn a badge.', 'Play every game once for the Game explorer badge.'),
      try: { href: '#/games', label: 'Open Games' } },

    { id: 'arena', group: 'play', art: 'timer', covers: ['#/arena'],
      title: w('Race the clock', 'Arena: the daily race'),
      what: w('Answer as many as you can in 60 seconds.', '60 seconds, and the same questions for everyone in your league today, so it is a fair race.'),
      how: [
        w('Tap Start. Wait for 3, 2, 1, then go!', 'Pick Daily challenge (counts for the leaderboard) or Practice round, then press Start.'),
        w('Each right answer gives points. Right answers in a row give extra points.', 'Each right answer is worth 10 points, and answers in a row add a combo bonus.'),
        w('See who is the fastest on the boards below.', 'Below: today\'s board, this week\'s board and Most XP this week.')
      ],
      tip: w('Play the daily race on 3 days to earn a badge.', 'Finish the daily challenge on 3 different days for the Daily habit badge. Score 200 for Arena star.'),
      try: { href: '#/arena', label: 'Open the Arena' } },

    { id: 'tower', group: 'play', art: 'tower', covers: ['#/tower', '#/tower/1', '#/challenge/1'],
      title: 'Challenge tower',
      what: w('Lots of short challenges. Climb as high as you can.', `${fmt(n.challenges)} challenges in ${n.chapters} chapters of ${n.perChapter}, in five formats: Sprint, Sharpshooter, Survival, Time attack and Boss round.`),
      how: [
        w('In the Arena, tap Challenge tower.', 'In the Arena, tap the Challenge tower banner.'),
        w('Pick a chapter. Finish a challenge to open the next one.', 'Pick any chapter. Inside it, clear each challenge to unlock the next.'),
        w('Win up to 3 stars on each one.', 'Each challenge says its goal and the score or time needed for each star.')
      ],
      tip: w('A Boss round is hard and gives you only two lives.', 'Boss rounds mix hard questions and give you only two lives. Warm up on a Sprint first.'),
      try: { href: '#/tower', label: 'Open the tower' } },

    { id: 'duel', group: 'play', art: 'duel', covers: ['#/duel'],
      title: w('Duel a friend', 'Duel'),
      what: w('Two players on one screen. First to 10 right answers wins!', 'Two players, one screen. First to 10 right answers wins.'),
      how: [
        w('Pick a level, then tap Start the duel.', 'Pick a level for the questions, then press Start the duel.'),
        w('A wrong answer freezes you for a second. Go fast but be careful!', 'A wrong answer freezes that player for a second, so speed and care both count.'),
        w('On a tablet flat on the table, tick Face to face.', 'With a tablet flat between you, tick Face to face to flip the top player.')
      ],
      tip: w('Grown-ups can play too. Pick a harder level for them!', 'Give the older player a harder level for a fair match.'),
      try: { href: '#/duel', label: 'Start a duel' } },

    { id: 'boards', group: 'play', art: 'board', covers: [],
      title: 'Leaderboards',
      what: w('Lists of the top scores. Only your made-up name shows.', 'Boards for the daily race, each game\'s ranked rounds and weekly XP. Your league follows your play mode.'),
      how: [
        w('World shows everyone. This device shows players here.', 'World shows players everywhere; This device shows the players on this device.'),
        w('Your row is the one that stands out.', 'Your row is highlighted. Only nicknames, colors and scores ever appear.'),
        w('Practice rounds do not go on the boards.', 'Practice rounds and endless practice never post scores.')
      ],
      tip: w('A grown-up can tap For grown-ups to see what is saved.', 'The For parents note under each board explains exactly what is stored.', 'The Privacy note under each board explains exactly what is stored.'),
      try: { href: '#/arena', label: 'See the boards' } },

    { id: 'watch', group: 'extras', art: 'video', covers: ['#/watch'],
      title: w('Watch and sing', 'Watch shelf'),
      what: w('Fun math videos and songs.', `${n.videos} free picks from around the web: counting songs, trick channels, Vedic math lessons and deep visual math.`),
      how: [
        w('Tap a video. It plays right here.', 'Use the filter chips: For your mode, Vedic math, Shorts, Videos, Channels, Sites and games, or Everything.'),
        w('Tap X to close the video.', 'Videos and playlists play inside the page. Close with the X button or Escape.'),
        w('Some buttons open a new tab.', 'Channels and websites open in a new tab. Lessons also link matching videos under Watch it explained.')
      ],
      tip: w('Watch with a grown-up nearby.', 'Each new video earns 5 XP. Grown-ups: videos use YouTube\'s privacy-enhanced mode.'),
      try: { href: '#/watch', label: 'Open the Watch shelf' } },

    { id: 'voice', group: 'extras', art: 'voice', covers: [],
      title: w('Read aloud', 'Read-aloud voice'),
      what: w('The app can read the questions to you.', 'The app can read questions out loud, saying math the natural way ("3 quarters", "x squared").'),
      how: [
        w('On Home, tap Read questions aloud.', 'Explorer Home has a Read questions aloud button; it starts on in Explorer.'),
        w('Tap Hear it to hear a question again.', 'In any practice, Hear it reads the current question.'),
        w('A grown-up can pick a voice on the Me page.', 'On Me, tick Read questions aloud, choose a built-in voice and press Test voice. Natural voice is an optional download (about 100 MB, once) that runs on this device.')
      ],
      tip: w('Turn the sound up a little to hear it.', 'Nothing you hear is sent anywhere: voices run in the browser.'),
      try: { href: '#/me', label: 'Voice settings on Me' } },

    { id: 'music', group: 'extras', art: 'music', covers: [],
      title: w('Calm music', 'Calm music and background'),
      what: w('Soft music and a slowly moving picture behind the page.', 'Gentle music made live in your browser, and a slow background that draws real pieces of early Indian mathematics.'),
      how: [
        w('Tap the music note button in the menu.', 'Tap the music note at the right of the menu bar.'),
        w('Pick a sound. Tap Stop to stop it.', 'Pick Singing bowls, Tanpura drone, Himalayan dawn or Temple chimes. Tap it again or press Stop to end it, and set the Volume.'),
        w('Untick Moving background to keep the page still.', 'Moving background turns the animation off (also on Me). What is in the background? explains each drawing.')
      ],
      tip: w('Music never starts by itself.', 'Music never starts by itself, pauses when you switch tabs and stops when a video plays.'),
      try: { action: 'music', label: 'Open the music panel' } },

    { id: 'players', group: 'extras', art: 'players', covers: [],
      title: w('More players', 'Players and backups'),
      what: w('Everyone in the family can have their own player on this device.', 'A family can share one device: each player keeps their own progress, mode and nickname.'),
      how: [
        w('On Me, tap Add a player.', 'On Me, under Players on this device: Add a player, Switch, or Remove.'),
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
        w('Leaderboards need the internet.', 'Offline, leaderboards show this device\'s scores and catch up when you are back online.'),
        w('A grown-up can add it to the home screen.', 'To install, use your browser\'s Install app option, or Share then Add to Home Screen on iPhone and iPad.')
      ],
      tip: w('It gets new things by itself.', 'Updates arrive by themselves the next time you open it online.'),
      try: null },

    { id: 'parents', group: 'extras', art: 'shield', covers: [],
      title: w('For grown-ups', 'For parents and teachers', 'Privacy'),
      what: w('A note for grown-ups about what is saved.', 'No account, no sign-up and no real names. Here is what is stored and where.', 'No account, no sign-up and no personal data. Here is what is stored and where.'),
      how: [
        'Progress, badges and players stay in this browser only.',
        'Leaderboard entries hold only the made-up nickname, an avatar color, a score and two timestamps.',
        'Videos use YouTube\'s privacy-enhanced mode, and music and voices are made in the browser.'
      ],
      tip: w('Open the note below for every detail.', 'The full note below says exactly what the leaderboard keeps and how to have an entry removed.'),
      parentNote: true,
      try: null }
  ];
}

/* ---------- First-visit tour ---------- */
/* Each step points at real UI; the first selector that matches a visible element wins, and a step with no
   match is skipped. The last step points at the Guide link so the player knows where to find this again. */
export const TOUR_STEPS = [
  { id: 'me', sel: ['.me-strip'],
    title: w('This is you!', 'This is you'),
    body: w('Your made-up name, your level and your XP. Right answers fill the bar.', 'Your nickname, level and XP. Right answers, games and races all earn XP and fill the bar.') },
  { id: 'nav', sel: ['.mq-nav .md-wrap'],
    title: w('Go anywhere', 'The menu'),
    body: w('Learn, races, games and videos are all up here.', 'Learn skills, train tricks in the Dojo, race in the Arena, play Games and watch videos. Swipe it sideways on a phone.') },
  { id: 'play', sel: ['.quest-card', '.play-tile'],
    title: w('Tap to play', 'Daily quests'),
    body: w('Tap a picture to start. Have fun!', 'Three small goals every day, worth 25 bonus XP each. They reset at midnight.') },
  { id: 'music', sel: ['#vmMBtn'],
    title: w('Calm music', 'Music and background'),
    body: w('Tap the note for soft music. It never starts by itself.', 'Calm music made in your browser, plus the moving background switch. It never starts by itself.') },
  { id: 'chip', sel: ['#mqChip a', '#mqChip'],
    title: w('Your page', 'Your Me page'),
    body: w('Tap here to see your badges and change your name or color.', 'Badges, nickname and color, play mode, players on this device, voice and sound settings.') },
  { id: 'guide', sel: ['.mq-nav a[href="#/guide"]'],
    title: w('Need help?', 'The guide'),
    body: w('The Guide shows how everything works. You can see this tour again there.', 'Everything the app can do, with Try it buttons. You can replay this tour from there any time.') }
];
export const TOUR_KEY = 'tour';

/* Show the tour on Home once a mode is picked, until it has been finished or skipped */
export const tourDue = ({ mode, seen, hash }) => !!mode && !seen && /^#?\/?$/.test(hash || '');
