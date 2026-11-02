/* The Trick pages (openspec change trick-pages, tasks 1.1, 1.2 and 4.1): the 15 rows of tools/trick-pages/pages.ts
   against the catalog (shared/src/vedic.ts), and the committed pages under site/tricks/ against a fresh render, so a
   change to a Trick's words or to the generator is committed with the pages it changes (pnpm gen:tricks). */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRICKS } from '../shared/src/vedic.ts';
import { PAGES, vals, sutraName, renderAll, INDEX_DESCRIPTION } from '../tools/trick-pages/pages.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const trickOf = id => TRICKS.find(t => t.id === id);

test('the 15 rows name Tricks the catalog has, with unique lowercase-word slugs', () => {
  assert.equal(PAGES.length, 15);
  const ids = PAGES.map(p => p.trick), slugs = PAGES.map(p => p.slug);
  for (const id of ids) assert.ok(trickOf(id), `${id} is in TRICKS`);
  assert.equal(new Set(ids).size, 15, 'no Trick twice');
  assert.equal(new Set(slugs).size, 15, 'no slug twice');
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${s}: lowercase words joined by hyphens`);
  // The six left out (design D2): equations, recurring decimals and divisibility tests
  for (const id of ['transpose', 'zero-sum', 'add-sub', 'ratio-zero', 'recip', 'osculator']) assert.ok(!ids.includes(id), `${id} has no page`);
});

test("every worked example passes the Trick's valid() and answer() gives the row's expected result", () => {
  for (const p of PAGES) {
    const t = trickOf(p.trick), v = vals(p);
    assert.equal(p.example.length, t.inputs.length, `${p.trick}: one number per input`);
    p.example.forEach((n, k) => assert.ok(n >= t.inputs[k].min && n <= t.inputs[k].max, `${p.trick}: ${n} is within ${t.inputs[k].label}'s limits`));
    assert.equal(t.valid(v), null, `${p.trick}: ${p.example.join(', ')} is taken`);
    assert.equal(t.answer(v), p.expected, `${p.trick}: answer(${p.example.join(', ')})`);
    assert.ok(t.steps(v).length >= 3, `${p.trick}: at least three steps`);
    assert.ok(p.question.length > 0 && !/[<>]/.test(p.question), `${p.trick}: the question is plain text`);
  }
});

test('every description is one sentence under 160 characters with no em dash, as is the index description', () => {
  for (const d of [...PAGES.map(p => p.description), INDEX_DESCRIPTION]) {
    assert.ok(d.length < 160, `${d.length} characters: ${d}`);
    assert.doesNotMatch(d, new RegExp(`${String.fromCharCode(8212)}|&mdash;`)); // an em dash, written as its code so this file holds none
    assert.match(d, /\.$/);
  }
});

test('a Sutra name on a page drops its bracketed note', () => {
  assert.equal(sutraName(trickOf('duplex')), 'Ūrdhva Tiryagbhyām');
  assert.equal(sutraName(trickOf('div9')), 'Nikhilaṃ');
  assert.equal(sutraName(trickOf('sq5')), 'Ekādhikena Pūrveṇa');
});

/* Design D3: the committed pages are exactly what the generator writes. The generator runs as the script
   (pnpm gen:tricks), into a scratch folder, so Node's own type stripping of the .ts files is exercised too. */
test('the committed pages under site/tricks/ are fresh (pnpm gen:tricks)', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'lvm-tricks-'));
  try {
    execFileSync('node', ['tools/trick-pages/generate.ts', '--out', scratch], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const fresh = walk(join(scratch, 'tricks')).map(f => relative(scratch, f)).sort();
    const committed = walk(join(root, 'site/tricks')).map(f => relative(join(root, 'site'), f)).sort();
    assert.deepEqual(committed, fresh, 'the same set of pages');
    assert.equal(fresh.length, 16);
    for (const f of fresh) assert.equal(readFileSync(join(root, 'site', f), 'utf8'), readFileSync(join(scratch, f), 'utf8'), `site/${f} is stale: run pnpm gen:tricks`);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
  // And the in-process render agrees with the script
  const rendered = renderAll(readFileSync(join(root, 'theme/header.html'), 'utf8'));
  for (const [rel, html] of rendered) assert.equal(readFileSync(join(root, 'site', rel), 'utf8'), html, rel);
});

/* Design D5 and D6: what each page carries */
test('each Trick page has its title, description, canonical, Open Graph, JSON-LD, Sutra line, 1965 book, example and Practice link', () => {
  for (const p of PAGES) {
    const t = trickOf(p.trick), html = readFileSync(join(root, 'site/tricks', p.slug, 'index.html'), 'utf8');
    const url = `https://learnvedicmath.com/tricks/${p.slug}/`;
    assert.ok(html.includes(`<title>${t.title}: the speed trick, step by step · Learn Vedic Math</title>`), `${p.slug}: title`);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${p.slug}: canonical`);
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`), `${p.slug}: og:url`);
    assert.ok(html.includes(`<meta name="description" content="${p.description}">`), `${p.slug}: description`);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const [resource, crumbs] = ld;
    assert.equal(resource['@type'], 'LearningResource');
    assert.equal(resource.name, t.title);
    assert.equal(resource.url, url);
    assert.equal(resource.isAccessibleForFree, true);
    assert.equal(resource.educationalLevel, `Grade ${t.grade}`);
    assert.equal(crumbs['@type'], 'BreadcrumbList');
    assert.deepEqual(crumbs.itemListElement.map(i => i.name), ['Home', 'Speed tricks', t.title]);
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.equal(html.match(/<h1>/g).length, 1, 'one h1');
    assert.ok(html.includes(`<b lang="sa-Latn">${sutraName(t)}</b>`), `${p.slug}: the Sutra's name`);
    assert.ok(html.includes(`<q>${t.meaning}</q>`), `${p.slug}: the meaning`);
    assert.ok(html.includes(`href="/learn/sutras/${t.sutraId}"`), `${p.slug}: the Deep dive link`);
    assert.ok(html.includes("in Bharati Krishna Tirtha's 1965 book <i>Vedic Mathematics</i>"), `${p.slug}: the 1965 book`);
    assert.ok(html.includes(`href="/learn/skill/v-${t.id}">Practice this trick</a>`), `${p.slug}: Practice this trick`);
    assert.ok(html.includes(`data-trick="${t.id}"`), `${p.slug}: the calculator's Trick`);
    for (const s of t.steps(vals(p))) assert.ok(html.includes(s.say), `${p.slug}: the step "${s.say}" is written out`);
    assert.equal(html.match(/<input type="number"/g).length, t.inputs.length, `${p.slug}: one field per input`);
    assert.ok(html.includes('<script type="module" src="/tricks/calculator.js"></script>'), `${p.slug}: loads the calculator`);
    assert.ok(!html.includes('?v='), `${p.slug}: the source carries no stamp`);
    assert.ok(!html.includes('type="importmap"'), `${p.slug}: the source carries no import map`);
  }
});

test('the index lists the 15 Trick pages by their titles and nothing more', () => {
  const html = readFileSync(join(root, 'site/tricks/index.html'), 'utf8');
  const links = [...html.matchAll(/<li><a href="\/tricks\/([a-z0-9-]+)\/">([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(links, PAGES.map(p => [p.slug, trickOf(p.trick).title]));
  assert.ok(html.includes('<link rel="canonical" href="https://learnvedicmath.com/tricks/">'));
  assert.ok(html.includes("Bharati Krishna Tirtha's 1965 book"));
  assert.ok(!html.includes('calculator.js'), 'the index loads no calculator');
});
