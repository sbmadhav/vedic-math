/* Page introductions as data (js/ledes.js, openspec explanation-audio task 4.2). The page must show the same words as
   before the split, so each lede is checked against the template js/app.js held until then, copied here word for
   word, in every Mode and with live numbers; and the recording list holds every fixed line and no live one. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { LEDES, ledeHTML, ledeFixed } from '../js/ledes.js';
import { allExplanationLines, guideCounts, ledeLines } from '../js/explain-lines.js';
import { SKILLS } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import * as LV from '../js/levels.js';
import { GAMES, LEVELS_PER_GAME } from '../js/games.js';
import { MAX_LENGTH } from '../js/watch.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import { MODES } from '../js/fx.js';

const ALL = SUTRAS.length + SUBSUTRAS.length;
/* js/app.js before task 4.2, one template per lede (m: the Mode, or null before one is picked) */
const OLD = {
  learn: () => `${SKILLS.length - TRICKS.length} skills from counting to calculus. Each has a picture-first lesson, endless practice and hints that teach the strategy. Fill every ring to level up.`,
  grade: (m, st) => `${st.done} of ${st.total} skills mastered. A skill is mastered after at least 8 problems with a score of 85% or more, weighted toward recent answers.`,
  'grade-kid': (m, st) => `You have ${st.done} of ${st.total} skills. Fill every ring!`,
  dojo: m => (m === 'explorer' ? `${TRICKS.length} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in seven groups from white belt to black belt. Open a trick to watch it work step by step, practice it, and try its <b>${LV.KATAS_PER_TRICK} katas</b>, drills that get harder. <b class="dojo-ex">Belts and Stars come with Challenger and Pro.</b>` : `${TRICKS.length} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in seven belts. Each trick has three Stars. Light all 9 Stars of a belt's three tricks to earn it. Each trick also has a step-by-step animator, endless practice and <b>${LV.KATAS_PER_TRICK} katas</b>: numbered drills that get harder, ${LV.KATA_COUNT.toLocaleString('en-US')} in all. Finish one to open the next.`),
  katas: () => 'Each kata is a short drill of 5 to 8 problems that gets harder as you climb: bigger numbers, new bases, trickier cases. Get at least 60% right to finish one and unlock the next.',
  tower: () => `${LV.TOPICS.length} chapters, ${LV.PER_CHAPTER} challenges each, in five formats: Sprint, Sharpshooter, Survival, Time attack and Boss rounds. Pick any chapter; inside a chapter, clear each challenge to unlock the next.`,
  sutras: (m, { got }) => (m === 'explorer' ? `Each sutra is a tiny math rule with a long name. Tap the speaker to hear the name, flip a card to see the rule, and open <b>Learn more</b> to watch it work. You have collected <b>${got} of ${ALL}</b>.` : `Each sutra is a short word formula that packs a whole method into a phrase. Flip a card for the short version, then open <b>Learn more</b> for the full story: animated diagrams, why it works, worked examples and further reading. Each card shows how far you are with its tricks. You have collected <b>${got} of ${ALL}</b>.`),
  arena: m => `Answer as many as you can. Each right answer is worth 10, and every answer in a row adds a combo bonus. The daily round uses the same questions for every ${MODES[m].name}, so it is a fair race.`,
  games: () => `${GAMES.length} games, each with its own world leaderboard. Every game adapts to you: right answers make it harder, misses make it easier, and points are weighted by difficulty. ${LEVELS_PER_GAME} levels per game (${(GAMES.length * LEVELS_PER_GAME).toLocaleString('en-US')} in all) open up as your skill grows. Every game earns Sparks, and playing all of them unlocks a badge. Want a real race? Try the <a href="#/arena">Arena</a> or a <a href="#/arena/party">Party Mode</a> game.`,
  watch: (m, { links }) => `Every video plays right here, and none is longer than ${MAX_LENGTH / 60} minutes. Each one is checked by hand and matched to the skills and tricks it teaches.${links ? ' Sites open in a new tab.' : ''}`,
  guide: m => ({ explorer: 'Everything you can do here, one part at a time. The button under each part takes you there.', challenger: 'Every part of the app, what it is for and how to use it. The button under each section takes you straight there.', pro: 'Every part of the app, what it is for and how to use it, with a link to each one.' })[m] ?? 'Every part of the app, what it is for and how to use it. The button under each section takes you straight there.'
};

test('every page introduction shows the words it showed before the split, in every Mode', () => {
  assert.deepEqual(Object.keys(LEDES).sort(), Object.keys(OLD).sort());
  const n = guideCounts();
  for (const mode of [...Object.keys(MODES), null]) for (const live of [{ done: 0, total: 12, got: 0, links: false }, { done: 7, total: 31, got: 29, links: true }]) {
    for (const id of Object.keys(LEDES)) {
      if (id === 'arena' && !mode) continue; // the Arena always has a Mode (its old template read MODES[mode].name)
      const c = { mode, n, all: ALL, modeName: mode && MODES[mode].name, ...live };
      assert.equal(ledeHTML(id, c), OLD[id](mode, live), `${id} ${mode} ${JSON.stringify(live)}`);
    }
  }
});

test('the recording list holds every fixed line of every page introduction, and none with the Player\'s numbers', () => {
  const listed = new Set(allExplanationLines().filter(l => l.src === 'ledes').map(l => l.text));
  assert.deepEqual([...listed].sort(), [...ledeLines()].sort());
  const n = guideCounts();
  for (const mode of Object.keys(MODES)) for (const id of Object.keys(LEDES))
    for (const t of ledeFixed(id, { mode, n, modeName: MODES[mode].name, links: true, done: 3, total: 9, got: 5, all: ALL })) assert.ok(listed.has(t), `${id} ${mode}: ${t}`);
  for (const t of listed) assert.doesNotMatch(t, /You have|skills mastered|collected/, t);
  assert.ok(listed.has('Fill every ring!') && listed.has('Sites open in a new tab.'));
});
