/* The copy table (openspec change age-bands, task 3.1; band-copy spec): every key the views use exists, every key has
   an early variant, early lines keep to 8 words a sentence and 2 sentences with no long words, growing lines to 14
   words, placeholders match across variants, no em dash and no Vedas claim (the copy test's rules), placeholders are
   filled as text, a line set is never drawn while picking the variant, and every early line with a count has exactly
   one sentence template (shared/src/voice-text.ts). */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY, VARIANTS, copyFor, pickLine, variantOf, fill, linesOf, placeholders, voiceLines, type CopyEntry, type Line } from './copy.ts';
import { TEMPLATES, templatesFor, matchTemplate, patternOf } from './voice-text.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
const entries = Object.entries(COPY) as [string, CopyEntry][];
const variants = (e: CopyEntry) => VARIANTS.flatMap(v => { const l = (e as Partial<Record<string, Line>>)[v]; return l === undefined ? [] : [[v, l] as const]; });
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const words = (s: string) => s.split(/\s+/).filter(Boolean);
/* Names and words a child reads as one picture; numbers and placeholders are not words to read */
const ALLOW = new Set(['Explorer', 'Challenger', 'Bolt', 'Kindergarten']);
const longWord = (w: string) => { const bare = w.replace(/[^A-Za-z]/g, ''); return bare.length > 10 && !ALLOW.has(bare); };

test('every key is <screen>.<line>, has a default or the Challenger and Pro variants, and an early variant', () => {
  for (const [key, e] of entries) {
    assert.match(key, /^[a-z]+\.[a-zA-Z]+(\.[a-zA-Z]+)?$/, key);
    assert.ok('default' in e || ('challenger' in e && 'pro' in e), `${key}: a default or Challenger and Pro`);
    assert.ok('early' in e, `${key} (a mapped screen): no early variant`);
    for (const [v, l] of variants(e)) for (const t of linesOf(l)) assert.ok(typeof t === 'string' && t.trim(), `${key}.${v} is text`);
  }
});

test('every copy key the views use exists in the table', () => {
  const used = new Set<string>();
  for (const f of walk(join(ROOT, 'js'))) for (const m of readFileSync(f, 'utf8').matchAll(/\bfx\.(?:copy|line)\(\s*'([^']+)'/g)) used.add(m[1] as string);
  for (const f of walk(join(ROOT, 'js'))) for (const m of readFileSync(f, 'utf8').matchAll(/\bfx\.copy\(\s*'([a-z]+\.[a-zA-Z]+\.)'\s*\+\s*id\b/g)) for (const mode of ['explorer', 'challenger', 'pro']) used.add(m[1] + mode);
  for (const f of walk(join(ROOT, 'js'))) for (const m of readFileSync(f, 'utf8').matchAll(/\bfx\.copy\((?:byAge|of === 'dare'|after > before|type !== 'daily'|litNow|nowLit|lit|store\.playedBefore\(\))[^)]*?'([a-z]+\.[a-zA-Z]+)'[^)]*?'([a-z]+\.[a-zA-Z]+)'/g)) { used.add(m[1] as string); used.add(m[2] as string); }
  for (const k of [...used]) if (k.endsWith('.')) used.delete(k); /* a prefix the Mode completes, expanded above */
  assert.ok(used.size >= 40, `the scan finds the keys (${used.size})`);
  const missing = [...used].filter(k => !(k in COPY));
  assert.deepEqual(missing, []);
});

test('early lines: at most 2 sentences of at most 8 words, no word over 10 letters but the allowed names', () => {
  const bad: string[] = [];
  for (const [key, e] of entries) for (const t of linesOf(e.early)) {
    const ss = sentences(t);
    if (ss.length > 2) bad.push(`${key}: ${ss.length} sentences`);
    for (const s of ss) { const ws = words(s); if (ws.length > 8) bad.push(`${key}: "${s}" has ${ws.length} words`); for (const w of ws) if (longWord(w)) bad.push(`${key}: "${w}" is over 10 letters`); }
  }
  assert.deepEqual(bad, []);
});

test('growing lines: at most 14 words a sentence', () => {
  const bad: string[] = [];
  for (const [key, e] of entries) for (const t of linesOf(e.growing)) for (const s of sentences(t)) if (words(s).length > 14) bad.push(`${key}: "${s}" has ${words(s).length} words`);
  assert.deepEqual(bad, []);
});

test('every variant of an entry carries the same placeholders; only {n}, {a} and {r} exist', () => {
  for (const [key, e] of entries) {
    const all = variants(e).flatMap(([v, l]) => linesOf(l).map(t => [v, placeholders(t)] as const));
    const first = all[0]![1];
    for (const [v, ph] of all) assert.deepEqual(ph, first, `${key}.${v}: placeholders ${ph.join()} against ${first.join()}`);
    for (const p of first) assert.ok(['n', 'a', 'r'].includes(p), `${key}: placeholder {${p}}`);
  }
});

test('no em dash, no Vedas claim, no XP, in any variant', () => {
  const BANNED = [/vedic sutras?\b/i, /traditional vedic mathematics/i, /from the vedas/i, /\bXP\b/, /—|&mdash;/];
  for (const [key, e] of entries) for (const [v, l] of variants(e)) for (const t of linesOf(l)) for (const re of BANNED) assert.doesNotMatch(t, re, `${key}.${v}`);
});

test('choosing a line: the band variant, else the Mode variant, else default; Fluent and no band read the Mode copy', () => {
  assert.equal(copyFor('practice.retry', { mode: 'challenger', band: 'early' }), 'Try again!');
  assert.equal(copyFor('practice.retry', { mode: 'pro', band: 'growing' }), 'Not quite. Try once more.', 'no growing variant: the Pro (default) line');
  assert.equal(copyFor('practice.retry', { mode: 'pro', band: 'fluent' }), 'Not quite. Try once more.');
  assert.equal(copyFor('home.heading', { mode: 'pro', band: 'fluent' }), 'Mental math, the sutra way');
  assert.equal(copyFor('home.heading', { mode: 'pro', band: 'early' }), 'What do you want to play?');
  assert.equal(copyFor('home.heading', { mode: 'challenger' }), 'Learn a sutra, then use it');
  assert.equal(copyFor('home.heading', {}), 'Learn a sutra, then use it', 'no Mode: Challenger, as fx.t falls back');
  assert.equal(copyFor('home.door.sutra', { mode: 'pro', band: 'growing' }), 'A sutra is a short rule that does a sum in one line. A Star is four quick questions on one trick.');
  assert.equal(copyFor('no.such.key', { mode: 'pro' }), 'no.such.key', 'an unknown key is itself, so a typo shows');
  assert.equal(variantOf(undefined, {}), undefined);
});

test('placeholders are filled as text: markup in a value shows as characters; {html} is the view\'s own markup', () => {
  assert.equal(fill('Hello {name}!', { name: '<b>Max</b>' }), 'Hello &lt;b&gt;Max&lt;/b&gt;!');
  assert.equal(copyFor('star.need', { mode: 'pro' }, { n: 7 }), '7 more Sparks to light it.');
  assert.equal(copyFor('star.reveal', { mode: 'pro', band: 'early' }, { a: '<img src=x onerror=alert(1)>' }), 'Not quite. It is &lt;img src=x onerror=alert(1)&gt;.');
  assert.equal(copyFor('arena.rating', { mode: 'explorer' }, { r: { html: '<b>7</b>' } }), 'Your Arena Rating: <b>7</b> of 20. Practice rounds get harder as you get them right.');
  assert.equal(fill('{n} and {m}', { n: 1 }), '1 and {m}', 'a placeholder with no value stays, so a missing var shows');
});

test('a line set is handed over whole by copyFor, and pickLine draws one: the view keeps what it drew', () => {
  const set = copyFor('bolt.right', { mode: 'challenger', band: 'early' });
  assert.deepEqual(set, ['You did it!', 'Yes!', 'Great job!']);
  assert.equal(copyFor('bolt.right', { mode: 'challenger', band: 'early' }), set, 'the same array each time: nothing is drawn while choosing');
  assert.ok(!(copyFor('bolt.right', { mode: 'pro' }) as readonly string[]).includes('You did it!'));
  assert.ok((copyFor('bolt.right', { mode: 'pro' }) as readonly string[]).includes('Boom.'));
  assert.equal(pickLine('bolt.right', { mode: 'pro', band: 'early' }, null, () => 0), 'You did it!');
  assert.equal(pickLine('bolt.right', { mode: 'pro', band: 'early' }, null, () => 0.99), 'Great job!');
  assert.equal(pickLine('practice.retry', { mode: 'pro' }), 'Not quite. Try once more.', 'a single line is itself');
  /* Early never says an idiom: no Boom, Nailed it, Smooth or crushed in any early line */
  for (const [key, e] of entries) for (const t of linesOf(e.early)) assert.doesNotMatch(t, /boom|nailed|smooth|crushed|lightning/i, `${key}.early`);
});

test('every early line with a count matches exactly one sentence template, and each template is a line in the table', () => {
  const counted = entries.flatMap(([key, e]) => linesOf(e.early).filter(t => /\{(n|a|r)\}/.test(t)).map(t => [key, t] as const));
  assert.ok(counted.length >= 5, `the counted early lines (${counted.length})`);
  for (const [key, t] of counted) assert.equal(templatesFor(t).length, 1, `${key}: "${t}" has ${templatesFor(t).length} templates`);
  for (const t of TEMPLATES) assert.ok(counted.some(([key, line]) => key === t.key && line === t.text), `template ${t.key} "${t.text}" is an early line`);
  assert.deepEqual(matchTemplate('You climbed 7 steps!'), null, 'not a line of this table yet (Placement)');
  assert.deepEqual(matchTemplate('Star 2 is lit!'), { template: TEMPLATES.find(t => t.key === 'star.headLit'), values: [2] });
  assert.deepEqual(matchTemplate('Not quite. It is 7225.')!.values, [7225]);
  assert.ok(patternOf(TEMPLATES[0]!).test(TEMPLATES[0]!.text.replace(/\{\w+\}/g, '12')));
});

test('the whole-line list for the Studio voice holds every fixed early line and every Bolt line, and no line with a placeholder', () => {
  const lines = voiceLines();
  assert.ok(lines.includes('You did it!') && lines.includes('Try again!') && lines.includes('Boom.') && lines.includes('Good thinking.'));
  assert.ok(!lines.some(t => /\{\w+\}/.test(t)));
  assert.equal(new Set(lines).size, lines.length, 'no line twice');
  for (const [, e] of entries) for (const t of linesOf(e.early)) if (!/\{\w+\}/.test(t)) assert.ok(lines.includes(t), t);
});
