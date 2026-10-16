/* Bolt (js/bolt.js): one inline SVG, six poses, token colors only, hidden from assistive technology */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOLT_SVG, POSES, boltHTML, pose } from '../js/bolt.js';

test('Bolt has no color literals: every fill and stroke comes from token classes in math.css', () => {
  assert.doesNotMatch(BOLT_SVG, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(BOLT_SVG, /\b(fill|stroke)="(?!none)/);
  assert.doesNotMatch(BOLT_SVG, /rgb|hsl/i);
});

test('Bolt is hidden from assistive technology and has the six poses', () => {
  assert.match(BOLT_SVG, /^<svg class="bolt"[^>]* aria-hidden="true"/);
  assert.match(BOLT_SVG, /focusable="false"/);
  assert.deepEqual(POSES, ['idle', 'think', 'surprised', 'explain', 'cheer', 'wink']);
  for (const p of POSES) assert.match(boltHTML(p), new RegExp(`data-pose="${p}"`));
  const css = readFileSync(new URL('../math.css', import.meta.url), 'utf8');
  for (const p of POSES.filter(p => p !== 'idle')) assert.match(css, new RegExp(`\\.bolt\\[data-pose="${p}"\\]`), `no CSS for ${p}`);
  const bolt = css.slice(css.indexOf('/* ---------- Bolt'), css.indexOf('/* ---------- end Bolt'));
  assert.ok(bolt.length > 100, 'found the Bolt block');
  assert.doesNotMatch(bolt, /#[0-9a-f]{3,8}\b/i, 'Bolt CSS uses tokens');
});

test('pose() sets a known pose and rejects unknown names', () => {
  const attrs = {}, svg = { matches: s => s === 'svg.bolt', setAttribute: (k, v) => { attrs[k] = v; } };
  assert.equal(pose(svg, 'cheer'), svg);
  assert.equal(attrs['data-pose'], 'cheer');
  const holder = { matches: () => false, querySelector: () => svg };
  pose(holder, 'wink'); assert.equal(attrs['data-pose'], 'wink');
  assert.throws(() => pose(svg, 'dance'), RangeError);
  assert.throws(() => boltHTML('sleepy'), RangeError);
});
