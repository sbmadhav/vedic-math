/* What the studio voice says for each explanation on screen (openspec explanation-audio). One entry per paragraph or
   list item, in the words the Player's Mode sees, as HTML: voice.js normalize() turns it into words, and its whole
   recording is named by lineHash(voice, words). tools/voice/lines.mjs records every line listed here, and the Listen
   buttons speak the same text, so the two can never drift apart. Lines that hold numbers made up per problem (worked
   steps) are not listed: they are said from clips, or by the device's voice.
   Pure data: no DOM, so Node gets the same answers as the browser. Sutra names are not read here (the
   sutra-pronunciation change gives them their own clips). */
import { SKILLS } from './skills/index.js';
import { SUTRAS, SUBSUTRAS, HISTORY } from './sutras.js';
import { DETAILS } from './sutra-details.js';
import { sectionsFor, TOUR_STEPS, MODES, say } from './guide.js';
import { TRICKS, BELTS } from './vedic.js';
import { GAMES, LEVELS_PER_GAME } from './games.js';
import { BADGES, STARS_PER_BELT, QUEST_POOL } from './gamify.js';
import { MODES as PLAY_MODES } from './fx.js';
import { MAX_LENGTH } from './watch.js';
import * as LV from './levels.js';

/* A worked example as heard: its label, then its working ("65 squared. 6 times 7 equals 42, then 25, gives 4225.") */
export const exampleLine = ([q, a]) => `${q}. ${a}`;

export const skillLines = s => [s.idea, ...(s.method || [])].filter(Boolean);
export const trickLines = t => [t.idea, t.when].filter(Boolean);
export const sutraCardLines = c => [c.meaning, c.plain, c.example].filter(Boolean);
export function sutraDeepLines(name) {
  const d = DETAILS[name]; if (!d) return [];
  return [d.more, d.why, ...(d.examples || []).map(exampleLine), ...(d.uses || []), ...((d.scene && d.scene.steps) || []).map(s => s.say)].filter(Boolean);
}
/* One guide section in a Mode: its intro, each step and its tip */
export const guideLines = (sec, mode) => [say(sec.what, mode), ...(sec.how || []).map(h => say(h, mode)), say(sec.tip, mode)].filter(Boolean);
export const tourLines = mode => TOUR_STEPS.flatMap(s => s.options.map(o => say(o.body, mode))).filter(Boolean);


export const gameLines = g => [g.desc].filter(Boolean);
/* Video and link descriptions on Watch. js/videos.js loads only when Watch opens, so its lists are passed in */
export const videoLines = (videos = [], links = []) => [...videos, ...links].map(v => v.why).filter(Boolean);

/* The live counts the guide's copy reads (guide.js sections(n)), from the catalogs */
export const guideCounts = () => ({ skills: SKILLS.length - TRICKS.length, tricks: TRICKS.length, belts: BELTS.length, katasPer: LV.KATAS_PER_TRICK, kataCount: LV.KATA_COUNT,
  sutras: SUTRAS.length, subsutras: SUBSUTRAS.length, games: GAMES.length, levelsPerGame: LEVELS_PER_GAME, chapters: LV.TOPICS.length, perChapter: LV.PER_CHAPTER,
  challenges: LV.CHALLENGE_COUNT, badges: BADGES.length, videoMinutes: MAX_LENGTH / 60, starsPerBelt: STARS_PER_BELT });

/* Every explanation line, for the recording tools: [{ text, src }], each in every Mode's words */
export function allExplanationLines({ videos = [], links = [] } = {}) {
  const n = guideCounts();
  const out = [], add = (src, list) => list.forEach(text => out.push({ text, src }));
  for (const s of SKILLS) add('skill:' + s.id, skillLines(s));
  for (const t of TRICKS) add('trick:' + t.id, trickLines(t));
  for (const c of [...SUTRAS, ...SUBSUTRAS]) { add('sutra-card', sutraCardLines(c)); add('sutra-deep', sutraDeepLines(c.name)); }
  add('sutra-history', HISTORY);
  for (const g of GAMES) add('game:' + g.id, gameLines(g));
  add('formats', Object.values(LV.FORMATS).map(f => f.how));
  add('badges', BADGES.map(b => b.how));
  add('quests', Object.values(QUEST_POOL).flat().map(q => q.label));
  add('modes', Object.values(PLAY_MODES).map(m => m.blurb));
  for (const m of MODES) { for (const sec of sectionsFor(m, n)) add('guide:' + m, guideLines(sec, m)); add('tour:' + m, tourLines(m)); }
  add('watch', videoLines(videos, links));
  return out;
}
