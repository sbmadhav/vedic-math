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

/* Kinds in the order results are grouped; the labels read by Mode. 'top' is the Best match group: the entries a known
   question or phrase points to (INTENTS), shown before every kind. */
export const KINDS = ['top', 'section', 'mode', 'trick', 'skill', 'sutra', 'game', 'play', 'guide', 'grade', 'video'];
export const KIND_LABELS = {
  top: 'Best match', section: { explorer: 'Places', challenger: 'Sections' }, mode: 'Play modes', trick: { explorer: 'Speed tricks', challenger: 'Tricks' }, skill: 'Skills',
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
  'trick-by11': ['eleven', 'elevens', 'times 11', 'multiply', 'multiplication', 'times'],
  'trick-times5': ['fives', 'times 5', 'halve', 'half', 'multiplication', 'times'],
  'trick-by9s': ['nines', 'times 9', 'multiplication', 'times'],
  'trick-ends10': ['ten buddies', 'last digits', 'multiplication', 'times'],
  'trick-near-base': ['near 100', 'base', 'ninety', 'multiplication', 'times', 'large numbers'],
  'trick-square-near': ['squares', 'squaring', 'near 100'],
  'trick-check9': ['check', 'checking', 'casting out nines', 'digit sum', 'mistake', 'add', 'adding'],
  'trick-crosswise': ['vertically', 'long multiplication', 'criss cross', 'two digit', 'multiplication', 'times', 'large numbers', 'long numbers', 'multi digit', 'product'],
  'trick-duplex': ['squares', 'squaring', 'two digit'],
  'trick-sub-base': ['base', 'fifty', 'multiplication', 'times'],
  'trick-div9': ['divide', 'divide by 9', 'division', 'dividing', 'nines', 'share'],
  'trick-osculator': ['divisible', 'divisibility', 'test', 'sevens', 'divide', 'division'],
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
  'guide-modes': ['explorer', 'challenger', 'pro', 'age', 'ages', 'change mode', 'kids', 'children', 'adults'],
  'mode-explorer': ['kids', 'kid', 'children', 'child', 'young', 'little', 'preschool', 'kindergarten', 'toddler', 'easy', 'pictures'],
  'mode-challenger': ['tweens', 'middle school', 'speed', 'belts'],
  'mode-pro': ['adults', 'adult', 'grown up', 'teens', 'teen', 'teenager', 'advanced', 'older', 'algebra', 'calculus']
};

/* Words that name a kind, so "games" lists the games and "tricks" the Tricks (a weaker hit than a synonym) */
export const KIND_WORDS = {
  section: [], mode: ['mode', 'modes', 'ages'], trick: ['trick', 'tricks', 'shortcut', 'shortcuts', 'speed'], skill: ['skill', 'skills', 'lesson', 'lessons'],
  sutra: ['sutra', 'sutras', 'rule', 'rules'], game: ['game', 'games'], play: ['play', 'ways to play'], guide: ['guide'], grade: ['grade', 'grades', 'level', 'levels'], video: ['video', 'videos', 'watch']
};

/* Questions and phrases people type that the words alone answer badly. When the query is one of these phrases, or holds
   one and nothing else but stop words and FILLER, its entries are listed first as the Best match (in this order, for
   the ones the Mode has). "how many dots" holds "how" but also "many" and "dots", so it is not a question about the app. */
export const INTENTS = [
  { phrases: ['what is vedic math', 'what is vedic maths', 'vedic math', 'vedic maths', 'where do the sutras come from', 'who made the sutras'], ids: ['section-sutras', 'guide-sutras', 'section-guide'] },
  { phrases: ['help', 'how', 'how it works', 'how does it work', 'how does this work', 'how do i', 'how to', 'how to play', 'how do i play', 'how do i start', 'what is this', 'what is', 'what do i do', 'where do i start', 'where to start', 'start here', 'new here', 'getting started', 'get started', 'tour', 'instructions', 'about'], ids: ['section-guide', 'guide-around'] },
  { phrases: ['kids', 'kid', 'for kids', 'for a kid', 'children', 'for children', 'child', 'my child', 'my kid', 'my son', 'my daughter', 'young', 'young kids', 'little kids', 'preschool', 'kindergarten', 'toddler', 'ages 4 to 7'], ids: ['mode-explorer', 'guide-modes'] },
  { phrases: ['adults', 'adult', 'for adults', 'grown up', 'grown ups', 'teens', 'teen', 'for teens', 'teenager', 'advanced', 'hard', 'harder'], ids: ['mode-pro', 'guide-modes'] },
  { phrases: ['ages 8 to 12', 'tweens', 'middle school', 'primary school', 'elementary school'], ids: ['mode-challenger', 'guide-modes'] },
  { phrases: ['change mode', 'change my mode', 'switch mode', 'play mode', 'modes', 'which mode', 'age', 'my age'], ids: ['guide-modes', 'section-me'] }
];
const FILLER = new Set(['app', 'site', 'website', 'page', 'thing', 'this', 'math', 'maths']);

/* The three Modes as Find entries (openspec find): the same ages and lines as fx.MODES, opening Me, where a Mode is
   picked or changed (before any Mode, Me shows the mode picker). Kept here so js/find.js stays free of the DOM. */
export const MODE_LINES = [
  { id: 'explorer', name: 'Explorer', ages: 'About 4 to 7', blurb: 'Big buttons, pictures, counting, read-aloud.' },
  { id: 'challenger', name: 'Challenger', ages: 'About 8 to 12', blurb: 'Speed tricks, belts, daily challenges.' },
  { id: 'pro', name: 'Pro', ages: '13 to adult', blurb: 'Algebra to calculus, sutra deep dives, leaderboards.' }
];

/* Lower case, no Latin diacritics, letters (any script, with their marks), digits and spaces only:
   "Ūrdhva-Tiryagbhyām" becomes "urdhva tiryagbhyam", and a Devanagari name keeps its letters so it can be typed too */
export const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[²³]/g, m => (m === '²' ? ' squared' : ' cubed')).replace(/[^\p{L}\p{M}\p{Nd}]+/gu, ' ').trim();
/* Words that carry no meaning in a search. Questions ("how does it work", "what is ...") and size words ("big numbers")
   are mostly these, so they are dropped and the rest is matched; the questions themselves are answered by INTENTS. */
export const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'or', 'it', 'its', 'is', 'at', 'how', 'does', 'do', 'did', 'is', 'are', 'was',
  'what', 'whats', 'which', 'who', 'why', 'where', 'when', 'i', 'me', 'my', 'can', 'you', 'your', 'this', 'that', 'be', 'big', 'bigger', 'huge', 'work', 'works', 'working', 'some', 'want', 'math', 'maths']);
export const tokenize = s => normalize(s).split(' ').filter(w => w && !STOP.has(w));
const words = s => normalize(s).split(' ').filter(Boolean);

const firstSentence = s => String(s || '').split(/(?<=[.!?])\s/)[0];
const strandName = (id, m) => (STRANDS[id] ? (m === 'explorer' ? STRANDS[id].kid : STRANDS[id].pro) : '');
const gradeName = (g, m) => { const x = GRADES.find(y => String(y.id) === String(g)); return x ? (m === 'explorer' ? x.kid : x.pro) : ''; };
const beltOf = id => BELTS.find(b => b.tricks.includes(id));

/* An entry: { id, kind, title, sub, href | yt, title words, synonym words, kind words, description words } */
function entry(kind, id, title, sub, target, more = '') {
  const key = `${kind}-${id}`;
  return { id: key, kind, title, sub, ...target, t: words(title), s: (SYNONYMS[key] || []).flatMap(words), k: (KIND_WORDS[kind] || []).flatMap(words), d: words(`${sub} ${more}`) };
}

/* Every named thing the Mode can open. videos: the list from js/videos.js when it has loaded (it is lazy), else none. */
export function buildIndex({ mode, counts = {}, videos = [] } = {}) {
  const m = modeOf(mode), ex = m === 'explorer', out = [];
  for (const l of sectionLines(m)) out.push(entry('section', l.href.replace('#/', '') || 'home', l.label, l.plain, { href: l.href }));
  for (const x of MODE_LINES) out.push(entry('mode', x.id, `${x.name} Mode`, `${x.ages}. ${x.blurb} ${x.id === m ? 'Your Mode now; change it on Me.' : 'Pick it on Me.'}`, { href: '#/me' }));
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

/* Score one entry for one query token: the best of title (10), synonym (8), kind word (6), description (3); a prefix
   of at least two letters scores 70 percent of a whole word; 0 when the token is nowhere in it. */
const hit = (list, tok) => { let best = 0; for (const w of list) { if (w === tok) return 1; if (tok.length >= 2 && w.startsWith(tok)) best = 0.7; } return best; };
const tokScore = (e, tok) => Math.max(10 * hit(e.t, tok), 8 * hit(e.s, tok), 6 * hit(e.k || [], tok), 3 * hit(e.d, tok));
/* The sum over the tokens that match; a token that matches nothing adds nothing (share() says how many matched) */
export const score = (e, toks) => toks.reduce((n, tok) => n + tokScore(e, tok), 0);
/* The share of the query's tokens that match the entry somewhere, 0 to 1 */
export const share = (e, toks) => (toks.length ? toks.filter(tok => tokScore(e, tok) > 0).length / toks.length : 0);
/* An entry is listed when every query word matches it, or when at least half of them do and one of those is in its
   title, synonyms or kind words (not only its description): "multiply big numbers" lists the Tricks that say multiply
   and numbers, and one stray word does not empty the page. Entries matching more words come first. */
export const MIN_SHARE = 0.5;
const strong = (e, toks) => toks.some(tok => Math.max(10 * hit(e.t, tok), 8 * hit(e.s, tok), 6 * hit(e.k || [], tok)) > 0);
export const listed = (e, toks) => { const sh = share(e, toks); return sh === 1 || (sh >= MIN_SHARE && strong(e, toks)); };

/* The intents a query asks for (INTENTS): the query is the phrase, or holds it as whole words and nothing else but
   stop words and FILLER */
export function intentsOf(query) {
  const q = normalize(query), all = q.split(' ').filter(Boolean);
  if (!all.length) return [];
  return INTENTS.filter(it => it.phrases.some(p => {
    if (q === p) return true;
    if (!` ${q} `.includes(` ${p} `)) return false;
    const inPhrase = new Set(p.split(' '));
    return all.every(w => inPhrase.has(w) || STOP.has(w) || FILLER.has(w));
  }));
}

/* The results for a query: the Best match group first (entries an intent names, in its order), then groups in KINDS
   order, at most `per` entries each, the entries matching the larger share of the words first, then by score. Among
   the kinds, a group whose best entry matches a larger share of the words comes first; equal shares keep KINDS order.
   An empty or stop-word-only query that names no intent gives no groups (the page shows the browse list instead). */
export function rank(index, query, { per = 8 } = {}) {
  const toks = tokenize(query), byId = new Map(index.map(e => [e.id, e]));
  const top = [...new Set(intentsOf(query).flatMap(it => it.ids))].map(id => byId.get(id)).filter(Boolean).slice(0, per);
  const pinned = new Set(top.map(e => e.id));
  const groups = top.length ? [{ kind: 'top', items: top, best: 2 }] : [];
  if (toks.length) {
    const scored = index.filter(e => !pinned.has(e.id)).filter(e => listed(e, toks)).map(e => [share(e, toks), score(e, toks), e]);
    const kinds = [];
    for (const kind of KINDS) {
      const items = scored.filter(([, , e]) => e.kind === kind).sort((a, b) => b[0] - a[0] || b[1] - a[1] || a[2].title.length - b[2].title.length).slice(0, per);
      if (items.length) kinds.push({ kind, items: items.map(([, , e]) => e), best: items[0][0] });
    }
    groups.push(...kinds.sort((a, b) => b.best - a.best)); /* a stable sort: equal shares stay in KINDS order */
  }
  return groups.map(({ kind, items }) => ({ kind, items }));
}
export const countOf = groups => groups.reduce((n, g) => n + g.items.length, 0);
