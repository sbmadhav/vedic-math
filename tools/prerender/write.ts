/* The prerendered route pages (openspec change indexable-routes, design D4 and D5, task 2.3). For every path the
   route table enumerates (allPaths() in js/paths.js) this writes <out>/learn/<path>.html: the game's shell, byte for
   byte, with that page's own <title>, meta description, canonical link, Open Graph title, description and URL, and
   `noindex, follow` on the pages design D5 keeps out of the index; plus <out>/learn/404.html, the shell with `noindex`
   and no canonical, which Cloudflare's 404-page handling serves for any path under /learn/ with no file. No article
   yet: tasks 5.1 to 5.3 add the public text into #view. Every page keeps the shell's scripts and stamps, so one
   _headers rule (/learn/*) covers them all; build.py fails when a page's inline scripts differ from the shell's.

   The title is the one the view sets (document.title in js/app.js). Where the view gives several pages one title
   (every Guide section says "Guide", the Word problems mix says "Endless practice", the tile Home says "Learn Vedic
   Math"), the page's title adds what tells them apart, so every page has its own. Descriptions are one sentence under
   160 characters from the catalogs, with no em dash (test/prerender.test.mjs checks both).

   Run by build.py with the system node (22.18 or newer strips the types itself, as for tools/budget.ts):
     node --no-warnings tools/prerender/write.ts --shell _site/play/index.html --out _site
   It prints one JSON line: the page count, how many are indexed, the folder written, and the 200 rewrites for share
   links that build.py puts in _redirects. test/prerender.test.mjs imports the functions and checks the pages in memory. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPaths, BASE } from '../../js/paths.js';
import { GRADES, SKILLS } from '../../js/skills/index.js';
import { TRICKS } from '../../js/vedic.js';
import { KATAS_PER_TRICK, STARS_PER_TRICK, TOPICS, PER_CHAPTER, CHALLENGE_COUNT } from '../../js/levels.js';
import { SUTRAS, SUBSUTRAS } from '../../js/sutras.js';
import { GAMES, LEVELS_PER_GAME } from '../../js/games.js';
import { sections, say } from '../../js/guide.js';
import { guideCounts } from '../../js/explain-lines.js';
import { PLAY } from '../../js/play/catalog.js';

export const ORIGIN = 'https://learnvedicmath.com';
export const SITE = 'Learn Vedic Math';
export const NOINDEX = '<meta name="robots" content="noindex, follow">';
/** Design D5: a meta description is one sentence under this many characters */
export const DESCRIPTION_MAX = 160;

/** One row of allPaths() (js/paths.js): the route key, its path and what the route table says about it */
export type Entry = { key: string; path: string; kind: string | null; public: boolean; indexed: boolean; lock: string | null };
export type Meta = { title: string; description: string };
export type Page = { entry: Entry | null; path: string; file: string; title: string; description: string; html: string };

/* The catalogs as this module reads them (their modules are plain JavaScript, so the shapes are named here) */
type Named = { id: string | number; pro: string; band: string };
type Titled = { id: string; title: string; idea?: string; desc?: string; tag?: string; blurb?: string; route?: string };
type Sutra = { name: string; meaning: string; plain: string };
type Topic = { name: string };
type Section = { id: string; title: unknown; what: unknown };

const grades = GRADES as Named[], skills = SKILLS as Titled[], tricks = TRICKS as Titled[], games = GAMES as Titled[], play = PLAY as Titled[];
const sutras = SUTRAS as Sutra[], subsutras = SUBSUTRAS as Sutra[], topics = TOPICS as Topic[];
const guide = () => (sections(guideCounts()) as Section[]);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = (s: unknown) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
/** The first sentence of a catalog text (ending where a capital, digit or quote follows the stop, so "1.5" and "e.g."
    do not end it), when it fits a description; else the fallback */
function sentence(raw: unknown, fallback: string): string {
  const t = text(raw);
  const m = /^(.*?[.!?])(?=\s+[A-Z0-9"(]|\s*$)/.exec(t);
  const first = m?.[1] ?? t;
  return first && first.length < DESCRIPTION_MAX ? first : fallback;
}
const titled = (list: Titled[], id: string, what: string): Titled => {
  const hit = list.find(x => x.id === id);
  if (!hit) throw new Error(`${what} ${id} is not in its catalog`);
  return hit;
};
const grade = (g: string): Named => {
  const hit = grades.find(x => String(x.id) === g);
  if (!hit) throw new Error(`grade ${g} is not in GRADES`);
  return hit;
};
const page = (title: string, description: string): Meta => ({ title: `${title} · ${SITE}`, description });

/** The page's title and description for a route key, following the view's document.title rule (see the header) */
export function metaOf(key: string): Meta {
  /* A play experience is a page inside its section (js/play/catalog.js), so its route comes before the section's own */
  const e = play.find(x => x.route === key);
  if (e) {
    const tag = text(e.tag).replace(/[.?!]$/, '');
    return page(e.title, sentence(`${e.title}, ${tag[0]?.toLowerCase() ?? ''}${tag.slice(1)}: ${text(e.blurb)}`, `${e.title}: ${tag}.`));
  }
  const parts = key.replace(/^#\//, '').split('/');
  const [head = '', a = '', b = ''] = parts;
  const n = +b;
  switch (head) {
    case '': return { title: SITE, description: `${SITE}: speed tricks from the sutras, a counting-to-calculus skill map, games, daily quests and an Arena with Boards. Three Modes for every age.` };
    case 'learn': return page('Skill map', `${skills.length} skills from counting to calculus, each with a picture-first lesson, endless practice and hints that teach the strategy.`);
    case 'grade': { const G = grade(a); return page(G.pro, `${G.pro} on the Skill map: ${G.band}. Every skill has a lesson, endless practice and hints.`); }
    case 'skill': { const s = titled(skills, a, 'skill'); return page(s.title, sentence(s.idea, `${s.title}: a lesson with a worked example, endless practice and hints that teach the strategy.`)); }
    case 'mix': {
      const G = grade(a);
      /* The view titles both mixes "Endless practice"; the Word problems page says what it holds */
      return b === 'words' ? page(`Word problems, ${G.pro}`, `Only the word problems of ${G.pro}: endless practice that adapts to you, with hints that teach the strategy.`)
        : page(`Endless practice, ${G.pro}`, `Endless practice across every ${G.pro} skill: mixed questions that adapt to you, with hints that teach the strategy.`);
    }
    case 'run': { const G = grade(a); return page(`Endless run, ${G.pro}`, `An endless run through ${G.pro}: keep answering right to keep your streak, with questions that adapt to you.`); }
    case 'arcade': return page('Arcade', `The Arcade: the Vedic Dojo, the Arena and Games, every way to play in ${SITE}.`);
    case 'dojo': return page('Vedic Dojo', `${tricks.length} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in seven belts, each with an animator, practice and ${KATAS_PER_TRICK} katas.`);
    case 'katas': { const t = titled(tricks, a, 'trick'); return page(`${t.title} katas`, `${KATAS_PER_TRICK} katas for ${t.title}: short drills of 5 to 8 problems that get harder as you climb.`); }
    case 'kata': { const t = titled(tricks, a, 'trick'); return page(`Kata ${n}: ${t.title}`, `Kata ${n} of ${KATAS_PER_TRICK} for ${t.title}: a short drill of 5 to 8 problems in the Vedic Dojo. Get 60% right to open the next.`); }
    case 'star': { const t = titled(tricks, a, 'trick'); return page(`Star ${n}: ${t.title}`, `Star ${n} of ${STARS_PER_TRICK} for ${t.title}: a timed round in the Vedic Dojo. Light every Star of a belt's tricks to earn the belt.`); }
    case 'try': return page('Try a trick', 'Try a speed trick with your own numbers and watch it work step by step.');
    case 'tower': {
      if (!a) return page('Challenge tower', `${topics.length} chapters of ${PER_CHAPTER} challenges in five formats: Sprint, Sharpshooter, Survival, Time attack and Boss rounds.`);
      const tp = topics[+a - 1];
      if (!tp) throw new Error(`tower chapter ${a} is not in TOPICS`);
      return page(`${tp.name}: Challenge tower`, `Chapter ${a} of the Challenge tower, ${tp.name}: ${PER_CHAPTER} challenges. Clear each one to open the next.`);
    }
    case 'challenge': {
      const id = +a, tp = topics[Math.ceil(id / PER_CHAPTER) - 1];
      if (!tp) throw new Error(`challenge ${a} is past the tower's ${CHALLENGE_COUNT}`);
      return page(`Challenge ${id}`, `Challenge ${id} of ${CHALLENGE_COUNT} in the Challenge tower, in the chapter ${tp.name}. Win a Medal to open the next.`);
    }
    case 'sutras': {
      if (!a) return page('The sutras', `The ${sutras.length} sutras and ${subsutras.length} sub-sutras from Bharati Krishna Tirtha's 1965 book: each a short word formula, with its meaning, history and worked examples.`);
      const c = (a[0] === 's' ? sutras : subsutras)[+a.slice(1) - 1];
      if (!c) throw new Error(`sutra ${a} is not in the catalog`);
      const kind = a[0] === 's' ? 'sutra' : 'sub-sutra';
      const book = `a ${kind} from Bharati Krishna Tirtha's 1965 book, with worked examples.`;
      /* The longest names leave no room for the meaning in the fallback line */
      return page(c.name, sentence(`${c.name}, "${c.meaning}": ${text(c.plain)}`, sentence(`${c.name}, "${c.meaning}": ${book}`, `${c.name}: ${book}`)));
    }
    case 'arena': return page('Arena', 'The Arena: answer as many as you can in a timed round; the daily round asks everyone in your Mode the same questions, so it is a fair race.');
    case 'games': return page('Games', `${games.length} games, each with its own leaderboard and ${LEVELS_PER_GAME} levels that open as your skill grows; every game adapts to you.`);
    case 'game': {
      const g = titled(games, a, 'game');
      if (!b) return page(g.title, sentence(g.desc, `${g.title}: a game that adapts to you, with ${LEVELS_PER_GAME} levels and its own leaderboard.`));
      return page(`${g.title} level ${n}`, `Level ${n} of ${LEVELS_PER_GAME} in ${g.title}: Levels open as your skill grows, or with a Medal on the one before.`);
    }
    case 'watch': return page('Watch and learn', 'Short videos that play right here, each checked by hand and matched to the skills and tricks it teaches.');
    case 'places': return page('All places', `Every place in ${SITE} as a plain list, so any of them is one tap away.`);
    /* The view titles the tile Home "Learn Vedic Math", as Home; the page says which Home it is */
    case 'tiles': return page('Home tiles', `Home as tiles: every place to learn and play in ${SITE}, whatever the Sky switch says.`);
    case 'me': return page('Me', 'Your page: progress, Sparks, badges, settings and the Players on this device.');
    case 'guide': {
      if (!a) return page('Guide', 'The Guide: every part of the app, what it is for and how to use it, with a link to each one.');
      const s = guide().find(x => x.id === a);
      if (!s) throw new Error(`guide section ${a} is not in js/guide.js`);
      const title = text(say(s.title, 'challenger'));
      /* Every section's view says "Guide"; the page names its section */
      return page(`${title}: Guide`, sentence(say(s.what, 'challenger'), `${title}: a section of the Guide, what it is for and how to use it.`));
    }
    case 'find': return page('Find', `Find anything in ${SITE} by name: skills, tricks, sutras, games, videos and the Guide.`);
    default: throw new Error(`${key}: no title rule for this route`);
  }
}

/** The file a path is written to, under the folder BASE names: /learn/ is learn/index.html, /learn/kata/sq5/12 is
    learn/kata/sq5/12.html (served at its path by auto-trailing-slash) */
export const fileOf = (path: string): string => (path.endsWith('/') ? `${path}index.html` : `${path}.html`).slice(1);

/* The head lines the shell (play/index.html) carries once, each on its own line, which every page rewrites */
const TITLE = /<title>[^<]*<\/title>\n/, DESCRIPTION = /<meta name="description" content="[^"]*">\n/, CANONICAL = /<link rel="canonical" href="[^"]*">\n/;
const OG_TITLE = /<meta property="og:title" content="[^"]*">\n/, OG_DESCRIPTION = /<meta property="og:description" content="[^"]*">\n/, OG_URL = /<meta property="og:url" content="[^"]*">\n/;

/** Replaces the one line the shell has for `re` with `lines` (each ending in a newline; none to drop the line) */
function replaceOnce(html: string, re: RegExp, lines: string[]): string {
  const hits = html.match(new RegExp(re.source, 'g')) ?? [];
  if (hits.length !== 1) throw new Error(`the shell has ${hits.length} lines matching ${re.source} in its head; the prerender rewrites exactly one`);
  return html.replace(re, () => lines.map(l => `${l}\n`).join(''));
}

/** The shell with a page's head: title, description, canonical, Open Graph, and the robots line when not indexed;
    everything else, the body included, stays byte for byte. A null url (the 404 shell) drops the canonical and og:url:
    a not-found page has no address of its own. */
export function withHead(shell: string, meta: Meta, url: string | null, indexed: boolean): string {
  let html = shell;
  html = replaceOnce(html, TITLE, [`<title>${esc(meta.title)}</title>`]);
  html = replaceOnce(html, DESCRIPTION, [`<meta name="description" content="${esc(meta.description)}">`, ...(indexed ? [] : [NOINDEX])]);
  html = replaceOnce(html, CANONICAL, url ? [`<link rel="canonical" href="${esc(url)}">`] : []);
  html = replaceOnce(html, OG_TITLE, [`<meta property="og:title" content="${esc(meta.title)}">`]);
  html = replaceOnce(html, OG_DESCRIPTION, [`<meta property="og:description" content="${esc(meta.description)}">`]);
  html = replaceOnce(html, OG_URL, url ? [`<meta property="og:url" content="${esc(url)}">`] : []);
  return html;
}

/** Every route page, in route-table order, and the 404 shell last */
export function routePages(shell: string): Page[] {
  const entries = allPaths() as Entry[];
  const pages = entries.map((entry): Page => {
    const meta = metaOf(entry.key), file = fileOf(entry.path);
    /* An id named "index" would be served as its folder's page. (Challenge 404 is learn/challenge/404.html, which the
       404-page handling also serves, with status 404, for a miss under /learn/challenge/: the same shell, noindex.) */
    if (!entry.path.endsWith('/') && file.endsWith('/index.html')) throw new Error(`${entry.path}: its file would be ${file}, which Cloudflare serves as the folder's index page`);
    return { entry, path: entry.path, file, ...meta, html: withHead(shell, meta, ORIGIN + entry.path, entry.indexed) };
  });
  const nf = metaOf('#/');
  pages.push({ entry: null, path: `${BASE}/404.html`, file: `${BASE.slice(1)}/404.html`, ...nf, html: withHead(shell, nf, null, false) });
  return pages;
}

/** The 200 rewrites for share links (design D4): a path under a play experience with parameters (a Ghost race code,
    an Art piece, a Wall card, a Locks chapter) is answered with the experience's own page, which reads them from the
    address as playFor() does for any '#/<section>/<experience>/<more>'; and an Arena challenge link
    (#/arena/day/<date>/<league>/<score>, openspec change arena-challenge-link) with the Arena. [from, to] per rule. */
export function rewrites(): [string, string][] {
  const rules = play.map((e): [string, string] => { const p = BASE + String(e.route).slice(1); return [`${p}/*`, p]; });
  rules.push([`${BASE}/arena/day/*`, `${BASE}/arena`]);
  return rules;
}

/** Writes every page under <out> and returns what build.py prints and uses */
export function write(shellFile: string, out: string) {
  const pages = routePages(readFileSync(shellFile, 'utf8'));
  for (const p of pages) {
    const dest = join(out, p.file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, p.html);
  }
  return { pages: pages.length - 1, indexed: pages.filter(p => p.entry?.indexed).length, base: BASE, folder: BASE.slice(1), rewrites: rewrites() };
}

function main(argv: string[]) {
  const opt = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const shell = opt('--shell'), out = opt('--out');
  if (!shell || !out) { process.stderr.write('usage: node tools/prerender/write.ts --shell <game page> --out <build dir>\n'); process.exit(2); }
  process.stdout.write(JSON.stringify(write(shell, out)) + '\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
