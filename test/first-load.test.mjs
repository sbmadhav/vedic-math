/* The first load's critical path (docs/perf/baseline.md, "Off the critical path"): Lighthouse's simulation counts
   every request that ends before the largest paint, so the modules no first view draws with stay outside the static
   import graph of js/app.js (js/app.js loads them after the page has loaded, or when a Player first asks), and
   js/voice-plan.js is imported by js/app.js itself, a level sooner than through js/voice.js. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const STATIC = /(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]/g;
const src = f => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const imports = f => [...src(f).matchAll(STATIC)].map(m => m[1] || m[2]).filter(s => s && s.startsWith('./')).map(s => new URL(s, 'file:///js/' + f).pathname.slice(4));
function graph() {
  const seen = new Set(), queue = ['app.js'];
  while (queue.length) { const f = queue.pop(); if (seen.has(f)) continue; seen.add(f); queue.push(...imports(f)); }
  return seen;
}

test('the Arena and Tower rounds, the tour and the play kit are outside the static import graph of js/app.js', () => {
  const seen = graph();
  for (const f of ['arena.js', 'mental.js', 'tour.js', 'play/kit.js']) assert.ok(!seen.has(f), `a static import of js/${f} puts it back on the critical path`);
  for (const f of ['shell.js', 'check.js', 'voice.js']) assert.ok(seen.has(f), `js/${f} is still on first load`);
});

test('js/app.js imports js/voice-plan.js itself, after its other imports, so the evaluation order does not change', () => {
  const own = imports('app.js');
  assert.ok(own.includes('voice-plan.js'));
  assert.equal(own.at(-1), 'voice-plan.js');
  assert.ok(imports('voice.js').includes('voice-plan.js'));
});

test('js/app.js loads each of them on demand, and again after the page has loaded', () => {
  const app = src('app.js');
  for (const f of ['arena.js', 'tour.js', 'play/kit.js']) assert.ok(app.includes(`import('./${f}')`), `js/app.js loads js/${f} on demand`);
  assert.match(app, /\[loadArena, loadTour, loadKit\]\.forEach/);
});
