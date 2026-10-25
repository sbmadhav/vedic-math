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
import { BG_NOTES, ROOTS_INTRO } from './sky-scene.js';

/* A worked example as heard: its label, then its working ("65 squared. 6 times 7 equals 42, then 25, gives 4225.") */
export const exampleLine = ([q, a]) => `${q}. ${a}`;

/* A Skill as its page shows it: the idea, then How it works (a Trick's Skill: when to use it, not its drawn steps) */
export const skillLines = s => {
  const t = s.trick && TRICKS.find(x => x.id === s.trick);
  return [s.idea, ...(t ? [t.when] : s.method || [])].filter(Boolean);
};
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
export const formatLines = () => Object.values(LV.FORMATS).map(f => f.how); // the Challenge tower's round format rules
/* "Older roots" on the Sutras page: the intro, then each background note as the list shows it */
export const rootNote = ([h, b]) => `<b>${h}.</b> ${b}`;
export const rootsLines = () => [ROOTS_INTRO, ...BG_NOTES.map(rootNote)];
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
  add('formats', formatLines());
  add('badges', BADGES.map(b => b.how));
  add('quests', Object.values(QUEST_POOL).flat().map(q => q.label));
  add('modes', Object.values(PLAY_MODES).map(m => m.blurb));
  add('roots', rootsLines());
  for (const m of MODES) { for (const sec of sectionsFor(m, n)) add('guide:' + m, guideLines(sec, m)); add('tour:' + m, tourLines(m)); }
  add('watch', videoLines(videos, links));
  return out;
}

/* ---------- Listen buttons (openspec explanation-audio): what each button reads ----------
   A button names its lines with a key; linesForKey() gives the same text the page shows, so every line has a whole
   recording once the inventory is recorded. Keys that read numbers made up per problem (worked steps) are handled in
   js/listen.js from the page itself. */
const sutraById = id => [...SUTRAS.map(c => ({ ...c, id: 's' + c.n })), ...SUBSUTRAS.map(c => ({ ...c, id: 'u' + c.n }))].find(c => c.id === id);
export const skillPageLines = skillLines;
export const SUTRA_PARTS = ['plain', 'why', 'examples', 'uses'];
/* One section of a Sutra deep dive, as the dialog shows it */
export function sutraSectionLines(c, part) {
  const d = DETAILS[c.name]; if (!d) return [];
  if (part === 'plain') return [c.plain, d.more].filter(Boolean);
  if (part === 'why') return [d.why].filter(Boolean);
  if (part === 'examples') return (d.examples || []).map(exampleLine);
  if (part === 'uses') return (d.uses || []).slice();
  return [];
}
export function linesForKey(key, mode = 'challenger') {
  const [kind, id, part] = String(key).split(':');
  if (kind === 'skill') { const s = SKILLS.find(x => x.id === id); return s ? skillPageLines(s) : []; }
  if (kind === 'sutra-card') { const c = sutraById(id); return c ? sutraCardLines(c) : []; }
  if (kind === 'sutra') { const c = sutraById(id); return c ? sutraSectionLines(c, part) : []; }
  if (kind === 'history') return HISTORY.slice();
  if (kind === 'guide') { const sec = sectionsFor(mode, guideCounts()).find(x => x.id === id); return sec ? guideLines(sec, mode) : []; }
  if (kind === 'game') { const g = GAMES.find(x => x.id === id); return g ? gameLines(g) : []; }
  if (kind === 'formats') return formatLines();
  return [];
}
/* Every key a page can ask for in a Mode, for the coverage test */
export function listenKeys(mode = 'challenger') {
  const sut = [...SUTRAS.map(c => 's' + c.n), ...SUBSUTRAS.map(c => 'u' + c.n)];
  return [...SKILLS.map(s => 'skill:' + s.id), ...sut.map(id => 'sutra-card:' + id), ...sut.flatMap(id => SUTRA_PARTS.map(p => `sutra:${id}:${p}`)),
    'history', ...sectionsFor(mode, guideCounts()).map(s => 'guide:' + s.id), ...GAMES.map(g => 'game:' + g.id), 'formats'];
}
