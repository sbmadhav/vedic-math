/* Page introductions (md-lede), as data (openspec explanation-audio 4.2), so their fixed lines can be recorded whole.
   A lede is a list of parts, joined with a space. A string is a fixed line (catalog counts filled in, as in the Guide)
   that tools/voice/lines.mjs records (ledeLines() in js/explain-lines.js); live() holds the Player's own numbers and
   is never recorded. Pure data, so Node reads it. c: { mode, n: guideCounts() } plus the page's live values. */
const live = text => ({ live: text });
const GUIDE = {
  explorer: 'Everything you can do here, one part at a time. The button under each part takes you there.',
  challenger: 'Every part of the app, what it is for and how to use it. The button under each section takes you straight there.',
  pro: 'Every part of the app, what it is for and how to use it, with a link to each one.'
};

export const LEDES = {
  learn: ({ n }) => [`${n.skills} skills from counting to calculus. Each has a picture-first lesson, endless practice and hints that teach the strategy. Fill every ring to level up.`],
  /* A level's page shows both wordings, one for each reading level (both() in js/app.js) */
  grade: ({ done, total }) => [live(`${done} of ${total} skills mastered.`), 'A skill is mastered after at least 8 problems with a score of 85% or more, weighted toward recent answers.'],
  'grade-kid': ({ done, total }) => [live(`You have ${done} of ${total} skills.`), 'Fill every ring!'],
  dojo: ({ mode, n }) => [mode === 'explorer'
    ? `${n.tricks} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in seven groups from white belt to black belt. Open a trick to watch it work step by step, practice it, and try its <b>${n.katasPer} katas</b>, drills that get harder. <b class="dojo-ex">Belts and Stars come with Challenger and Pro.</b>`
    : `${n.tricks} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in seven belts. Each trick has three Stars. Light all 9 Stars of a belt's three tricks to earn it. Each trick also has a step-by-step animator, endless practice and <b>${n.katasPer} katas</b>: numbered drills that get harder, ${n.kataCount.toLocaleString('en-US')} in all. Finish one to open the next.`],
  katas: () => ['Each kata is a short drill of 5 to 8 problems that gets harder as you climb: bigger numbers, new bases, trickier cases. Get at least 60% right to finish one and unlock the next.'],
  tower: ({ n }) => [`${n.chapters} chapters, ${n.perChapter} challenges each, in five formats: Sprint, Sharpshooter, Survival, Time attack and Boss rounds. Pick any chapter; inside a chapter, clear each challenge to unlock the next.`],
  /* modeName: the Player's Mode as the page names it ("Explorer") */
  arena: ({ modeName }) => [`Answer as many as you can. Each right answer is worth 10, and every answer in a row adds a combo bonus. The daily round uses the same questions for every ${modeName}, so it is a fair race.`],
  games: ({ n }) => [`${n.games} games, each with its own world leaderboard. Every game adapts to you: right answers make it harder, misses make it easier, and points are weighted by difficulty. ${n.levelsPerGame} levels per game (${(n.games * n.levelsPerGame).toLocaleString('en-US')} in all) open up as your skill grows. Every game earns Sparks, and playing all of them unlocks a badge. Want a real race? Try the <a href="#/arena">Arena</a> or a <a href="#/arena/party">Party Mode</a> game.`],
  sutras: ({ mode, got, all }) => [mode === 'explorer'
    ? 'Each sutra is a tiny math rule with a long name. Tap the speaker to hear the name, flip a card to see the rule, and open <b>Learn more</b> to watch it work.'
    : 'Each sutra is a short word formula that packs a whole method into a phrase. Flip a card for the short version, then open <b>Learn more</b> for the full story: animated diagrams, why it works, worked examples and further reading. Each card shows how far you are with its tricks.',
  live(`You have collected <b>${got} of ${all}</b>.`)],
  /* links: the Player sees outside links (Pro), which open in a new tab */
  watch: ({ n, links }) => [`Every video plays right here, and none is longer than ${n.videoMinutes} minutes. Each one is checked by hand and matched to the skills and tricks it teaches.`, ...(links ? ['Sites open in a new tab.'] : [])],
  guide: ({ mode }) => [GUIDE[mode] ?? GUIDE.challenger] // no Mode yet: the Challenger words, as fx.t() picks
};

/* What a lede says, as the page shows it */
export const ledeHTML = (id, c) => LEDES[id](c).map(p => (typeof p === 'string' ? p : p.live)).join(' ');
/* Its fixed lines, for the recording list */
export const ledeFixed = (id, c) => LEDES[id](c).filter(p => typeof p === 'string');
