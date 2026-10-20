/* Copy scan (honest-framing spec): the shipped HTML, the manifest and every script never claim a Vedic
   source for the sutras, never call them "the Vedic sutras", and never use an em dash. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
/* The game page, the landing and grown-up pages (site/), the header partial, the manifest and every script */
const FILES = [join(root, 'play', 'index.html'), ...walk(join(root, 'site')).filter(f => f.endsWith('.html')), join(root, 'theme', 'header.html'),
  join(root, 'manifest.webmanifest'), ...walk(join(root, 'js')).filter(f => f.endsWith('.js'))];

const BANNED = [/vedic sutras?\b/i, /traditional vedic mathematics/i, /from the vedas/i];
/* A sentence may name the Vedas to say the sutras are not in them (the history text) */
const denies = sentence => /\bnot\b|\bnever\b/i.test(sentence);

test('no copy claims the sutras come from the Vedas or calls them the Vedic sutras', () => {
  const hits = [];
  for (const f of FILES) {
    const text = readFileSync(f, 'utf8');
    for (const re of BANNED) {
      for (const m of text.matchAll(new RegExp(re.source, 'gi'))) {
        const start = Math.max(text.lastIndexOf('.', m.index) + 1, text.lastIndexOf('\n', m.index) + 1), end = text.indexOf('.', m.index);
        const sentence = text.slice(start, end < 0 ? undefined : end);
        if (/from the vedas/i.test(m[0]) && denies(sentence)) continue;
        hits.push(`${relative(root, f)}: "${sentence.trim().slice(0, 120)}"`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test('no em dashes', () => {
  const hits = FILES.flatMap(f => readFileSync(f, 'utf8').split('\n').map((l, i) => [l, i]).filter(([l]) => /—|&mdash;/.test(l)).map(([, i]) => `${relative(root, f)}:${i + 1}`));
  assert.deepEqual(hits, []);
});

test('the footer credits the 1965 book', () => {
  const html = readFileSync(join(root, 'play', 'index.html'), 'utf8');
  assert.match(html, /Speed tricks use sutras from Bharati Krishna Tirtha's 1965 book; lessons, problems and visuals are original\./);
});

/* Sparks replace XP (sparks spec): no Player-facing text says XP or experience points. Comments are left out,
   so code may still explain the migration from xp; the weekly Board id keeps its lowercase xp-week- prefix. */
const saysXP = l => /\bXP\b/.test(l) || /experience points/i.test(l);
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
test('no XP shown to Players', () => {
  assert.ok(saysXP('<span class="fx-sparks">+5 XP</span>') && !saysXP("startsWith('xp-')") && !saysXP('d.xp > 0'), 'the scan itself');
  const hits = FILES.flatMap(f => stripComments(readFileSync(f, 'utf8')).split('\n').map((l, i) => [l, i]).filter(([l]) => saysXP(l)).map(([l]) => `${relative(root, f)}: ${l.trim().slice(0, 120)}`));
  assert.deepEqual(hits, []);
});

test('the XP and star calls are gone, not aliased', () => {
  const OLD = /\b(addXP|weekXP|weekXPOf|postWeekXP|MAX_WEEK_XP|setStars|starsWhere|doneWhere|levelOf|xpFor|levelInfo|starHTML|kataStars|challengeStars|levelStars|queueXpPost)\b|store\.(xp|stars)\(/;
  const hits = FILES.filter(f => f.endsWith('.js')).flatMap(f => readFileSync(f, 'utf8').split('\n').map((l, i) => [l, i]).filter(([l]) => OLD.test(l)).map(([, i]) => `${relative(root, f)}:${i + 1}`));
  assert.deepEqual(hits, []);
});

test('no star counts or star glyphs for Katas, game Levels or the tower', () => {
  const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');
  assert.doesNotMatch(app, /&#9733;|★|\\u2605|lv-stars/);
});

/* Sutra ambience (openspec honest-framing, "Om is labelled as atmosphere") */
test('the Om note is shipped verbatim and nothing calls the Om or the ambience Vedic', async () => {
  const NOTE = 'Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book.';
  assert.ok(readFileSync(join(root, 'js/sutra-ambience.js'), 'utf8').includes(NOTE));
  const hits = FILES.flatMap(f => readFileSync(f, 'utf8').split('\n').map((l, i) => [l, i])
    .filter(([l]) => /\b(om|ambience|singing bowl)\b/i.test(l) && /\bvedic\b/i.test(l) && !/^\s*(\/\*|\*|\/\/)/.test(l) && !/import|vedic\.js|vedic-math/i.test(l))
    .map(([, i]) => `${relative(root, f)}:${i + 1}`));
  assert.deepEqual(hits, []);
});

/* The pages for grown-ups (openspec change learnvedicmath, landing-pages; task 4.2): the parents and privacy pages name
   the contact, the legal pages are the reviewed docs/legal/ drafts rendered at build time (so their headings and
   last-updated line always match), and the published Markdown keeps the copy rules too */
test('grown-up pages: the contact on parents and privacy, the legal text included from docs/legal/, no em dashes', () => {
  const page = p => readFileSync(join(root, 'site', p, 'index.html'), 'utf8');
  assert.match(page('parents'), /privacy@learnvedicmath\.com/);
  assert.match(page('parents'), /href="\/privacy\/"/);
  for (const [p, md] of [['privacy', 'privacy-policy'], ['privacy/retention', 'data-retention'], ['terms', 'terms']]) {
    assert.match(page(p), new RegExp(`<!-- include-md: docs/legal/${md}\\.md -->`), p);
    assert.match(page(p), /Draft under review/, `${p} says it is a draft until the lawyer review (tasks 13.1, 14.5)`);
  }
  const policy = readFileSync(join(root, 'docs/legal/privacy-policy.md'), 'utf8');
  assert.match(policy, /privacy@learnvedicmath\.com/);
  assert.match(policy, /^Last updated: /m);
  for (const f of ['privacy-policy', 'data-retention', 'terms'].map(n => join(root, 'docs/legal', n + '.md')).concat(join(root, 'THIRD-PARTY-NOTICES.md')))
    assert.doesNotMatch(readFileSync(f, 'utf8'), /—/, f);
  assert.match(page('teachers'), /separate written agreement/);
  assert.doesNotMatch(readFileSync(join(root, 'site/index.html'), 'utf8'), /from the Vedas/i);
});

/* The parent note (openspec parent-note, change learnvedicmath; task 8.6): under 13 never posts, 30-day showing and
   automatic deletion, the privacy contact, the videos sentence, and links to the privacy policy and the parents page.
   The note is built in js/app.js (parentNote); its fixed sentences are checked in the source. */
test('the parent note says what the privacy policy says, in every Mode', () => {
  const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');
  const note = app.slice(app.indexOf('function parentNote()'), app.indexOf('async function loadBoard('));
  for (const s of [
    'Nothing is posted before a player answers one question about their age.',
    'Nothing is ever posted for a player whose answer is under 13: their scores rank on this device\'s board only.',
    'Each entry stops being shown 30 days after its last update, and is then deleted by an automatic clean-up that usually finishes within a few days.',
    'privacy@learnvedicmath.com',
    'Video pictures come from this site, and a video loads from YouTube, in privacy-enhanced mode, only after a player presses play; YouTube\'s own rules apply once it plays.',
    'href="/privacy/?home"', 'href="/parents/?home"',
    "there is no way to turn World boards on for them",
    // The launch has World boards off (tasks 1.8 and 8.5): the note says so without claiming nothing at all is sent
    // (the site still counts visits, said further down)
    'Right now no score is sent anywhere: World boards are switched off on this site, so every score stays in this browser.',
  ]) assert.ok(note.includes(s), s);
  assert.ok(!note.includes('nothing is sent anywhere'), 'analytics still counts visits, so the note never says nothing is sent');
  for (const gone of ['linkedin', 'LinkedIn', 'Parent step', 'turn on World boards for them, a grown-up', 'Entries are not deleted automatically']) assert.ok(!note.includes(gone), gone);
  for (const mode of ['explorer:', 'challenger:', 'pro:']) assert.ok(note.split(mode).length >= 3, `${mode} wording in the note`);
  const policy = readFileSync(join(root, 'docs/legal/privacy-policy.md'), 'utf8');
  assert.match(policy, /stop being shown after 30 days/);
});

test('no Parent step is left in the game', () => {
  const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');
  for (const gone of ['parent-step/', 'wbSwitch', 'wbCheck', 'inWords(', 'needs-parent', 'setParentOk']) assert.ok(!app.includes(gone), gone);
});
