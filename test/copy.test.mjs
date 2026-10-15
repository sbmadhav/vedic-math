/* Copy scan (honest-framing spec): the shipped HTML, the manifest and every script never claim a Vedic
   source for the sutras, never call them "the Vedic sutras", and never use an em dash. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const FILES = [join(root, 'index.html'), join(root, 'manifest.webmanifest'), ...walk(join(root, 'js')).filter(f => f.endsWith('.js'))];

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
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /Speed tricks use sutras from Bharati Krishna Tirtha's 1965 book; lessons, problems and visuals are original\./);
});
