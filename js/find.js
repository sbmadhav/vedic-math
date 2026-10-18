/* Find (openspec find): an index of every named thing in the app and a ranking over it, built in the page from the
   catalogs. Pure: no DOM, no requests, and nothing typed is kept anywhere. The page that draws it is findView() in
   js/app.js. sectionLines() is also the single source of the menu tooltips (openspec site-header). */
import { SKILLS, GRADES, STRANDS } from './skills/index.js';
import { TRICKS, BELTS } from './vedic.js';
import { SUTRAS, SUBSUTRAS } from './sutras.js';
import { GAMES } from './games.js';
import { PLAY, playOpen } from './play/catalog.js';
import { sectionsFor, say } from './guide.js';
import { MODE_SEES } from './watch.js';

const ALL = ['explorer', 'challenger', 'pro'], BIG = ['challenger', 'pro'];
const modeOf = m => (ALL.includes(m) ? m : 'challenger');

/* Kinds in the order results are grouped; the labels read by Mode */
export const KINDS = ['section', 'trick', 'skill', 'sutra', 'game', 'play', 'guide', 'grade', 'video'];
export const KIND_LABELS = {
  section: { explorer: 'Places', challenger: 'Sections' }, trick: { explorer: 'Speed tricks', challenger: 'Tricks' }, skill: 'Skills',
  sutra: 'Sutras', game: 'Games', play: 'Ways to play', guide: 'Guide', grade: 'Grades', video: 'Videos'
};
export const kindLabel = (kind, mode) => say(KIND_LABELS[kind], modeOf(mode));

/* One plain line per section the Mode's menu has, in menu order. No counts, so the lines never go stale. */
export function sectionLines(mode) {
  const m = modeOf(mode), ex = m === 'explorer';
  const L = (href, label, modes, explorer, big) => ({ href, label, modes, plain: ex ? explorer : big });
  return [
    L('#/', 'Home', ALL, 'Your name, your Sparks and the games to tap', 'Your next Star, the daily quests and every way to play'),
    L('#/learn', 'Learn', ALL, 'Counting, adding and shapes, one skill at a time', 'Skills by grade from counting to calculus, each with a hint and a worked answer'),
    L('#/dojo', 'Dojo', BIG, '', 'Speed tricks in belts, from white to black; each trick has three Stars to light'),
    L('#/arena', 'Arena', ALL, 'Race the clock. Tap fast!', 'Sixty-second races with the same questions for everyone in your league, and the leaderboards'),
    L('#/games', 'Games', ALL, 'Balloons, dots, make ten and more', 'Number games with levels, plus puzzles, rhythm, art and a camera lens'),
    L('#/sutras', 'Sutras', BIG, '', 'The rules from Bharati Krishna Tirtha\'s book, each with a card, a deep dive and the math behind it'),
    L('#/watch', 'Watch', ALL, 'Short videos and songs about numbers', 'Short videos that show each trick and skill'),
    L('#/me', 'Me', ALL, 'Your name, your color and your badges', 'Your nickname, color, badges, play mode, players on this device and settings'),
    L('#/guide', 'Guide', ALL, 'How everything works, one part at a time', 'Every part of the app explained, with a link to each'),
    L('#/find', 'Find', ALL, 'Type a word to find a game, a skill or a video', 'Search skills, tricks, sutras, games and videos by name or a plain word')
  ].filter(l => l.modes.includes(m));
}

/* Plain words that find an entry, by entry id (kind-id). Titles and descriptions are indexed on their own, so this
   table holds only the words people say that the catalog does not. */
export const SYNONYMS = {
  'section-home': ['start', 'front', 'main', 'quests'],
  'section-learn': ['skills', 'skill map', 'grades', 'lessons', 'practice', 'homework', 'school', 'levels'],
  'section-dojo': ['tricks', 'belts', 'stars', 'katas', 'speed', 'train', 'vedic'],
  'section-arena': ['leaderboard', 'leaderboards', 'scores', 'race', 'racing', 'timer', 'rank', 'ranking', 'compete', 'daily', 'board', 'boards', 'medals', 'tower'],
  'section-games': ['play', 'puzzles', 'fun'],
  'section-sutras': ['cards', 'sanskrit', 'book', 'rules', 'verses', 'history', 'deep dive', 'tirtha'],
  'section-watch': ['videos', 'video', 'youtube', 'films', 'clips', 'songs', 'sing'],
  'section-me': ['settings', 'nickname', 'name', 'avatar', 'color', 'colour', 'profile', 'badges', 'mode', 'players', 'reset', 'calm', 'sound', 'backup', 'progress', 'streak', 'title'],
  'section-guide': ['help', 'how', 'tour', 'instructions', 'manual', 'faq', 'about', 'privacy', 'parents'],
  'section-find': ['search', 'look for'],
  'trick-sq5': ['squares', 'squaring', 'ending in 5', 'fives'],
  'trick-from9': ['take away', 'minus', 'subtraction', 'subtract', 'all from 9', 'complements', 'borrowing'],
  'trick-by11': ['eleven', 'elevens', 'times 11'],
  'trick-times5': ['fives', 'times 5', 'halve', 'half'],
  'trick-by9s': ['nines', 'times 9'],
  'trick-ends10': ['ten buddies', 'last digits'],
  'trick-near-base': ['near 100', 'base', 'ninety'],
  'trick-square-near': ['squares', 'squaring', 'near 100'],
  'trick-check9': ['check', 'checking', 'casting out nines', 'digit sum', 'mistake'],
  'trick-crosswise': ['vertically', 'long multiplication', 'criss cross', 'two digit'],
  'trick-duplex': ['squares', 'squaring', 'two digit'],
  'trick-sub-base': ['base', 'fifty'],
  'trick-div9': ['divide by 9', 'division', 'dividing', 'nines'],
  'trick-osculator': ['divisible', 'divisibility', 'test', 'sevens'],
  'trick-recip': ['decimals', 'recurring', 'repeating', 'sevenths', 'one over'],
  'trick-sqroot': ['square root', 'roots'],
  'trick-cuberoot': ['cube root', 'roots', 'cubes'],
  'trick-transpose': ['equations', 'solve', 'algebra', 'linear'],
  'trick-add-sub': ['equations', 'simultaneous', 'algebra'],
  'trick-ratio-zero': ['equations', 'simultaneous', 'algebra'],
  'trick-zero-sum': ['equations', 'algebra', 'factors'],
  'sutra-s2': ['take away', 'subtract', 'complements', 'nikhilam'],
  'sutra-s3': ['multiplication', 'crosswise', 'urdhva'],
  'game-balloons': ['count', 'counting', 'pop'],
  'game-make-ten': ['ten', 'partners', 'number bonds', 'target'],
  'game-times-sprint': ['times tables', 'multiplication', 'tables'],
  'game-target': ['countdown', 'brackets', 'operations'],
  'game-frac-faceoff': ['fractions', 'compare'],
  'game-check-it': ['mistake', 'digit sum', 'check'],
  'game-pairs': ['memory', 'cards', 'matching'],
  'game-rain': ['multiples', 'tables'],
  'game-sequence': ['patterns', 'next number'],
  'game-balance': ['equations', 'scale', 'mystery number'],
  'play-party': ['family', 'friends', 'two players', 'multiplayer', 'buzz', 'duel'],
  'play-ghosts': ['ghost', 'past self', 'replay', 'race'],
  'play-daily': ['puzzle of the day', 'countdown', 'daily puzzle'],
  'play-lens': ['camera', 'photo', 'plate', 'receipt', 'clock'],
  'play-tala': ['rhythm', 'clap', 'music', 'drums', 'konnakol', 'beat'],
  'play-art': ['mandala', 'drawing', 'wallpaper', 'patterns', 'art', 'geometry'],
  'play-wall': ['patterns', 'grid', 'discover'],
  'play-apprentice': ['teach', 'teacher', 'mistakes', 'coach'],
  'play-bets': ['estimate', 'guess', 'confidence', 'bet'],
  'play-spells': ['spell', 'trace', 'magic'],
  'play-locks': ['lock', 'machine', 'secret', 'discover'],
  'play-scroll': ['mystery', 'story', 'cipher', 'chapters'],
  'guide-parents': ['privacy', 'safe', 'data', 'grown-ups', 'teachers'],
  'guide-offline': ['internet', 'install', 'app'],
  'guide-calm': ['big text', 'text size', 'timer', 'no clock'],
  'guide-voice': ['speak', 'read aloud', 'hear it', 'speech'],
  'guide-music': ['background', 'motion', 'animation'],
  'guide-players': ['family', 'siblings', 'switch player', 'backup', 'restore'],
  'guide-boards': ['leaderboard', 'world', 'device', 'rank'],
  'guide-modes': ['explorer', 'challenger', 'pro', 'age', 'change mode']
};

/* Lower case, no diacritics, letters digits and spaces only: "Ūrdhva-Tiryagbhyām" becomes "urdhva tiryagbhyam" */
export const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[²³]/g, m => (m === '²' ? ' squared' : ' cubed')).replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'or', 'it', 'is', 'at']);
export const tokenize = s => normalize(s).split(' ').filter(w => w && !STOP.has(w));
const words = s => normalize(s).split(' ').filter(Boolean);

const firstSentence = s => String(s || '').split(/(?<=[.!?])\s/)[0];
const strandName = (id, m) => (STRANDS[id] ? (m === 'explorer' ? STRANDS[id].kid : STRANDS[id].pro) : '');
const gradeName = (g, m) => { const x = GRADES.find(y => String(y.id) === String(g)); return x ? (m === 'explorer' ? x.kid : x.pro) : ''; };
const beltOf = id => BELTS.find(b => b.tricks.includes(id));

/* An entry: { id, kind, title, sub, href | yt, title words, synonym words, description words } */
function entry(kind, id, title, sub, target, more = '') {
  const key = `${kind}-${id}`;
  return { id: key, kind, title, sub, ...target, t: words(title), s: (SYNONYMS[key] || []).flatMap(words), d: words(`${sub} ${more}`) };
}

/* Every named thing the Mode can open. videos: the list from js/videos.js when it has loaded (it is lazy), else none. */
export function buildIndex({ mode, counts = {}, videos = [] } = {}) {
  const m = modeOf(mode), ex = m === 'explorer', out = [];
  for (const l of sectionLines(m)) out.push(entry('section', l.href.replace('#/', '') || 'home', l.label, l.plain, { href: l.href }));
  for (const t of TRICKS) out.push(entry('trick', t.id, ex ? t.kid : t.title, `${ex ? t.title : t.kid}. ${firstSentence(t.when)}`, { href: `#/skill/v-${t.id}` }, `${beltOf(t.id)?.name || ''} ${t.sutra} ${t.meaning} ${t.idea}`));
  for (const s of SKILLS) {
    if (String(s.id).startsWith('v-')) continue;
    out.push(entry('skill', s.id, ex ? s.kid : s.title, `${ex ? s.title : s.kid}. ${gradeName(s.grade, m)}, ${strandName(s.strand, m)}`, { href: `#/skill/${s.id}` }, s.idea));
  }
  for (const [list, p] of [[SUTRAS, 's'], [SUBSUTRAS, 'u']]) for (const c of list) out.push(entry('sutra', `${p}${c.n}`, c.name, `${c.meaning}. ${firstSentence(c.plain)}`, { href: `#/sutras/${p}${c.n}` }, `${c.deva || ''} ${c.say || ''} ${c.plain}`));
  for (const g of GAMES) if (g.modes.includes(m)) out.push(entry('game', g.id, ex ? g.kid : g.title, `${ex ? g.title : g.kid}. ${firstSentence(g.desc)}`, { href: `#/game/${g.id}` }, g.desc));
  for (const e of PLAY) if (playOpen(e, m)) out.push(entry('play', e.id, e.title, `${e.tag}. ${e.blurb}`, { href: e.route }));
  for (const s of sectionsFor(m, counts)) out.push(entry('guide', s.id, say(s.title, m), firstSentence(say(s.what, m)), { href: `#/guide/${s.id}` }, s.how.map(h => say(h, m)).join(' ')));
  for (const g of GRADES) out.push(entry('grade', String(g.id).toLowerCase(), ex ? g.kid : g.pro, g.band, { href: `#/grade/${g.id}` }, ex ? g.pro : g.kid));
  const sees = MODE_SEES[m] || MODE_SEES.challenger; /* a Mode sees its own videos and the Mode below, as on Watch */
  for (const v of videos) if (v.modes.some(x => sees.includes(x))) out.push(entry('video', v.id, v.title, `${v.channel}. ${v.kind === 'short' ? 'Short' : 'Video'}, ${Math.max(1, Math.round(v.duration / 60))} min`, { yt: v.yt }, v.why));
  return out;
}

/* Score one entry for one query token: the best of title (10), synonym (8), description (3); a prefix of at least
   two letters scores 70 percent of a whole word; 0 when the token is nowhere in it. */
const hit = (list, tok) => { let best = 0; for (const w of list) { if (w === tok) return 1; if (tok.length >= 2 && w.startsWith(tok)) best = 0.7; } return best; };
export function score(e, toks) {
  let total = 0;
  for (const tok of toks) {
    const s = Math.max(10 * hit(e.t, tok), 8 * hit(e.s, tok), 3 * hit(e.d, tok));
    if (!s) return 0; /* every token must match somewhere */
    total += s;
  }
  return total;
}

/* The results for a query: groups in KINDS order, at most `per` entries each, best first. An empty or stop-word-only
   query gives no groups (the page shows the browse list instead). */
export function rank(index, query, { per = 8 } = {}) {
  const toks = tokenize(query);
  if (!toks.length) return [];
  const scored = index.map(e => [score(e, toks), e]).filter(([s]) => s > 0);
  const groups = [];
  for (const kind of KINDS) {
    const items = scored.filter(([, e]) => e.kind === kind).sort((a, b) => b[0] - a[0] || a[1].title.length - b[1].title.length).slice(0, per).map(([, e]) => e);
    if (items.length) groups.push({ kind, items });
  }
  return groups;
}
export const countOf = groups => groups.reduce((n, g) => n + g.items.length, 0);
