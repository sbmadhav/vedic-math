/* The route table (openspec change indexable-routes, design D2 and D3): one row per pattern in js/app.js `routes`, in
   the same order, so the first match wins here as it does there. Pure: no DOM and nothing stored, so the router, the
   hash shim, the build (the prerendered pages, the sitemap, _redirects), js/metrics.js and the tests read one table.
   A route key is the hash form the router matches ('#/kata/sq5/12'). Its path is the key without its '#', under
   /learn, lowercase with no trailing slash ('/learn/kata/sq5/12'); Home is '/learn/'. Four rows choose otherwise
   (design D2): the Skill map is /learn/skills, and a route's second name (tricks, progress, duel, learn) is an alias
   path that answers 301 to the screen's one path.
   Row fields:
   - pattern: the regex in js/app.js `routes`, the same source (test/paths.test.mjs matches them up)
   - kind: the route-view name for analytics (js/metrics.js routePath): {catalog:n} is capture n, lowercased, which
     metrics checks against that catalog; a numbered step is its fixed word; a function where the pattern has no
     capture to read it from
   - public: opens without a Mode (design D6); indexed: self-canonical and in the sitemap (design D5)
   - lock: what can lock the screen (design D7): 'kata' (the Kata before it), 'challenge' (a Medal on the one before),
     'level' (a Rating or a Medal on the Level before), 'mode' (a play experience the Mode cannot open), or null
   - path: the one path, when it is not the key without its '#'; aliases: the paths that answer 301 to it
   - keys: the finite route keys the row makes, from the catalogs, enumerated only when asked (none for a redirect) */
import { SKILLS, GRADES } from './skills/index.js';
import { TRICKS } from './vedic.js';
import { KATAS_PER_TRICK, STARS_PER_TRICK, TOPICS, CHALLENGE_COUNT } from './levels.js';
import { SUTRAS, SUBSUTRAS } from './sutras.js';
import { GAMES, LEVELS_PER_GAME } from './games.js';
import { sections } from './guide.js';
import { guideCounts } from './explain-lines.js';
import { PLAY } from './play/catalog.js';

export const BASE = '/learn';

const range = n => Array.from({ length: n }, (_, i) => i + 1);
const GRADE_IDS = GRADES.map(g => String(g.id));
const SUTRA_IDS = [...SUTRAS.map(c => 's' + c.n), ...SUBSUTRAS.map(c => 'u' + c.n)];
const row = (pattern, kind, o = {}) => Object.freeze({ pattern, kind, public: false, indexed: false, lock: null, path: null, aliases: [], keys: () => [], ...o });

export const ROWS = Object.freeze([
  row(/^#?\/?$/, 'home', { public: true, indexed: true, keys: () => ['#/'] }),
  row(/^#\/learn$/, 'learn', { public: true, indexed: true, path: '/learn/skills', aliases: ['/learn/learn'], keys: () => ['#/learn'] }),
  row(/^#\/grade\/(\w+)$/, 'grade/{grade:1}', { public: true, indexed: true, keys: () => GRADE_IDS.map(g => `#/grade/${g}`) }),
  row(/^#\/skill\/([\w-]+)$/, 'skill/{skill:1}', { public: true, indexed: true, keys: () => SKILLS.map(s => `#/skill/${s.id}`) }),
  row(/^#\/mix\/(\w+)$/, 'mix/{grade:1}', { keys: () => GRADE_IDS.map(g => `#/mix/${g}`) }),
  row(/^#\/mix\/(\w+)\/words$/, 'mix/{grade:1}/words', { keys: () => GRADE_IDS.map(g => `#/mix/${g}/words`) }),
  row(/^#\/run\/(\w+)$/, 'run/{grade:1}', { keys: () => GRADE_IDS.map(g => `#/run/${g}`) }),
  row(/^#\/arcade$/, 'arcade', { public: true, indexed: true, keys: () => ['#/arcade'] }),
  row(/^#\/(dojo|tricks)$/, 'dojo', { public: true, indexed: true, path: '/learn/dojo', aliases: ['/learn/tricks'], keys: () => ['#/dojo'] }),
  row(/^#\/katas\/([\w-]+)$/, 'katas/{trick:1}', { keys: () => TRICKS.map(t => `#/katas/${t.id}`) }),
  row(/^#\/kata\/([\w-]+)\/(\d+)$/, 'kata/{trick:1}/kata', { lock: 'kata', keys: () => TRICKS.flatMap(t => range(KATAS_PER_TRICK).map(n => `#/kata/${t.id}/${n}`)) }),
  row(/^#\/star\/([\w-]+)\/(\d+)$/, 'star/{trick:1}/star', { keys: () => TRICKS.flatMap(t => range(STARS_PER_TRICK).map(n => `#/star/${t.id}/${n}`)) }),
  row(/^#\/try$/, 'try', { keys: () => ['#/try'] }),
  row(/^#\/placement$/, 'placement', { keys: () => ['#/placement'] }), /* openspec change placement: the level climb, a Player's own screen, never indexed */
  row(/^#\/tower$/, 'tower', { keys: () => ['#/tower'] }),
  row(/^#\/tower\/(\d+)$/, 'tower/chapter', { keys: () => range(TOPICS.length).map(c => `#/tower/${c}`) }),
  row(/^#\/challenge\/(\d+)$/, 'challenge/challenge', { lock: 'challenge', keys: () => range(CHALLENGE_COUNT).map(id => `#/challenge/${id}`) }),
  row(/^#\/sutras$/, 'sutras', { public: true, indexed: true, keys: () => ['#/sutras'] }),
  row(/^#\/sutras\/(\w+)$/, 'sutras/{sutra:1}', { public: true, indexed: true, keys: () => SUTRA_IDS.map(id => `#/sutras/${id}`) }),
  row(/^#\/arena$/, 'arena', { public: true, indexed: true, keys: () => ['#/arena'] }),
  row(/^#\/duel$/, 'duel', { path: '/learn/arena/party', aliases: ['/learn/duel'] }), /* Duel became Party Mode: a redirect, no page of its own */
  row(/^#\/games$/, 'games', { public: true, indexed: true, keys: () => ['#/games'] }),
  row(/^#\/game\/([\w-]+)$/, 'game/{game:1}', { public: true, indexed: true, keys: () => GAMES.map(g => `#/game/${g.id}`) }),
  row(/^#\/game\/([\w-]+)\/(\d+)$/, 'game/{game:1}/level', { lock: 'level', keys: () => GAMES.flatMap(g => range(LEVELS_PER_GAME).map(n => `#/game/${g.id}/${n}`)) }),
  row(/^#\/watch$/, 'watch', { public: true, indexed: true, keys: () => ['#/watch'] }),
  row(/^#\/places$/, 'places', { keys: () => ['#/places'] }),
  row(/^#\/tiles$/, 'tiles', { keys: () => ['#/tiles'] }),
  row(/^#\/(me|progress)$/, 'me', { path: '/learn/me', aliases: ['/learn/progress'], keys: () => ['#/me'] }),
  /* #/guide/<s> scrolls the Guide to section s (js/guide.js sections), so each section is a page */
  row(/^#\/guide(?:\/([\w-]+))?$/, m => (m[1] ? 'guide/section' : 'guide'), { public: true, indexed: true, keys: () => ['#/guide', ...sections(guideCounts()).map(s => `#/guide/${s.id}`)] }),
  row(/^#\/find$/, 'find', { public: true, keys: () => ['#/find'] }),
  /* An Arena challenge link (openspec change arena-challenge-link): open-ended codes, linkable, never indexed; /learn/arena/day/* is a 200 rewrite to the Arena's page */
  row(/^#\/arena\/day(?:\/.*)?$/, 'arena/day', { keys: () => [] }),
  /* Play experiences (js/play/catalog.js): the page is the experience; what follows it is its parameters (a share code) */
  row(/^#\/(?:dojo|arena|games|sutras)\/[a-z-]+(?:\/.*)?$/, m => 'play/' + m[0].split('/')[2], { public: true, indexed: true, lock: 'mode', keys: () => PLAY.map(e => e.route) })
]);

/* [alias path, the path it answers 301 to], for _redirects (design D2) */
export const ALIASES = Object.freeze(ROWS.flatMap(r => r.aliases.map(a => [a, r.path])));
const ALIAS = new Map(ALIASES);
/* A row's own path, for rows whose path is not the key without its '#' */
const FIXED = new Map(ROWS.filter(r => r.path && r.keys().length).map(r => [r.path, r.keys()[0]]));
/* The key as the catalog writes it, per row ('#/grade/k' to '#/grade/K'), built on first use */
const CANON = new Map();

/* The row a route key matches, or null */
export const rowFor = key => ROWS.find(r => r.pattern.test(key)) || null;

function pathOf(row, key) {
  if (row.path) return row.path;
  const m = key.match(row.pattern), rest = key.replace(/^#/, '') || '/';
  /* Catalog ids and numbers are lowercase ('K' to 'k'); a play route is kept as written, since a share code after the
     experience may hold capitals. The pattern's captures tell the two apart: a play route captures nothing. */
  const p = BASE + (m.length > 1 ? rest.toLowerCase() : rest);
  return p.length > BASE.length + 1 ? p.replace(/\/+$/, '') : p;
}

/* The path for a route key ('#/kata/sq5/12' to '/learn/kata/sq5/12'; an alias key to its screen's one path), or null */
export function toPath(key) {
  const row = rowFor(key);
  return row ? pathOf(row, key) : null;
}

/* The route key for a pathname ('/learn/kata/sq5/12' to '#/kata/sq5/12'), or null for a path that names no screen.
   A trailing slash is ignored, an alias gives its screen's key, and an id comes back as its catalog writes it. A path
   the catalogs do not list (a share code, a number past the end) keeps its key: the view decides what it shows. */
export function toKey(pathname) {
  let p = String(pathname || '');
  while (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p !== BASE && !p.startsWith(BASE + '/')) return null;
  p = ALIAS.get(p) || p;
  if (FIXED.has(p)) return FIXED.get(p);
  const key = '#' + (p.slice(BASE.length) || '/'), row = rowFor(key);
  if (!row) return null;
  let canon = CANON.get(row);
  if (!canon) CANON.set(row, canon = new Map(row.keys().map(k => [k.toLowerCase(), k])));
  return canon.get(key.toLowerCase()) || key;
}

/* The route-view name for a key (js/metrics.js checks the ids against the catalogs), or null */
export function kindOf(key) {
  const row = rowFor(key);
  if (!row) return null;
  const m = key.match(row.pattern);
  return typeof row.kind === 'function' ? row.kind(m) : row.kind.replace(/\{\w+:(\d)\}/g, (_, i) => m[+i].toLowerCase());
}

/* Every finite path, one entry per route key the catalogs enumerate: { key, path, kind, public, indexed, lock } */
export function allPaths() {
  return ROWS.flatMap(row => row.keys().map(key => ({ key, path: pathOf(row, key), kind: kindOf(key), public: row.public, indexed: row.indexed, lock: row.lock })));
}
