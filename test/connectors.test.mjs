/* Digit connectors (openspec working-memory-scaffolds, trick-connectors spec): which digits each step of the Trick
   animator joins, in which colour, and the text alternative. Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { linksFor, hasLinks } from '../js/connectors.js';
import { TRICKS } from '../js/vedic.js';

const pick = l => l.lines.map(({ from, to, color, dashed }) => [from, to, color, !!dashed]);

test('near-base 97 × 94: the distances, the cross, then the distances multiplied', () => {
  const s0 = linksFor('near-base', [97, 94], 0);
  assert.deepEqual(pick(s0), [['97', '-3', 'coral', false], ['94', '-6', 'teal', false]]);
  assert.equal(s0.label, 'Lines join 97 to its distance minus 3, and 94 to its distance minus 6.');
  assert.deepEqual(pick(linksFor('near-base', [97, 94], 1)), [['97', '-6', 'sky', false], ['94', '-3', 'sky', true]]);
  const s2 = linksFor('near-base', [97, 94], 2);
  assert.deepEqual(pick(s2), [['-3', '-6', 'sun', false]]);
  assert.equal(s2.label, 'A line joins minus 3 and minus 6: multiply them for the right part.');
  assert.equal(linksFor('near-base', [97, 94], 3), null); /* the answer: no digit of the question */
});

test('near-base over the base says plus', () => {
  assert.equal(linksFor('near-base', [103, 108], 0).label, 'Lines join 103 to its distance plus 3, and 108 to its distance plus 8.');
});

test('crosswise 23 × 41: straight down, crosswise, straight down, then no diagram', () => {
  assert.deepEqual(pick(linksFor('crosswise', [23, 41], 0)), [['3', '1', 'coral', false]]);
  const c1 = linksFor('crosswise', [23, 41], 1);
  assert.deepEqual(pick(c1), [['3', '4', 'coral', false], ['2', '1', 'teal', false]]);
  assert.equal(c1.label, 'Lines join the top 3 and the bottom 4, and the top 2 and the bottom 1.');
  assert.deepEqual(pick(linksFor('crosswise', [23, 41], 2)), [['2', '4', 'coral', false]]);
  assert.equal(linksFor('crosswise', [23, 41], 3), null);
});

test('crosswise with three digits: the middle column joins three pairs', () => {
  assert.equal(linksFor('crosswise', [123, 321], 2).lines.length, 3);
  assert.equal(linksFor('crosswise', [123, 321], 5), null);
});

test('every step that has a diagram matches a step of the Trick, for random numbers', () => {
  for (const id of ['near-base', 'crosswise']) {
    const t = TRICKS.find(x => x.id === id);
    for (let i = 0; i < 300; i++) {
      let v; do { v = t.random(); } while (t.valid(v));
      const steps = t.steps(v);
      steps.forEach((_, k) => { const l = linksFor(id, v, k); if (l) { assert.match(l.svg, /^<svg class="cx" [^>]*role="img" aria-label="[^"]+"/); assert.ok(l.lines.length > 0); } });
      assert.equal(linksFor(id, v, steps.length - 1), null, `${id} ${v}: the answer step has no diagram`);
    }
  }
});

test('only the two Tricks have connectors, and the markup holds no raw colour', () => {
  assert.deepEqual(TRICKS.filter(t => hasLinks(t.id)).map(t => t.id), ['near-base', 'crosswise']);
  assert.equal(linksFor('sq5', [85], 0), null);
  const src = readFileSync(new URL('../js/connectors.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
});
