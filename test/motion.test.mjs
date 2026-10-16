/* fx.noMotion(): no motion when the device asks for reduced motion, when the site-wide motion pause is on
   (html.motion-paused), or when Calm is on (vm.calm). Each source is stubbed on its own. */
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
let reduce = false; const classes = new Set();
globalThis.matchMedia = q => ({ matches: q === '(prefers-reduced-motion: reduce)' && reduce });
globalThis.document = { documentElement: { classList: { contains: c => classes.has(c) } } };
const fx = await import('../js/fx.js');
const reset = () => { reduce = false; classes.clear(); delete mem['vm.calm']; };

test('motion is on with no source set', () => { reset(); assert.equal(fx.noMotion(), false); });
test('reduced motion on the device turns it off', () => { reset(); reduce = true; assert.equal(fx.noMotion(), true); });
test('the site-wide Pause motion (html.motion-paused) turns it off', () => { reset(); classes.add('motion-paused'); assert.equal(fx.noMotion(), true); });
test('Calm (vm.calm = 1) turns it off, and only 1 counts', () => {
  reset(); mem['vm.calm'] = '1'; assert.equal(fx.noMotion(), true);
  mem['vm.calm'] = '0'; assert.equal(fx.noMotion(), false);
});
test('storage that throws falls back to the other two sources', () => {
  reset(); const real = globalThis.localStorage.getItem; globalThis.localStorage.getItem = () => { throw new Error('blocked'); };
  try { assert.equal(fx.noMotion(), false); classes.add('motion-paused'); assert.equal(fx.noMotion(), true); } finally { globalThis.localStorage.getItem = real; }
});
