/* The prerendered route pages (openspec change indexable-routes, design D4 and D5, task 2.3): one page per allPaths()
   entry plus the 404 shell, each the game shell with its own head: a title that follows the view's document.title rule
   and is its own, a description under 160 characters with no em dash, a canonical without a query, Open Graph tags,
   and `noindex, follow` on exactly the rows the route table does not index. Checked in memory from play/index.html;
   test/build.test.mjs checks the files the build writes and the _headers and _redirects rules around them. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allPaths, BASE } from '../js/paths.js';
import { PLAY } from '../js/play/catalog.js';
import { routePages, metaOf, fileOf, rewrites, withHead, ORIGIN, NOINDEX, DESCRIPTION_MAX } from '../tools/prerender/write.ts';

const shell = readFileSync(new URL('../play/index.html', import.meta.url), 'utf8');
const PAGES = routePages(shell), ROUTES = PAGES.filter(p => p.entry), NOT_FOUND = PAGES[PAGES.length - 1];
const ALL = allPaths();
const by = path => ROUTES.find(p => p.path === path);
const body = html => html.slice(html.indexOf('</head>'));
/* The inline scripts that run, as build.py csp_hashes counts them: a data block never runs; an import map counts */
const inline = html => [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(m => !/type=/i.test(m[1]) || /type="?(text\/javascript|module|importmap|application\/javascript)/i.test(m[1])).map(m => m[2]);
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const title = html => attr(html, /<title>([^<]*)<\/title>/);
const description = html => attr(html, /<meta name="description" content="([^"]*)">/);
const canonical = html => attr(html, /<link rel="canonical" href="([^"]*)">/);
const og = (html, p) => attr(html, new RegExp(`<meta property="og:${p}" content="([^"]*)">`));

test('one page per allPaths() entry (3,469) plus the 404 shell, each at learn/<path>.html, Home at learn/index.html', () => {
  assert.equal(ROUTES.length, ALL.length);
  assert.equal(ROUTES.length, 3469);
  assert.equal(PAGES.length, 3470);
  assert.deepEqual(ROUTES.map(p => p.path), ALL.map(e => e.path), 'in route-table order');
  assert.equal(fileOf('/learn/'), 'learn/index.html');
  assert.equal(fileOf('/learn/skills'), 'learn/skills.html');
  assert.equal(fileOf('/learn/kata/sq5/12'), 'learn/kata/sq5/12.html');
  assert.equal(NOT_FOUND.file, 'learn/404.html');
  assert.equal(NOT_FOUND.entry, null);
  assert.equal(new Set(PAGES.map(p => p.file)).size, PAGES.length, 'distinct files');
  for (const p of PAGES) assert.ok(p.file.startsWith(`${BASE.slice(1)}/`) && p.file.endsWith('.html'), p.file);
  assert.deepEqual(PAGES.filter(p => p.file.endsWith('/index.html')).map(p => p.file), ['learn/index.html'], 'no id is served as a folder page');
});

test("every page's title is its own and follows the view's document.title rule", () => {
  const titles = ROUTES.map(p => title(p.html));
  assert.equal(new Set(titles).size, titles.length, 'unique titles');
  const t = path => title(by(path).html);
  assert.equal(t('/learn/'), 'Learn Vedic Math');
  assert.equal(t('/learn/skills'), 'Skill map · Learn Vedic Math');
  assert.equal(t('/learn/grade/k'), 'Kindergarten · Learn Vedic Math');
  assert.equal(t('/learn/grade/12'), 'Precalculus and calculus · Learn Vedic Math');
  assert.equal(t('/learn/skill/3-mult'), 'Times tables with strategies · Learn Vedic Math');
  assert.equal(t('/learn/mix/3'), 'Endless practice, Grade 3 · Learn Vedic Math');
  assert.equal(t('/learn/run/3'), 'Endless run, Grade 3 · Learn Vedic Math');
  assert.equal(t('/learn/katas/sq5'), 'Square numbers ending in 5 katas · Learn Vedic Math');
  assert.equal(t('/learn/kata/sq5/12'), 'Kata 12: Square numbers ending in 5 · Learn Vedic Math');
  assert.equal(t('/learn/star/sq5/2'), 'Star 2: Square numbers ending in 5 · Learn Vedic Math');
  assert.equal(t('/learn/tower/1'), 'Counting and number bonds: Challenge tower · Learn Vedic Math');
  assert.equal(t('/learn/challenge/30'), 'Challenge 30 · Learn Vedic Math');
  assert.equal(t('/learn/sutras/s1'), 'Ekādhikena Pūrveṇa · Learn Vedic Math');
  assert.equal(t('/learn/sutras/u1'), 'Ānurūpyeṇa · Learn Vedic Math');
  assert.equal(t('/learn/game/times-sprint'), 'Times sprint · Learn Vedic Math');
  assert.equal(t('/learn/game/times-sprint/12'), 'Times sprint level 12 · Learn Vedic Math');
  assert.equal(t('/learn/games/tala'), 'Tala Lab · Learn Vedic Math');
  assert.equal(t('/learn/sutras/lost-scroll'), 'The Lost Śulba Scroll · Learn Vedic Math');
  for (const [path, name] of [['/learn/arcade', 'Arcade'], ['/learn/dojo', 'Vedic Dojo'], ['/learn/try', 'Try a trick'], ['/learn/tower', 'Challenge tower'], ['/learn/sutras', 'The sutras'],
    ['/learn/arena', 'Arena'], ['/learn/games', 'Games'], ['/learn/watch', 'Watch and learn'], ['/learn/places', 'All places'], ['/learn/me', 'Me'], ['/learn/guide', 'Guide'], ['/learn/find', 'Find']])
    assert.equal(t(path), `${name} · Learn Vedic Math`, path);
  /* Where the view gives several pages one title, the page adds what tells them apart (the header of write.ts) */
  assert.equal(t('/learn/guide/around'), 'Getting around: Guide · Learn Vedic Math');
  assert.equal(t('/learn/mix/3/words'), 'Word problems, Grade 3 · Learn Vedic Math');
  assert.equal(t('/learn/tiles'), 'Home tiles · Learn Vedic Math');
  assert.equal(title(NOT_FOUND.html), 'Learn Vedic Math', 'the 404 shell shows Home');
  for (const p of PAGES) assert.equal(og(p.html, 'title'), title(p.html), p.path);
  assert.throws(() => metaOf('#/nowhere'), /no title rule/);
});

test(`every description is under ${DESCRIPTION_MAX} characters with no em dash, and Open Graph repeats it`, () => {
  for (const p of PAGES) {
    const d = description(p.html);
    assert.ok(d, `${p.path} has a description`);
    assert.ok(d.length < DESCRIPTION_MAX, `${p.path}: ${d.length} characters: ${d}`);
    assert.doesNotMatch(d, /—/, p.path);
    assert.doesNotMatch(title(p.html), /—/, p.path);
    assert.equal(og(p.html, 'description'), d, p.path);
  }
  const d = path => description(by(path).html);
  assert.equal(d('/learn/kata/sq5/12'), 'Kata 12 of 50 for Square numbers ending in 5: a short drill of 5 to 8 problems in the Vedic Dojo, which opens the next one at 60% right.');
  assert.match(d('/learn/sutras/s1'), /^Ekādhikena Pūrveṇa, &quot;By one more than the one before&quot;: /, 'the Sutra, its meaning and its plain explanation');
  assert.match(d('/learn/skill/3-mult'), /^You only need a few facts by heart\.$/, "the Skill's idea, first sentence");
  assert.match(d('/learn/games/tala'), /^Tala Lab, konnakol rhythm math: Clap 3 against 4/);
  assert.match(d('/learn/dojo'), /21 speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book/);
  assert.equal(d('/learn/'), description(shell), "Home keeps the shell's description");
});

test('the canonical and og:url are the production URL of the path, without a query; the 404 shell has neither', () => {
  for (const p of ROUTES) {
    assert.equal(canonical(p.html), ORIGIN + p.path, p.path);
    assert.equal(og(p.html, 'url'), ORIGIN + p.path, p.path);
    assert.ok(!p.html.includes(`${ORIGIN}/play/`), `${p.path} still names /play/`);
  }
  assert.equal(canonical(NOT_FOUND.html), null);
  assert.equal(og(NOT_FOUND.html, 'url'), null);
  assert.equal(og(ROUTES[0].html, 'image'), `${ORIGIN}/icons/og.png`, 'the site share image');
  assert.equal(og(ROUTES[0].html, 'type'), 'website');
});

test('`noindex, follow` is on exactly the rows the route table does not index, and on the 404 shell', () => {
  let count = 0;
  for (const p of ROUTES) {
    const has = p.html.includes(NOINDEX);
    assert.equal(has, !p.entry.indexed, p.path);
    assert.equal((p.html.match(/<meta name="robots"/g) || []).length, has ? 1 : 0, p.path);
    if (has) count++;
  }
  assert.equal(count, 3469 - 239);
  assert.ok(by('/learn/challenge/30').html.includes(NOINDEX), 'a numbered step');
  assert.ok(by('/learn/find').html.includes(NOINDEX), 'Find is public but not indexed');
  assert.ok(!by('/learn/sutras/s1').html.includes(NOINDEX), 'a Deep dive is indexed');
  assert.ok(NOT_FOUND.html.includes(NOINDEX));
});

test('every page is the shell apart from its head: the same body and inline script set, so one /learn/* header rule covers them', () => {
  const want = inline(shell);
  assert.ok(want.length >= 1, 'the shell has the pre-paint script');
  for (const p of PAGES) {
    assert.equal(body(p.html), body(shell), p.path);
    assert.deepEqual(inline(p.html), want, p.path);
    assert.doesNotMatch(p.html, /http-equiv="Content-Security-Policy"/i, p.path);
    for (const line of ['<link rel="manifest" href="/manifest.webmanifest">', '<link rel="stylesheet" href="/math.css">', '<meta property="og:site_name" content="Learn Vedic Math">', '<meta name="viewport"'])
      assert.ok(p.html.includes(line), `${p.path} keeps ${line}`);
  }
  assert.notDeepEqual(inline(PAGES[0].html.replace('</body>', '<script>1</script></body>')), want, 'a stray script is seen (what build.py fails on)');
});

test('withHead escapes the title and description, rewrites each head line once, and refuses a shell missing one', () => {
  const html = withHead(shell, { title: 'A & B <c>', description: 'Says "hi" & more' }, `${ORIGIN}/learn/x`, true);
  assert.ok(html.includes('<title>A &amp; B &lt;c&gt;</title>'));
  assert.ok(html.includes('<meta name="description" content="Says &quot;hi&quot; &amp; more">'));
  assert.ok(!html.includes(NOINDEX));
  assert.throws(() => withHead(shell.replace(/<link rel="canonical"[^>]*>\n/, ''), metaOf('#/arena'), `${ORIGIN}/learn/arena`, true), /canonical/);
});

test('the 200 rewrites: one per play experience, whose page answers for any parameters, and the Arena challenge link', () => {
  const r = rewrites();
  assert.equal(r.length, PLAY.length + 1);
  for (const e of PLAY) assert.ok(r.some(([from, to]) => from === `${BASE}${e.route.slice(1)}/*` && to === `${BASE}${e.route.slice(1)}`), e.route);
  assert.ok(r.some(([from, to]) => from === '/learn/arena/ghosts/*' && to === '/learn/arena/ghosts'));
  assert.deepEqual(r[r.length - 1], ['/learn/arena/day/*', '/learn/arena']);
  for (const [, to] of r) assert.ok(ALL.some(e => e.path === to), `${to} is a page`);
});
